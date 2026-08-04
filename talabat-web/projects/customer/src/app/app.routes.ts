import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'restaurants' },
  {
    path: 'restaurants',
    loadChildren: () => import('./features/catalog/routes').then((module) => module.routes),
  },
];
