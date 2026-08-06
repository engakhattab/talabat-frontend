import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, RouterStateSnapshot, UrlTree } from '@angular/router';

import { ProfileStore } from '../profile/profile.store';
import { CartStore } from '../../features/cart/cart.store';
import { checkoutGuard } from './checkout.guard';

describe('checkoutGuard', () => {
  let profile: { ensureLoaded: ReturnType<typeof vi.fn> };
  let cart: {
    status: ReturnType<typeof signal<'uninitialized' | 'loading' | 'loaded' | 'error'>>;
    isEmpty: ReturnType<typeof signal<boolean>>;
    loadCart: ReturnType<typeof vi.fn>;
  };

  const route = {} as ActivatedRouteSnapshot;
  const state = (url: string): RouterStateSnapshot => ({ url, root: {} as never }) as RouterStateSnapshot;

  beforeEach(async () => {
    profile = { ensureLoaded: vi.fn() };
    cart = {
      status: signal<'uninitialized' | 'loading' | 'loaded' | 'error'>('uninitialized'),
      isEmpty: signal(false),
      loadCart: vi.fn(),
    };

    await TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ProfileStore, useValue: profile },
        { provide: CartStore, useValue: cart },
      ],
    }).compileComponents();
  });

  const loadedProfile = { id: 1, fullName: 'Test', age: 25, phoneNumber: null, addresses: [] };

  it('activates when the profile is loaded and the cart is not empty', async () => {
    profile.ensureLoaded.mockResolvedValue({ kind: 'loaded', profile: loadedProfile });
    cart.status.set('loaded');
    cart.isEmpty.set(false);

    const result = await TestBed.runInInjectionContext(() => checkoutGuard(route, state('/checkout')));

    expect(result).toBe(true);
    expect(cart.loadCart).not.toHaveBeenCalled();
  });

  it('loads the cart before deciding when it has not finished loading', async () => {
    profile.ensureLoaded.mockResolvedValue({ kind: 'loaded', profile: loadedProfile });
    cart.status.set('uninitialized');
    cart.isEmpty.set(true);
    cart.loadCart.mockImplementation(async () => {
      cart.status.set('loaded');
    });

    const result = await TestBed.runInInjectionContext(() => checkoutGuard(route, state('/checkout')));

    expect(cart.loadCart).toHaveBeenCalled();
    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toContain('/cart');
  });

  it('redirects an empty cart to /cart', async () => {
    profile.ensureLoaded.mockResolvedValue({ kind: 'loaded', profile: loadedProfile });
    cart.status.set('loaded');
    cart.isEmpty.set(true);

    const result = await TestBed.runInInjectionContext(() => checkoutGuard(route, state('/checkout')));

    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toContain('/cart');
  });

  it('redirects to /onboarding with returnUrl when the profile is missing', async () => {
    profile.ensureLoaded.mockResolvedValue({ kind: 'missing' });

    const result = await TestBed.runInInjectionContext(() => checkoutGuard(route, state('/checkout')));

    expect(result).toBeInstanceOf(UrlTree);
    const tree = result as UrlTree;
    expect(tree.toString()).toContain('/onboarding');
    expect(tree.toString()).toContain('returnUrl=%2Fcheckout');
  });

  it('redirects to /profile-unavailable on profile error', async () => {
    profile.ensureLoaded.mockResolvedValue({
      kind: 'error',
      error: { status: 0, code: 'Unknown', title: 'Network error', isNetworkError: true },
    });

    const result = await TestBed.runInInjectionContext(() => checkoutGuard(route, state('/checkout')));

    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toContain('/profile-unavailable');
  });
});
