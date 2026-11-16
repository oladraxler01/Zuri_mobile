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
 * Whether features send work to the real server.
 *
 * Every /api/v1 route except sign-in/register needs an `Authorization` header.
 * The app has no server sign-in yet, so live uploads stay off until it does
 * (EXPO_PUBLIC_USE_LIVE_API=true turns them on); until then features use
 * their clearly labelled stand-ins.
 */
export const isBackendConfigured = !!API_BASE && process.env.EXPO_PUBLIC_USE_LIVE_API === 'true';

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
