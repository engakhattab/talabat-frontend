import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';

import { ProfileStore } from '../profile/profile.store';
import { profileGuard } from './profile.guard';

describe('profileGuard', () => {
  let store: { ensureLoaded: ReturnType<typeof vi.fn>; state: ReturnType<typeof vi.fn> };

  const route = {} as ActivatedRouteSnapshot;
  const state = (url: string): RouterStateSnapshot => ({ url, root: {} as never }) as RouterStateSnapshot;

  beforeEach(async () => {
    store = {
      ensureLoaded: vi.fn(),
      state: vi.fn(),
    };

    await TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ProfileStore, useValue: store },
      ],
    }).compileComponents();
  });

  it('returns true when profile is loaded', async () => {
    store.ensureLoaded.mockResolvedValue({ kind: 'loaded', profile: { id: 1, fullName: 'Test', age: 25, phoneNumber: null, addresses: [] } });

    const result = await TestBed.runInInjectionContext(() => profileGuard(route, state('/auth-check')));

    expect(result).toBe(true);
  });

  it('redirects to /onboarding with returnUrl when profile is missing', async () => {
    store.ensureLoaded.mockResolvedValue({ kind: 'missing' });

    const result = await TestBed.runInInjectionContext(() => profileGuard(route, state('/auth-check')));

    expect(result).toBeInstanceOf(UrlTree);
    const tree = result as UrlTree;
    expect(tree.toString()).toContain('/onboarding');
  });

  it('redirects to /profile-unavailable on error', async () => {
    store.ensureLoaded.mockResolvedValue({ kind: 'error', error: { status: 0, code: 'Unknown', title: 'Network error', isNetworkError: true } });

    const result = await TestBed.runInInjectionContext(() => profileGuard(route, state('/auth-check')));

    expect(result).toBeInstanceOf(UrlTree);
    const tree = result as UrlTree;
    expect(tree.toString()).toContain('/profile-unavailable');
  });
});
