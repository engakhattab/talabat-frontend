import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/orders.page').then((m) => m.OrdersPage),
  },
  {
    path: ':orderId',
    loadComponent: () =>
      import('./pages/order-confirmation.page').then((m) => m.OrderConfirmationPage),
  },
];
