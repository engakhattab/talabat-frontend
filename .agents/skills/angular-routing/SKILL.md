---
name: angular-routing
description: Implement routing and navigation in Angular v20+ using standalone routes, functional guards/resolvers, component input bindings, and view transitions. Use for configuring app routes, lazy loading components, route parameters, navigation guards, and programmatic navigation. Triggers on setting up routing, defining routes, writing route guards or resolvers, using withComponentInputBinding, or navigating programmatically.
---

# Angular Routing

Routing in Angular v20+ relies on standalone application configuration (`provideRouter`) with functional guards, functional resolvers, signal component input bindings, and native View Transitions.

## Router Configuration (`app.config.ts`)

Configure routing in `app.config.ts` using `provideRouter()` and feature flags:

```typescript
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { 
  provideRouter, 
  withComponentInputBinding, 
  withViewTransitions, 
  withPreloading, 
  PreloadAllModules,
  withInMemoryScrolling
} from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withComponentInputBinding(), // Bind route params, query params & data to component inputs
      withViewTransitions(), // Enable native browser View Transitions API
      withPreloading(PreloadAllModules), // Preload lazy routes in background
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled'
      })
    )
  ]
};
```

## Route Definitions (`app.routes.ts`)

Define routes using `loadComponent` for lazy loading standalone components and `children` for layout nesting.

```typescript
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { productResolver } from './features/products/product.resolver';

export const routes: Routes = [
  // Redirect root path
  { 
    path: '', 
    pathMatch: 'full', 
    redirectTo: 'dashboard' 
  },
  
  // Public Lazy Route
  {
    path: 'login',
    title: 'Sign In | Talabat',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
  },

  // Protected Route Group with Shell Layout
  {
    path: '',
    loadComponent: () => import('./shell/shell.component').then(m => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        title: 'Dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'products',
        title: 'Products List',
        loadComponent: () => import('./features/products/product-list.component').then(m => m.ProductListComponent)
      },
      {
        path: 'products/:id',
        title: 'Product Details',
        resolve: { product: productResolver },
        loadComponent: () => import('./features/products/product-detail.component').then(m => m.ProductDetailComponent)
      },
      // Nested Feature Routes using loadChildren
      {
        path: 'orders',
        loadChildren: () => import('./features/orders/orders.routes').then(m => m.ORDER_ROUTES)
      }
    ]
  },

  // 404 Wildcard Page
  {
    path: '**',
    title: 'Page Not Found',
    loadComponent: () => import('./core/pages/not-found.component').then(m => m.NotFoundComponent)
  }
];
```

## Signal Component Input Binding

When `withComponentInputBinding()` is enabled, route parameters (`:id`), query parameters (`?sort=asc`), matrix parameters, and static route `data` are automatically bound to signal inputs.

```typescript
import { Component, input, computed } from '@angular/core';
import { Product } from './product.model';

@Component({
  selector: 'app-product-detail',
  template: `
    <article>
      <h1>{{ product()?.name }}</h1>
      <p>Product ID: {{ id() }}</p>
      <p>Current Tab: {{ tab() }}</p>
    </article>
  `
})
export class ProductDetailComponent {
  // Path parameter from route: /products/:id
  id = input.required<string>();

  // Query parameter: /products/123?tab=reviews
  tab = input<string>('overview');

  // Resolved route data or static route data
  product = input<Product>();
}
```

## Functional Route Guards

Do NOT use class-based guards (`CanActivate`). Use functional guards with `inject()`.

### Auth Guard (`canActivate`)

```typescript
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Redirect to login with return URL
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url }
  });
};
```

### Unsaved Changes Guard (`canDeactivate`)

```typescript
import { CanDeactivateFn } from '@angular/router';

export interface HasUnsavedChanges {
  hasUnsavedChanges: () => boolean;
}

export const pendingChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  if (component.hasUnsavedChanges()) {
    return confirm('You have unsaved changes. Are you sure you want to leave?');
  }
  return true;
};
```

### Feature Flag / Role Guard (`canMatch`)

```typescript
import { inject } from '@angular/core';
import { CanMatchFn, Route, UrlSegment } from '@angular/router';
import { FeatureFlagService } from '../services/feature-flag.service';

export const featureFlagGuard = (flagName: string): CanMatchFn => {
  return (route: Route, segments: UrlSegment[]) => {
    const featureFlags = inject(FeatureFlagService);
    return featureFlags.isEnabled(flagName);
  };
};
```

## Functional Resolvers

Pre-fetch data before route activation using functional `ResolveFn`:

```typescript
import { inject } from '@angular/core';
import { ResolveFn, RedirectCommand, Router } from '@angular/router';
import { catchError, EMPTY } from 'rxjs';
import { ProductService } from './product.service';
import { Product } from './product.model';

export const productResolver: ResolveFn<Product | RedirectCommand> = (route, state) => {
  const productService = inject(ProductService);
  const router = inject(Router);
  const productId = route.paramMap.get('id');

  if (!productId) {
    return new RedirectCommand(router.parseUrl('/products'));
  }

  return productService.getProductById(productId).pipe(
    catchError(() => {
      // Redirect to 404 on error
      return [new RedirectCommand(router.parseUrl('/404'))];
    })
  );
};
```

## Template Navigation (`RouterLink` & `RouterOutlet`)

Import `RouterLink` and `RouterLinkActive` in standalone components:

```typescript
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <nav class="navbar">
      <a routerLink="/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
        Dashboard
      </a>
      <a [routerLink]="['/products']" [queryParams]="{ category: 'electronics' }" routerLinkActive="active">
        Products
      </a>
      <a [routerLink]="['/products', activeId()]" routerLinkActive="active">
        Active Item
      </a>
    </nav>

    <main>
      <router-outlet />
    </main>
  `
})
export class ShellComponent {
  activeId = input<string>('123');
}
```

## Programmatic Navigation

Use `Router` injected via `inject(Router)` for code-driven navigation:

```typescript
import { Component, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-search-bar',
  template: `
    <input #searchBox placeholder="Search..." />
    <button (click)="performSearch(searchBox.value)">Search</button>
  `
})
export class SearchBarComponent {
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  performSearch(query: string) {
    // Navigate with query params
    this.router.navigate(['/products'], {
      queryParams: { q: query },
      queryParamsHandling: 'merge' // Preserve other query params
    });
  }

  navigateToChild(childPath: string) {
    // Relative navigation
    this.router.navigate([childPath], { relativeTo: this.route });
  }
}
```

## View Transitions API

Customize transitions using `withViewTransitions()` options:

```typescript
provideRouter(
  routes,
  withViewTransitions({
    skipInitialTransition: true,
    onViewTransitionCreated({ transition, to, from }) {
      // Custom transition logic if needed
    }
  })
)
```

In component CSS, style transitions with standard CSS:

```css
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 250ms;
}
```

## Best Practices Checklist

- [ ] Use `provideRouter()` in `app.config.ts` (standalone architecture).
- [ ] Enable `withComponentInputBinding()` to receive route & query params via signal `input()`.
- [ ] Use `loadComponent: () => import(...)` for route-level lazy loading.
- [ ] Write functional guards (`CanActivateFn`) and resolvers (`ResolveFn`) using `inject()`.
- [ ] Avoid class-based `CanActivate` or `Resolve` interfaces (deprecated).
- [ ] Use native `@if` / `@for` in routed templates instead of structural directives.
