import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthStore } from './auth.store';
import { AUTH_FALLBACK_URL, safeReturnUrl } from './return-url';

const CALLBACK_ROUTES = new Set(['/signin-callback', '/signout-callback']);

export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  const requestedPath = state.url.split(/[?#]/u, 1)[0] ?? '';

  if (CALLBACK_ROUTES.has(requestedPath)) {
    return router.parseUrl(AUTH_FALLBACK_URL);
  }

  const target = safeReturnUrl(state.url);

  await auth.initialize();
  if (auth.isAuthenticated()) return true;
  if (auth.error()?.code === 'initialization_failed') return router.parseUrl(AUTH_FALLBACK_URL);

  try {
    await auth.signIn(target);
  } catch {
    return router.parseUrl(AUTH_FALLBACK_URL);
  }
  return false;
};
