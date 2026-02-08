import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ScanBarcode, Loader2, Check } from "lucide-react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Food, MealType } from "@/hooks/useNutrition";

const mealLabels: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snacks: "Snacks",
};

interface BarcodeScannerSheetProps {
  open: boolean;
  mealType: MealType;
  mealId: string;
  onClose: () => void;
  onAddFood: (mealId: string, food: Food, grams: number) => Promise<boolean>;
}

type ScanState = "scanning" | "looking_up" | "found" | "not_found" | "manual";

export function BarcodeScannerSheet({
  open,
  mealType,
  mealId,
  onClose,
  onAddFood,
}: BarcodeScannerSheetProps) {
  const [state, setState] = useState<ScanState>("scanning");
  const [food, setFood] = useState<Food | null>(null);
  const [quantity, setQuantity] = useState(100);
  const [manualBarcode, setManualBarcode] = useState("");
  const [scannedBarcode, setScannedBarcode] = useState("");

  const reset = () => {
    setState("scanning");
    setFood(null);
    setQuantity(100);
    setManualBarcode("");
    setScannedBarcode("");
  };

  const handleClose = () => {
    onClose();
    setTimeout(reset, 300);
  };

  const lookupBarcode = useCallback(async (barcode: string) => {
    if (!barcode) return;
    setScannedBarcode(barcode);
    setState("looking_up");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nutrition-lookup?action=barcode&barcode=${encodeURIComponent(barcode)}`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      const result = await resp.json();

      if (result.food) {
        // If external, cache it locally
        if (result.source !== "local" && result.food.name) {
          const { data: cached } = await supabase
            .from("foods")
            .insert({
              name: result.food.name,
              brand: result.food.brand,
              barcode: result.food.barcode || barcode,
              serving_size_g: result.food.serving_size_g || 100,
              calories_per_100g: result.food.calories_per_100g || 0,
              protein_per_100g: result.food.protein_per_100g || 0,
              carbs_per_100g: result.food.carbs_per_100g || 0,
              fat_per_100g: result.food.fat_per_100g || 0,
              source: result.source || "open_food_facts",
              external_id: result.food.external_id || barcode,
              raw_payload: result.food.raw_payload || null,
              is_approved: true,
            })
            .select()
            .single();
          if (cached) {
            setFood(cached as unknown as Food);
          } else {
            setFood(result.food as Food);
          }
        } else {
          setFood(result.food as Food);
        }
        setQuantity(Number(result.food.serving_size_g) || 100);
        setState("found");
      } else {
        setState("not_found");
      }
    } catch {
      toast.error("Lookup failed");
      setState("not_found");
    }
  }, []);

  const handleScan = useCallback(
    (detectedCodes: any[]) => {
      if (state !== "scanning" || !detectedCodes?.length) return;
      const code = detectedCodes[0]?.rawValue;
      if (code) lookupBarcode(code);
    },
    [state, lookupBarcode]
  );

  const handleConfirm = async () => {
    if (!food) return;
    const ok = await onAddFood(mealId, food, quantity);
    if (ok) handleClose();
  };

  const previewMacros = food
    ? {
        cal: ((Number(food.calories_per_100g) * quantity) / 100).toFixed(0),
        p: ((Number(food.protein_per_100g) * quantity) / 100).toFixed(1),
        c: ((Number(food.carbs_per_100g) * quantity) / 100).toFixed(1),
        f: ((Number(food.fat_per_100g) * quantity) / 100).toFixed(1),
      }
    : null;

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-[69]"
            onClick={handleClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-[70] shadow-elevated max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="p-4 pb-2 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <ScanBarcode className="h-4 w-4" />
                  Scan Barcode
                </h2>
                <p className="text-[10px] text-muted-foreground">
                  Add to {mealLabels[mealType]}
                </p>
              </div>
              <button onClick={handleClose} className="p-2 rounded-full bg-muted/50">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-footer-safe">
              {/* Camera Scanner */}
              {state === "scanning" && (
                <div className="space-y-3 py-3">
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
                    <Scanner
                      onScan={handleScan}
                      formats={["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39"]}
                      sound={false}
                      components={{ finder: true }}
                      styles={{ container: { width: "100%", height: "100%" } }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Point camera at barcode
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-border/30" />
                    <span className="text-[10px] text-muted-foreground">or enter manually</span>
                    <div className="flex-1 h-px bg-border/30" />
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter barcode..."
                      value={manualBarcode}
                      onChange={(e) => setManualBarcode(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={() => lookupBarcode(manualBarcode)}
                      disabled={!manualBarcode.trim()}
                    >
                      Look up
                    </Button>
                  </div>
                </div>
              )}

              {/* Loading */}
              {state === "looking_up" && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Looking up {scannedBarcode}...
                  </p>
                </div>
              )}

              {/* Not Found */}
              {state === "not_found" && (
                <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
                  <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center">
                    <ScanBarcode className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Not Found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Barcode {scannedBarcode} not in database
                    </p>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button variant="outline" size="sm" onClick={() => setState("scanning")}>
                      Try Again
                    </Button>
                  </div>
                </div>
              )}

              {/* Found - Preview */}
              {state === "found" && food && previewMacros && (
                <div className="space-y-5 py-3">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Check className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{food.name}</h3>
                      {food.brand && (
                        <p className="text-xs text-muted-foreground">{food.brand}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Barcode: {scannedBarcode}
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Amount (grams)</Label>
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value) || 0)}
                      className="text-center font-semibold mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center">
                    {[
                      { label: "Calories", val: previewMacros.cal, unit: "kcal" },
                      { label: "Protein", val: previewMacros.p, unit: "g" },
                      { label: "Carbs", val: previewMacros.c, unit: "g" },
                      { label: "Fat", val: previewMacros.f, unit: "g" },
                    ].map((m) => (
                      <div key={m.label} className="p-2.5 rounded-xl bg-muted/30">
                        <p className="text-lg font-bold tabular-nums">{m.val}</p>
                        <p className="text-[9px] text-muted-foreground">{m.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setState("scanning")}>
                      Scan Another
                    </Button>
                    <Button className="flex-1" onClick={handleConfirm}>
                      Add to {mealLabels[mealType]}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
