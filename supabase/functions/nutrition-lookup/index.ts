import "https://deno.land/std@0.224.0/dotenv/load.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get enabled providers ordered by priority
    const { data: providers } = await supabase
      .from("nutrition_api_providers")
      .select("*")
      .eq("is_enabled", true)
      .order("priority");

    if (action === "barcode") {
      const barcode = url.searchParams.get("barcode");
      if (!barcode) {
        return new Response(
          JSON.stringify({ error: "barcode required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 1. Check local DB first
      const { data: localFood } = await supabase
        .from("foods")
        .select("*")
        .eq("barcode", barcode)
        .limit(1)
        .maybeSingle();

      if (localFood) {
        return new Response(
          JSON.stringify({ source: "local", food: localFood }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 2. Try external providers
      for (const provider of providers || []) {
        try {
          if (provider.provider_key === "open_food_facts") {
            const resp = await fetch(
              `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`
            );
            const data = await resp.json();

            if (data.status === 1 && data.product) {
              const p = data.product;
              const n = p.nutriments || {};
              const food = {
                name: p.product_name || p.product_name_en || "Unknown",
                brand: p.brands || null,
                barcode,
                serving_size_g: p.serving_quantity || 100,
                calories_per_100g: n["energy-kcal_100g"] || 0,
                protein_per_100g: n.proteins_100g || 0,
                carbs_per_100g: n.carbohydrates_100g || 0,
                fat_per_100g: n.fat_100g || 0,
                source: "open_food_facts",
                external_id: barcode,
                raw_payload: data,
              };

              // Update provider status
              await supabase
                .from("nutrition_api_providers")
                .update({
                  last_ok_at: new Date().toISOString(),
                  call_count_24h: (provider.call_count_24h || 0) + 1,
                })
                .eq("id", provider.id);

              return new Response(
                JSON.stringify({ source: "open_food_facts", food }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          }
        } catch (err) {
          await supabase
            .from("nutrition_api_providers")
            .update({ last_error: String(err) })
            .eq("id", provider.id);
        }
      }

      return new Response(
        JSON.stringify({ source: null, food: null, message: "Not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "search") {
      const query = url.searchParams.get("q") || "";
      const includeExternal = url.searchParams.get("external") === "true";

      // Search local DB
      const { data: localResults } = await supabase
        .from("foods")
        .select("*")
        .or(`name.ilike.%${query}%,brand.ilike.%${query}%`)
        .limit(20);

      const results = localResults || [];

      // Optionally search external
      if (includeExternal && results.length < 5) {
        for (const provider of providers || []) {
          try {
            if (provider.provider_key === "open_food_facts") {
              const resp = await fetch(
                `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=10`
              );
              const data = await resp.json();

              for (const p of data.products || []) {
                const n = p.nutriments || {};
                results.push({
                  id: `off_${p.code || p._id}`,
                  name: p.product_name || "Unknown",
                  brand: p.brands || null,
                  barcode: p.code || null,
                  serving_size_g: p.serving_quantity || 100,
                  calories_per_100g: n["energy-kcal_100g"] || 0,
                  protein_per_100g: n.proteins_100g || 0,
                  carbs_per_100g: n.carbohydrates_100g || 0,
                  fat_per_100g: n.fat_100g || 0,
                  source: "open_food_facts",
                  external_id: p.code || p._id,
                  is_approved: false,
                  _external: true,
                });
              }

              await supabase
                .from("nutrition_api_providers")
                .update({
                  last_ok_at: new Date().toISOString(),
                  call_count_24h: (provider.call_count_24h || 0) + 1,
                })
                .eq("id", provider.id);

              break; // Only use first provider
            }
          } catch (err) {
            await supabase
              .from("nutrition_api_providers")
              .update({ last_error: String(err) })
              .eq("id", provider.id);
          }
        }
      }

      return new Response(
        JSON.stringify({ results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action. Use ?action=barcode or ?action=search" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
