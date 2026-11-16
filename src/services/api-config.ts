/**
 * Where the Zuri backend lives.
 *
 * The live gateway is built in, so every build (including EAS builds, which
 * never receive the git-ignored .env) signs people up with real email codes.
 * EXPO_PUBLIC_API_GATEWAY_URL in .env overrides it, e.g. for a staging server.
 * The gateway serves the REST API under /api/v1 and a health check at /health.
 *
 * A localhost address (http://localhost:8080) means "the backend on my
 * computer". A phone can't reach that, so during development it's swapped for
 * the computer's address on the network (taken from the Metro dev server),
 * or 10.0.2.2 on an Android emulator.
 */

export const DEFAULT_GATEWAY_URL = 'https://api.zurilearn.com';

export const GATEWAY_URL: string = (process.env.EXPO_PUBLIC_API_GATEWAY_URL?.trim() || DEFAULT_GATEWAY_URL).replace(/\/+$/, '');

/** Base for every REST call, e.g. https://api.zurilearn.com/api/v1 */
export const API_BASE: string = `${GATEWAY_URL}/api/v1`;

/**
 * Whether uploads (lectures, materials) go to the real server.
 *
 * Sign-up, email codes and sign-in always use the server; there is no offline
 * bypass for them. Uploads
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
