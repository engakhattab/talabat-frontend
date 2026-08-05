import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot } from '@angular/router';

import { authGuard } from './auth.guard';
import { AuthError } from './auth.models';
import { AuthStore } from './auth.store';

describe('authGuard', () => {
  const authenticated = signal(false);
  const error = signal<AuthError | null>(null);
  const auth = {
    isAuthenticated: authenticated.asReadonly(),
    error: error.asReadonly(),
    initialize: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    signIn: vi.fn<(returnUrl: string) => Promise<void>>().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    authenticated.set(false);
    error.set(null);
    vi.clearAllMocks();
    auth.initialize.mockResolvedValue(undefined);
    auth.signIn.mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthStore, useValue: auth }],
    });
  });

  it('allows an authenticated route after initialization', async () => {
    authenticated.set(true);
    await expect(runGuard('/auth-check')).resolves.toBe(true);
    expect(auth.initialize).toHaveBeenCalledOnce();
    expect(auth.signIn).not.toHaveBeenCalled();
  });

  it('starts sign-in for an anonymous route and preserves its safe target', async () => {
    await expect(runGuard('/auth-check?from=header')).resolves.toBe(false);
    expect(auth.signIn).toHaveBeenCalledWith('/auth-check?from=header');
  });

  it('rejects an unsafe requested target before sign-in', async () => {
    await expect(runGuard('//evil.example')).resolves.toBe(false);
    expect(auth.signIn).toHaveBeenCalledWith('/restaurants');
  });

  it('waits for asynchronous initialization before deciding', async () => {
    let finishInitialization: (() => void) | undefined;
    auth.initialize.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishInitialization = () => {
            authenticated.set(true);
            resolve();
          };
        }),
    );
    const result = runGuard('/auth-check');
    expect(auth.signIn).not.toHaveBeenCalled();
    finishInitialization?.();
    await expect(result).resolves.toBe(true);
  });

  it('redirects callback-loop attempts to the public fallback', async () => {
    const result = await runGuard('/signin-callback?code=value');
    expect(result).toEqual(TestBed.inject(Router).parseUrl('/restaurants'));
    expect(auth.signIn).not.toHaveBeenCalled();
  });

  it('returns to the public catalog after initialization failure', async () => {
    error.set({
      code: 'initialization_failed',
      message: 'Authentication could not be initialized.',
    });
    const result = await runGuard('/auth-check');
    expect(result).toEqual(TestBed.inject(Router).parseUrl('/restaurants'));
    expect(auth.signIn).not.toHaveBeenCalled();
  });

  function runGuard(url: string): Promise<unknown> {
    return TestBed.runInInjectionContext(async () =>
      authGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );
  }
});
