import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { corsHeaders as makeCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";

// Email templates
const templates: Record<string, { subject: (data: any) => string; html: (data: any) => string }> = {
  gym_invite: {
    subject: (data) => `You're invited to join ${data.gymName}!`,
    html: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
        <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">You're Invited!</h1>
          </div>
          <div style="padding: 32px;">
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
              ${data.recipientName ? `Hi ${data.recipientName},` : "Hi there,"}
            </p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
              You've been invited to join <strong>${data.gymName}</strong>${data.membershipLevel ? ` with a <strong>${data.membershipLevel}</strong> membership` : ""}.
            </p>
            <a href="${data.actionUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Accept Invitation
            </a>
            <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
              This invitation expires in 7 days. If you didn't expect this email, you can safely ignore it.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              <a href="${data.settingsUrl}" style="color: #9ca3af;">Manage notification settings</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  },
  coach_invite: {
    subject: (data) => `${data.coachName} invited you to start coaching!`,
    html: (data) => `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
        <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Coaching Invitation</h1>
          </div>
          <div style="padding: 32px;">
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
              ${data.recipientName ? `Hi ${data.recipientName},` : "Hi there,"}
            </p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
              <strong>${data.coachName}</strong> has invited you to work with them as a coaching client${data.serviceName ? ` for <strong>${data.serviceName}</strong>` : ""}.
            </p>
            ${data.message ? `<p style="color: #6b7280; font-size: 14px; background: #f9fafb; padding: 16px; border-radius: 8px; margin: 0 0 24px;">"${data.message}"</p>` : ""}
            <a href="${data.actionUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              View Invitation
            </a>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              <a href="${data.settingsUrl}" style="color: #9ca3af;">Manage notification settings</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  },
  event_invite: {
    subject: (data) => `You're invited to ${data.eventName}!`,
    html: (data) => `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
        <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 32px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Event Invitation</h1>
          </div>
          <div style="padding: 32px;">
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
              ${data.recipientName ? `Hi ${data.recipientName},` : "Hi there,"}
            </p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
              You've been invited to participate in <strong>${data.eventName}</strong>${data.teamName ? ` as part of team <strong>${data.teamName}</strong>` : ""}.
            </p>
            <a href="${data.actionUrl}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              View Invitation
            </a>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              <a href="${data.settingsUrl}" style="color: #9ca3af;">Manage notification settings</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  },
  notification_coach: {
    subject: (data) => data.subject || "Coach Update",
    html: (data) => generateNotificationEmail(data, "#10b981", "#059669"),
  },
  notification_event: {
    subject: (data) => data.subject || "Event Update",
    html: (data) => generateNotificationEmail(data, "#f59e0b", "#d97706"),
  },
  notification_gym: {
    subject: (data) => data.subject || "Gym Update",
    html: (data) => generateNotificationEmail(data, "#6366f1", "#8b5cf6"),
  },
  notification_workout: {
    subject: (data) => data.subject || "Workout Update",
    html: (data) => generateNotificationEmail(data, "#ef4444", "#dc2626"),
  },
  notification_system: {
    subject: (data) => data.subject || "System Notification",
    html: (data) => generateNotificationEmail(data, "#71717a", "#52525b"),
  },
  notification_message: {
    subject: (data) => data.subject || "New Message",
    html: (data) => generateNotificationEmail(data, "#3b82f6", "#2563eb"),
  },
  test_email: {
    subject: (data) => data.subject || "Test Email from Flow Fitness",
    html: (data) => `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
        <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 32px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">✓ Email Test Successful</h1>
          </div>
          <div style="padding: 32px;">
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
              This is a test email from Flow Fitness admin diagnostics.
            </p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
              ${data.body || "If you're seeing this, email delivery is working correctly!"}
            </p>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <p style="color: #166534; font-size: 14px; margin: 0;"><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
            </div>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              Sent from Flow Fitness Admin Portal
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  },
};

function generateNotificationEmail(data: any, color1: string, color2: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
      <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, ${color1} 0%, ${color2} 100%); padding: 24px 32px;">
          <h1 style="color: white; margin: 0; font-size: 20px;">${data.title || data.subject || "Notification"}</h1>
        </div>
        <div style="padding: 32px;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
            ${data.body}
          </p>
          ${data.actionUrl ? `
          <a href="${data.actionUrl}" style="display: inline-block; background: linear-gradient(135deg, ${color1} 0%, ${color2} 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
            View Details
          </a>
          ` : ""}
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            <a href="${data.settingsUrl || data.appUrl + '/profile'}" style="color: #9ca3af;">Manage notification settings</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

interface EmailRequest {
  to: string;
  template: string;
  data: Record<string, any>;
  subject?: string; // Override template subject
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
  resendMessageId?: string;
  error?: string;
  errorCode?: string;
}

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 15000]; // 1s, 5s, 15s

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return handleCorsPreFlight(req);
  }

  const corsHeaders = makeCorsHeaders(req);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Health check endpoint
  const url = new URL(req.url);
  if (url.pathname.endsWith("/health")) {
    return new Response(
      JSON.stringify({
        status: "ok",
        resendConfigured: !!resendApiKey,
        fromEmailConfigured: true,
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

    // Resend appears to enforce test-mode recipient matching strictly; normalize.
    const toEmail = (to || "").trim().toLowerCase();
    const templateKey = template;

    // Validate required fields
    if (!toEmail || !templateKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: to, template",
          errorCode: "VALIDATION_ERROR",
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if Resend is configured
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Email service not configured. RESEND_API_KEY is missing.",
          errorCode: "CONFIG_ERROR",
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get template
    const templateDef = templates[templateKey];
    if (!templateDef) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Unknown template: ${templateKey}`,
          errorCode: "TEMPLATE_ERROR",
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get app URL for links
    const appUrl = data.appUrl || Deno.env.get("APP_URL") || "https://calm-train-flow.lovable.app";
    const enrichedData = {
      ...data,
      appUrl,
      settingsUrl: `${appUrl}/profile`,
    };

    const emailSubject = subject || templateDef.subject(enrichedData);
    const emailHtml = templateDef.html(enrichedData);

    // Create email log entry if not a retry
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

    // Initialize Resend
    const resend = new Resend(resendApiKey);

    // Attempt to send with retries
    let lastError: any = null;
    let attempt = isRetry ? 2 : 1; // Start at attempt 2 if this is already a retry

    while (attempt <= MAX_RETRIES) {
      try {
        console.log(`Sending email to ${toEmail}, template: ${templateKey}, attempt: ${attempt}`);

        const emailResponse = await resend.emails.send({
          from: "Flow Fitness <onboarding@resend.dev>",
          to: [toEmail],
          subject: emailSubject,
          html: emailHtml,
        });

        console.log("Resend response:", JSON.stringify(emailResponse));

        // Check if response has an ID (success)
        if (emailResponse.data?.id) {
          // Update log with success
          if (logId) {
            await supabase
              .from("email_logs")
              .update({
                status: "sent",
                resend_message_id: emailResponse.data.id,
                attempt_count: attempt,
                last_attempt_at: new Date().toISOString(),
              })
              .eq("id", logId);
          }

          return new Response(
            JSON.stringify({
              success: true,
              emailLogId: logId,
              resendMessageId: emailResponse.data.id,
            } as EmailResponse),
            { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        // If there's an error in the response
        if (emailResponse.error) {
          const errAny = emailResponse.error as any;
          const e: any = new Error(errAny.message || "Unknown Resend error");
          e.statusCode = errAny.statusCode;
          e.name = errAny.name || e.name;
          throw e;
        }

        // Unexpected response format
        throw new Error("Unexpected response from Resend");
      } catch (err: any) {
        lastError = err;
        console.error(`Email send attempt ${attempt} failed:`, err.message);

        // Check if it's a 4xx error (don't retry)
        if (err.statusCode && err.statusCode >= 400 && err.statusCode < 500) {
          break;
        }

        // Retry on 5xx or network errors
        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAYS[attempt - 1]);
        }
        attempt++;
      }
    }

    // All retries failed
    const errorMessage = lastError?.message || "Failed to send email";
    const errorCode = lastError?.statusCode?.toString() || lastError?.name || "SEND_ERROR";

    if (logId) {
      await supabase
        .from("email_logs")
        .update({
          status: "failed",
          error_code: errorCode,
          error_message: errorMessage,
          attempt_count: attempt - 1,
          last_attempt_at: new Date().toISOString(),
        })
        .eq("id", logId);
    }

    // IMPORTANT: return 200 so clients using `functions.invoke` can reliably read the JSON body.
    return new Response(
      JSON.stringify({
        success: false,
        emailLogId: logId,
        error: errorMessage,
        errorCode,
      } as EmailResponse),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-email function:", error);

    // IMPORTANT: return 200 so clients using `functions.invoke` can reliably read the JSON body.
    return new Response(
      JSON.stringify({ success: false, error: error.message, errorCode: "INTERNAL_ERROR" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);