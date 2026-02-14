import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders as makeCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import { sendSmtpEmail } from "../_shared/email/smtp.ts";
import { templates } from "../_shared/email/templates.ts";

interface EmailRequest {
  to: string;
  template: string;
  data: Record<string, any>;
  subject?: string;
  contextType?: string;
  contextId?: string;
  actorUserId?: string;
  skipLog?: boolean;
  isRetry?: boolean;
  emailLogId?: string;
}

interface EmailResponse {
  success: boolean;
  emailLogId?: string;
  error?: string;
  errorCode?: string;
}

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 15000];

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Replace merge tags like {{user.first_name}} with values from data.
 * Supports both dot-notation keys and flat keys.
 */
function renderMergeTags(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_match, key: string) => {
    const trimmed = key.trim();
    // Try direct key first (e.g., data["user.first_name"])
    if (data[trimmed] !== undefined) return String(data[trimmed]);
    // Try dot-notation (e.g., data.user?.first_name)
    const parts = trimmed.split(".");
    let val: any = data;
    for (const p of parts) {
      if (val == null) break;
      val = val[p];
    }
    return val !== undefined && val !== null ? String(val) : `{{${trimmed}}}`;
  });
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return handleCorsPreFlight(req);
  }

  const corsHeaders = makeCorsHeaders(req);
  const supabase = getServiceClient();

  // Health check endpoint
  const url = new URL(req.url);
  if (url.pathname.endsWith("/health")) {
    // Check if SMTP is configured
    const { data: config } = await supabase
      .from("smtp_config")
      .select("enabled, host, from_email")
      .limit(1)
      .maybeSingle();

    return new Response(
      JSON.stringify({
        status: "ok",
        smtpConfigured: !!(config?.host),
        smtpEnabled: !!(config?.enabled),
        fromEmailConfigured: !!(config?.from_email),
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const {
      to,
      template,
      data,
      subject,
      contextType,
      contextId,
      actorUserId,
      skipLog,
      isRetry,
      emailLogId,
    }: EmailRequest = await req.json();

    const toEmail = (to || "").trim().toLowerCase();
    const templateKey = template;

    if (!toEmail || !templateKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: to, template", errorCode: "VALIDATION_ERROR" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Try to resolve template from database first (published version)
    let emailSubject: string;
    let emailHtml: string;
    let templateVersionId: string | null = null;

    const { data: dbVersion } = await supabase
      .from("email_template_versions")
      .select("id, subject, html_content, version_number")
      .eq("status", "published")
      .eq("template_id",
        // subquery: get template id by key
        (await supabase.from("email_templates").select("id").eq("template_key", templateKey).eq("is_enabled", true).maybeSingle()).data?.id || "00000000-0000-0000-0000-000000000000"
      )
      .maybeSingle();

    const appUrl = data.appUrl || Deno.env.get("APP_URL") || "https://calm-train-flow.lovable.app";
    const enrichedData = { ...data, appUrl, settingsUrl: `${appUrl}/profile` };

    if (dbVersion) {
      // Use database-managed template
      templateVersionId = dbVersion.id;
      emailSubject = subject || renderMergeTags(dbVersion.subject, enrichedData);
      emailHtml = renderMergeTags(dbVersion.html_content, enrichedData);
    } else {
      // Fallback to hardcoded template
      const templateDef = templates[templateKey];
      if (!templateDef) {
        return new Response(
          JSON.stringify({ success: false, error: `Unknown template: ${templateKey}`, errorCode: "TEMPLATE_ERROR" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      emailSubject = subject || templateDef.subject(enrichedData);
      emailHtml = templateDef.html(enrichedData);
    }

    // Create email log entry
    let logId = emailLogId;
    if (!skipLog && !logId) {
      const { data: logEntry, error: logError } = await supabase
        .from("email_logs")
        .insert({
          to_email: toEmail,
          template_key: templateKey,
          subject: emailSubject,
          context_type: contextType || null,
          context_id: contextId || null,
          actor_user_id: actorUserId || null,
          status: "pending",
          metadata: { data: enrichedData, template_version_id: templateVersionId },
        })
        .select("id")
        .single();

      if (logError) {
        console.error("Failed to create email log:", logError);
      } else {
        logId = logEntry.id;
      }
    }

    // Attempt to send with retries
    let lastError: string = "";
    let attempt = isRetry ? 2 : 1;

    while (attempt <= MAX_RETRIES) {
      console.log(`Sending email to ${toEmail}, template: ${templateKey}, attempt: ${attempt}`);

      const result = await sendSmtpEmail({
        to: toEmail,
        subject: emailSubject,
        html: emailHtml,
      });

      if (result.success) {
        if (logId) {
          await supabase
            .from("email_logs")
            .update({
              status: "sent",
              attempt_count: attempt,
              last_attempt_at: new Date().toISOString(),
            })
            .eq("id", logId);
        }

        return new Response(
          JSON.stringify({ success: true, emailLogId: logId } as EmailResponse),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      lastError = result.error || "Unknown send error";
      console.error(`Email send attempt ${attempt} failed: ${lastError}`);

      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAYS[attempt - 1]);
      }
      attempt++;
    }

    // All retries failed
    if (logId) {
      await supabase
        .from("email_logs")
        .update({
          status: "failed",
          error_code: "SMTP_ERROR",
          error_message: lastError,
          attempt_count: attempt - 1,
          last_attempt_at: new Date().toISOString(),
        })
        .eq("id", logId);
    }

    return new Response(
      JSON.stringify({ success: false, emailLogId: logId, error: lastError, errorCode: "SEND_ERROR" } as EmailResponse),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-email function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message, errorCode: "INTERNAL_ERROR" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
