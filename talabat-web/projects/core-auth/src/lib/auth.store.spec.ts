import { TestBed } from '@angular/core/testing';

import { OidcSession } from './auth.models';
import { OIDC_ADAPTER, OidcAdapter, OidcLifecycleHandlers } from './oidc-adapter';
import { AuthStore } from './auth.store';

const SESSION: OidcSession = {
  accessToken: 'test-access-token',
  expired: false,
  returnUrl: '/restaurants/12',
  user: { subject: 'customer-1', displayName: 'Test Customer', roles: ['Customer'] },
};

class FakeOidcAdapter implements OidcAdapter {
  initialize = vi.fn<() => Promise<OidcSession | null>>().mockResolvedValue(null);
  startSignIn = vi.fn<(returnUrl: string) => Promise<void>>().mockResolvedValue(undefined);
  completeSignInCallback = vi
    .fn<(callbackUrl: string) => Promise<OidcSession>>()
    .mockResolvedValue(SESSION);
  startSignOut = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
  completeSignOutCallback = vi.fn<(callbackUrl: string) => Promise<void>>().mockResolvedValue(undefined);
  clearSession = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
  handlers: OidcLifecycleHandlers | undefined;

  setLifecycleHandlers(handlers: OidcLifecycleHandlers): void {
    this.handlers = handlers;
  }
}

describe('AuthStore', () => {
  let adapter: FakeOidcAdapter;
  let store: AuthStore;

  beforeEach(() => {
    adapter = new FakeOidcAdapter();
    TestBed.configureTestingModule({
      providers: [AuthStore, { provide: OIDC_ADAPTER, useValue: adapter }],
    });
    store = TestBed.inject(AuthStore);
  });

  it('restores an authenticated session during initialization', async () => {
    adapter.initialize.mockResolvedValue(SESSION);
    const pending = store.initialize();
    expect(store.busy()).toBe(true);
    await pending;
    expect(store.initialized()).toBe(true);
    expect(store.isAuthenticated()).toBe(true);
    expect(store.user()?.displayName).toBe('Test Customer');
    expect(store.getAccessToken()).toBe('test-access-token');
  });

  it('restores anonymous state without an error', async () => {
    await store.initialize();
    expect(store.initialized()).toBe(true);
    expect(store.isAuthenticated()).toBe(false);
    expect(store.error()).toBeNull();
  });

  it('normalizes initialization failure without exposing protocol details', async () => {
    adapter.initialize.mockRejectedValue(new Error('raw discovery details'));
    await store.initialize();
    expect(store.error()).toEqual({
      code: 'initialization_failed',
      message: 'Authentication could not be initialized. You can continue browsing publicly.',
    });
  });

  it('starts sign-in once and validates the requested destination', async () => {
    await Promise.all([store.signIn('https://evil.example'), store.signIn('/restaurants/12')]);
    expect(adapter.startSignIn).toHaveBeenCalledOnce();
    expect(adapter.startSignIn).toHaveBeenCalledWith('/restaurants');
  });

  it('gives actionable non-protocol copy when the identity service is unavailable during sign-in', async () => {
    adapter.startSignIn.mockRejectedValue(new Error('raw authority connection refused'));
    await expect(store.signIn('/auth-check')).rejects.toThrow('Sign-in redirect failed');
    expect(store.error()?.code).toBe('signin_failed');
    expect(store.error()?.message).toBe('Sign-in could not be started. Please try again.');
    expect(store.error()?.message).not.toContain('raw');
    expect(store.error()?.message).not.toContain('refused');
    expect(store.busy()).toBe(false);
    expect(store.isAuthenticated()).toBe(false);
  });

  it('allows a second sign-in attempt after an identity outage', async () => {
    adapter.startSignIn.mockRejectedValueOnce(new Error('connection refused'));
    await expect(store.signIn('/auth-check')).rejects.toThrow('Sign-in redirect failed');
    adapter.startSignIn.mockResolvedValueOnce(undefined);
    await expect(store.signIn('/auth-check')).resolves.toBeUndefined();
    expect(adapter.startSignIn).toHaveBeenCalledTimes(2);
  });

  it('completes a successful callback exactly once', async () => {
    const first = store.completeSignInCallback('http://app/signin-callback?code=one');
    const second = store.completeSignInCallback('http://app/signin-callback?code=two');
    await expect(first).resolves.toBe('/restaurants/12');
    await expect(second).resolves.toBe('/restaurants/12');
    expect(adapter.completeSignInCallback).toHaveBeenCalledOnce();
    expect(store.isAuthenticated()).toBe(true);
  });

  it('clears state and exposes a safe callback error', async () => {
    adapter.completeSignInCallback.mockRejectedValue(new Error('raw token response'));
    await expect(store.completeSignInCallback('http://app/signin-callback')).rejects.toThrow(
      'Sign-in callback failed',
    );
    expect(store.isAuthenticated()).toBe(false);
    expect(store.error()?.code).toBe('callback_failed');
    expect(store.error()?.message).not.toContain('raw');
  });

  it('rejects an invalid or absent callback state with safe public copy', async () => {
    adapter.completeSignInCallback.mockRejectedValue(
      new Error('state mismatch — unexpected state=attacker-state'),
    );
    await expect(
      store.completeSignInCallback('http://app/signin-callback?state=attacker-state'),
    ).rejects.toThrow('Sign-in callback failed');
    expect(store.error()?.code).toBe('callback_failed');
    expect(store.error()?.message).not.toContain('state mismatch');
    expect(store.error()?.message).not.toContain('attacker-state');
  });

  it('never adopts a hostile redirect_uri returned by the identity provider', async () => {
    adapter.completeSignInCallback.mockResolvedValue({
      ...SESSION,
      returnUrl: 'https://evil.example/phish#redirect_uri=https://evil.example',
    });
    await expect(
      store.completeSignInCallback('http://app/signin-callback?code=one'),
    ).resolves.toBe('/restaurants');
  });

  it('keeps query and hash in a returned internal redirect apart from the target', async () => {
    adapter.completeSignInCallback.mockResolvedValue({
      ...SESSION,
      returnUrl: '/orders?sort=new#menu',
    });
    await expect(
      store.completeSignInCallback('http://app/signin-callback?code=one'),
    ).resolves.toBe('/orders?sort=new#menu');
  });

  it('starts sign-out once and clears state on callback', async () => {
    adapter.initialize.mockResolvedValue(SESSION);
    await store.initialize();
    await Promise.all([store.signOut(), store.signOut()]);
    expect(adapter.startSignOut).toHaveBeenCalledOnce();
    await store.completeSignOutCallback('http://app/signout-callback?state=value');
    expect(store.isAuthenticated()).toBe(false);
    expect(adapter.clearSession).toHaveBeenCalled();
  });

  it('clears local state with actionable copy when sign-out cannot reach identity', async () => {
    adapter.initialize.mockResolvedValue(SESSION);
    await store.initialize();
    adapter.startSignOut.mockRejectedValue(new Error('raw identity timeout'));
    await expect(store.signOut()).rejects.toThrow('Sign-out redirect failed');
    expect(store.error()?.code).toBe('signout_failed');
    expect(store.error()?.message).not.toContain('raw');
    expect(store.error()?.message).not.toContain('timeout');
    expect(store.isAuthenticated()).toBe(false);
    expect(adapter.clearSession).toHaveBeenCalled();
  });

  it('applies refresh success and clears state on expiry or refresh failure', async () => {
    adapter.handlers?.onSessionLoaded(SESSION);
    expect(store.isAuthenticated()).toBe(true);
    adapter.handlers?.onSessionExpired();
    expect(store.isAuthenticated()).toBe(false);
    expect(store.error()?.code).toBe('session_expired');

    adapter.handlers?.onSessionLoaded(SESSION);
    adapter.handlers?.onRefreshFailed();
    await vi.waitFor(() => expect(adapter.clearSession).toHaveBeenCalled());
    expect(store.isAuthenticated()).toBe(false);
  });

  it('clears a rejected session only once for repeated unauthorized responses', () => {
    adapter.handlers?.onSessionLoaded(SESSION);
    store.handleUnauthorized();
    store.handleUnauthorized();
    expect(adapter.clearSession).toHaveBeenCalledOnce();
    expect(store.isAuthenticated()).toBe(false);
  });

  it('keeps a valid session for forbidden responses', () => {
    adapter.handlers?.onSessionLoaded(SESSION);
    store.handleForbidden();
    expect(store.isAuthenticated()).toBe(true);
    expect(store.error()?.code).toBe('authorization_failed');
  });
});
