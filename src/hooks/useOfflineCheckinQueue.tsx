import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

interface QueuedCheckin {
  operationId: string;
  eventId: string;
  registrationId: string | null;
  teamMemberId: string | null;
  action: "checkin" | "undo";
  method: "qr" | "manual";
  source: "portal" | "station";
  deviceId: string;
  createdAt: string;
  syncedAt: string | null;
  status: "pending" | "synced" | "failed";
  error?: string;
}

interface CachedEvent {
  id: string;
  title: string;
  enableCheckin: boolean;
  startDate: string;
  endDate: string;
  registrations: CachedRegistration[];
  tokenIndex: Map<string, string>; // token -> registrationId
  downloadedAt: string;
}

interface CachedRegistration {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  divisionName: string | null;
  teamName: string | null;
  passToken: string | null;
  isCheckedIn: boolean;
  checkedInAt: string | null;
}

const DB_NAME = "eventCheckinOffline";
const DB_VERSION = 1;
const QUEUE_STORE = "checkinQueue";
const EVENTS_STORE = "cachedEvents";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        const queueStore = db.createObjectStore(QUEUE_STORE, { keyPath: "operationId" });
        queueStore.createIndex("status", "status", { unique: false });
        queueStore.createIndex("eventId", "eventId", { unique: false });
      }
      
      if (!db.objectStoreNames.contains(EVENTS_STORE)) {
        db.createObjectStore(EVENTS_STORE, { keyPath: "id" });
      }
    };
  });
}

export function useOfflineCheckinQueue(eventId: string | null) {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [cachedEvent, setCachedEvent] = useState<CachedEvent | null>(null);

  const deviceId = typeof window !== "undefined" 
    ? localStorage.getItem("checkin_device_id") || (() => {
        const id = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem("checkin_device_id", id);
        return id;
      })()
    : "unknown";

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Load pending count
  const loadPendingCount = useCallback(async () => {
    try {
      const db = await openDB();
      const tx = db.transaction(QUEUE_STORE, "readonly");
      const store = tx.objectStore(QUEUE_STORE);
      const index = store.index("status");
      const request = index.count(IDBKeyRange.only("pending"));
      
      request.onsuccess = () => setPendingCount(request.result);
    } catch (error) {
      console.error("Error loading pending count:", error);
    }
  }, []);

  // Load cached event
  const loadCachedEvent = useCallback(async () => {
    if (!eventId) return;
    
    try {
      const db = await openDB();
      const tx = db.transaction(EVENTS_STORE, "readonly");
      const store = tx.objectStore(EVENTS_STORE);
      const request = store.get(eventId);
      
      request.onsuccess = () => {
        if (request.result) {
          const cached = request.result as CachedEvent;
          cached.tokenIndex = new Map(Object.entries(request.result.tokenIndex || {}));
          setCachedEvent(cached);
        }
      };
    } catch (error) {
      console.error("Error loading cached event:", error);
    }
  }, [eventId]);

  useEffect(() => {
    loadPendingCount();
    loadCachedEvent();
  }, [loadPendingCount, loadCachedEvent]);

  // Queue a check-in action
  const queueCheckin = useCallback(async (
    registrationId: string,
    method: "qr" | "manual",
    source: "portal" | "station"
  ): Promise<{ success: boolean; message: string }> => {
    if (!eventId) return { success: false, message: "No event selected" };

    const operationId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const queueItem: QueuedCheckin = {
      operationId,
      eventId,
      registrationId,
      teamMemberId: null,
      action: "checkin",
      method,
      source,
      deviceId,
      createdAt: new Date().toISOString(),
      syncedAt: null,
      status: "pending",
    };

    try {
      const db = await openDB();
      const tx = db.transaction(QUEUE_STORE, "readwrite");
      const store = tx.objectStore(QUEUE_STORE);
      store.add(queueItem);
      
      await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });

      // Update local cache
      if (cachedEvent) {
        const updated = { ...cachedEvent };
        const reg = updated.registrations.find(r => r.id === registrationId);
        if (reg) {
          reg.isCheckedIn = true;
          reg.checkedInAt = new Date().toISOString();
        }
        setCachedEvent(updated);
        
        // Persist cache update
        const cacheTx = db.transaction(EVENTS_STORE, "readwrite");
        const cacheStore = cacheTx.objectStore(EVENTS_STORE);
        cacheStore.put({ ...updated, tokenIndex: Object.fromEntries(updated.tokenIndex) });
      }

      setPendingCount(prev => prev + 1);
      return { success: true, message: "Queued for sync" };
    } catch (error) {
      console.error("Error queuing check-in:", error);
      return { success: false, message: "Failed to queue check-in" };
    }
  }, [eventId, deviceId, cachedEvent]);

  // Sync pending items
  const syncQueue = useCallback(async (): Promise<{ synced: number; failed: number }> => {
    if (!user || !isOnline) return { synced: 0, failed: 0 };
    
    setIsSyncing(true);
    let synced = 0;
    let failed = 0;

    try {
      const db = await openDB();
      const tx = db.transaction(QUEUE_STORE, "readonly");
      const store = tx.objectStore(QUEUE_STORE);
      const index = store.index("status");
      const request = index.getAll(IDBKeyRange.only("pending"));

      const items: QueuedCheckin[] = await new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      for (const item of items) {
        try {
          if (item.action === "checkin") {
            // Try to insert check-in (idempotent via operation_id)
            const { error } = await supabase
              .from("event_checkins")
              .insert({
                event_id: item.eventId,
                registration_id: item.registrationId,
                team_member_id: item.teamMemberId,
                checked_in_by_user_id: user.id,
                method: item.method,
                source: item.source,
                device_id: item.deviceId,
                operation_id: item.operationId,
              });

            // Ignore duplicate key errors (already synced)
            if (error && error.code !== "23505") throw error;

            // Update registration if check-in succeeded
            if (!error) {
              await supabase
                .from("event_registrations")
                .update({
                  checked_in_at: item.createdAt,
                  active_for_event: true,
                })
                .eq("id", item.registrationId);
            }
          }

          // Mark as synced
          const updateTx = db.transaction(QUEUE_STORE, "readwrite");
          const updateStore = updateTx.objectStore(QUEUE_STORE);
          updateStore.put({ ...item, status: "synced", syncedAt: new Date().toISOString() });
          synced++;
        } catch (error: any) {
          console.error("Sync error for item:", item.operationId, error);
          
          const updateTx = db.transaction(QUEUE_STORE, "readwrite");
          const updateStore = updateTx.objectStore(QUEUE_STORE);
          updateStore.put({ ...item, status: "failed", error: error.message });
          failed++;
        }
      }

      // Log sync batch
      if (items.length > 0) {
        await supabase.from("audit_logs").insert({
          action: "offline_sync_batch",
          category: "events",
          message: `Synced ${synced} check-ins, ${failed} failed`,
          actor_id: user.id,
          metadata: { device_id: deviceId, synced, failed },
        });
      }

      await loadPendingCount();
    } catch (error) {
      console.error("Sync queue error:", error);
    } finally {
      setIsSyncing(false);
    }

    return { synced, failed };
  }, [user, isOnline, deviceId, loadPendingCount]);

  // Auto-sync when online
  useEffect(() => {
    if (isOnline && pendingCount > 0 && !isSyncing) {
      syncQueue().then(({ synced, failed }) => {
        if (synced > 0) toast.success(`Synced ${synced} check-ins`);
        if (failed > 0) toast.error(`${failed} check-ins failed to sync`);
      });
    }
  }, [isOnline, pendingCount, isSyncing, syncQueue]);

  // Download event for offline use
  const downloadEventForOffline = useCallback(async (): Promise<boolean> => {
    if (!eventId || !user) return false;

    try {
      // Fetch event details
      const { data: event, error: eventError } = await supabase
        .from("events")
        .select("id, title, enable_checkin, start_date, end_date")
        .eq("id", eventId)
        .single();

      if (eventError || !event) throw eventError || new Error("Event not found");

      // Fetch registrations with passes
      const { data: registrations, error: regError } = await supabase
        .from("event_registrations")
        .select(`
          id,
          user_id,
          checked_in_at,
          event_divisions (name),
          event_teams (name),
          profiles!event_registrations_user_id_fkey (display_name, email),
          event_registration_passes (pass_token, status)
        `)
        .eq("event_id", eventId)
        .eq("status", "confirmed");

      if (regError) throw regError;

      const tokenIndex = new Map<string, string>();
      const cachedRegs: CachedRegistration[] = (registrations || []).map((r: any) => {
        const activePass = r.event_registration_passes?.find((p: any) => p.status === "active");
        if (activePass?.pass_token) {
          tokenIndex.set(activePass.pass_token, r.id);
        }
        return {
          id: r.id,
          userId: r.user_id,
          userName: r.profiles?.display_name || "Unknown",
          userEmail: r.profiles?.email || "",
          divisionName: r.event_divisions?.name || null,
          teamName: r.event_teams?.name || null,
          passToken: activePass?.pass_token || null,
          isCheckedIn: !!r.checked_in_at,
          checkedInAt: r.checked_in_at,
        };
      });

      const cached: CachedEvent = {
        id: event.id,
        title: event.title,
        enableCheckin: event.enable_checkin || false,
        startDate: event.start_date,
        endDate: event.end_date,
        registrations: cachedRegs,
        tokenIndex,
        downloadedAt: new Date().toISOString(),
      };

      // Save to IndexedDB
      const db = await openDB();
      const tx = db.transaction(EVENTS_STORE, "readwrite");
      const store = tx.objectStore(EVENTS_STORE);
      store.put({ ...cached, tokenIndex: Object.fromEntries(tokenIndex) });

      await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });

      setCachedEvent(cached);

      // Log download
      await supabase.from("audit_logs").insert({
        action: "offline_event_download",
        category: "events",
        message: `Downloaded event for offline use`,
        entity_type: "event",
        entity_id: eventId,
        actor_id: user.id,
        metadata: { registration_count: cachedRegs.length },
      });

      return true;
    } catch (error) {
      console.error("Error downloading event:", error);
      return false;
    }
  }, [eventId, user]);

  // Validate token offline
  const validateTokenOffline = useCallback((token: string): CachedRegistration | null => {
    if (!cachedEvent) return null;
    
    const registrationId = cachedEvent.tokenIndex.get(token);
    if (!registrationId) return null;
    
    return cachedEvent.registrations.find(r => r.id === registrationId) || null;
  }, [cachedEvent]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    cachedEvent,
    deviceId,
    queueCheckin,
    syncQueue,
    downloadEventForOffline,
    validateTokenOffline,
  };
}
