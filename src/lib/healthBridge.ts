/**
 * Capacitor-ready bridge interfaces for native health platform integrations.
 * These define the contract that native Capacitor plugins must implement.
 * In web/PWA mode, these return unavailable status gracefully.
 */

export type HealthDataType = 
  | "steps" | "calories" | "workouts" | "heart_rate" 
  | "sleep" | "hrv_stress" | "weight" | "nutrition";

export interface HealthSample {
  sourceId?: string;
  startTime: string; // ISO
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

/**
 * Abstract health bridge interface — implemented per platform
 */
export interface IHealthBridge {
  isAvailable(): Promise<boolean>;
  requestPermissions(dataTypes: HealthDataType[], write?: boolean): Promise<HealthBridgeResult<HealthPermissionStatus>>;
  checkPermissions(): Promise<HealthBridgeResult<HealthPermissionStatus>>;
  
  // Read operations
  readSteps(startDate: string, endDate: string): Promise<HealthBridgeResult<HealthSample[]>>;
  readCalories(startDate: string, endDate: string): Promise<HealthBridgeResult<HealthSample[]>>;
  readWorkouts(startDate: string, endDate: string): Promise<HealthBridgeResult<HealthSample[]>>;
  readHeartRate(startDate: string, endDate: string): Promise<HealthBridgeResult<HealthSample[]>>;
  readSleep(startDate: string, endDate: string): Promise<HealthBridgeResult<HealthSample[]>>;
  readHRVStress(startDate: string, endDate: string): Promise<HealthBridgeResult<HealthSample[]>>;
  readWeight(startDate: string, endDate: string): Promise<HealthBridgeResult<HealthSample[]>>;
  readNutrition(startDate: string, endDate: string): Promise<HealthBridgeResult<HealthSample[]>>;

  // Write operations (idempotent)
  writeWorkout(data: WorkoutWriteBack): Promise<HealthBridgeResult<{ sourceId: string }>>;
  writeCalories(value: number, startTime: string, endTime: string): Promise<HealthBridgeResult<{ sourceId: string }>>;
  writeNutrition(data: Record<string, unknown>, startTime: string): Promise<HealthBridgeResult<{ sourceId: string }>>;
}

/**
 * Web/PWA fallback — always returns unavailable
 */
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

/**
 * HealthKit bridge stub — to be wired to @nicoacosta/capacitor-healthkit or similar
 */
class HealthKitBridge implements IHealthBridge {
  async isAvailable(): Promise<boolean> {
    try {
      // In native iOS, check if HealthKit plugin is registered
      const Capacitor = (window as any).Capacitor;
      if (!Capacitor?.isPluginAvailable?.("HealthKit")) return false;
      return true;
    } catch { return false; }
  }

  async requestPermissions(dataTypes: HealthDataType[], write = false): Promise<HealthBridgeResult<HealthPermissionStatus>> {
    try {
      const plugin = (window as any).Capacitor?.Plugins?.HealthKit;
      if (!plugin) return { success: false, error: "HealthKit plugin not available" };
      
      const result = await plugin.requestAuthorization({
        readTypes: dataTypes,
        writeTypes: write ? dataTypes.filter(d => ["calories", "workouts", "nutrition"].includes(d)) : [],
      });
      return { success: true, data: result };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async checkPermissions(): Promise<HealthBridgeResult<HealthPermissionStatus>> {
    return { success: true, data: { granted: [], denied: [], notDetermined: [] } };
  }

  // Read stubs — in production, these call the native plugin
  async readSteps(startDate: string, endDate: string) { return this._readGeneric("steps", startDate, endDate); }
  async readCalories(startDate: string, endDate: string) { return this._readGeneric("calories", startDate, endDate); }
  async readWorkouts(startDate: string, endDate: string) { return this._readGeneric("workouts", startDate, endDate); }
  async readHeartRate(startDate: string, endDate: string) { return this._readGeneric("heart_rate", startDate, endDate); }
  async readSleep(startDate: string, endDate: string) { return this._readGeneric("sleep", startDate, endDate); }
  async readHRVStress(startDate: string, endDate: string) { return this._readGeneric("hrv_stress", startDate, endDate); }
  async readWeight(startDate: string, endDate: string) { return this._readGeneric("weight", startDate, endDate); }
  async readNutrition(startDate: string, endDate: string) { return this._readGeneric("nutrition", startDate, endDate); }

  async writeWorkout(data: WorkoutWriteBack) {
    try {
      const plugin = (window as any).Capacitor?.Plugins?.HealthKit;
      if (!plugin) return { success: false, error: "Plugin not available" } as HealthBridgeResult<{ sourceId: string }>;
      const result = await plugin.saveWorkout(data);
      return { success: true, data: { sourceId: result.sourceId || "hk_" + Date.now() } };
    } catch (e: any) {
      return { success: false, error: e.message } as HealthBridgeResult<{ sourceId: string }>;
    }
  }

  async writeCalories() { return { success: false, error: "Not yet implemented" } as HealthBridgeResult<{ sourceId: string }>; }
  async writeNutrition() { return { success: false, error: "Not yet implemented" } as HealthBridgeResult<{ sourceId: string }>; }

  private async _readGeneric(type: string, startDate: string, endDate: string): Promise<HealthBridgeResult<HealthSample[]>> {
    try {
      const plugin = (window as any).Capacitor?.Plugins?.HealthKit;
      if (!plugin) return { success: false, error: "Plugin not available" };
      const result = await plugin.queryData({ type, startDate, endDate });
      return { success: true, data: result.samples || [] };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}

/**
 * Health Connect bridge stub — to be wired to capacitor-health-connect
 */
class HealthConnectBridge implements IHealthBridge {
  async isAvailable(): Promise<boolean> {
    try {
      const Capacitor = (window as any).Capacitor;
      if (!Capacitor?.isPluginAvailable?.("HealthConnect")) return false;
      return true;
    } catch { return false; }
  }

  async requestPermissions(dataTypes: HealthDataType[], write = false): Promise<HealthBridgeResult<HealthPermissionStatus>> {
    try {
      const plugin = (window as any).Capacitor?.Plugins?.HealthConnect;
      if (!plugin) return { success: false, error: "Health Connect plugin not available" };
      const result = await plugin.requestPermissions({
        readTypes: dataTypes,
        writeTypes: write ? dataTypes.filter(d => ["calories", "workouts", "nutrition"].includes(d)) : [],
      });
      return { success: true, data: result };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async checkPermissions() { return { success: true, data: { granted: [], denied: [], notDetermined: [] } } as HealthBridgeResult<HealthPermissionStatus>; }

  async readSteps(s: string, e: string) { return this._read("steps", s, e); }
  async readCalories(s: string, e: string) { return this._read("calories", s, e); }
  async readWorkouts(s: string, e: string) { return this._read("workouts", s, e); }
  async readHeartRate(s: string, e: string) { return this._read("heart_rate", s, e); }
  async readSleep(s: string, e: string) { return this._read("sleep", s, e); }
  async readHRVStress(s: string, e: string) { return this._read("hrv_stress", s, e); }
  async readWeight(s: string, e: string) { return this._read("weight", s, e); }
  async readNutrition(s: string, e: string) { return this._read("nutrition", s, e); }

  async writeWorkout(data: WorkoutWriteBack) {
    try {
      const plugin = (window as any).Capacitor?.Plugins?.HealthConnect;
      if (!plugin) return { success: false, error: "Plugin not available" } as HealthBridgeResult<{ sourceId: string }>;
      const result = await plugin.insertExerciseSession(data);
      return { success: true, data: { sourceId: result.recordId || "hc_" + Date.now() } };
    } catch (e: any) {
      return { success: false, error: e.message } as HealthBridgeResult<{ sourceId: string }>;
    }
  }

  async writeCalories() { return { success: false, error: "Not yet implemented" } as HealthBridgeResult<{ sourceId: string }>; }
  async writeNutrition() { return { success: false, error: "Not yet implemented" } as HealthBridgeResult<{ sourceId: string }>; }

  private async _read(type: string, startDate: string, endDate: string): Promise<HealthBridgeResult<HealthSample[]>> {
    try {
      const plugin = (window as any).Capacitor?.Plugins?.HealthConnect;
      if (!plugin) return { success: false, error: "Plugin not available" };
      const result = await plugin.readRecords({ type, startDate, endDate });
      return { success: true, data: result.records || [] };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}

/**
 * Get the appropriate bridge for a provider
 */
export function getHealthBridge(provider: "healthkit" | "healthconnect"): IHealthBridge {
  const isNative = !!(window as any).Capacitor;
  if (!isNative) return new WebHealthBridge();
  
  if (provider === "healthkit") return new HealthKitBridge();
  if (provider === "healthconnect") return new HealthConnectBridge();
  return new WebHealthBridge();
}
