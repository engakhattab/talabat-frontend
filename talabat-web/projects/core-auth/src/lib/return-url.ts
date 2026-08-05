export const AUTH_FALLBACK_URL = '/restaurants';

const AUTH_CALLBACK_PATHS = new Set(['/signin-callback', '/signout-callback']);

export function safeReturnUrl(value: unknown, fallback = AUTH_FALLBACK_URL): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2048) return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;

  let decoded = value;
  try {
    for (let index = 0; index < 3; index += 1) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
  } catch {
    return fallback;
  }

  if (!decoded.startsWith('/') || decoded.startsWith('//') || decoded.includes('\\')) return fallback;

  try {
    const parsed = new URL(value, 'https://talabat.invalid');
    if (parsed.origin !== 'https://talabat.invalid') return fallback;
    if (AUTH_CALLBACK_PATHS.has(parsed.pathname.toLowerCase())) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
