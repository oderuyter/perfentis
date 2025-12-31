import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

type ThemeMode = "system" | "light" | "dark";
type AccentColor = "sage" | "mint" | "ocean" | "lavender" | "coral" | "gold";

interface ThemeContextValue {
  mode: ThemeMode;
  accent: AccentColor;
  resolvedTheme: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: AccentColor) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_STORAGE_KEY = "flow-theme-mode";
const ACCENT_STORAGE_KEY = "flow-accent-color";

export const accentColors: { value: AccentColor; label: string; color: string }[] = [
  { value: "sage", label: "Sage", color: "hsl(158 35% 45%)" },
  { value: "mint", label: "Mint", color: "hsl(168 45% 48%)" },
  { value: "ocean", label: "Ocean", color: "hsl(200 50% 50%)" },
  { value: "lavender", label: "Lavender", color: "hsl(270 40% 55%)" },
  { value: "coral", label: "Coral", color: "hsl(15 65% 55%)" },
  { value: "gold", label: "Gold", color: "hsl(45 70% 50%)" },
];

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "system";
    return (localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode) || "system";
  });
  
  const [accent, setAccentState] = useState<AccentColor>(() => {
    if (typeof window === "undefined") return "sage";
    return (localStorage.getItem(ACCENT_STORAGE_KEY) as AccentColor) || "sage";
  });
  
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() => {
    if (mode === "system") return getSystemTheme();
    return mode;
  });

  // Apply theme class to document
  const applyTheme = useCallback((theme: "light" | "dark") => {
    const root = document.documentElement;
    
    // Prevent flash by temporarily disabling transitions
    root.classList.add("no-transitions");
    
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    
    // Re-enable transitions after a short delay
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        root.classList.remove("no-transitions");
      });
    });
    
    setResolvedTheme(theme);
  }, []);

  // Apply accent color to document
  const applyAccent = useCallback((color: AccentColor) => {
    document.documentElement.setAttribute("data-accent", color);
  }, []);

  // Set mode handler
  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem(THEME_STORAGE_KEY, newMode);
    
    const theme = newMode === "system" ? getSystemTheme() : newMode;
    applyTheme(theme);
  }, [applyTheme]);

  // Set accent handler
  const setAccent = useCallback((newAccent: AccentColor) => {
    setAccentState(newAccent);
    localStorage.setItem(ACCENT_STORAGE_KEY, newAccent);
    applyAccent(newAccent);
  }, [applyAccent]);

  // Initialize on mount
  useEffect(() => {
    const theme = mode === "system" ? getSystemTheme() : mode;
    applyTheme(theme);
    applyAccent(accent);
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    if (mode !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    
    const handleChange = (e: MediaQueryListEvent) => {
      applyTheme(e.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [mode, applyTheme]);

  return (
    <ThemeContext.Provider value={{ mode, accent, resolvedTheme, setMode, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
