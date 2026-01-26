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
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      fontSize: {
        // Premium typography scale with refined tracking
        "display-xl": ["3rem", { lineHeight: "1.05", fontWeight: "700", letterSpacing: "-0.03em" }],
        "display": ["2.25rem", { lineHeight: "1.1", fontWeight: "700", letterSpacing: "-0.025em" }],
        "heading-lg": ["1.5rem", { lineHeight: "1.2", fontWeight: "600", letterSpacing: "-0.02em" }],
        "heading": ["1.25rem", { lineHeight: "1.25", fontWeight: "600", letterSpacing: "-0.015em" }],
        "heading-sm": ["1.125rem", { lineHeight: "1.3", fontWeight: "600", letterSpacing: "-0.01em" }],
        "body-lg": ["1rem", { lineHeight: "1.6", fontWeight: "400", letterSpacing: "-0.01em" }],
        "body": ["0.9375rem", { lineHeight: "1.6", fontWeight: "400", letterSpacing: "-0.005em" }],
        "body-sm": ["0.875rem", { lineHeight: "1.55", fontWeight: "400" }],
        "caption": ["0.8125rem", { lineHeight: "1.4", fontWeight: "500" }],
        "micro": ["0.75rem", { lineHeight: "1.35", fontWeight: "500" }],
        "label": ["0.6875rem", { lineHeight: "1.3", fontWeight: "600", letterSpacing: "0.04em" }],
        // Metric display (large numbers) with tabular figures feel
        "metric-xl": ["2.75rem", { lineHeight: "1", fontWeight: "700", letterSpacing: "-0.03em" }],
        "metric-lg": ["2rem", { lineHeight: "1", fontWeight: "700", letterSpacing: "-0.025em" }],
        "metric": ["1.5rem", { lineHeight: "1", fontWeight: "600", letterSpacing: "-0.02em" }],
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
          glow: "hsl(var(--accent-glow))",
        },
        // Status colors
        status: {
          success: "hsl(var(--status-success))",
          "success-soft": "hsl(var(--status-success-soft))",
          warning: "hsl(var(--status-warning))",
          "warning-soft": "hsl(var(--status-warning-soft))",
          error: "hsl(var(--status-error))",
          "error-soft": "hsl(var(--status-error-soft))",
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
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
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
        xs: "var(--radius-xs)",
        sm: "var(--radius-small)",
        DEFAULT: "var(--radius-medium)",
        md: "var(--radius-medium)",
        lg: "var(--radius-large)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
        "3xl": "calc(var(--radius-2xl) + 0.5rem)",
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
        glow: "var(--elevation-glow)",
      },
      spacing: {
        "safe-bottom": "max(1rem, env(safe-area-inset-bottom))",
        "safe-top": "max(0.75rem, env(safe-area-inset-top))",
        "4.5": "1.125rem",
        "18": "4.5rem",
        "22": "5.5rem",
      },
      zIndex: {
        // Layering system: drawers slide behind persistent header/footer
        "sheet-overlay": "50",
        "sheet": "60",
        "drawer": "70",
        "footer": "100",
        "header": "100",
      },
      transitionDuration: {
        fast: "150ms",
        standard: "250ms",
        slow: "400ms",
        gentle: "350ms",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
        gentle: "cubic-bezier(0.25, 0.1, 0.25, 1)",
        bounce: "cubic-bezier(0.34, 1.56, 0.64, 1)",
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
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-down": {
          from: { opacity: "0", transform: "translateY(-12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-up": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "slide-down": {
          from: { transform: "translateY(-100%)" },
          to: { transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        "glow": {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
        "countdown": {
          from: { "stroke-dashoffset": "0" },
          to: { "stroke-dashoffset": "283" },
        },
        "shimmer": {
          from: { backgroundPosition: "200% 0" },
          to: { backgroundPosition: "-200% 0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.25s ease-out",
        "accordion-up": "accordion-up 0.25s ease-out",
        "fade-in": "fade-in 0.35s ease-out",
        "fade-up": "fade-up 0.4s ease-out",
        "fade-down": "fade-down 0.4s ease-out",
        "scale-in": "scale-in 0.25s ease-out",
        "slide-up": "slide-up 0.35s ease-out",
        "slide-down": "slide-down 0.35s ease-out",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        "glow": "glow 2s ease-in-out infinite",
        "countdown": "countdown linear forwards",
        "shimmer": "shimmer 2.5s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;