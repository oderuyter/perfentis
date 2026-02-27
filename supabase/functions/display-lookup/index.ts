const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

      // Get latest session (idle or active)
      const sRes = await fetch(
        `${restUrl}/display_sessions?select=id,status,title,started_at,settings_json,join_code,current_workout_session_id&display_id=eq.${display.id}&status=in.(idle,active)&order=created_at.desc&limit=1`,
        { headers: baseHeaders }
      );
      const sessions = sRes.ok ? await sRes.json() : (await sRes.text(), []);
      let session = sessions[0] || null;

      // If no session exists, create one with a persistent join code
      if (!session) {
        const codeRes = await fetch(`${restUrl}/rpc/generate_display_join_code`, {
          method: "POST",
          headers: baseHeaders,
          body: "{}",
        });
        const joinCodeVal = codeRes.ok ? (await codeRes.json()) : null;

        if (joinCodeVal) {
          const createRes = await fetch(`${restUrl}/display_sessions`, {
            method: "POST",
            headers: { ...baseHeaders, "Prefer": "return=representation" },
            body: JSON.stringify({
              display_id: display.id,
              status: "idle",
              join_code: joinCodeVal,
              settings_json: { privacy_mode: "structure_only", show_user_names: false, max_participant_tiles: 1 },
            }),
          });
          if (createRes.ok) {
            const created = await createRes.json();
            session = Array.isArray(created) ? created[0] : created;
          } else { await createRes.text(); }
        }
      } else {
        // Rotate join code every 3 hours
        const sessionCreated = new Date(session.started_at || session.id).getTime();
        const threeHoursMs = 3 * 60 * 60 * 1000;
        // Use a simple check: if join_code was created > 3h ago, rotate
        // We'll track this by checking if session has been idle for 3+ hours
        if (session.status === "idle" && session.join_code) {
          // Check if we need to rotate by looking at when the session was created
          const sDetailRes = await fetch(
            `${restUrl}/display_sessions?select=created_at&id=eq.${session.id}`,
            { headers: { ...baseHeaders, "Accept": "application/vnd.pgrst.object+json" } }
          );
          if (sDetailRes.ok) {
            const sDetail = await sDetailRes.json();
            const createdAt = new Date(sDetail.created_at).getTime();
            if (Date.now() - createdAt > threeHoursMs) {
              // Rotate: generate new join code
              const codeRes = await fetch(`${restUrl}/rpc/generate_display_join_code`, {
                method: "POST",
                headers: baseHeaders,
                body: "{}",
              });
              const newCode = codeRes.ok ? await codeRes.json() : null;
              if (newCode) {
                // End old idle session, create new one
                await fetch(`${restUrl}/display_sessions?id=eq.${session.id}`, {
                  method: "PATCH",
                  headers: baseHeaders,
                  body: JSON.stringify({ status: "ended", ended_at: new Date().toISOString() }),
                });
                const createRes = await fetch(`${restUrl}/display_sessions`, {
                  method: "POST",
                  headers: { ...baseHeaders, "Prefer": "return=representation" },
                  body: JSON.stringify({
                    display_id: display.id,
                    status: "idle",
                    join_code: newCode,
                    settings_json: session.settings_json || { privacy_mode: "structure_only", show_user_names: false, max_participant_tiles: 1 },
                  }),
                });
                if (createRes.ok) {
                  const created = await createRes.json();
                  session = Array.isArray(created) ? created[0] : created;
                } else { await createRes.text(); }
              }
            }
          } else { await sDetailRes.text(); }
        }
      }

      // Count connected participants
      let participantCount = 0;
      if (session) {
        const pRes = await fetch(
          `${restUrl}/display_participants?select=id&display_session_id=eq.${session.id}&status=eq.connected`,
          { headers: baseHeaders }
        );
        if (pRes.ok) {
          const participants = await pRes.json();
          participantCount = participants.length;
        } else { await pRes.text(); }
      }

      return new Response(JSON.stringify({
        display: { id: display.id, name: display.name, owner_type: display.owner_type, owner_name: ownerName },
        session,
        participant_count: participantCount,
      }), { status: 200, headers: openHeaders });
    }

    if (joinCode) {
      // Look up by join code - search both idle and active sessions
      const sRes = await fetch(
        `${restUrl}/display_sessions?select=id,display_id,status,title,join_code,settings_json&join_code=eq.${encodeURIComponent(joinCode.toUpperCase())}&status=in.(idle,active)&limit=1`,
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
