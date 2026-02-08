import "https://deno.land/std@0.224.0/dotenv/load.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface Provider {
  id: string;
  provider_key: string;
  is_enabled: boolean;
  priority: number;
  api_key_encrypted: string | null;
  call_count_24h: number;
  last_ok_at: string | null;
  last_error: string | null;
}

async function lookupOpenFoodFacts(barcode: string) {
  const resp = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`
  );
  const data = await resp.json();
  if (data.status !== 1 || !data.product) return null;

  const p = data.product;
  const n = p.nutriments || {};
  return {
    food: {
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
    },
    source: "open_food_facts",
  };
}

async function searchOpenFoodFacts(query: string) {
  const resp = await fetch(
    `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=10`
  );
  const data = await resp.json();
  return (data.products || []).map((p: any) => {
    const n = p.nutriments || {};
    return {
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
    };
  });
}

async function lookupUSDA(barcode: string, apiKey: string) {
  // USDA FoodData Central barcode (GTIN/UPC) search
  const resp = await fetch(
    `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(barcode)}&dataType=Branded&pageSize=1&api_key=${apiKey}`
  );
  const data = await resp.json();
  const item = data.foods?.[0];
  if (!item) return null;

  const getNutrient = (id: number) => {
    const n = item.foodNutrients?.find((fn: any) => fn.nutrientId === id);
    return n?.value || 0;
  };

  return {
    food: {
      name: item.description || "Unknown",
      brand: item.brandOwner || item.brandName || null,
      barcode: item.gtinUpc || barcode,
      serving_size_g: item.servingSize || 100,
      calories_per_100g: getNutrient(1008),
      protein_per_100g: getNutrient(1003),
      carbs_per_100g: getNutrient(1005),
      fat_per_100g: getNutrient(1004),
      source: "usda_fdc",
      external_id: String(item.fdcId),
      raw_payload: item,
    },
    source: "usda_fdc",
  };
}

async function searchUSDA(query: string, apiKey: string) {
  const resp = await fetch(
    `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=10&api_key=${apiKey}`
  );
  const data = await resp.json();

  return (data.foods || []).map((item: any) => {
    const getNutrient = (id: number) => {
      const n = item.foodNutrients?.find((fn: any) => fn.nutrientId === id);
      return n?.value || 0;
    };

    return {
      id: `usda_${item.fdcId}`,
      name: item.description || "Unknown",
      brand: item.brandOwner || item.brandName || null,
      barcode: item.gtinUpc || null,
      serving_size_g: item.servingSize || 100,
      calories_per_100g: getNutrient(1008),
      protein_per_100g: getNutrient(1003),
      carbs_per_100g: getNutrient(1005),
      fat_per_100g: getNutrient(1004),
      source: "usda_fdc",
      external_id: String(item.fdcId),
      is_approved: false,
      _external: true,
    };
  });
}

async function updateProviderStatus(
  supabase: any,
  providerId: string,
  success: boolean,
  currentCount: number,
  error?: string
) {
  const update: any = {
    call_count_24h: currentCount + 1,
  };
  if (success) {
    update.last_ok_at = new Date().toISOString();
  }
  if (error) {
    update.last_error = error;
  }
  await supabase.from("nutrition_api_providers").update(update).eq("id", providerId);
}

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

    const enabledProviders = (providers || []) as Provider[];

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

      // 2. Try providers in priority order
      for (const provider of enabledProviders) {
        try {
          let result = null;
          if (provider.provider_key === "open_food_facts") {
            result = await lookupOpenFoodFacts(barcode);
          } else if (provider.provider_key === "usda_fdc") {
            const apiKey = provider.api_key_encrypted || Deno.env.get("USDA_API_KEY") || "DEMO_KEY";
            result = await lookupUSDA(barcode, apiKey);
          }

          if (result) {
            await updateProviderStatus(supabase, provider.id, true, provider.call_count_24h || 0);
            return new Response(
              JSON.stringify(result),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // Provider returned no result, still count the call
          await updateProviderStatus(supabase, provider.id, true, provider.call_count_24h || 0);
        } catch (err) {
          await updateProviderStatus(supabase, provider.id, false, provider.call_count_24h || 0, String(err));
        }
      }

      return new Response(
        JSON.stringify({ source: null, food: null, message: "Not found in any provider" }),
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

      const results = [...(localResults || [])];

      // If not enough local results, search external providers
      if (includeExternal && results.length < 5) {
        for (const provider of enabledProviders) {
          try {
            let externalResults: any[] = [];

            if (provider.provider_key === "open_food_facts") {
              externalResults = await searchOpenFoodFacts(query);
            } else if (provider.provider_key === "usda_fdc") {
              const apiKey = provider.api_key_encrypted || Deno.env.get("USDA_API_KEY") || "DEMO_KEY";
              externalResults = await searchUSDA(query, apiKey);
            }

            if (externalResults.length > 0) {
              // Dedupe: don't add external results that match local barcodes
              const localBarcodes = new Set(results.map((r: any) => r.barcode).filter(Boolean));
              for (const ext of externalResults) {
                if (ext.barcode && localBarcodes.has(ext.barcode)) continue;
                results.push(ext);
              }

              await updateProviderStatus(supabase, provider.id, true, provider.call_count_24h || 0);
            }
          } catch (err) {
            await updateProviderStatus(supabase, provider.id, false, provider.call_count_24h || 0, String(err));
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
