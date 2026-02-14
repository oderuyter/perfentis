import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import { sendSmtpEmail } from "../_shared/email/smtp.ts";
import { templates } from "../_shared/email/templates.ts";

interface InvitationRequest {
  gymId: string;
  email: string;
  name?: string;
  membershipLevelId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return handleCorsPreFlight(req);
  }

  const cors = corsHeaders(req);
  const supabase = getServiceClient();

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error("Invalid authorization");

    // Rate limit
    const rl = await checkRateLimit({ functionName: "send-gym-invitation", actorKey: user.id, maxPerMinute: 5, maxPerDay: 50 });
    if (!rl.allowed) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { status: 429, headers: { ...cors, "Content-Type": "application/json", "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    const { gymId, email, name, membershipLevelId }: InvitationRequest = await req.json();
    if (!gymId || !email) throw new Error("Gym ID and email are required");

    console.log(`Creating invitation for ${email} to gym ${gymId}`);

    const { data: gym, error: gymError } = await supabase.from("gyms").select("id, name, owner_id").eq("id", gymId).single();
    if (gymError || !gym) throw new Error("Gym not found");

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("scope_id", gymId).eq("is_active", true).in("role", ["gym_manager", "gym_staff"]);
    const isOwner = gym.owner_id === user.id;
    const hasRole = roles && roles.length > 0;
    const { data: adminRole } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").eq("is_active", true).single();
    if (!isOwner && !hasRole && !adminRole) throw new Error("You don't have permission to invite members to this gym");

    const { data: existingInvite } = await supabase.from("gym_invitations").select("id, status").eq("gym_id", gymId).eq("email", email.toLowerCase()).eq("status", "pending").single();
    if (existingInvite) throw new Error("There's already a pending invitation for this email");

    // Check existing membership
    const { data: existingMembership } = await supabase.from("memberships").select("id, user_id").eq("gym_id", gymId).not("status", "eq", "cancelled");
    if (existingMembership && existingMembership.length > 0) {
      const userIds = existingMembership.map(m => m.user_id);
      const { data: users } = await supabase.auth.admin.listUsers();
      const existingUser = users?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase() && userIds.includes(u.id));
      if (existingUser) throw new Error("This email is already a member of this gym");
    }

    let levelName = "Standard";
    if (membershipLevelId) {
      const { data: level } = await supabase.from("gym_membership_levels").select("name").eq("id", membershipLevelId).single();
      if (level) levelName = level.name;
    }

    const token_value = crypto.randomUUID() + "-" + crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

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

    if (inviteError) throw new Error("Failed to create invitation");

    const origin = req.headers.get("origin") || "https://calm-train-flow.lovable.app";
    const inviteLink = `${origin}/accept-invite?token=${token_value}`;
    const settingsUrl = `${origin}/profile`;

    const templateData = {
      recipientName: name,
      gymName: gym.name,
      membershipLevel: levelName,
      actionUrl: inviteLink,
      settingsUrl,
    };

    const { data: emailLog } = await supabase
      .from("email_logs")
      .insert({
        to_email: email.toLowerCase(),
        template_key: "gym_invite",
        subject: templates.gym_invite.subject(templateData),
        context_type: "gym",
        context_id: invitation.id,
        actor_user_id: user.id,
        status: "pending",
        metadata: { data: templateData },
      })
      .select("id")
      .single();

    // Send via SMTP
    const emailResult = await sendSmtpEmail({
      to: email.toLowerCase(),
      subject: templates.gym_invite.subject(templateData),
      html: templates.gym_invite.html(templateData),
    });

    if (emailLog?.id) {
      await supabase
        .from("email_logs")
        .update({
          status: emailResult.success ? "sent" : "failed",
          error_message: emailResult.error || null,
          error_code: emailResult.error ? "SMTP_ERROR" : null,
          attempt_count: 1,
          last_attempt_at: new Date().toISOString(),
        })
        .eq("id", emailLog.id);
    }

    await supabase
      .from("gym_invitations")
      .update({
        email_status: emailResult.success ? "sent" : "failed",
        email_sent_at: emailResult.success ? new Date().toISOString() : null,
        email_error: emailResult.error || null,
        email_log_id: emailLog?.id || null,
      })
      .eq("id", invitation.id);

    return new Response(
      JSON.stringify({
        success: true,
        invitationId: invitation.id,
        emailSent: emailResult.success,
        emailError: emailResult.error || null,
        message: emailResult.success
          ? `Invitation sent to ${email}`
          : `Invitation created but email failed: ${emailResult.error}`,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...cors } }
    );
  } catch (error: any) {
    console.error("Error in send-gym-invitation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json", ...cors } }
    );
  }
};

serve(handler);
