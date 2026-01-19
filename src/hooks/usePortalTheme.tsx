import { useState, useEffect, createContext, useContext, ReactNode } from "react";

type PortalTheme = "light" | "dark" | "system";

interface PortalThemeContextValue {
  theme: PortalTheme;
  setTheme: (theme: PortalTheme) => void;
  resolvedTheme: "light" | "dark";
}

const PortalThemeContext = createContext<PortalThemeContextValue | null>(null);

interface PortalThemeProviderProps {
  children: ReactNode;
  portalKey: string; // unique key per portal (e.g., 'admin', 'gym', 'coach', 'event')
}

export function PortalThemeProvider({ children, portalKey }: PortalThemeProviderProps) {
  const storageKey = `portal-theme-${portalKey}`;
  
  const [theme, setThemeState] = useState<PortalTheme>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem(storageKey) as PortalTheme) || "system";
    }
    return "system";
  });

  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove old theme classes
    root.classList.remove("light", "dark");

    let resolved: "light" | "dark";
    if (theme === "system") {
      resolved = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } else {
      resolved = theme;
    }

    root.classList.add(resolved);
    setResolvedTheme(resolved);
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      const resolved = e.matches ? "dark" : "light";
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(resolved);
      setResolvedTheme(resolved);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  const setTheme = (newTheme: PortalTheme) => {
    localStorage.setItem(storageKey, newTheme);
    setThemeState(newTheme);
  };

  return (
    <PortalThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </PortalThemeContext.Provider>
  );
}

export function usePortalTheme() {
  const context = useContext(PortalThemeContext);
  if (!context) {
    throw new Error("usePortalTheme must be used within a PortalThemeProvider");
  }
  return context;
}

// Standalone hook for portals that don't want to use the provider
export function usePortalThemeStandalone(portalKey: string) {
  const storageKey = `portal-theme-${portalKey}`;
  
  const [theme, setThemeState] = useState<PortalTheme>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem(storageKey) as PortalTheme) || "system";
    }
    return "system";
  });

  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    let resolved: "light" | "dark";
    if (theme === "system") {
      resolved = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } else {
      resolved = theme;
    }

    root.classList.add(resolved);
    setResolvedTheme(resolved);
  }, [theme]);

  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      const resolved = e.matches ? "dark" : "light";
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(resolved);
      setResolvedTheme(resolved);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  const setTheme = (newTheme: PortalTheme) => {
    localStorage.setItem(storageKey, newTheme);
    setThemeState(newTheme);
  };

  return { theme, setTheme, resolvedTheme };
}
