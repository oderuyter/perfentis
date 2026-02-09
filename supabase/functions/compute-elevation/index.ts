import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();
    if (!sessionId) throw new Error('sessionId required');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch route points (sample every Nth)
    const { data: points, error: pointsErr } = await supabase
      .from('activity_route_points')
      .select('lat, lng, idx')
      .eq('session_id', sessionId)
      .order('idx', { ascending: true });

    if (pointsErr) throw pointsErr;
    if (!points || points.length < 2) {
      return new Response(JSON.stringify({ message: 'Not enough points' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Sample points (max 100 for API call)
    const maxSamples = 100;
    const step = Math.max(1, Math.ceil(points.length / maxSamples));
    const sampled = points.filter((_, i) => i % step === 0);

    // Use Open Elevation API (free, no key needed)
    const locations = sampled.map(p => ({ latitude: p.lat, longitude: p.lng }));
    
    const elevResponse = await fetch('https://api.open-elevation.com/api/v1/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locations }),
    });

    if (!elevResponse.ok) {
      // Log failure for admin
      await supabase.rpc('log_audit_event', {
        _action: 'elevation_api_failed',
        _message: `Elevation API returned ${elevResponse.status} for session ${sessionId}`,
        _category: 'system',
        _severity: 'warn',
      });

      return new Response(JSON.stringify({ 
        message: 'Elevation API unavailable', 
        status: elevResponse.status 
      }), {
        status: 200, // Don't fail the run save
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const elevData = await elevResponse.json();
    const elevations: number[] = elevData.results?.map((r: any) => r.elevation) || [];

    // Compute gain/loss with smoothing threshold
    const THRESHOLD = 2; // meters - ignore noise below this
    let gain = 0;
    let loss = 0;
    for (let i = 1; i < elevations.length; i++) {
      const delta = elevations[i] - elevations[i - 1];
      if (delta > THRESHOLD) gain += delta;
      if (delta < -THRESHOLD) loss += Math.abs(delta);
    }

    // Update session with computed elevation
    const { error: updateErr } = await supabase
      .from('workout_sessions')
      .update({
        elevation_gain_m: Math.round(gain),
        elevation_loss_m: Math.round(loss),
      })
      .eq('id', sessionId);

    if (updateErr) throw updateErr;

    // Log success
    await supabase.rpc('log_audit_event', {
      _action: 'elevation_computed',
      _message: `Elevation computed for session ${sessionId}: +${Math.round(gain)}m / -${Math.round(loss)}m`,
      _category: 'system',
      _severity: 'info',
    });

    return new Response(JSON.stringify({ gain: Math.round(gain), loss: Math.round(loss) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Elevation compute error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
