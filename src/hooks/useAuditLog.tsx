import { supabase } from "@/integrations/supabase/client";

export type AuditCategory = 
  | "admin" 
  | "system" 
  | "security" 
  | "notification" 
  | "billing" 
  | "event" 
  | "import" 
  | "moderation";

export type AuditSeverity = "info" | "warn" | "error";

interface LogAuditEventParams {
  action: string;
  message: string;
  category?: AuditCategory;
  severity?: AuditSeverity;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export async function logAuditEvent({
  action,
  message,
  category = "admin",
  severity = "info",
  entityType,
  entityId,
  metadata = {},
}: LogAuditEventParams): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc("log_audit_event", {
      _action: action,
      _message: message,
      _category: category,
      _severity: severity,
      _entity_type: entityType || null,
      _entity_id: entityId || null,
      _metadata: metadata as unknown as Record<string, never>,
    });

    if (error) {
      console.error("Error logging audit event:", error);
      return null;
    }

    return data as string;
  } catch (error) {
    console.error("Error logging audit event:", error);
    return null;
  }
}

export function useAuditLog() {
  return { logAuditEvent };
}
