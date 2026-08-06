import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Params, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';

import { ProfileStore } from '../profile/profile.store';
import { onboardingGuard } from './onboarding.guard';

describe('onboardingGuard', () => {
  let store: { ensureLoaded: ReturnType<typeof vi.fn> };

  const state = (url: string): RouterStateSnapshot => ({ url, root: {} as never }) as RouterStateSnapshot;

  const makeRoute = (params: Params = {}): ActivatedRouteSnapshot => ({
    queryParams: params,
  } as ActivatedRouteSnapshot);

  beforeEach(async () => {
    store = {
      ensureLoaded: vi.fn(),
    };

    await TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ProfileStore, useValue: store },
      ],
    }).compileComponents();
  });

  it('redirects to returnUrl when profile already exists', async () => {
    store.ensureLoaded.mockResolvedValue({ kind: 'loaded', profile: { id: 1, fullName: 'Test', age: 25, phoneNumber: null, addresses: [] } });

    const result = await TestBed.runInInjectionContext(() =>
      onboardingGuard(makeRoute({ returnUrl: '/restaurants/123' }), state('/onboarding')),
    );

    expect(result).toBeInstanceOf(UrlTree);
    const tree = result as UrlTree;
    expect(tree.toString()).toContain('/restaurants/123');
  });

  it('redirects to /restaurants when no returnUrl and profile exists', async () => {
    store.ensureLoaded.mockResolvedValue({ kind: 'loaded', profile: { id: 1, fullName: 'Test', age: 25, phoneNumber: null, addresses: [] } });

    const result = await TestBed.runInInjectionContext(() =>
      onboardingGuard(makeRoute(), state('/onboarding')),
    );

    expect(result).toBeInstanceOf(UrlTree);
    const tree = result as UrlTree;
    expect(tree.toString()).toContain('/restaurants');
  });

  it('allows navigation when profile is missing', async () => {
    store.ensureLoaded.mockResolvedValue({ kind: 'missing' });

    const result = await TestBed.runInInjectionContext(() =>
      onboardingGuard(makeRoute(), state('/onboarding')),
    );

    expect(result).toBe(true);
  });

  it('redirects to /profile-unavailable on error', async () => {
    store.ensureLoaded.mockResolvedValue({ kind: 'error', error: { status: 0, code: 'Unknown', title: 'Network error', isNetworkError: true } });

    const result = await TestBed.runInInjectionContext(() =>
      onboardingGuard(makeRoute(), state('/onboarding')),
    );

    expect(result).toBeInstanceOf(UrlTree);
    const tree = result as UrlTree;
    expect(tree.toString()).toContain('/profile-unavailable');
  });
});
