import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import { sendSmtpEmail } from "../_shared/email/smtp.ts";
import { templates } from "../_shared/email/templates.ts";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return handleCorsPreFlight(req);
  }

  const cors = corsHeaders(req);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabase = getServiceClient();
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error("Invalid authorization");

    const { data: adminRole } = await supabase
      .from("user_roles").select("role")
      .eq("user_id", user.id).eq("role", "admin").eq("is_active", true).single();
    if (!adminRole) throw new Error("Only admins can invite users");

    const rl = await checkRateLimit({ functionName: "send-admin-invitation", actorKey: user.id, maxPerMinute: 5, maxPerDay: 30 });
    if (!rl.allowed) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { status: 429, headers: { ...cors, "Content-Type": "application/json", "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    const { email, name, role = "athlete" } = await req.json();
    if (!email) throw new Error("Email is required");

    console.log(`Admin ${user.id} inviting ${email} with role ${role}`);

    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (existingUser) throw new Error("A user with this email already exists");

    const inviteToken = crypto.randomUUID() + "-" + crypto.randomUUID();
    const tempPassword = crypto.randomUUID();
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase(),
      password: tempPassword,
      email_confirm: true,
      user_metadata: { display_name: name, invited_by: user.id, invite_token: inviteToken },
    });
    if (createError) throw new Error("Failed to create user account");

    await supabase.from("profiles").upsert({ user_id: newUser.user.id, display_name: name || email.split("@")[0], status: "active" });
    await supabase.from("user_roles").insert({ user_id: newUser.user.id, role, scope_type: "global", is_active: true });

    const { data: resetData, error: resetError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: email.toLowerCase(),
      options: { redirectTo: `${req.headers.get("origin") || "https://app.example.com"}/auth?type=recovery` },
    });
    if (resetError) console.error("Error generating reset link:", resetError);

    const resetLink = resetData?.properties?.action_link || "";

    // Send via SMTP using shared template
    const emailResult = await sendSmtpEmail({
      to: email.toLowerCase(),
      subject: templates.admin_invite.subject({}),
      html: templates.admin_invite.html({ name, resetLink }),
    });

    if (!emailResult.success) {
      console.error("Admin invitation email failed:", emailResult.error);
    }

    await supabase.from("audit_logs").insert({
      action: "user_invited",
      message: `Admin invited ${email} with role ${role}`,
      category: "admin",
      severity: "info",
      actor_id: user.id,
      entity_type: "user",
      entity_id: newUser.user.id,
      metadata: { email, role, name, emailSent: emailResult.success },
    });

    return new Response(
      JSON.stringify({ success: true, userId: newUser.user.id, message: `Invitation sent to ${email}`, emailSent: emailResult.success }),
      { status: 200, headers: { "Content-Type": "application/json", ...cors } }
    );
  } catch (error: any) {
    console.error("Error in send-admin-invitation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json", ...cors } }
    );
  }
};

serve(handler);
