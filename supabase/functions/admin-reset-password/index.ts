import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResetRequest {
  userId: string;
  email?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
      throw new Error("Only admins can reset passwords");
    }

    const { userId, email }: ResetRequest = await req.json();

    if (!userId) {
      throw new Error("User ID is required");
    }

    console.log(`Admin ${user.id} initiating password reset for user ${userId}`);

    // Get the target user's email
    const { data: targetUser, error: userLookupError } = await supabase.auth.admin.getUserById(userId);

    if (userLookupError || !targetUser?.user?.email) {
      throw new Error("User not found");
    }

    const targetEmail = email || targetUser.user.email;

    // Generate password reset link
    const { data: resetData, error: resetError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: targetEmail,
      options: {
        redirectTo: `${req.headers.get("origin") || "https://app.example.com"}/auth?type=recovery`
      }
    });

    if (resetError) {
      console.error("Error generating reset link:", resetError);
      throw new Error("Failed to generate password reset link");
    }

    const resetLink = resetData?.properties?.action_link || "";

    // Get display name from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", userId)
      .single();

    const displayName = profile?.display_name || targetEmail.split("@")[0];

    // Send password reset email
    const emailResponse = await resend.emails.send({
      from: "Flow Fitness <onboarding@resend.dev>",
      to: [targetEmail],
      subject: "Password Reset Request - Flow Fitness",
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
              <h1 style="color: white; margin: 0; font-size: 24px;">Password Reset</h1>
            </div>
            <div style="padding: 32px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
                Hi ${displayName},
              </p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                An administrator has requested a password reset for your account. Click the button below to set a new password.
              </p>
              <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Reset Password
              </a>
              <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
                This link will expire in 1 hour. If you didn't request this reset, please contact support.
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

    console.log("Password reset email sent:", emailResponse);

    // Log audit event
    await supabase.from("audit_logs").insert({
      action: "password_reset_initiated",
      message: `Admin initiated password reset for ${targetEmail}`,
      category: "security",
      severity: "warn",
      actor_id: user.id,
      entity_type: "user",
      entity_id: userId,
      metadata: { target_email: targetEmail }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Password reset email sent to ${targetEmail}`
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in admin-reset-password function:", error);
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
