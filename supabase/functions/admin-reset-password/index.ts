import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import { sendSmtpEmail } from "../_shared/email/smtp.ts";
import { templates } from "../_shared/email/templates.ts";

interface ResetRequest {
  userId: string;
  email?: string;
}

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
    if (!adminRole) throw new Error("Only admins can reset passwords");

    const rl = await checkRateLimit({ functionName: "admin-reset-password", actorKey: user.id, maxPerMinute: 3, maxPerDay: 20 });
    if (!rl.allowed) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { status: 429, headers: { ...cors, "Content-Type": "application/json", "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    const { userId, email }: ResetRequest = await req.json();
    if (!userId) throw new Error("User ID is required");

    console.log(`Admin ${user.id} initiating password reset for user ${userId}`);

    const { data: targetUser, error: userLookupError } = await supabase.auth.admin.getUserById(userId);
    if (userLookupError || !targetUser?.user?.email) throw new Error("User not found");

    const targetEmail = email || targetUser.user.email;

    const { data: resetData, error: resetError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: targetEmail,
      options: { redirectTo: `${req.headers.get("origin") || "https://app.example.com"}/auth?type=recovery` },
    });
    if (resetError) throw new Error("Failed to generate password reset link");

    const resetLink = resetData?.properties?.action_link || "";

    const { data: profile } = await supabase.from("profiles").select("display_name").eq("user_id", userId).single();
    const displayName = profile?.display_name || targetEmail.split("@")[0];

    // Send via SMTP using shared template
    const emailResult = await sendSmtpEmail({
      to: targetEmail,
      subject: templates.password_reset.subject({}),
      html: templates.password_reset.html({ displayName, resetLink }),
    });

    if (!emailResult.success) {
      console.error("Password reset email failed:", emailResult.error);
    }

    await supabase.from("audit_logs").insert({
      action: "password_reset_initiated",
      message: `Admin initiated password reset for ${targetEmail}`,
      category: "security",
      severity: "warn",
      actor_id: user.id,
      entity_type: "user",
      entity_id: userId,
      metadata: { target_email: targetEmail, emailSent: emailResult.success },
    });

    return new Response(
      JSON.stringify({ success: true, message: `Password reset email sent to ${targetEmail}`, emailSent: emailResult.success }),
      { status: 200, headers: { "Content-Type": "application/json", ...cors } }
    );
  } catch (error: any) {
    console.error("Error in admin-reset-password:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json", ...cors } }
    );
  }
};

serve(handler);
