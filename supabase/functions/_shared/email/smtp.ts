/**
 * SMTP email sender for Supabase Edge Functions.
 * Loads SMTP config from the smtp_config DB table, decrypts password,
 * and sends email via denomailer.
 *
 * NOTE: Supabase Edge Functions (Deno Deploy) block ports 25, 465, 587.
 * Use port 2525 or another non-standard port for your SMTP relay.
 */

import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { getServiceClient } from "../supabase.ts";
import { decryptPassword } from "./crypto.ts";

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  from_name: string;
  from_email: string;
  reply_to: string | null;
  enabled: boolean;
  updated_at: string;
  updated_by: string | null;
}

export interface SendMailParams {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export interface SendMailResult {
  success: boolean;
  error?: string;
}

/** Load SMTP config from DB (service-role access). */
export async function loadSmtpConfig(): Promise<
  (SmtpConfig & { encrypted_password: string; password_iv: string }) | null
> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("smtp_config")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to load SMTP config:", error.message);
    return null;
  }
  return data as any;
}

/** Send an email using the stored SMTP configuration. */
export async function sendSmtpEmail(params: SendMailParams): Promise<SendMailResult> {
  const config = await loadSmtpConfig();

  if (!config) {
    return { success: false, error: "SMTP not configured. Please configure SMTP settings in the admin portal." };
  }

  if (!config.enabled) {
    return { success: false, error: "SMTP is disabled. Enable it in the admin portal." };
  }

  if (!config.host || !config.from_email) {
    return { success: false, error: "SMTP configuration incomplete (missing host or from_email)." };
  }

  let password = "";
  try {
    if (config.encrypted_password && config.password_iv) {
      password = await decryptPassword(config.encrypted_password, config.password_iv);
    }
  } catch (err) {
    console.error("Failed to decrypt SMTP password");
    return { success: false, error: "Failed to decrypt SMTP credentials." };
  }

  const TIMEOUT_MS = 15_000;
  const timeoutController = new AbortController();
  const timer = setTimeout(() => timeoutController.abort(), TIMEOUT_MS);

  try {
    const client = new SMTPClient({
      connection: {
        hostname: config.host,
        port: config.port,
        tls: config.secure,
        auth: config.username
          ? { username: config.username, password }
          : undefined,
      },
    });

    const from = config.from_name
      ? `${config.from_name} <${config.from_email}>`
      : config.from_email;

    await client.send({
      from,
      to: params.to,
      subject: params.subject,
      content: "auto",
      html: params.html,
    });

    await client.close();

    console.log(`Email sent successfully to ${params.to}`);
    return { success: true };
  } catch (err: any) {
    const message = err.message || "SMTP send failed";
    // Never log full SMTP errors (may contain creds in some edge cases)
    console.error(`SMTP send error: ${message.substring(0, 200)}`);
    return { success: false, error: message };
  } finally {
    clearTimeout(timer);
  }
}

/** Test SMTP connectivity without sending an email. */
export async function testSmtpConnection(): Promise<{ success: boolean; error?: string }> {
  const config = await loadSmtpConfig();

  if (!config) {
    return { success: false, error: "SMTP not configured." };
  }

  if (!config.host) {
    return { success: false, error: "SMTP host not set." };
  }

  let password = "";
  try {
    if (config.encrypted_password && config.password_iv) {
      password = await decryptPassword(config.encrypted_password, config.password_iv);
    }
  } catch {
    return { success: false, error: "Failed to decrypt SMTP credentials." };
  }

  try {
    const client = new SMTPClient({
      connection: {
        hostname: config.host,
        port: config.port,
        tls: config.secure,
        auth: config.username
          ? { username: config.username, password }
          : undefined,
      },
    });

    // Just connecting and closing tests the handshake
    await client.close();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message?.substring(0, 200) || "Connection failed" };
  }
}
