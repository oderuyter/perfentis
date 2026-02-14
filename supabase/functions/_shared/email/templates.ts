/**
 * Shared email templates – extracted from the old send-email function.
 * Each template has a subject generator and an HTML generator.
 */

// deno-lint-ignore no-explicit-any
type TemplateData = Record<string, any>;

interface TemplateDef {
  subject: (data: TemplateData) => string;
  html: (data: TemplateData) => string;
}

function generateNotificationEmail(data: TemplateData, color1: string, color2: string): string {
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

export const templates: Record<string, TemplateDef> = {
  gym_invite: {
    subject: (d) => `You're invited to join ${d.gymName}!`,
    html: (d) => `
      <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
        <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">You're Invited!</h1>
          </div>
          <div style="padding: 32px;">
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
              ${d.recipientName ? `Hi ${d.recipientName},` : "Hi there,"}
            </p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
              You've been invited to join <strong>${d.gymName}</strong>${d.membershipLevel ? ` with a <strong>${d.membershipLevel}</strong> membership` : ""}.
            </p>
            <a href="${d.actionUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Accept Invitation
            </a>
            <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
              This invitation expires in 7 days. If you didn't expect this email, you can safely ignore it.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              <a href="${d.settingsUrl}" style="color: #9ca3af;">Manage notification settings</a>
            </p>
          </div>
        </div>
      </body></html>`,
  },
  coach_invite: {
    subject: (d) => `${d.coachName} invited you to start coaching!`,
    html: (d) => `
      <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
        <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Coaching Invitation</h1>
          </div>
          <div style="padding: 32px;">
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
              ${d.recipientName ? `Hi ${d.recipientName},` : "Hi there,"}
            </p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
              <strong>${d.coachName}</strong> has invited you to work with them as a coaching client${d.serviceName ? ` for <strong>${d.serviceName}</strong>` : ""}.
            </p>
            ${d.message ? `<p style="color: #6b7280; font-size: 14px; background: #f9fafb; padding: 16px; border-radius: 8px; margin: 0 0 24px;">"${d.message}"</p>` : ""}
            <a href="${d.actionUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              View Invitation
            </a>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              <a href="${d.settingsUrl}" style="color: #9ca3af;">Manage notification settings</a>
            </p>
          </div>
        </div>
      </body></html>`,
  },
  event_invite: {
    subject: (d) => `You're invited to ${d.eventName}!`,
    html: (d) => `
      <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
        <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 32px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Event Invitation</h1>
          </div>
          <div style="padding: 32px;">
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
              ${d.recipientName ? `Hi ${d.recipientName},` : "Hi there,"}
            </p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
              You've been invited to participate in <strong>${d.eventName}</strong>${d.teamName ? ` as part of team <strong>${d.teamName}</strong>` : ""}.
            </p>
            <a href="${d.actionUrl}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              View Invitation
            </a>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              <a href="${d.settingsUrl}" style="color: #9ca3af;">Manage notification settings</a>
            </p>
          </div>
        </div>
      </body></html>`,
  },
  notification_coach: {
    subject: (d) => d.subject || "Coach Update",
    html: (d) => generateNotificationEmail(d, "#10b981", "#059669"),
  },
  notification_event: {
    subject: (d) => d.subject || "Event Update",
    html: (d) => generateNotificationEmail(d, "#f59e0b", "#d97706"),
  },
  notification_gym: {
    subject: (d) => d.subject || "Gym Update",
    html: (d) => generateNotificationEmail(d, "#6366f1", "#8b5cf6"),
  },
  notification_workout: {
    subject: (d) => d.subject || "Workout Update",
    html: (d) => generateNotificationEmail(d, "#ef4444", "#dc2626"),
  },
  notification_system: {
    subject: (d) => d.subject || "System Notification",
    html: (d) => generateNotificationEmail(d, "#71717a", "#52525b"),
  },
  notification_message: {
    subject: (d) => d.subject || "New Message",
    html: (d) => generateNotificationEmail(d, "#3b82f6", "#2563eb"),
  },
  test_email: {
    subject: (d) => d.subject || "Test Email from Flow Fitness",
    html: (d) => `
      <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
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
              ${d.body || "If you're seeing this, email delivery is working correctly!"}
            </p>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <p style="color: #166534; font-size: 14px; margin: 0;"><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
            </div>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">Sent from Flow Fitness Admin Portal</p>
          </div>
        </div>
      </body></html>`,
  },
  admin_invite: {
    subject: () => "You've been invited to Flow Fitness!",
    html: (d) => `
      <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
        <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to Flow Fitness!</h1>
          </div>
          <div style="padding: 32px;">
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
              ${d.name ? `Hi ${d.name},` : "Hi there,"}
            </p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
              An administrator has created an account for you on Flow Fitness. Click the button below to set your password and get started.
            </p>
            <a href="${d.resetLink}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Set Your Password
            </a>
            <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
              If you didn't expect this email, you can safely ignore it.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">Flow Fitness - Your fitness journey starts here</p>
          </div>
        </div>
      </body></html>`,
  },
  password_reset: {
    subject: () => "Password Reset Request - Flow Fitness",
    html: (d) => `
      <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
        <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Password Reset</h1>
          </div>
          <div style="padding: 32px;">
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">Hi ${d.displayName},</p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
              An administrator has requested a password reset for your account. Click the button below to set a new password.
            </p>
            <a href="${d.resetLink}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Reset Password
            </a>
            <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
              This link will expire in 1 hour. If you didn't request this reset, please contact support.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">Flow Fitness - Your fitness journey starts here</p>
          </div>
        </div>
      </body></html>`,
  },
};
