import { supabase } from "@/integrations/supabase/client";

export interface SendEmailParams {
  to: string;
  template: string;
  data: Record<string, any>;
  subject?: string;
  contextType?: string;
  contextId?: string;
}

export interface EmailResult {
  success: boolean;
  emailLogId?: string;
  resendMessageId?: string;
  error?: string;
  errorCode?: string;
}

export interface EmailHealthCheck {
  status: string;
  resendConfigured: boolean;
  fromEmailConfigured: boolean;
  timestamp: string;
}

/**
 * Send an email using the centralized email service
 */
export async function sendEmail(params: SendEmailParams): Promise<EmailResult> {
  try {
    const { data, error } = await supabase.functions.invoke("send-email", {
      body: {
        to: params.to,
        template: params.template,
        data: params.data,
        subject: params.subject,
        contextType: params.contextType,
        contextId: params.contextId,
      },
    });

    if (error) {
      console.error("Email service error:", error);
      return {
        success: false,
        error: error.message || "Failed to send email",
        errorCode: "SERVICE_ERROR",
      };
    }

    return data as EmailResult;
  } catch (err: any) {
    console.error("Email service exception:", err);
    return {
      success: false,
      error: err.message || "Unexpected error",
      errorCode: "EXCEPTION",
    };
  }
}

/**
 * Check email service health
 */
export async function checkEmailHealth(): Promise<EmailHealthCheck | null> {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email/health`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (err) {
    console.error("Health check failed:", err);
    return null;
  }
}

/**
 * Send a test email (admin only)
 */
export async function sendTestEmail(to: string, subject?: string, body?: string): Promise<EmailResult> {
  return sendEmail({
    to,
    template: "test_email",
    data: {
      subject: subject || "Test Email from Flow Fitness",
      body: body || "If you're seeing this, email delivery is working correctly!",
    },
  });
}

/**
 * Retry a failed email
 */
export async function retryEmail(emailLogId: string): Promise<EmailResult> {
  try {
    // Get the original email log
    const { data: log, error: fetchError } = await supabase
      .from("email_logs")
      .select("*")
      .eq("id", emailLogId)
      .single();

    if (fetchError || !log) {
      return {
        success: false,
        error: "Email log not found",
        errorCode: "NOT_FOUND",
      };
    }

    // Extract metadata
    const metadata = log.metadata as { data?: Record<string, any> } | null;
    const originalData = metadata?.data || {};

    // Resend using the email service
    const { data, error } = await supabase.functions.invoke("send-email", {
      body: {
        to: log.to_email,
        template: log.template_key,
        data: originalData,
        subject: log.subject,
        contextType: log.context_type,
        contextId: log.context_id,
        isRetry: true,
        emailLogId: log.id,
      },
    });

    if (error) {
      return {
        success: false,
        error: error.message,
        errorCode: "RETRY_ERROR",
      };
    }

    return data as EmailResult;
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
      errorCode: "EXCEPTION",
    };
  }
}

// Template types for type safety
export type EmailTemplate =
  | "gym_invite"
  | "coach_invite"
  | "event_invite"
  | "notification_coach"
  | "notification_event"
  | "notification_gym"
  | "notification_workout"
  | "notification_system"
  | "notification_message"
  | "test_email";

// Template data interfaces
export interface GymInviteData {
  recipientName?: string;
  gymName: string;
  membershipLevel?: string;
  actionUrl: string;
}

export interface CoachInviteData {
  recipientName?: string;
  coachName: string;
  serviceName?: string;
  message?: string;
  actionUrl: string;
}

export interface EventInviteData {
  recipientName?: string;
  eventName: string;
  teamName?: string;
  actionUrl: string;
}

export interface NotificationEmailData {
  title?: string;
  subject: string;
  body: string;
  actionUrl?: string;
}