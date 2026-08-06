import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';

import { ProfileStore } from '../profile/profile.store';
import { safeReturnUrl } from '@talabat/core-auth';

export const profileGuard: CanActivateFn = async (_route, state) => {
  const store = inject(ProfileStore);
  const router = inject(Router);

  const result = await store.ensureLoaded();

  if (result.kind === 'loaded') {
    return true;
  }

  if (result.kind === 'missing') {
    return router.createUrlTree(['/onboarding'], {
      queryParams: { returnUrl: safeReturnUrl(state.url) },
    });
  }

  return router.createUrlTree(['/profile-unavailable'], {
    queryParams: { returnUrl: safeReturnUrl(state.url) },
  });
};
