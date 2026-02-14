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

    const templateDef = templates[templateKey];
    if (!templateDef) {
      return new Response(
        JSON.stringify({ success: false, error: `Unknown template: ${templateKey}`, errorCode: "TEMPLATE_ERROR" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const appUrl = data.appUrl || Deno.env.get("APP_URL") || "https://calm-train-flow.lovable.app";
    const enrichedData = { ...data, appUrl, settingsUrl: `${appUrl}/profile` };

    const emailSubject = subject || templateDef.subject(enrichedData);
    const emailHtml = templateDef.html(enrichedData);

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
          metadata: { data: enrichedData },
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
