/** Standard JSON success response. */
export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

export function badRequest(message: string, headers: Record<string, string> = {}): Response {
  return json({ error: message }, 400, headers);
}

export function unauthorized(message = "Unauthorized", headers: Record<string, string> = {}): Response {
  return json({ error: message }, 401, headers);
}

export function forbidden(message = "Forbidden", headers: Record<string, string> = {}): Response {
  return json({ error: message }, 403, headers);
}

export function serverError(message = "Internal server error", headers: Record<string, string> = {}): Response {
  return json({ error: message }, 500, headers);
}

export function tooManyRequests(retryAfter: number, headers: Record<string, string> = {}): Response {
  return json(
    { error: "Too many requests. Please try again later." },
    429,
    { ...headers, "Retry-After": String(retryAfter) },
  );
}
