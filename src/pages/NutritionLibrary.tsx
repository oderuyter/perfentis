import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, Filter, Heart, ArrowLeft, BookTemplate, Apple, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface LibraryFood {
  id: string;
  name: string;
  brand: string | null;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  source: string;
  is_approved: boolean;
}

interface LibraryTemplate {
  id: string;
  name: string;
  description: string | null;
  tags: string[] | null;
  is_approved: boolean;
  is_public: boolean;
  created_by: string | null;
  item_count?: number;
}

export default function NutritionLibrary() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("foods");
  const [searchQuery, setSearchQuery] = useState("");
  const [foods, setFoods] = useState<LibraryFood[]>([]);
  const [templates, setTemplates] = useState<LibraryTemplate[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [macroFilter, setMacroFilter] = useState<"all" | "high_protein" | "low_carb" | "low_fat">("all");

  const fetchFoods = useCallback(async () => {
    let query = supabase
      .from("foods")
      .select("id, name, brand, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, source, is_approved")
      .eq("is_approved", true)
      .order("name")
      .limit(50);

    if (searchQuery.trim()) {
      query = query.or(`name.ilike.%${searchQuery}%,brand.ilike.%${searchQuery}%`);
    }

    const { data } = await query;
    let results = (data || []) as unknown as LibraryFood[];

    // Apply macro filters
    if (macroFilter === "high_protein") {
      results = results.filter((f) => Number(f.protein_per_100g) >= 20);
    } else if (macroFilter === "low_carb") {
      results = results.filter((f) => Number(f.carbs_per_100g) <= 10);
    } else if (macroFilter === "low_fat") {
      results = results.filter((f) => Number(f.fat_per_100g) <= 5);
    }

    setFoods(results);
  }, [searchQuery, macroFilter]);

  const fetchTemplates = useCallback(async () => {
    let query = supabase
      .from("meal_templates")
      .select("id, name, description, tags, is_approved, is_public, created_by")
      .eq("is_approved", true)
      .eq("is_public", true)
      .order("name")
      .limit(50);

    if (searchQuery.trim()) {
      query = query.ilike("name", `%${searchQuery}%`);
    }

    const { data } = await query;
    setTemplates((data || []) as unknown as LibraryTemplate[]);
  }, [searchQuery]);

  const fetchFavorites = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("nutrition_favorites")
      .select("food_id, meal_template_id, item_type")
      .eq("user_id", user.id);

    const favSet = new Set<string>();
    (data || []).forEach((f: any) => {
      if (f.food_id) favSet.add(f.food_id);
      if (f.meal_template_id) favSet.add(f.meal_template_id);
    });
    setFavorites(favSet);
  }, [user]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchFoods(), fetchTemplates(), fetchFavorites()]);
    setLoading(false);
  }, [fetchFoods, fetchTemplates, fetchFavorites]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const toggleFavorite = async (itemId: string, itemType: "food" | "meal_template") => {
    if (!user) return;
    const isFav = favorites.has(itemId);

    if (isFav) {
      const col = itemType === "food" ? "food_id" : "meal_template_id";
      await supabase
        .from("nutrition_favorites")
        .delete()
        .eq("user_id", user.id)
        .eq(col, itemId);
      setFavorites((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    } else {
      await supabase.from("nutrition_favorites").insert({
        user_id: user.id,
        item_type: itemType,
        ...(itemType === "food" ? { food_id: itemId } : { meal_template_id: itemId }),
      });
      setFavorites((prev) => new Set(prev).add(itemId));
    }
  };

  const macroFilters = [
    { key: "all", label: "All" },
    { key: "high_protein", label: "High Protein" },
    { key: "low_carb", label: "Low Carb" },
    { key: "low_fat", label: "Low Fat" },
  ] as const;

  return (
    <div className="min-h-screen px-4 pb-footer-safe">
      <header className="pt-5 pb-3 flex items-center gap-3">
        <button
          onClick={() => navigate("/nutrition")}
          className="p-2 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xl font-semibold tracking-tight"
          >
            Community Library
          </motion.h1>
          <p className="text-muted-foreground text-xs">
            Browse approved foods & meal templates
          </p>
        </div>
      </header>

      {/* Search */}
      <div className="relative mt-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search foods & templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Macro Filters */}
      <div className="flex gap-1.5 mt-3 overflow-x-auto no-scrollbar">
        {macroFilters.map((f) => (
          <button
            key={f.key}
            onClick={() => setMacroFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              macroFilter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mt-4">
        <TabsList className="w-full">
          <TabsTrigger value="foods" className="flex-1 text-xs">
            <Apple className="h-3.5 w-3.5 mr-1" />
            Foods
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex-1 text-xs">
            <BookTemplate className="h-3.5 w-3.5 mr-1" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="favorites" className="flex-1 text-xs">
            <Star className="h-3.5 w-3.5 mr-1" />
            Favorites
          </TabsTrigger>
        </TabsList>

        <TabsContent value="foods" className="mt-3 space-y-1.5">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : foods.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No foods found</p>
          ) : (
            foods.map((food) => (
              <FoodRow
                key={food.id}
                food={food}
                isFav={favorites.has(food.id)}
                onToggleFav={() => toggleFavorite(food.id, "food")}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="templates" className="mt-3 space-y-1.5">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : templates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No templates found</p>
          ) : (
            templates.map((t) => (
              <TemplateRow
                key={t.id}
                template={t}
                isFav={favorites.has(t.id)}
                onToggleFav={() => toggleFavorite(t.id, "meal_template")}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="favorites" className="mt-3 space-y-1.5">
          {foods.filter((f) => favorites.has(f.id)).length === 0 &&
          templates.filter((t) => favorites.has(t.id)).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No favorites yet. Tap the heart icon to save items.
            </p>
          ) : (
            <>
              {foods
                .filter((f) => favorites.has(f.id))
                .map((food) => (
                  <FoodRow
                    key={food.id}
                    food={food}
                    isFav={true}
                    onToggleFav={() => toggleFavorite(food.id, "food")}
                  />
                ))}
              {templates
                .filter((t) => favorites.has(t.id))
                .map((t) => (
                  <TemplateRow
                    key={t.id}
                    template={t}
                    isFav={true}
                    onToggleFav={() => toggleFavorite(t.id, "meal_template")}
                  />
                ))}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FoodRow({
  food,
  isFav,
  onToggleFav,
}: {
  food: LibraryFood;
  isFav: boolean;
  onToggleFav: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/30">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{food.name}</p>
        <p className="text-[10px] text-muted-foreground">
          {food.brand && `${food.brand} · `}
          {Number(food.protein_per_100g).toFixed(0)}P · {Number(food.carbs_per_100g).toFixed(0)}C · {Number(food.fat_per_100g).toFixed(0)}F
        </p>
      </div>
      <span className="text-xs font-medium tabular-nums whitespace-nowrap">
        {Number(food.calories_per_100g).toFixed(0)} kcal
      </span>
      <button onClick={onToggleFav} className="p-1.5">
        <Heart
          className={`h-4 w-4 transition-colors ${
            isFav ? "fill-primary text-primary" : "text-muted-foreground"
          }`}
        />
      </button>
    </div>
  );
}

function TemplateRow({
  template,
  isFav,
  onToggleFav,
}: {
  template: LibraryTemplate;
  isFav: boolean;
  onToggleFav: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/30">
      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <BookTemplate className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{template.name}</p>
        {template.description && (
          <p className="text-[10px] text-muted-foreground truncate">{template.description}</p>
        )}
        {template.tags && template.tags.length > 0 && (
          <div className="flex gap-1 mt-0.5">
            {template.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[9px] h-4 px-1.5">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
      <button onClick={onToggleFav} className="p-1.5">
        <Heart
          className={`h-4 w-4 transition-colors ${
            isFav ? "fill-primary text-primary" : "text-muted-foreground"
          }`}
        />
      </button>
    </div>
  );
}
