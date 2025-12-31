import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Outfit", "system-ui", "sans-serif"],
      },
      colors: {
        // Semantic surface colors
        surface: {
          bg: {
            primary: "hsl(var(--surface-bg-primary))",
            secondary: "hsl(var(--surface-bg-secondary))",
          },
          card: "hsl(var(--surface-card))",
          elevated: "hsl(var(--surface-elevated))",
          sunken: "hsl(var(--surface-sunken))",
          overlay: "hsl(var(--surface-overlay))",
        },
        // Semantic text colors
        content: {
          primary: "hsl(var(--text-primary))",
          secondary: "hsl(var(--text-secondary))",
          muted: "hsl(var(--text-muted))",
          inverse: "hsl(var(--text-inverse))",
          accent: "hsl(var(--text-accent))",
        },
        // Accent color tokens
        accent: {
          DEFAULT: "hsl(var(--accent-primary))",
          primary: "hsl(var(--accent-primary))",
          soft: "hsl(var(--accent-primary-soft))",
          subtle: "hsl(var(--accent-primary-subtle))",
          foreground: "hsl(var(--accent-on-primary))",
        },
        // Chart tokens
        chart: {
          line: "hsl(var(--chart-line-primary))",
          axis: "hsl(var(--chart-axis-muted))",
          bar: {
            active: "hsl(var(--chart-bar-active))",
            inactive: "hsl(var(--chart-bar-inactive))",
          },
        },
        // Shadcn compatibility
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        hr: {
          zone1: "hsl(var(--hr-zone-1))",
          zone2: "hsl(var(--hr-zone-2))",
          zone3: "hsl(var(--hr-zone-3))",
          zone4: "hsl(var(--hr-zone-4))",
          zone5: "hsl(var(--hr-zone-5))",
        },
      },
      borderRadius: {
        sm: "var(--radius-small)",
        DEFAULT: "var(--radius-medium)",
        md: "var(--radius-medium)",
        lg: "var(--radius-large)",
        xl: "var(--radius-large)",
        "2xl": "calc(var(--radius-large) + 0.5rem)",
        full: "var(--radius-full)",
      },
      boxShadow: {
        none: "var(--elevation-none)",
        sm: "var(--elevation-low)",
        DEFAULT: "var(--elevation-low)",
        md: "var(--elevation-medium)",
        lg: "var(--elevation-high)",
        card: "var(--elevation-low)",
        elevated: "var(--elevation-high)",
      },
      spacing: {
        "safe-bottom": "max(1rem, env(safe-area-inset-bottom))",
        "safe-top": "max(0.75rem, env(safe-area-inset-top))",
        "18": "4.5rem",
        "22": "5.5rem",
      },
      transitionDuration: {
        fast: "150ms",
        standard: "300ms",
        slow: "500ms",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
        gentle: "cubic-bezier(0.25, 0.1, 0.25, 1)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-up": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        "countdown": {
          from: { "stroke-dashoffset": "0" },
          to: { "stroke-dashoffset": "283" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "fade-up": "fade-up 0.4s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        "countdown": "countdown linear forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
