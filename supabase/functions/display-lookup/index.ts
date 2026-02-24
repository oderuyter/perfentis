const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const openHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const joinCode = url.searchParams.get("join_code");

    if (!token && !joinCode) {
      return new Response(JSON.stringify({ error: "Token or join_code required" }), { status: 400, headers: openHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const baseHeaders = {
      "apikey": serviceKey,
      "Authorization": `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    };
    const restUrl = `${supabaseUrl}/rest/v1`;

    if (token) {
      const dRes = await fetch(
        `${restUrl}/displays?select=id,name,owner_type,owner_id,is_active&display_token=eq.${encodeURIComponent(token)}`,
        { headers: { ...baseHeaders, "Accept": "application/vnd.pgrst.object+json" } }
      );

      if (!dRes.ok) {
        await dRes.text();
        return new Response(JSON.stringify({ error: "Display not found" }), { status: 404, headers: openHeaders });
      }

      const display = await dRes.json();

      if (!display.is_active) {
        return new Response(JSON.stringify({ error: "Display is inactive" }), { status: 403, headers: openHeaders });
      }

      let ownerName = "Display";
      if (display.owner_type === "gym") {
        const gRes = await fetch(
          `${restUrl}/gyms?select=name,logo_url&id=eq.${display.owner_id}`,
          { headers: { ...baseHeaders, "Accept": "application/vnd.pgrst.object+json" } }
        );
        if (gRes.ok) {
          const gym = await gRes.json();
          ownerName = gym.name;
        } else { await gRes.text(); }
      } else if (display.owner_type === "coach") {
        const cRes = await fetch(
          `${restUrl}/coaches?select=display_name,avatar_url&id=eq.${display.owner_id}`,
          { headers: { ...baseHeaders, "Accept": "application/vnd.pgrst.object+json" } }
        );
        if (cRes.ok) {
          const coach = await cRes.json();
          ownerName = coach.display_name;
        } else { await cRes.text(); }
      }

      const sRes = await fetch(
        `${restUrl}/display_sessions?select=id,status,title,started_at,settings_json,join_code,current_workout_session_id&display_id=eq.${display.id}&status=in.(idle,active)&order=created_at.desc&limit=1`,
        { headers: baseHeaders }
      );
      const sessions = sRes.ok ? await sRes.json() : (await sRes.text(), []);

      return new Response(JSON.stringify({
        display: { id: display.id, name: display.name, owner_type: display.owner_type, owner_name: ownerName },
        session: sessions[0] || null,
      }), { status: 200, headers: openHeaders });
    }

    if (joinCode) {
      const sRes = await fetch(
        `${restUrl}/display_sessions?select=id,display_id,status,title,join_code,settings_json&join_code=eq.${encodeURIComponent(joinCode.toUpperCase())}&status=eq.active&limit=1`,
        { headers: baseHeaders }
      );
      const sessions = sRes.ok ? await sRes.json() : (await sRes.text(), []);
      const session = sessions[0];

      if (!session) {
        return new Response(JSON.stringify({ error: "Session not found" }), { status: 404, headers: openHeaders });
      }

      const ddRes = await fetch(
        `${restUrl}/displays?select=id,name,display_token,owner_type,owner_id&id=eq.${session.display_id}`,
        { headers: { ...baseHeaders, "Accept": "application/vnd.pgrst.object+json" } }
      );
      const display = ddRes.ok ? await ddRes.json() : (await ddRes.text(), null);

      return new Response(JSON.stringify({
        session,
        display_token: display?.display_token || null,
      }), { status: 200, headers: openHeaders });
    }

    return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400, headers: openHeaders });
  } catch (_err) {
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
