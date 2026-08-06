import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';

import { ProfileStore } from '../profile/profile.store';
import { safeReturnUrl } from '@talabat/core-auth';

export const onboardingGuard: CanActivateFn = async (route) => {
  const store = inject(ProfileStore);
  const router = inject(Router);

  const result = await store.ensureLoaded();

  if (result.kind === 'loaded') {
    const returnUrl = route.queryParams['returnUrl'];
    const destination = safeReturnUrl(returnUrl);
    return router.createUrlTree([destination]);
  }

  if (result.kind === 'missing') {
    return true;
  }

  return router.createUrlTree(['/profile-unavailable']);
};
