import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { signal } from '@angular/core';
import { AuthStore } from '@talabat/core-auth';
import { CatalogApiService } from '@talabat/api-customer';
import { of } from 'rxjs';

import { routes } from './app.routes';
import { ProfileStore } from './core/profile/profile.store';
import { HeaderComponent } from './layout/header.component';
import { CartEntryBarComponent } from './layout/cart-entry-bar.component';
import { RestaurantCardComponent } from './features/catalog/components/restaurant-card.component';
import { CartStore } from './features/cart/cart.store';

describe('Routing and Navigation Architecture', () => {
  let router: Router;
  let harness: RouterTestingHarness;

  const mockCatalogApi = {
    getRestaurants: vi.fn().mockReturnValue(of({ items: [], page: 1, pageSize: 20, totalCount: 0 })),
    getRestaurantMenu: vi.fn().mockReturnValue(of({ restaurantId: 1, restaurantName: 'Test', products: [] })),
  };

  const mockProfileStore = {
    state: signal('loaded').asReadonly(),
    profile: signal({ fullName: 'Test User', age: 25, phoneNumber: null, id: 1, addresses: [] }).asReadonly(),
    hasProfile: signal(true).asReadonly(),
    isMissing: signal(false).asReadonly(),
    canRetry: signal(false).asReadonly(),
    error: signal(null).asReadonly(),
    ensureLoaded: vi.fn().mockResolvedValue({ kind: 'loaded', profile: { fullName: 'Test User', age: 25, phoneNumber: null, id: 1, addresses: [] } }),
    refreshAfterCreation: vi.fn().mockResolvedValue({ kind: 'loaded' }),
    reset: vi.fn(),
    retry: vi.fn(),
  };

  const mockAuthStore = {
    initialized: signal(true).asReadonly(),
    isAuthenticated: signal(true).asReadonly(),
    busy: signal(false).asReadonly(),
    user: signal({ subject: 'auth0|1', displayName: 'Test User', roles: [] }).asReadonly(),
    error: signal(null).asReadonly(),
    initialize: vi.fn().mockResolvedValue(undefined),
    signIn: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
  };

  const mockCartStore = {
    status: signal('loaded').asReadonly(),
    cart: signal(null).asReadonly(),
    items: signal([]).asReadonly(),
    isEmpty: signal(true).asReadonly(),
    total: signal(null).asReadonly(),
    totalItemCount: signal(0).asReadonly(),
    error: signal(null).asReadonly(),
    notice: signal(null).asReadonly(),
    isMutating: signal(false).asReadonly(),
    mutatingProductId: signal(null).asReadonly(),
    loadCart: vi.fn().mockResolvedValue(undefined),
    reload: vi.fn().mockResolvedValue(undefined),
    updateQuantity: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
    clearCart: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        { provide: CatalogApiService, useValue: mockCatalogApi },
        { provide: ProfileStore, useValue: mockProfileStore },
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: CartStore, useValue: mockCartStore },
      ],
    });

    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
  });

  it('navigates to /restaurants as the root landing page', async () => {
    await harness.navigateByUrl('/');
    expect(router.url).toBe('/restaurants');
  });

  it('navigates to canonical /cart page when authenticated with profile', async () => {
    await harness.navigateByUrl('/cart');
    expect(router.url).toBe('/cart');
    expect(harness.routeNativeElement?.querySelector('tal-cart-page')).toBeTruthy();
  });

  it('navigates to canonical /profile page when authenticated', async () => {
    await harness.navigateByUrl('/profile');
    expect(router.url).toBe('/profile');
    expect(harness.routeNativeElement?.querySelector('tal-profile-page')).toBeTruthy();
  });

  it('navigates to canonical /orders page when authenticated', async () => {
    await harness.navigateByUrl('/orders');
    expect(router.url).toBe('/orders');
    expect(harness.routeNativeElement?.querySelector('tal-orders-page')).toBeTruthy();
  });

  it('renders wildcard page for unknown paths like /some-unknown-path', async () => {
    await harness.navigateByUrl('/some-unknown-path');
    expect(router.url).toBe('/some-unknown-path');
    expect(harness.routeNativeElement?.querySelector('tal-not-found-page')).toBeTruthy();
  });

  it('Header component renders absolute routerLinks for Restaurants, Profile, and Orders', () => {
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();

    const links = fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>;
    const hrefs = Array.from(links).map((l) => l.getAttribute('href'));

    expect(hrefs).toContain('/restaurants');
    expect(hrefs).toContain('/profile');
    expect(hrefs).toContain('/orders');
  });

  it('CartEntryBar component renders absolute routerLink for /cart', () => {
    const fixture = TestBed.createComponent(CartEntryBarComponent);
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('/cart');
  });

  it('RestaurantCard component renders link to absolute /restaurants/:restaurantId', () => {
    const fixture = TestBed.createComponent(RestaurantCardComponent);
    fixture.componentRef.setInput('restaurant', {
      id: 42,
      name: 'Cairo Grill',
      description: 'Test',
      imageUrl: null,
      isActive: true,
    });
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('/restaurants/42');
  });
});
