import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/checkout.page').then((m) => m.CheckoutPage),
  },
];
