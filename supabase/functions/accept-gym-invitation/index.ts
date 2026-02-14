import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { corsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";

interface AcceptRequest {
  token: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return handleCorsPreFlight(req);
  }

  const cors = corsHeaders(req);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header - you must be logged in to accept an invitation");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const jwtToken = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwtToken);
    
    if (userError || !user) {
      throw new Error("Invalid authorization");
    }

    const { token }: AcceptRequest = await req.json();

    if (!token) {
      throw new Error("Invitation token is required");
    }

    console.log(`Accepting invitation with token for user ${user.id}`);

    const { data: invitation, error: inviteError } = await supabase
      .from("gym_invitations")
      .select(`
        *,
        gym:gyms(id, name),
        membership_level:gym_membership_levels(id, name)
      `)
      .eq("token", token)
      .single();

    if (inviteError || !invitation) {
      console.error("Invitation lookup error:", inviteError);
      throw new Error("Invitation not found");
    }

    if (invitation.status !== "pending") {
      throw new Error(`This invitation has already been ${invitation.status}`);
    }

    if (new Date(invitation.expires_at) < new Date()) {
      await supabase
        .from("gym_invitations")
        .update({ status: "expired" })
        .eq("id", invitation.id);
      throw new Error("This invitation has expired");
    }

    if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new Error(`This invitation was sent to ${invitation.email}. Please log in with that email address.`);
    }

    const { data: existingMembership } = await supabase
      .from("memberships")
      .select("id, status")
      .eq("gym_id", invitation.gym_id)
      .eq("user_id", user.id)
      .neq("status", "cancelled")
      .single();

    if (existingMembership) {
      await supabase
        .from("gym_invitations")
        .update({ 
          status: "accepted",
          accepted_at: new Date().toISOString(),
          accepted_by: user.id
        })
        .eq("id", invitation.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "You already have an active membership at this gym",
          membershipId: existingMembership.id,
          alreadyMember: true
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...cors } }
      );
    }

    const { data: membership, error: membershipError } = await supabase
      .from("memberships")
      .insert({
        gym_id: invitation.gym_id,
        user_id: user.id,
        status: "active",
        tier: invitation.membership_level?.name || "standard",
        membership_level_id: invitation.membership_level_id,
        invitation_id: invitation.id,
        start_date: new Date().toISOString().split("T")[0]
      })
      .select()
      .single();

    if (membershipError) {
      console.error("Error creating membership:", membershipError);
      throw new Error("Failed to create membership");
    }

    console.log(`Membership created with ID: ${membership.id}`);

    await supabase
      .from("gym_invitations")
      .update({ 
        status: "accepted",
        accepted_at: new Date().toISOString(),
        accepted_by: user.id
      })
      .eq("id", invitation.id);

    await supabase
      .from("user_roles")
      .insert({
        user_id: user.id,
        role: "gym_user",
        scope_type: "gym",
        scope_id: invitation.gym_id
      })
      .select()
      .single();

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Welcome to ${invitation.gym?.name || "the gym"}!`,
        membershipId: membership.id,
        gymId: invitation.gym_id,
        gymName: invitation.gym?.name
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...cors } }
    );
  } catch (error: any) {
    console.error("Error in accept-gym-invitation function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json", ...cors } }
    );
  }
};

serve(handler);
