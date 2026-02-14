/**
 * AES-256-GCM encryption/decryption for SMTP password storage.
 * Uses SMTP_ENCRYPTION_KEY env var (hex-encoded 32-byte key).
 */

function getEncryptionKey(): Uint8Array {
  const hex = Deno.env.get("SMTP_ENCRYPTION_KEY");
  if (!hex || hex.length !== 64) {
    throw new Error("SMTP_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)");
  }
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export async function encryptPassword(plaintext: string): Promise<{ encrypted: string; iv: string }> {
  const keyBytes = getEncryptionKey();
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt"]);

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);

  return {
    encrypted: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

export async function decryptPassword(encrypted: string, ivBase64: string): Promise<string> {
  const keyBytes = getEncryptionKey();
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);

  const ciphertext = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(ivBase64), (c) => c.charCodeAt(0));

  const plainBuffer = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(plainBuffer);
}
