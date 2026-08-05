import { Routes } from '@angular/router';
import { authGuard } from '@talabat/core-auth';

export const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./auth-check.page').then((module) => module.AuthCheckPage),
  },
];
