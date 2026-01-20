import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  gymId: string;
  email: string;
  name?: string;
  membershipLevelId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Invalid authorization");
    }

    const { gymId, email, name, membershipLevelId }: InvitationRequest = await req.json();

    if (!gymId || !email) {
      throw new Error("Gym ID and email are required");
    }

    console.log(`Creating invitation for ${email} to gym ${gymId}`);

    // Check if user has permission to invite
    const { data: gym, error: gymError } = await supabase
      .from("gyms")
      .select("id, name, owner_id")
      .eq("id", gymId)
      .single();

    if (gymError || !gym) {
      throw new Error("Gym not found");
    }

    // Check roles
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("scope_id", gymId)
      .eq("is_active", true)
      .in("role", ["gym_manager", "gym_staff"]);

    const isOwner = gym.owner_id === user.id;
    const hasRole = roles && roles.length > 0;
    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .eq("is_active", true)
      .single();

    if (!isOwner && !hasRole && !adminRole) {
      throw new Error("You don't have permission to invite members to this gym");
    }

    // Check for existing pending invitation
    const { data: existingInvite } = await supabase
      .from("gym_invitations")
      .select("id, status")
      .eq("gym_id", gymId)
      .eq("email", email.toLowerCase())
      .eq("status", "pending")
      .single();

    if (existingInvite) {
      throw new Error("There's already a pending invitation for this email");
    }

    // Check if user already has a membership
    const { data: existingMembership } = await supabase
      .from("memberships")
      .select("id, user_id")
      .eq("gym_id", gymId)
      .not("status", "eq", "cancelled");

    if (existingMembership && existingMembership.length > 0) {
      const userIds = existingMembership.map(m => m.user_id);
      const { data: users } = await supabase.auth.admin.listUsers();
      const existingUser = users?.users?.find(u => 
        u.email?.toLowerCase() === email.toLowerCase() && 
        userIds.includes(u.id)
      );
      if (existingUser) {
        throw new Error("This email is already a member of this gym");
      }
    }

    // Get membership level details
    let levelName = "Standard";
    if (membershipLevelId) {
      const { data: level } = await supabase
        .from("gym_membership_levels")
        .select("name")
        .eq("id", membershipLevelId)
        .single();
      if (level) {
        levelName = level.name;
      }
    }

    // Generate secure token
    const token_value = crypto.randomUUID() + "-" + crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invitation record (with pending email status)
    const { data: invitation, error: inviteError } = await supabase
      .from("gym_invitations")
      .insert({
        gym_id: gymId,
        email: email.toLowerCase(),
        name: name || null,
        membership_level_id: membershipLevelId || null,
        invited_by: user.id,
        token: token_value,
        status: "pending",
        expires_at: expiresAt.toISOString(),
        email_status: "pending",
      })
      .select()
      .single();

    if (inviteError) {
      console.error("Error creating invitation:", inviteError);
      throw new Error("Failed to create invitation");
    }

    console.log(`Invitation created with ID: ${invitation.id}`);

    // Get the app URL
    const origin = req.headers.get("origin") || "https://calm-train-flow.lovable.app";
    const inviteLink = `${origin}/accept-invite?token=${token_value}`;
    const settingsUrl = `${origin}/profile`;

    // Create email log
    const { data: emailLog, error: logError } = await supabase
      .from("email_logs")
      .insert({
        to_email: email.toLowerCase(),
        template_key: "gym_invite",
        subject: `You're invited to join ${gym.name}!`,
        context_type: "gym",
        context_id: invitation.id,
        actor_user_id: user.id,
        status: "pending",
        metadata: {
          data: {
            recipientName: name,
            gymName: gym.name,
            membershipLevel: levelName,
            actionUrl: inviteLink,
            settingsUrl,
          },
        },
      })
      .select("id")
      .single();

    // Try to send the email
    let emailSuccess = false;
    let resendMessageId: string | null = null;
    let emailError: string | null = null;

    if (!resendApiKey) {
      emailError = "RESEND_API_KEY not configured";
      console.error(emailError);
    } else {
      try {
        const resend = new Resend(resendApiKey);
        
        const emailResponse = await resend.emails.send({
          from: "Flow Fitness <onboarding@resend.dev>",
          to: [email],
          subject: `You're invited to join ${gym.name}!`,
          html: `
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
              <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 24px;">You're Invited!</h1>
                </div>
                <div style="padding: 32px;">
                  <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
                    ${name ? `Hi ${name},` : "Hi there,"}
                  </p>
                  <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                    You've been invited to join <strong>${gym.name}</strong> with a <strong>${levelName}</strong> membership.
                  </p>
                  <a href="${inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Accept Invitation
                  </a>
                  <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
                    This invitation expires in 7 days. If you didn't expect this email, you can safely ignore it.
                  </p>
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
                  <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                    <a href="${settingsUrl}" style="color: #9ca3af;">Manage notification settings</a>
                  </p>
                </div>
              </div>
            </body>
            </html>
          `,
        });

        console.log("Resend response:", JSON.stringify(emailResponse));

        if (emailResponse.data?.id) {
          emailSuccess = true;
          resendMessageId = emailResponse.data.id;
        } else if (emailResponse.error) {
          emailError = emailResponse.error.message || "Unknown Resend error";
        }
      } catch (err: any) {
        emailError = err.message || "Failed to send email";
        console.error("Email send error:", emailError);
      }
    }

    // Update email log with result
    if (emailLog?.id) {
      await supabase
        .from("email_logs")
        .update({
          status: emailSuccess ? "sent" : "failed",
          resend_message_id: resendMessageId,
          error_message: emailError,
          error_code: emailError ? "SEND_ERROR" : null,
          attempt_count: 1,
          last_attempt_at: new Date().toISOString(),
        })
        .eq("id", emailLog.id);
    }

    // Update invitation with email status
    await supabase
      .from("gym_invitations")
      .update({
        email_status: emailSuccess ? "sent" : "failed",
        email_sent_at: emailSuccess ? new Date().toISOString() : null,
        email_error: emailError,
        email_log_id: emailLog?.id || null,
      })
      .eq("id", invitation.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        invitationId: invitation.id,
        emailSent: emailSuccess,
        emailError: emailError,
        message: emailSuccess 
          ? `Invitation sent to ${email}` 
          : `Invitation created but email failed: ${emailError}`,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-gym-invitation function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
