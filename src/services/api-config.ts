/**
 * Where the Zuri backend lives.
 *
 * Set EXPO_PUBLIC_API_GATEWAY_URL in .env (e.g. https://api.zurilearn.com).
 * The gateway serves the REST API under /api/v1 and a health check at /health.
 */

export const GATEWAY_URL = process.env.EXPO_PUBLIC_API_GATEWAY_URL?.trim().replace(/\/+$/, '') || undefined;

/** Base for every REST call, e.g. https://api.zurilearn.com/api/v1 */
export const API_BASE = GATEWAY_URL ? `${GATEWAY_URL}/api/v1` : undefined;

/**
 * Whether uploads (lectures, materials) go to the real server.
 *
 * Sign-up / sign-in always use the server when GATEWAY_URL is set. Uploads
 * need a signed-in user (every /api/v1 route except auth needs an
 * `Authorization` header). EXPO_PUBLIC_USE_LIVE_API=false switches uploads
 * back to the on-phone stand-ins, e.g. for demos without a connection.
 */
export const isBackendConfigured = !!API_BASE && process.env.EXPO_PUBLIC_USE_LIVE_API !== 'false';

export interface GatewayHealth {
  status: string;
  upstream: Record<string, string>;
}

/** GET {gateway}/health — no sign-in needed. */
export async function checkGatewayHealth(timeoutMs = 10000): Promise<GatewayHealth> {
  if (!GATEWAY_URL) throw new Error('EXPO_PUBLIC_API_GATEWAY_URL is not set');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${GATEWAY_URL}/health`, { signal: controller.signal });
    if (!res.ok) throw new Error(`Gateway health check failed (${res.status})`);
    const json = await res.json();
    return { status: String(json.status ?? 'unknown'), upstream: json.upstream ?? {} };
  } finally {
    clearTimeout(timer);
  }
}
