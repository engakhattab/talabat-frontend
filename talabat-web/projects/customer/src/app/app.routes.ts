import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'restaurants' },
  {
    path: 'signin-callback',
    loadComponent: () =>
      import('./features/auth/signin-callback.page').then((module) => module.SigninCallbackPage),
  },
  {
    path: 'signout-callback',
    loadComponent: () =>
      import('./features/auth/signout-callback.page').then((module) => module.SignoutCallbackPage),
  },
  {
    path: 'auth-check',
    loadChildren: () => import('./features/auth/routes').then((module) => module.routes),
  },
  {
    path: 'restaurants',
    loadChildren: () => import('./features/catalog/routes').then((module) => module.routes),
  },
];
