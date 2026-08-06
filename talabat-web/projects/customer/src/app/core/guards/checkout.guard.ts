import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';

import { safeReturnUrl } from '@talabat/core-auth';

import { ProfileStore } from '../profile/profile.store';
import { CartStore } from '../../features/cart/cart.store';

export const checkoutGuard: CanActivateFn = async (_route, state) => {
  const store = inject(ProfileStore);
  const cartStore = inject(CartStore);
  const router = inject(Router);

  const result = await store.ensureLoaded();

  if (result.kind === 'missing') {
    return router.createUrlTree(['/onboarding'], {
      queryParams: { returnUrl: safeReturnUrl(state.url) },
    });
  }

  if (result.kind === 'error') {
    return router.createUrlTree(['/profile-unavailable'], {
      queryParams: { returnUrl: safeReturnUrl(state.url) },
    });
  }

  if (cartStore.status() !== 'loaded') {
    await cartStore.loadCart();
  }

  if (cartStore.isEmpty()) {
    return router.createUrlTree(['/cart']);
  }

  return true;
};
