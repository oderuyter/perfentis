import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Fingerprint, Merge, X, RefreshCw, ArrowRight } from "lucide-react";

interface DuplicateGroup {
  fingerprint: string;
  templates: {
    id: string;
    name: string;
    created_by: string | null;
    is_approved: boolean;
    created_at: string;
  }[];
}

interface SimilarFoodPair {
  foodA: {
    id: string;
    name: string;
    brand: string | null;
    barcode: string | null;
    calories_per_100g: number;
  };
  foodB: {
    id: string;
    name: string;
    brand: string | null;
    barcode: string | null;
    calories_per_100g: number;
  };
  reason: string;
  score: number;
}

export function AdminDuplicateDetection() {
  const [duplicateTemplates, setDuplicateTemplates] = useState<DuplicateGroup[]>([]);
  const [similarFoods, setSimilarFoods] = useState<SimilarFoodPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    fetchDuplicates();
  }, []);

  const fetchDuplicates = async () => {
    setLoading(true);

    // Find duplicate fingerprints in meal_templates
    const { data: templates } = await supabase
      .from("meal_templates")
      .select("id, name, fingerprint, created_by, is_approved, created_at")
      .not("fingerprint", "is", null)
      .order("fingerprint");

    const groups: Record<string, DuplicateGroup["templates"]> = {};
    (templates || []).forEach((t: any) => {
      if (!t.fingerprint) return;
      if (!groups[t.fingerprint]) groups[t.fingerprint] = [];
      groups[t.fingerprint].push(t);
    });

    const dupGroups: DuplicateGroup[] = Object.entries(groups)
      .filter(([, items]) => items.length > 1)
      .map(([fingerprint, items]) => ({ fingerprint, templates: items }));

    setDuplicateTemplates(dupGroups);
    setLoading(false);
  };

  const scanForSimilarFoods = async () => {
    setScanning(true);
    try {
      // Get foods with barcode
      const { data: barcodeFoods } = await supabase
        .from("foods")
        .select("id, name, brand, barcode, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g")
        .not("barcode", "is", null)
        .order("barcode")
        .limit(500);

      const pairs: SimilarFoodPair[] = [];

      // Detect exact barcode duplicates
      const barcodeMap: Record<string, any[]> = {};
      (barcodeFoods || []).forEach((f: any) => {
        if (!f.barcode) return;
        if (!barcodeMap[f.barcode]) barcodeMap[f.barcode] = [];
        barcodeMap[f.barcode].push(f);
      });

      Object.entries(barcodeMap).forEach(([barcode, items]) => {
        if (items.length > 1) {
          for (let i = 0; i < items.length - 1; i++) {
            pairs.push({
              foodA: items[i],
              foodB: items[i + 1],
              reason: `Same barcode: ${barcode}`,
              score: 1.0,
            });
          }
        }
      });

      // Get all foods for name similarity (limited)
      const { data: allFoods } = await supabase
        .from("foods")
        .select("id, name, brand, barcode, calories_per_100g")
        .order("name")
        .limit(200);

      const foods = allFoods || [];
      for (let i = 0; i < foods.length; i++) {
        for (let j = i + 1; j < foods.length; j++) {
          const a = foods[i] as any;
          const b = foods[j] as any;
          if (a.id === b.id) continue;

          const nameA = (a.name || "").toLowerCase().trim();
          const nameB = (b.name || "").toLowerCase().trim();

          // Exact name match
          if (nameA === nameB && nameA.length > 2) {
            const existing = pairs.find(
              (p) =>
                (p.foodA.id === a.id && p.foodB.id === b.id) ||
                (p.foodA.id === b.id && p.foodB.id === a.id)
            );
            if (!existing) {
              pairs.push({
                foodA: a,
                foodB: b,
                reason: "Exact name match",
                score: 0.95,
              });
            }
          }
        }
      }

      setSimilarFoods(pairs.sort((a, b) => b.score - a.score).slice(0, 50));
    } catch {
      toast.error("Scan failed");
    } finally {
      setScanning(false);
    }
  };

  const mergeFoods = async (keepId: string, removeId: string) => {
    // Update all entries referencing removeId to keepId
    const { error: updateError } = await supabase
      .from("nutrition_log_entries")
      .update({ food_id: keepId })
      .eq("food_id", removeId);

    if (updateError) {
      toast.error("Failed to update references");
      return;
    }

    // Update meal_template_items
    await supabase
      .from("meal_template_items")
      .update({ food_id: keepId })
      .eq("food_id", removeId);

    // Delete the duplicate
    const { error: deleteError } = await supabase.from("foods").delete().eq("id", removeId);

    if (deleteError) {
      toast.error("Failed to delete duplicate");
      return;
    }

    toast.success("Foods merged");
    setSimilarFoods((prev) =>
      prev.filter((p) => p.foodA.id !== removeId && p.foodB.id !== removeId)
    );
  };

  const dismissPair = (foodAId: string, foodBId: string) => {
    setSimilarFoods((prev) =>
      prev.filter(
        (p) =>
          !(p.foodA.id === foodAId && p.foodB.id === foodBId) &&
          !(p.foodA.id === foodBId && p.foodB.id === foodAId)
      )
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Template Duplicates */}
      <div>
        <h3 className="text-sm font-semibold mb-3">
          Template Fingerprint Duplicates ({duplicateTemplates.length})
        </h3>
        {duplicateTemplates.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            No duplicate templates detected
          </p>
        ) : (
          <div className="space-y-3">
            {duplicateTemplates.map((group) => (
              <Card key={group.fingerprint}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-mono flex items-center gap-2">
                    <Fingerprint className="h-3.5 w-3.5" />
                    {group.fingerprint.substring(0, 30)}...
                    <Badge variant="destructive" className="text-[10px] h-4">
                      {group.templates.length} duplicates
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {group.templates.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/20 text-xs"
                    >
                      <div>
                        <span className="font-medium">{t.name}</span>
                        <span className="text-muted-foreground ml-2">
                          {new Date(t.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {t.is_approved && (
                        <Badge variant="default" className="text-[10px] h-4">
                          Approved
                        </Badge>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Similar Foods */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">
            Similar Foods ({similarFoods.length})
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={scanForSimilarFoods}
            disabled={scanning}
            className="text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${scanning ? "animate-spin" : ""}`} />
            {scanning ? "Scanning..." : "Scan for Duplicates"}
          </Button>
        </div>

        {similarFoods.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            {scanning ? "Scanning..." : 'Click "Scan for Duplicates" to detect similar foods'}
          </p>
        ) : (
          <div className="space-y-2">
            {similarFoods.map((pair, idx) => (
              <Card key={`${pair.foodA.id}-${pair.foodB.id}-${idx}`}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-1 mb-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {pair.reason}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      Score: {pair.score.toFixed(2)}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                    <div className="p-2 rounded-lg bg-muted/20 text-xs">
                      <p className="font-medium truncate">{pair.foodA.name}</p>
                      <p className="text-muted-foreground text-[10px]">
                        {pair.foodA.brand || "No brand"} · {Number(pair.foodA.calories_per_100g).toFixed(0)} kcal
                      </p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    <div className="p-2 rounded-lg bg-muted/20 text-xs">
                      <p className="font-medium truncate">{pair.foodB.name}</p>
                      <p className="text-muted-foreground text-[10px]">
                        {pair.foodB.brand || "No brand"} · {Number(pair.foodB.calories_per_100g).toFixed(0)} kcal
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs flex-1"
                      onClick={() => mergeFoods(pair.foodA.id, pair.foodB.id)}
                    >
                      <Merge className="h-3 w-3 mr-1" />
                      Keep Left
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs flex-1"
                      onClick={() => mergeFoods(pair.foodB.id, pair.foodA.id)}
                    >
                      Keep Right
                      <Merge className="h-3 w-3 ml-1" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs"
                      onClick={() => dismissPair(pair.foodA.id, pair.foodB.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
