import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...corsHeaders, "Access-Control-Allow-Origin": "*" } });
  }

  // Allow unauthenticated access - this is intentional for display screens
  const openHeaders = { ...corsHeaders, "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const joinCode = url.searchParams.get("join_code");

    if (!token && !joinCode) {
      return new Response(JSON.stringify({ error: "Token or join_code required" }), { status: 400, headers: openHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    if (token) {
      // Look up display by token
      const { data: display, error: dErr } = await supabase
        .from("displays")
        .select("id, name, owner_type, owner_id, is_active")
        .eq("display_token", token)
        .single();

      if (dErr || !display) {
        return new Response(JSON.stringify({ error: "Display not found" }), { status: 404, headers: openHeaders });
      }

      if (!display.is_active) {
        return new Response(JSON.stringify({ error: "Display is inactive" }), { status: 403, headers: openHeaders });
      }

      // Get owner info
      let ownerName = "Display";
      if (display.owner_type === "gym") {
        const { data: gym } = await supabase.from("gyms").select("name, logo_url").eq("id", display.owner_id).single();
        if (gym) ownerName = gym.name;
      } else if (display.owner_type === "coach") {
        const { data: coach } = await supabase.from("coaches").select("display_name, avatar_url").eq("id", display.owner_id).single();
        if (coach) ownerName = coach.display_name;
      }

      // Get active session if any
      const { data: session } = await supabase
        .from("display_sessions")
        .select("id, status, title, started_at, settings_json, join_code, current_workout_session_id")
        .eq("display_id", display.id)
        .in("status", ["idle", "active"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return new Response(JSON.stringify({
        display: {
          id: display.id,
          name: display.name,
          owner_type: display.owner_type,
          owner_name: ownerName,
        },
        session: session || null,
      }), { status: 200, headers: openHeaders });
    }

    if (joinCode) {
      // Look up by join code
      const { data: session, error } = await supabase
        .from("display_sessions")
        .select("id, display_id, status, title, join_code, settings_json")
        .eq("join_code", joinCode.toUpperCase())
        .eq("status", "active")
        .maybeSingle();

      if (error || !session) {
        return new Response(JSON.stringify({ error: "Session not found" }), { status: 404, headers: openHeaders });
      }

      // Get display info
      const { data: display } = await supabase
        .from("displays")
        .select("id, name, display_token, owner_type, owner_id")
        .eq("id", session.display_id)
        .single();

      return new Response(JSON.stringify({
        session,
        display_token: display?.display_token || null,
      }), { status: 200, headers: openHeaders });
    }

    return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400, headers: openHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: openHeaders });
  }
});
