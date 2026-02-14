import { z } from "zod";

/**
 * Fail-fast validation of required frontend environment variables.
 * Imported once at app startup (main.tsx) so missing vars surface immediately.
 */
const envSchema = z.object({
  VITE_SUPABASE_URL: z
    .string({ required_error: "VITE_SUPABASE_URL is required" })
    .url("VITE_SUPABASE_URL must be a valid URL"),
  VITE_SUPABASE_PUBLISHABLE_KEY: z
    .string({ required_error: "VITE_SUPABASE_PUBLISHABLE_KEY is required" })
    .min(1, "VITE_SUPABASE_PUBLISHABLE_KEY must not be empty"),
  VITE_SUPABASE_PROJECT_ID: z
    .string({ required_error: "VITE_SUPABASE_PROJECT_ID is required" })
    .min(1, "VITE_SUPABASE_PROJECT_ID must not be empty"),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse({
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    VITE_SUPABASE_PROJECT_ID: import.meta.env.VITE_SUPABASE_PROJECT_ID,
  });

  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `\n❌ Missing or invalid environment variables:\n${formatted}\n\nSee .env.example for required values.\n`
    );
  }

  return result.data;
}

export const env = validateEnv();
