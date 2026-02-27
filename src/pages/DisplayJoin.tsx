import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Monitor, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function DisplayJoin() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const code = params.get("code") || "";
  const [status, setStatus] = useState<"loading" | "error" | "success">("loading");
  const [error, setError] = useState("");
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    if (!code) {
      setStatus("error");
      setError("No join code provided");
      return;
    }

    const resolve = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const res = await fetch(
          `${supabaseUrl}/functions/v1/display-lookup?join_code=${encodeURIComponent(code.toUpperCase())}`,
          { headers: { "Content-Type": "application/json" } }
        );
        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.session) {
          setStatus("error");
          setError(data.error || "Invalid or expired join code");
          return;
        }

        setDisplayName(data.display?.name || "Display");
        setStatus("success");

        // Store the resolved info for the SendToDisplay sheet
        sessionStorage.setItem("display_join_code", code.toUpperCase());
        sessionStorage.setItem("display_join_name", data.display?.name || "Display");
        sessionStorage.setItem("display_join_owner", data.display?.owner_name || "");

        // Redirect to home after brief success screen — user will connect from active workout
        setTimeout(() => navigate("/"), 2000);
      } catch {
        setStatus("error");
        setError("Failed to connect");
      }
    };

    resolve();
  }, [code, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      {status === "loading" && (
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium">Joining display…</p>
          <p className="text-sm text-muted-foreground mt-1">Code: {code}</p>
        </div>
      )}
      {status === "error" && (
        <div className="text-center">
          <Monitor className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Cannot Join</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      )}
      {status === "success" && (
        <div className="text-center">
          <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <Monitor className="h-8 w-8 text-emerald-500" />
          </div>
          <h1 className="text-xl font-semibold mb-2">Display Found</h1>
          <p className="text-muted-foreground">{displayName}</p>
          <p className="text-xs text-muted-foreground mt-2">Redirecting…</p>
        </div>
      )}
    </div>
  );
}
