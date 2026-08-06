import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'signin-callback',
    loadComponent: () =>
      import('./features/auth/signin-callback.page').then((m) => m.SigninCallbackPage),
  },
  {
    path: 'signout-callback',
    loadComponent: () =>
      import('./features/auth/signout-callback.page').then((m) => m.SignoutCallbackPage),
  },
  {
    path: '',
    loadChildren: () => import('./layout/routes').then((m) => m.routes),
  },
];
