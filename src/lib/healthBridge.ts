/**
 * Health bridge using @capgo/capacitor-health unified plugin.
 * Supports Apple HealthKit (iOS) and Health Connect (Android) through a single API.
 */
import type { HealthPlugin, Workout } from "@capgo/capacitor-health";

export type HealthDataType =
  | "steps" | "calories" | "workouts" | "heart_rate"
  | "sleep" | "hrv_stress" | "weight" | "nutrition";

export interface HealthSample {
  sourceId?: string;
  startTime: string;
  endTime?: string;
  value: Record<string, unknown>;
  dataType: HealthDataType;
}

export interface WorkoutWriteBack {
  name: string;
  activityType: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  distanceMeters?: number;
  caloriesBurned?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  routePoints?: { lat: number; lng: number; altitude?: number; timestamp: string }[];
}

export interface HealthBridgeResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
}

export interface HealthPermissionStatus {
  granted: string[];
  denied: string[];
  notDetermined: string[];
}

export interface IHealthBridge {
  isAvailable(): Promise<boolean>;
  requestPermissions(dataTypes: HealthDataType[], write?: boolean): Promise<HealthBridgeResult<HealthPermissionStatus>>;
  checkPermissions(): Promise<HealthBridgeResult<HealthPermissionStatus>>;
  readSteps(startDate: string, endDate: string): Promise<HealthBridgeResult<HealthSample[]>>;
  readCalories(startDate: string, endDate: string): Promise<HealthBridgeResult<HealthSample[]>>;
  readWorkouts(startDate: string, endDate: string): Promise<HealthBridgeResult<HealthSample[]>>;
  readHeartRate(startDate: string, endDate: string): Promise<HealthBridgeResult<HealthSample[]>>;
  readSleep(startDate: string, endDate: string): Promise<HealthBridgeResult<HealthSample[]>>;
  readHRVStress(startDate: string, endDate: string): Promise<HealthBridgeResult<HealthSample[]>>;
  readWeight(startDate: string, endDate: string): Promise<HealthBridgeResult<HealthSample[]>>;
  readNutrition(startDate: string, endDate: string): Promise<HealthBridgeResult<HealthSample[]>>;
  writeWorkout(data: WorkoutWriteBack): Promise<HealthBridgeResult<{ sourceId: string }>>;
  writeCalories(value: number, startTime: string, endTime: string): Promise<HealthBridgeResult<{ sourceId: string }>>;
  writeNutrition(data: Record<string, unknown>, startTime: string): Promise<HealthBridgeResult<{ sourceId: string }>>;
}

// Map our data types to plugin's HealthDataType strings
type PluginDataType = "steps" | "calories" | "heartRate" | "weight" | "sleep" | "heartRateVariability";

const READ_TYPE_MAP: Partial<Record<HealthDataType, PluginDataType>> = {
  steps: "steps",
  calories: "calories",
  heart_rate: "heartRate",
  weight: "weight",
  sleep: "sleep",
  hrv_stress: "heartRateVariability",
};

// --- Web/PWA fallback ---
class WebHealthBridge implements IHealthBridge {
  async isAvailable() { return false; }
  async requestPermissions() { return { success: false, error: "Requires mobile app" } as HealthBridgeResult<HealthPermissionStatus>; }
  async checkPermissions() { return { success: false, error: "Requires mobile app" } as HealthBridgeResult<HealthPermissionStatus>; }
  async readSteps() { return { success: false, error: "Requires mobile app" } as HealthBridgeResult<HealthSample[]>; }
  async readCalories() { return { success: false, error: "Requires mobile app" } as HealthBridgeResult<HealthSample[]>; }
  async readWorkouts() { return { success: false, error: "Requires mobile app" } as HealthBridgeResult<HealthSample[]>; }
  async readHeartRate() { return { success: false, error: "Requires mobile app" } as HealthBridgeResult<HealthSample[]>; }
  async readSleep() { return { success: false, error: "Requires mobile app" } as HealthBridgeResult<HealthSample[]>; }
  async readHRVStress() { return { success: false, error: "Requires mobile app" } as HealthBridgeResult<HealthSample[]>; }
  async readWeight() { return { success: false, error: "Requires mobile app" } as HealthBridgeResult<HealthSample[]>; }
  async readNutrition() { return { success: false, error: "Requires mobile app" } as HealthBridgeResult<HealthSample[]>; }
  async writeWorkout() { return { success: false, error: "Requires mobile app" } as HealthBridgeResult<{ sourceId: string }>; }
  async writeCalories() { return { success: false, error: "Requires mobile app" } as HealthBridgeResult<{ sourceId: string }>; }
  async writeNutrition() { return { success: false, error: "Requires mobile app" } as HealthBridgeResult<{ sourceId: string }>; }
}

// --- Native bridge using @capgo/capacitor-health ---
class CapgoHealthBridge implements IHealthBridge {
  private plugin: HealthPlugin | null = null;

  private async getPlugin(): Promise<HealthPlugin | null> {
    if (this.plugin) return this.plugin;
    try {
      const { Health } = await import("@capgo/capacitor-health");
      this.plugin = Health;
      return this.plugin;
    } catch {
      return null;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const p = await this.getPlugin();
      if (!p) return false;
      const r = await p.isAvailable();
      return r.available === true;
    } catch { return false; }
  }

  async requestPermissions(dataTypes: HealthDataType[], write = false): Promise<HealthBridgeResult<HealthPermissionStatus>> {
    try {
      const p = await this.getPlugin();
      if (!p) return { success: false, error: "Plugin not available" };

      const readTypes = dataTypes
        .map(dt => READ_TYPE_MAP[dt])
        .filter((t): t is PluginDataType => !!t);

      const writeTypes = write
        ? (["calories", "weight", "steps"] as PluginDataType[]).filter(wt => readTypes.includes(wt))
        : [];

      const result = await p.requestAuthorization({ read: readTypes, write: writeTypes });

      return {
        success: true,
        data: {
          granted: [...result.readAuthorized, ...result.writeAuthorized],
          denied: [...result.readDenied, ...result.writeDenied],
          notDetermined: [],
        },
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async checkPermissions(): Promise<HealthBridgeResult<HealthPermissionStatus>> {
    try {
      const p = await this.getPlugin();
      if (!p) return { success: false, error: "Plugin not available" };
      const allTypes: PluginDataType[] = ["steps", "calories", "heartRate", "weight", "sleep", "heartRateVariability"];
      const result = await p.checkAuthorization({ read: allTypes });
      return {
        success: true,
        data: {
          granted: [...result.readAuthorized, ...result.writeAuthorized],
          denied: [...result.readDenied, ...result.writeDenied],
          notDetermined: [],
        },
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  // --- Read methods ---

  async readSteps(startDate: string, endDate: string) {
    return this._readSamples("steps", "steps", startDate, endDate);
  }

  async readCalories(startDate: string, endDate: string) {
    return this._readSamples("calories", "calories", startDate, endDate);
  }

  async readWorkouts(startDate: string, endDate: string): Promise<HealthBridgeResult<HealthSample[]>> {
    try {
      const p = await this.getPlugin();
      if (!p) return { success: false, error: "Plugin not available" };

      const result = await p.queryWorkouts({ startDate, endDate, limit: 500 });
      const samples: HealthSample[] = result.workouts.map((w: Workout) => ({
        sourceId: w.sourceId || undefined,
        startTime: w.startDate,
        endTime: w.endDate,
        value: {
          workoutType: w.workoutType,
          duration: w.duration,
          totalEnergyBurned: w.totalEnergyBurned,
          totalDistance: w.totalDistance,
          sourceName: w.sourceName,
        },
        dataType: "workouts" as HealthDataType,
      }));
      return { success: true, data: samples };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async readHeartRate(startDate: string, endDate: string) {
    return this._readSamples("heartRate", "heart_rate", startDate, endDate);
  }

  async readSleep(startDate: string, endDate: string) {
    return this._readSamples("sleep", "sleep", startDate, endDate);
  }

  async readHRVStress(startDate: string, endDate: string) {
    return this._readSamples("heartRateVariability", "hrv_stress", startDate, endDate);
  }

  async readWeight(startDate: string, endDate: string) {
    return this._readSamples("weight", "weight", startDate, endDate);
  }

  async readNutrition(): Promise<HealthBridgeResult<HealthSample[]>> {
    // @capgo/capacitor-health doesn't have a nutrition data type yet
    return { success: false, error: "Nutrition read not supported by plugin" };
  }

  // --- Write methods ---

  async writeWorkout(data: WorkoutWriteBack): Promise<HealthBridgeResult<{ sourceId: string }>> {
    try {
      const p = await this.getPlugin();
      if (!p) return { success: false, error: "Plugin not available" };

      // Write calories burned as a sample covering the workout period
      if (data.caloriesBurned) {
        await p.saveSample({
          dataType: "calories",
          value: data.caloriesBurned,
          unit: "kilocalorie",
          startDate: data.startTime,
          endDate: data.endTime,
        });
      }

      return { success: true, data: { sourceId: `capgo_workout_${Date.now()}` } };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async writeCalories(value: number, startTime: string, endTime: string): Promise<HealthBridgeResult<{ sourceId: string }>> {
    try {
      const p = await this.getPlugin();
      if (!p) return { success: false, error: "Plugin not available" };

      await p.saveSample({
        dataType: "calories",
        value,
        unit: "kilocalorie",
        startDate: startTime,
        endDate: endTime,
      });

      return { success: true, data: { sourceId: `capgo_cal_${Date.now()}` } };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async writeNutrition(): Promise<HealthBridgeResult<{ sourceId: string }>> {
    return { success: false, error: "Nutrition write not supported by plugin" };
  }

  // --- Internal helper ---

  private async _readSamples(
    pluginType: PluginDataType,
    ourType: HealthDataType,
    startDate: string,
    endDate: string,
  ): Promise<HealthBridgeResult<HealthSample[]>> {
    try {
      const p = await this.getPlugin();
      if (!p) return { success: false, error: "Plugin not available" };

      const result = await p.readSamples({
        dataType: pluginType,
        startDate,
        endDate,
        limit: 1000,
        ascending: true,
      });

      const samples: HealthSample[] = result.samples.map(s => ({
        sourceId: s.sourceId || undefined,
        startTime: s.startDate,
        endTime: s.endDate,
        value: {
          value: s.value,
          unit: s.unit,
          ...(s.sleepState ? { sleepState: s.sleepState } : {}),
        },
        dataType: ourType,
      }));

      return { success: true, data: samples };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}

// --- Factory ---

export function getHealthBridge(provider: "healthkit" | "healthconnect"): IHealthBridge {
  const isNative = typeof window !== "undefined" && !!(window as any).Capacitor?.isNativePlatform?.();
  if (!isNative) return new WebHealthBridge();
  // Unified plugin handles both platforms
  return new CapgoHealthBridge();
}
