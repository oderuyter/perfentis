
-- ============================================
-- NUTRITION MODULE - Complete Schema
-- ============================================

-- Enable trigram extension for fuzzy search first
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1) Nutrition Goal Profiles
CREATE TABLE public.nutrition_goal_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Default',
  calories INTEGER NOT NULL DEFAULT 2000,
  protein_g INTEGER NOT NULL DEFAULT 150,
  carbs_g INTEGER NOT NULL DEFAULT 250,
  fat_g INTEGER NOT NULL DEFAULT 65,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.nutrition_goal_profiles ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX idx_nutrition_goal_profiles_user_default ON public.nutrition_goal_profiles(user_id) WHERE is_default = true;

CREATE POLICY "Users manage own goal profiles" ON public.nutrition_goal_profiles FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins read all goal profiles" ON public.nutrition_goal_profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin', 'global'));

-- 2) Foods Library
CREATE TABLE public.foods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT,
  barcode TEXT,
  serving_size_g NUMERIC(10,2) DEFAULT 100,
  calories_per_100g NUMERIC(10,2) DEFAULT 0,
  protein_per_100g NUMERIC(10,2) DEFAULT 0,
  carbs_per_100g NUMERIC(10,2) DEFAULT 0,
  fat_per_100g NUMERIC(10,2) DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'user',
  external_id TEXT,
  raw_payload JSONB,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_foods_barcode ON public.foods(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_foods_name_trgm ON public.foods USING gin(name gin_trgm_ops);
CREATE INDEX idx_foods_source ON public.foods(source);
CREATE INDEX idx_foods_external_id ON public.foods(source, external_id) WHERE external_id IS NOT NULL;

CREATE POLICY "Anyone can read approved foods" ON public.foods FOR SELECT USING (is_approved = true OR created_by = auth.uid() OR public.has_role(auth.uid(), 'admin', 'global'));
CREATE POLICY "Users can create foods" ON public.foods FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users update own unapproved foods" ON public.foods FOR UPDATE USING (created_by = auth.uid() AND is_approved = false);
CREATE POLICY "Admins manage all foods" ON public.foods FOR ALL USING (public.has_role(auth.uid(), 'admin', 'global'));

-- 3) Meal Templates
CREATE TABLE public.meal_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  fingerprint TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.meal_templates ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_meal_templates_fingerprint ON public.meal_templates(fingerprint) WHERE fingerprint IS NOT NULL;

CREATE POLICY "Read approved or own templates" ON public.meal_templates FOR SELECT USING ((is_approved = true AND is_public = true) OR created_by = auth.uid() OR public.has_role(auth.uid(), 'admin', 'global'));
CREATE POLICY "Users create own templates" ON public.meal_templates FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users update own unapproved templates" ON public.meal_templates FOR UPDATE USING (created_by = auth.uid() AND is_approved = false);
CREATE POLICY "Users delete own unapproved templates" ON public.meal_templates FOR DELETE USING (created_by = auth.uid() AND is_approved = false);
CREATE POLICY "Admins manage all templates" ON public.meal_templates FOR ALL USING (public.has_role(auth.uid(), 'admin', 'global'));

-- 4) Meal Template Items
CREATE TABLE public.meal_template_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meal_template_id UUID NOT NULL REFERENCES public.meal_templates(id) ON DELETE CASCADE,
  food_id UUID NOT NULL REFERENCES public.foods(id) ON DELETE CASCADE,
  quantity_grams NUMERIC(10,2) NOT NULL DEFAULT 100,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.meal_template_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read items of readable templates" ON public.meal_template_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.meal_templates mt WHERE mt.id = meal_template_id AND ((mt.is_approved AND mt.is_public) OR mt.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin', 'global')))
);
CREATE POLICY "Users manage items of own templates" ON public.meal_template_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.meal_templates mt WHERE mt.id = meal_template_id AND mt.created_by = auth.uid())
);
CREATE POLICY "Admins manage all template items" ON public.meal_template_items FOR ALL USING (public.has_role(auth.uid(), 'admin', 'global'));

-- 5) Nutrition Days
CREATE TABLE public.nutrition_days (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  goal_profile_id UUID REFERENCES public.nutrition_goal_profiles(id) ON DELETE SET NULL,
  total_calories NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_protein_g NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_carbs_g NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_fat_g NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);
ALTER TABLE public.nutrition_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own days" ON public.nutrition_days FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins read all days" ON public.nutrition_days FOR SELECT USING (public.has_role(auth.uid(), 'admin', 'global'));

-- 6) Nutrition Meals
CREATE TABLE public.nutrition_meals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nutrition_day_id UUID NOT NULL REFERENCES public.nutrition_days(id) ON DELETE CASCADE,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snacks')),
  total_calories NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_protein_g NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_carbs_g NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_fat_g NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(nutrition_day_id, meal_type)
);
ALTER TABLE public.nutrition_meals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own meals" ON public.nutrition_meals FOR ALL USING (
  EXISTS (SELECT 1 FROM public.nutrition_days nd WHERE nd.id = nutrition_day_id AND nd.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.nutrition_days nd WHERE nd.id = nutrition_day_id AND nd.user_id = auth.uid())
);
CREATE POLICY "Admins read all meals" ON public.nutrition_meals FOR SELECT USING (public.has_role(auth.uid(), 'admin', 'global'));

-- 7) Nutrition Log Entries
CREATE TABLE public.nutrition_log_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nutrition_meal_id UUID NOT NULL REFERENCES public.nutrition_meals(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL DEFAULT 'food' CHECK (entry_type IN ('food', 'meal_template')),
  food_id UUID REFERENCES public.foods(id) ON DELETE SET NULL,
  meal_template_id UUID REFERENCES public.meal_templates(id) ON DELETE SET NULL,
  food_name TEXT,
  quantity_grams NUMERIC(10,2) DEFAULT 100,
  servings NUMERIC(10,2) DEFAULT 1,
  computed_calories NUMERIC(10,2) NOT NULL DEFAULT 0,
  computed_protein_g NUMERIC(10,2) NOT NULL DEFAULT 0,
  computed_carbs_g NUMERIC(10,2) NOT NULL DEFAULT 0,
  computed_fat_g NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.nutrition_log_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own entries" ON public.nutrition_log_entries FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.nutrition_meals nm 
    JOIN public.nutrition_days nd ON nd.id = nm.nutrition_day_id 
    WHERE nm.id = nutrition_meal_id AND nd.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.nutrition_meals nm 
    JOIN public.nutrition_days nd ON nd.id = nm.nutrition_day_id 
    WHERE nm.id = nutrition_meal_id AND nd.user_id = auth.uid()
  )
);
CREATE POLICY "Admins read all entries" ON public.nutrition_log_entries FOR SELECT USING (public.has_role(auth.uid(), 'admin', 'global'));

-- 8) Nutrition Submissions
CREATE TABLE public.nutrition_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('food', 'meal_template')),
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'merged')),
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_notes TEXT,
  target_food_id UUID REFERENCES public.foods(id) ON DELETE SET NULL,
  target_meal_template_id UUID REFERENCES public.meal_templates(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);
ALTER TABLE public.nutrition_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own submissions" ON public.nutrition_submissions FOR SELECT USING (submitted_by = auth.uid() OR public.has_role(auth.uid(), 'admin', 'global'));
CREATE POLICY "Users create submissions" ON public.nutrition_submissions FOR INSERT WITH CHECK (auth.uid() = submitted_by);
CREATE POLICY "Admins manage all submissions" ON public.nutrition_submissions FOR ALL USING (public.has_role(auth.uid(), 'admin', 'global'));

-- 9) Nutrition Favorites
CREATE TABLE public.nutrition_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('food', 'meal_template')),
  food_id UUID REFERENCES public.foods(id) ON DELETE CASCADE,
  meal_template_id UUID REFERENCES public.meal_templates(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.nutrition_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own favorites" ON public.nutrition_favorites FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 10) Admin Config: API Providers
CREATE TABLE public.nutrition_api_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  priority INTEGER NOT NULL DEFAULT 0,
  api_key_encrypted TEXT,
  base_url TEXT,
  rate_limit_per_min INTEGER DEFAULT 60,
  last_ok_at TIMESTAMPTZ,
  last_error TEXT,
  call_count_24h INTEGER DEFAULT 0,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.nutrition_api_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage providers" ON public.nutrition_api_providers FOR ALL USING (public.has_role(auth.uid(), 'admin', 'global'));

INSERT INTO public.nutrition_api_providers (provider_key, display_name, is_enabled, priority, base_url) VALUES
  ('open_food_facts', 'Open Food Facts', true, 1, 'https://world.openfoodfacts.org/api/v2'),
  ('usda_fdc', 'USDA FoodData Central', true, 2, 'https://api.nal.usda.gov/fdc/v1');

-- 11) Admin Config: Mapping Rules
CREATE TABLE public.nutrition_mapping_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_key TEXT NOT NULL REFERENCES public.nutrition_api_providers(provider_key) ON DELETE CASCADE,
  rule_version TEXT NOT NULL DEFAULT '1.0',
  mapping_json JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.nutrition_mapping_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage mapping rules" ON public.nutrition_mapping_rules FOR ALL USING (public.has_role(auth.uid(), 'admin', 'global'));

INSERT INTO public.nutrition_mapping_rules (provider_key, rule_version, mapping_json, is_active) VALUES
('open_food_facts', '1.0', '{"provider":"open_food_facts","version":"1.0","bases":{"preferred_basis":"per_100g","supported_bases":["per_100g","per_serving"],"serving_size_path":"$.product.serving_quantity"},"fields":{"name":{"paths":["$.product.product_name","$.product.product_name_en"],"transform":"trim"},"brand":{"paths":["$.product.brands"],"transform":"trim"},"barcode":{"paths":["$.code"],"transform":"trim"},"calories_kcal":{"basis_paths":{"per_100g":["$.product.nutriments.energy-kcal_100g"],"per_serving":["$.product.nutriments.energy-kcal_serving"]},"unit":"kcal"},"protein_g":{"basis_paths":{"per_100g":["$.product.nutriments.proteins_100g"],"per_serving":["$.product.nutriments.proteins_serving"]},"unit":"g"},"carbs_g":{"basis_paths":{"per_100g":["$.product.nutriments.carbohydrates_100g"],"per_serving":["$.product.nutriments.carbohydrates_serving"]},"unit":"g"},"fat_g":{"basis_paths":{"per_100g":["$.product.nutriments.fat_100g"],"per_serving":["$.product.nutriments.fat_serving"]},"unit":"g"}},"conversions":{"kj_to_kcal":0.239005736},"validation":{"require_name":true,"require_any_macro":true}}'::jsonb, true),
('usda_fdc', '1.0', '{"provider":"usda_fdc","version":"1.0","bases":{"preferred_basis":"per_100g","supported_bases":["per_100g"]},"fields":{"name":{"paths":["$.description"],"transform":"trim"},"brand":{"paths":["$.brandOwner","$.brandName"],"transform":"trim"},"barcode":{"paths":["$.gtinUpc"],"transform":"trim"},"calories_kcal":{"basis_paths":{"per_100g":["$.foodNutrients[?(@.nutrientId==1008)].value"]},"unit":"kcal"},"protein_g":{"basis_paths":{"per_100g":["$.foodNutrients[?(@.nutrientId==1003)].value"]},"unit":"g"},"carbs_g":{"basis_paths":{"per_100g":["$.foodNutrients[?(@.nutrientId==1005)].value"]},"unit":"g"},"fat_g":{"basis_paths":{"per_100g":["$.foodNutrients[?(@.nutrientId==1004)].value"]},"unit":"g"}},"validation":{"require_name":true,"require_any_macro":true}}'::jsonb, true);

-- 12) Admin Config: Matching Rules
CREATE TABLE public.nutrition_matching_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_version TEXT NOT NULL DEFAULT '1.0',
  settings_json JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.nutrition_matching_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage matching rules" ON public.nutrition_matching_rules FOR ALL USING (public.has_role(auth.uid(), 'admin', 'global'));

INSERT INTO public.nutrition_matching_rules (rule_version, settings_json, is_active) VALUES
('1.0', '{"version":"1.0","normalization":{"name":{"lowercase":true,"trim":true,"collapse_whitespace":true,"remove_patterns":[],"replace_map":[{"pattern":"&","replacement":"and"}]},"brand":{"lowercase":true,"trim":true,"collapse_whitespace":true,"remove_patterns":[],"replace_map":[]}},"matching":{"hard_match":{"barcode":true,"external_id":true},"soft_match":{"fields":["name","brand","macros"],"weights":{"name":0.65,"brand":0.15,"macros":0.2}},"thresholds":{"suggest_merge":0.82,"auto_merge_block":0.95},"macro_tolerance":{"calories_kcal_per_100g":20,"protein_g_per_100g":2,"carbs_g_per_100g":3,"fat_g_per_100g":2}}}'::jsonb, true);

-- 13) Admin Config: Fingerprint Settings
CREATE TABLE public.nutrition_fingerprint_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_version TEXT NOT NULL DEFAULT '1.0',
  settings_json JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.nutrition_fingerprint_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage fingerprint settings" ON public.nutrition_fingerprint_settings FOR ALL USING (public.has_role(auth.uid(), 'admin', 'global'));

INSERT INTO public.nutrition_fingerprint_settings (rule_version, settings_json, is_active) VALUES
('1.0', '{"version":"1.0","rounding":{"quantity_grams_step":1,"min_grams":0},"normalize":{"sort_by":"food_id","exclude_zero_quantities":true},"duplicate_rules":{"mode":"near","near_match_tolerance":{"ingredient_count_delta":0,"quantity_percent_delta":0.05}}}'::jsonb, true);

-- 14) Recalc function
CREATE OR REPLACE FUNCTION public.recalc_nutrition_meal_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_meal_id UUID;
  v_day_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_meal_id := OLD.nutrition_meal_id;
  ELSE
    v_meal_id := NEW.nutrition_meal_id;
  END IF;

  UPDATE public.nutrition_meals SET
    total_calories = COALESCE((SELECT SUM(computed_calories) FROM public.nutrition_log_entries WHERE nutrition_meal_id = v_meal_id), 0),
    total_protein_g = COALESCE((SELECT SUM(computed_protein_g) FROM public.nutrition_log_entries WHERE nutrition_meal_id = v_meal_id), 0),
    total_carbs_g = COALESCE((SELECT SUM(computed_carbs_g) FROM public.nutrition_log_entries WHERE nutrition_meal_id = v_meal_id), 0),
    total_fat_g = COALESCE((SELECT SUM(computed_fat_g) FROM public.nutrition_log_entries WHERE nutrition_meal_id = v_meal_id), 0),
    updated_at = now()
  WHERE id = v_meal_id
  RETURNING nutrition_day_id INTO v_day_id;

  IF v_day_id IS NOT NULL THEN
    UPDATE public.nutrition_days SET
      total_calories = COALESCE((SELECT SUM(total_calories) FROM public.nutrition_meals WHERE nutrition_day_id = v_day_id), 0),
      total_protein_g = COALESCE((SELECT SUM(total_protein_g) FROM public.nutrition_meals WHERE nutrition_day_id = v_day_id), 0),
      total_carbs_g = COALESCE((SELECT SUM(total_carbs_g) FROM public.nutrition_meals WHERE nutrition_day_id = v_day_id), 0),
      total_fat_g = COALESCE((SELECT SUM(total_fat_g) FROM public.nutrition_meals WHERE nutrition_day_id = v_day_id), 0),
      updated_at = now()
    WHERE id = v_day_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_recalc_nutrition_totals
AFTER INSERT OR UPDATE OR DELETE ON public.nutrition_log_entries
FOR EACH ROW EXECUTE FUNCTION public.recalc_nutrition_meal_totals();

-- 15) Drop old nutrition_entries table if it exists
DROP TABLE IF EXISTS public.nutrition_entries;

-- 16) Updated_at triggers
CREATE TRIGGER update_nutrition_goal_profiles_updated_at BEFORE UPDATE ON public.nutrition_goal_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_foods_updated_at BEFORE UPDATE ON public.foods FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_meal_templates_updated_at BEFORE UPDATE ON public.meal_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_nutrition_days_updated_at BEFORE UPDATE ON public.nutrition_days FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_nutrition_meals_updated_at BEFORE UPDATE ON public.nutrition_meals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_nutrition_api_providers_updated_at BEFORE UPDATE ON public.nutrition_api_providers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_nutrition_mapping_rules_updated_at BEFORE UPDATE ON public.nutrition_mapping_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_nutrition_matching_rules_updated_at BEFORE UPDATE ON public.nutrition_matching_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_nutrition_fingerprint_settings_updated_at BEFORE UPDATE ON public.nutrition_fingerprint_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
