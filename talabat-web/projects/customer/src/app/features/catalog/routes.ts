import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/restaurant-list.page').then((m) => m.RestaurantListPage),
  },
  {
    path: ':restaurantId',
    loadComponent: () => import('./pages/restaurant-menu.page').then((m) => m.RestaurantMenuPage),
  },
];
