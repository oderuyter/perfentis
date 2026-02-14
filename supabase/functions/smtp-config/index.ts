import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { requireAdmin } from "../_shared/roles.ts";
import { json, badRequest, forbidden, serverError, tooManyRequests } from "../_shared/http.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import { encryptPassword } from "../_shared/email/crypto.ts";
import { sendSmtpEmail, testSmtpConnection } from "../_shared/email/smtp.ts";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return handleCorsPreFlight(req);
  }

  const cors = corsHeaders(req);

  try {
    const user = await requireUser(req);
    await requireAdmin(user.id);

    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();

    // GET /smtp-config → return current config (masked password)
    if (req.method === "GET" && (!path || path === "smtp-config")) {
      const supabase = getServiceClient();
      const { data, error } = await supabase
        .from("smtp_config")
        .select("id, host, port, secure, username, from_name, from_email, reply_to, enabled, updated_at, updated_by")
        .limit(1)
        .maybeSingle();

      if (error) {
        return serverError("Failed to load SMTP config", cors);
      }

      return json({ config: data || null }, 200, cors);
    }

    // PUT /smtp-config → update config
    if (req.method === "PUT") {
      const body = await req.json();
      const { host, port, secure, username, password, from_name, from_email, reply_to, enabled } = body;

      // Validate
      if (enabled && !host) return badRequest("Host is required when SMTP is enabled", cors);
      if (port !== undefined && (port < 1 || port > 65535)) return badRequest("Port must be 1-65535", cors);
      if (from_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from_email)) return badRequest("Invalid from_email", cors);
      if (enabled && !username) return badRequest("Username is required when SMTP is enabled", cors);

      const supabase = getServiceClient();

      const updateData: Record<string, unknown> = {
        host: host || "",
        port: port || 587,
        secure: secure ?? false,
        username: username || "",
        from_name: from_name || "Flow Fitness",
        from_email: from_email || "",
        reply_to: reply_to || null,
        enabled: enabled ?? false,
        updated_by: user.id,
      };

      // Only update password if a new one was provided
      if (password && password.length > 0) {
        const { encrypted, iv } = await encryptPassword(password);
        updateData.encrypted_password = encrypted;
        updateData.password_iv = iv;
      }

      // Upsert (singleton pattern)
      const { data: existing } = await supabase
        .from("smtp_config")
        .select("id")
        .limit(1)
        .maybeSingle();

      let error;
      if (existing) {
        ({ error } = await supabase.from("smtp_config").update(updateData).eq("id", existing.id));
      } else {
        ({ error } = await supabase.from("smtp_config").insert(updateData));
      }

      if (error) {
        console.error("Failed to save SMTP config:", error.message);
        return serverError("Failed to save SMTP config", cors);
      }

      // Audit log
      await supabase.from("audit_logs").insert({
        action: "smtp_config_updated",
        message: `SMTP configuration updated by admin`,
        category: "admin",
        severity: "info",
        actor_id: user.id,
        entity_type: "smtp_config",
        metadata: { host, port, from_email, enabled, password_changed: !!password },
      });

      return json({ success: true }, 200, cors);
    }

    // POST /smtp-config → actions (test-email, connection-test)
    if (req.method === "POST") {
      const body = await req.json();
      const { action } = body;

      if (action === "test-email") {
        const { to, subject, message } = body;
        if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
          return badRequest("Valid recipient email required", cors);
        }

        // Rate limit: 5 test emails per 10 minutes
        const rl = await checkRateLimit({
          functionName: "smtp-test-email",
          actorKey: user.id,
          maxPerMinute: 1,
          maxPerDay: 30,
        });
        if (!rl.allowed) {
          return tooManyRequests(rl.retryAfterSeconds, cors);
        }

        const result = await sendSmtpEmail({
          to,
          subject: subject || "Test Email from Flow Fitness",
          html: `
            <!DOCTYPE html><html><head><meta charset="utf-8"></head>
            <body style="font-family: -apple-system, sans-serif; background: #f4f4f5; padding: 20px;">
              <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 32px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 24px;">✓ SMTP Test Successful</h1>
                </div>
                <div style="padding: 32px;">
                  <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                    ${message || "If you're seeing this, SMTP email delivery is working correctly!"}
                  </p>
                  <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-top: 16px;">
                    <p style="color: #166534; font-size: 14px; margin: 0;"><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
                  </div>
                </div>
              </div>
            </body></html>`,
        });

        return json(result, 200, cors);
      }

      if (action === "connection-test") {
        const result = await testSmtpConnection();
        return json(result, 200, cors);
      }

      return badRequest("Unknown action", cors);
    }

    return badRequest("Method not allowed", cors);
  } catch (err: any) {
    if (err.message === "Admin access required") {
      return forbidden("Admin access required", cors);
    }
    if (err.message?.includes("authorization")) {
      return json({ error: err.message }, 401, cors);
    }
    console.error("smtp-config error:", err.message);
    return serverError(err.message, cors);
  }
};

serve(handler);
