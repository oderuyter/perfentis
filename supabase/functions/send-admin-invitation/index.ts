import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { corsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return handleCorsPreFlight(req);
  }

  const cors = corsHeaders(req);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Invalid authorization");
    }

    // Check if user is admin
    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .eq("is_active", true)
      .single();

    if (!adminRole) {
      throw new Error("Only admins can invite users");
    }

    // ── Rate limit: 5/min, 30/day per admin ──
    const rl = await checkRateLimit({
      functionName: "send-admin-invitation",
      actorKey: user.id,
      maxPerMinute: 5,
      maxPerDay: 30,
    });
    if (!rl.allowed) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { status: 429, headers: { ...cors, "Content-Type": "application/json", "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    interface InvitationRequest {
      email: string;
      name?: string;
      role?: string;
    }

    const { email, name, role = "athlete" }: InvitationRequest = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    console.log(`Admin ${user.id} inviting ${email} with role ${role}`);

    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => 
      u.email?.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
      throw new Error("A user with this email already exists");
    }

    const inviteToken = crypto.randomUUID() + "-" + crypto.randomUUID();
    const tempPassword = crypto.randomUUID();
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase(),
      password: tempPassword,
      email_confirm: true,
      user_metadata: { 
        display_name: name,
        invited_by: user.id,
        invite_token: inviteToken 
      }
    });

    if (createError) {
      console.error("Error creating user:", createError);
      throw new Error("Failed to create user account");
    }

    console.log(`User created with ID: ${newUser.user.id}`);

    await supabase
      .from("profiles")
      .upsert({
        user_id: newUser.user.id,
        display_name: name || email.split("@")[0],
        status: "active"
      });

    await supabase
      .from("user_roles")
      .insert({
        user_id: newUser.user.id,
        role: role,
        scope_type: "global",
        is_active: true
      });

    const { data: resetData, error: resetError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: email.toLowerCase(),
      options: {
        redirectTo: `${req.headers.get("origin") || "https://app.example.com"}/auth?type=recovery`
      }
    });

    if (resetError) {
      console.error("Error generating reset link:", resetError);
    }

    const resetLink = resetData?.properties?.action_link || "";

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }
    const resend = new Resend(resendApiKey);

    const emailResponse = await resend.emails.send({
      from: "Flow Fitness <onboarding@resend.dev>",
      to: [email],
      subject: "You've been invited to Flow Fitness!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
          <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to Flow Fitness!</h1>
            </div>
            <div style="padding: 32px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
                ${name ? `Hi ${name},` : "Hi there,"}
              </p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                An administrator has created an account for you on Flow Fitness. Click the button below to set your password and get started.
              </p>
              <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Set Your Password
              </a>
              <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
                If you didn't expect this email, you can safely ignore it.
              </p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                Flow Fitness - Your fitness journey starts here
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Invitation email sent:", emailResponse);

    await supabase.from("audit_logs").insert({
      action: "user_invited",
      message: `Admin invited ${email} with role ${role}`,
      category: "admin",
      severity: "info",
      actor_id: user.id,
      entity_type: "user",
      entity_id: newUser.user.id,
      metadata: { email, role, name }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: newUser.user.id,
        message: `Invitation sent to ${email}`
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...cors } }
    );
  } catch (error: any) {
    console.error("Error in send-admin-invitation function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json", ...cors } }
    );
  }
};

serve(handler);
