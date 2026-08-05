import { computed, inject, Injectable, signal } from '@angular/core';

import { AuthError, AuthUser, OidcSession } from './auth.models';
import { OIDC_ADAPTER, OidcAdapter } from './oidc-adapter';
import { safeReturnUrl } from './return-url';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly oidc = inject(OIDC_ADAPTER);
  private readonly initializedState = signal(false);
  private readonly busyState = signal(false);
  private readonly userState = signal<AuthUser | null>(null);
  private readonly accessTokenState = signal<string | null>(null);
  private readonly errorState = signal<AuthError | null>(null);
  private initialization: Promise<void> | undefined;
  private signInOperation: Promise<void> | undefined;
  private signOutOperation: Promise<void> | undefined;
  private signInCallbackOperation: Promise<string> | undefined;
  private signOutCallbackOperation: Promise<void> | undefined;
  private unauthorizedSessionCleared = false;

  readonly initialized = this.initializedState.asReadonly();
  readonly busy = this.busyState.asReadonly();
  readonly user = this.userState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly isAuthenticated = computed(
    () => this.userState() !== null && this.accessTokenState() !== null,
  );

  constructor() {
    this.oidc.setLifecycleHandlers({
      onSessionLoaded: (session) => this.applySession(session),
      onSessionExpired: () => this.handleSessionExpiry(),
      onRefreshFailed: () => void this.handleRefreshFailure(),
      onSessionCleared: () => this.clearLocalState(),
    });
  }

  initialize(): Promise<void> {
    this.initialization ??= this.runInitialization();
    return this.initialization;
  }

  signIn(returnUrl: string): Promise<void> {
    if (this.signInOperation) return this.signInOperation;
    this.signInOperation = this.runSignIn(safeReturnUrl(returnUrl));
    return this.signInOperation;
  }

  completeSignInCallback(callbackUrl: string): Promise<string> {
    this.signInCallbackOperation ??= this.runSignInCallback(callbackUrl);
    return this.signInCallbackOperation;
  }

  signOut(): Promise<void> {
    if (this.signOutOperation) return this.signOutOperation;
    this.signOutOperation = this.runSignOut();
    return this.signOutOperation;
  }

  completeSignOutCallback(callbackUrl: string): Promise<void> {
    this.signOutCallbackOperation ??= this.runSignOutCallback(callbackUrl);
    return this.signOutCallbackOperation;
  }

  getAccessToken(): string | null {
    return this.accessTokenState();
  }

  async clearSession(): Promise<void> {
    this.clearLocalState();
    await this.oidc.clearSession();
  }

  handleUnauthorized(): void {
    if (this.unauthorizedSessionCleared) return;
    this.unauthorizedSessionCleared = true;
    this.clearLocalState();
    this.errorState.set({
      code: 'session_expired',
      message: 'Your session has ended. Sign in again to continue.',
    });
    void this.oidc.clearSession();
  }

  handleForbidden(): void {
    this.errorState.set({
      code: 'authorization_failed',
      message: 'You do not have permission to perform this action.',
    });
  }

  clearError(): void {
    this.errorState.set(null);
  }

  private async runInitialization(): Promise<void> {
    this.busyState.set(true);
    this.errorState.set(null);
    try {
      const session = await this.oidc.initialize();
      if (session) this.applySession(session);
      else this.clearLocalState();
    } catch {
      this.clearLocalState();
      this.errorState.set({
        code: 'initialization_failed',
        message: 'Authentication could not be initialized. You can continue browsing publicly.',
      });
    } finally {
      this.initializedState.set(true);
      this.busyState.set(false);
    }
  }

  private async runSignIn(returnUrl: string): Promise<void> {
    this.busyState.set(true);
    this.errorState.set(null);
    try {
      await this.oidc.startSignIn(returnUrl);
    } catch {
      this.errorState.set({
        code: 'signin_failed',
        message: 'Sign-in could not be started. Please try again.',
      });
      this.busyState.set(false);
      this.signInOperation = undefined;
      throw new Error('Sign-in redirect failed');
    }
  }

  private async runSignInCallback(callbackUrl: string): Promise<string> {
    this.busyState.set(true);
    this.errorState.set(null);
    try {
      const session = await this.oidc.completeSignInCallback(callbackUrl);
      if (session.expired) throw new Error('Expired callback session');
      this.applySession(session);
      return safeReturnUrl(session.returnUrl);
    } catch {
      await this.oidc.clearSession();
      this.clearLocalState();
      this.errorState.set({
        code: 'callback_failed',
        message: 'Sign-in could not be completed. Please start again.',
      });
      throw new Error('Sign-in callback failed');
    } finally {
      this.busyState.set(false);
    }
  }

  private async runSignOut(): Promise<void> {
    this.busyState.set(true);
    this.errorState.set(null);
    try {
      await this.oidc.startSignOut();
    } catch {
      await this.oidc.clearSession();
      this.clearLocalState();
      this.errorState.set({
        code: 'signout_failed',
        message: 'Sign-out could not reach the identity service. Local session data was cleared.',
      });
      this.busyState.set(false);
      this.signOutOperation = undefined;
      throw new Error('Sign-out redirect failed');
    }
  }

  private async runSignOutCallback(callbackUrl: string): Promise<void> {
    this.busyState.set(true);
    try {
      await this.oidc.completeSignOutCallback(callbackUrl);
    } catch {
      this.errorState.set({
        code: 'signout_failed',
        message: 'The identity sign-out response could not be verified. Local session data was cleared.',
      });
    } finally {
      await this.oidc.clearSession();
      this.clearLocalState();
      this.initializedState.set(true);
      this.busyState.set(false);
    }
  }

  private applySession(session: OidcSession): void {
    if (session.expired || !session.accessToken || !session.user.subject) {
      this.handleSessionExpiry();
      return;
    }
    this.userState.set(session.user);
    this.accessTokenState.set(session.accessToken);
    this.unauthorizedSessionCleared = false;
    this.errorState.set(null);
  }

  private handleSessionExpiry(): void {
    this.clearLocalState();
    this.errorState.set({
      code: 'session_expired',
      message: 'Your session has ended. Sign in again to continue.',
    });
  }

  private async handleRefreshFailure(): Promise<void> {
    await this.oidc.clearSession();
    this.handleSessionExpiry();
  }

  private clearLocalState(): void {
    this.userState.set(null);
    this.accessTokenState.set(null);
  }
}
