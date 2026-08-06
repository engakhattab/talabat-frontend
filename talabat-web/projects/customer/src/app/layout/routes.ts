import { Routes } from '@angular/router';
import { CustomerShellComponent } from './customer-shell.component';
import { authGuard } from '@talabat/core-auth';
import { profileGuard } from '../core/guards/profile.guard';
import { onboardingGuard } from '../core/guards/onboarding.guard';
import { checkoutGuard } from '../core/guards/checkout.guard';

export const routes: Routes = [
  {
    path: '',
    component: CustomerShellComponent,
    children: [
      {
        path: 'restaurants',
        loadChildren: () => import('../features/catalog/routes').then((m) => m.routes),
      },
      {
        path: 'onboarding',
        canActivate: [authGuard, onboardingGuard],
        loadChildren: () => import('../features/onboarding/routes').then((m) => m.routes),
      },
      {
        path: 'cart',
        canActivate: [authGuard, profileGuard],
        loadComponent: () =>
          import('../features/cart/pages/cart.page').then((m) => m.CartPage),
      },
      {
        path: 'checkout',
        canActivate: [authGuard, profileGuard, checkoutGuard],
        loadChildren: () =>
          import('../features/checkout/checkout.routes').then((m) => m.routes),
      },
      {
        path: 'profile',
        canActivate: [authGuard, profileGuard],
        loadComponent: () =>
          import('../features/profile/pages/profile.page').then((m) => m.ProfilePage),
      },
      {
        path: 'orders',
        canActivate: [authGuard, profileGuard],
        loadChildren: () => import('../features/orders/orders.routes').then((m) => m.routes),
      },
      {
        path: 'auth-check',
        canActivate: [authGuard, profileGuard],
        loadChildren: () => import('../features/auth/routes').then((m) => m.routes),
      },
      {
        path: 'profile-unavailable',
        canActivate: [authGuard],
        loadComponent: () =>
          import('../features/auth/pages/profile-unavailable.page').then((m) => m.ProfileUnavailablePage),
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'restaurants',
      },
      {
        path: '**',
        loadComponent: () =>
          import('../features/not-found/not-found.page').then((m) => m.NotFoundPage),
      },
    ],
  },
];

