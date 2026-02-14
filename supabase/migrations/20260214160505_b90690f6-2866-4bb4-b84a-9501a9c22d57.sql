
-- Add new columns to email_template_versions for defaults, theme, and CTA overrides
ALTER TABLE public.email_template_versions
  ADD COLUMN IF NOT EXISTS defaults_json jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS theme_json jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS cta_defaults_json jsonb DEFAULT '{}'::jsonb;

-- Add global email theme settings to app_settings if not exists
INSERT INTO public.app_settings (category, settings)
VALUES ('email_theme', '{
  "primaryColor": "#6366f1",
  "secondaryColor": "#8b5cf6",
  "backgroundColor": "#f4f4f5",
  "surfaceColor": "#ffffff",
  "textPrimaryColor": "#374151",
  "textSecondaryColor": "#6b7280",
  "dividerColor": "#e5e7eb",
  "buttonTextColor": "#ffffff",
  "buttonRadius": "8px",
  "fontFamily": "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
}'::jsonb)
ON CONFLICT DO NOTHING;
