import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useProfile } from "./useProfile";
import { toast } from "sonner";



// Types
export interface HRDevice {
  id: string;
  user_id: string;
  name: string;
  manufacturer: string | null;
  transport: "ble" | "ant";
  device_identifier: string | null;
  last_connected_at: string | null;
  is_preferred: boolean;
  created_at: string;
}

export interface HRSample {
  timestamp: number;
  bpm: number;
}

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "reconnecting" | "unsupported";

const HR_SERVICE_UUID = 0x180d;
const HR_MEASUREMENT_UUID = 0x2a37;
const BATCH_INTERVAL_MS = 10000; // flush samples every 10s
const RECONNECT_INITIAL_DELAY_MS = 2000;
const RECONNECT_MAX_DELAY_MS = 30000;
const MAX_RECONNECT_ATTEMPTS = 10;

function isWebBluetoothSupported(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

function parseHeartRateMeasurement(value: DataView): number {
  const flags = value.getUint8(0);
  const is16Bit = flags & 0x01;
  return is16Bit ? value.getUint16(1, true) : value.getUint8(1);
}

export function useHeartRateMonitor() {
  const { user } = useAuth();
  const { profile } = useProfile();

  // Device management state
  const [devices, setDevices] = useState<HRDevice[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(true);

  // Connection state
  const [status, setStatus] = useState<ConnectionStatus>(
    isWebBluetoothSupported() ? "disconnected" : "unsupported"
  );
  const [activeDevice, setActiveDevice] = useState<HRDevice | null>(null);
  const [currentBPM, setCurrentBPM] = useState<number>(0);
  const [zone, setZone] = useState<number>(1);

  // Internal refs
  const bleDeviceRef = useRef<BluetoothDevice | null>(null);
  const characteristicRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const sampleBufferRef = useRef<{ timestamp: string; bpm: number }[]>([]);
  const flushTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const deviceIdRef = useRef<string | null>(null);
  const reconnectRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const samplesRef = useRef<HRSample[]>([]);
  const maxHRRef = useRef(0);
  const timeInZonesRef = useRef<Record<number, number>>({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  const lastSampleTimeRef = useRef<number>(0);

  const userMaxHR = profile?.max_hr || 190;

  // Zone calculation
  const getZone = useCallback((hr: number): number => {
    const pct = (hr / userMaxHR) * 100;
    if (pct < 60) return 1;
    if (pct < 70) return 2;
    if (pct < 80) return 3;
    if (pct < 90) return 4;
    return 5;
  }, [userMaxHR]);

  // Fetch devices
  const fetchDevices = useCallback(async () => {
    if (!user) return;
    setIsLoadingDevices(true);
    const { data, error } = await supabase
      .from("hr_devices")
      .select("*")
      .eq("user_id", user.id)
      .order("is_preferred", { ascending: false });
    if (!error && data) setDevices(data as unknown as HRDevice[]);
    setIsLoadingDevices(false);
  }, [user]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  // Handle incoming HR measurement
  const handleHRMeasurement = useCallback((event: Event) => {
    const target = event.target as unknown as BluetoothRemoteGATTCharacteristic;
    const bpm = parseHeartRateMeasurement(target.value!);
    const now = Date.now();

    setCurrentBPM(bpm);
    const z = getZone(bpm);
    setZone(z);

    // Track time in zones (time since last sample)
    const elapsed = lastSampleTimeRef.current > 0
      ? Math.min((now - lastSampleTimeRef.current) / 1000, 5) // cap at 5s
      : 1;
    lastSampleTimeRef.current = now;
    timeInZonesRef.current[z] = (timeInZonesRef.current[z] || 0) + elapsed;

    // Track max
    if (bpm > maxHRRef.current) maxHRRef.current = bpm;

    // Add to local samples array
    samplesRef.current.push({ timestamp: now, bpm });
    // Keep last 500 in memory for UI
    if (samplesRef.current.length > 500) samplesRef.current = samplesRef.current.slice(-500);

    // Buffer for DB batch write
    if (sessionIdRef.current) {
      sampleBufferRef.current.push({
        timestamp: new Date(now).toISOString(),
        bpm,
      });
    }
  }, [getZone]);

  // Flush buffer to DB
  const flushSamples = useCallback(async () => {
    const sid = sessionIdRef.current;
    const did = deviceIdRef.current;
    if (!sid || sampleBufferRef.current.length === 0) return;

    const batch = sampleBufferRef.current.splice(0, sampleBufferRef.current.length);
    const rows = batch.map(s => ({
      session_id: sid,
      timestamp: s.timestamp,
      bpm: s.bpm,
      source_device_id: did,
    }));

    await supabase.from("hr_samples").insert(rows as any);
  }, []);

  // Start periodic flush
  const startFlushing = useCallback(() => {
    if (flushTimerRef.current) clearInterval(flushTimerRef.current);
    flushTimerRef.current = setInterval(flushSamples, BATCH_INTERVAL_MS);
  }, [flushSamples]);

  const stopFlushing = useCallback(async () => {
    if (flushTimerRef.current) {
      clearInterval(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    await flushSamples(); // final flush
  }, [flushSamples]);

  // Disconnect handler
  const attemptReconnect = useCallback(async () => {
    if (!reconnectRef.current || !bleDeviceRef.current?.gatt) {
      setStatus("disconnected");
      return;
    }

    const attempt = reconnectAttemptsRef.current;
    if (attempt >= MAX_RECONNECT_ATTEMPTS) {
      setStatus("disconnected");
      reconnectRef.current = false;
      reconnectAttemptsRef.current = 0;
      toast.error("HR monitor reconnection failed after multiple attempts");
      return;
    }

    const delay = Math.min(
      RECONNECT_INITIAL_DELAY_MS * Math.pow(1.5, attempt),
      RECONNECT_MAX_DELAY_MS
    );
    reconnectAttemptsRef.current = attempt + 1;
    setStatus("reconnecting");

    reconnectTimerRef.current = setTimeout(async () => {
      try {
        if (!reconnectRef.current || !bleDeviceRef.current?.gatt) {
          setStatus("disconnected");
          return;
        }
        const server = await bleDeviceRef.current.gatt.connect();
        const service = await server.getPrimaryService(HR_SERVICE_UUID);
        const char = await service.getCharacteristic(HR_MEASUREMENT_UUID);
        characteristicRef.current = char;
        await char.startNotifications();
        char.addEventListener("characteristicvaluechanged", handleHRMeasurement);
        reconnectAttemptsRef.current = 0;
        setStatus("connected");
        toast.success("HR monitor reconnected");
      } catch {
        // Retry again
        attemptReconnect();
      }
    }, delay);
  }, [handleHRMeasurement]);

  const onDisconnected = useCallback(() => {
    setStatus("disconnected");
    characteristicRef.current = null;
    attemptReconnect();
  }, [attemptReconnect]);

  // Connect to BLE device
  const connectBLE = useCallback(async (device?: HRDevice) => {
    if (!isWebBluetoothSupported()) {
      setStatus("unsupported");
      return;
    }

    setStatus("connecting");
    reconnectRef.current = true;

    try {
      let bleDevice: BluetoothDevice;

      if (device?.device_identifier) {
        // Try to reconnect to known device - but Web Bluetooth doesn't support
        // reconnecting by ID without user gesture, so we request with filter
        bleDevice = await navigator.bluetooth.requestDevice({
          filters: [{ services: [HR_SERVICE_UUID] }],
          optionalServices: [HR_SERVICE_UUID],
        });
      } else {
        bleDevice = await navigator.bluetooth.requestDevice({
          filters: [{ services: [HR_SERVICE_UUID] }],
          optionalServices: [HR_SERVICE_UUID],
        });
      }

      bleDevice.addEventListener("gattserverdisconnected", onDisconnected);
      bleDeviceRef.current = bleDevice;

      const server = await bleDevice.gatt!.connect();
      const service = await server.getPrimaryService(HR_SERVICE_UUID);
      const char = await service.getCharacteristic(HR_MEASUREMENT_UUID);
      characteristicRef.current = char;

      await char.startNotifications();
      char.addEventListener("characteristicvaluechanged", handleHRMeasurement);

      setStatus("connected");

      // Save or update device record
      if (user) {
        const deviceName = bleDevice.name || "HR Monitor";
        const existing = devices.find(d => d.name === deviceName && d.transport === "ble");

        if (existing) {
          await supabase
            .from("hr_devices")
            .update({ last_connected_at: new Date().toISOString() } as any)
            .eq("id", existing.id);
          setActiveDevice(existing);
          deviceIdRef.current = existing.id;
        } else {
          const { data: newDev } = await supabase
            .from("hr_devices")
            .insert({
              user_id: user.id,
              name: deviceName,
              manufacturer: null,
              transport: "ble",
              device_identifier: bleDevice.id || null,
              last_connected_at: new Date().toISOString(),
              is_preferred: devices.length === 0,
            } as any)
            .select()
            .single();
          if (newDev) {
            const dev = newDev as unknown as HRDevice;
            setActiveDevice(dev);
            deviceIdRef.current = dev.id;
            fetchDevices();
          }
        }
      }

      startFlushing();
      toast.success(`Connected to ${bleDevice.name || "HR Monitor"}`);
    } catch (err: any) {
      if (err?.name === "NotFoundError") {
        // User cancelled device picker
        setStatus("disconnected");
      } else {
        setStatus("disconnected");
        console.error("BLE connect error:", err);
        toast.error("Failed to connect HR monitor");
      }
      reconnectRef.current = false;
    }
  }, [user, devices, handleHRMeasurement, onDisconnected, startFlushing, fetchDevices]);

  // Disconnect
  const disconnect = useCallback(async () => {
    reconnectRef.current = false;
    reconnectAttemptsRef.current = 0;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (characteristicRef.current) {
      try {
        await characteristicRef.current.stopNotifications();
        characteristicRef.current.removeEventListener("characteristicvaluechanged", handleHRMeasurement);
      } catch { }
    }
    if (bleDeviceRef.current?.gatt?.connected) {
      bleDeviceRef.current.gatt.disconnect();
    }
    bleDeviceRef.current = null;
    characteristicRef.current = null;
    await stopFlushing();
    setStatus("disconnected");
    setActiveDevice(null);
    setCurrentBPM(0);
    deviceIdRef.current = null;
  }, [handleHRMeasurement, stopFlushing]);

  // Set session for recording
  const startRecording = useCallback((sessionId: string) => {
    sessionIdRef.current = sessionId;
    sampleBufferRef.current = [];
    samplesRef.current = [];
    maxHRRef.current = 0;
    timeInZonesRef.current = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    lastSampleTimeRef.current = 0;
    if (status === "connected") startFlushing();
  }, [status, startFlushing]);

  const stopRecording = useCallback(async () => {
    await stopFlushing();
    const bpms = samplesRef.current.map(s => s.bpm).filter(b => b > 0);
    const result = {
      avgHR: bpms.length > 0
        ? Math.round(bpms.reduce((s, x) => s + x, 0) / bpms.length)
        : 0,
      maxHR: maxHRRef.current,
      minHR: bpms.length > 0 ? Math.min(...bpms) : 0,
      timeInZones: { ...timeInZonesRef.current },
      deviceId: deviceIdRef.current,
    };
    sessionIdRef.current = null;
    return result;
  }, [stopFlushing]);

  // Device management
  const removeDevice = useCallback(async (deviceId: string) => {
    await supabase.from("hr_devices").delete().eq("id", deviceId);
    setDevices(prev => prev.filter(d => d.id !== deviceId));
    if (activeDevice?.id === deviceId) {
      await disconnect();
    }
    toast.success("Device removed");
  }, [activeDevice, disconnect]);

  const setPreferred = useCallback(async (deviceId: string) => {
    await supabase
      .from("hr_devices")
      .update({ is_preferred: true } as any)
      .eq("id", deviceId);
    fetchDevices();
    toast.success("Default device updated");
  }, [fetchDevices]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      reconnectRef.current = false;
      if (flushTimerRef.current) clearInterval(flushTimerRef.current);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, []);

  return {
    // State
    status,
    currentBPM,
    zone,
    activeDevice,
    devices,
    isLoadingDevices,
    samples: samplesRef.current,
    timeInZones: timeInZonesRef.current,
    isSupported: isWebBluetoothSupported(),

    // Actions
    connectBLE,
    disconnect,
    startRecording,
    stopRecording,
    fetchDevices,
    removeDevice,
    setPreferred,
  };
}
