import { Routes } from '@angular/router';
import { authGuard } from '@talabat/core-auth';
import { onboardingGuard } from '../../core/guards/onboarding.guard';


export const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard, onboardingGuard],
    loadComponent: () => import('./pages/onboarding.page').then((m) => m.OnboardingPage),
  },
];
