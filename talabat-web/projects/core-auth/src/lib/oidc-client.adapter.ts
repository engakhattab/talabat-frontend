import { User, UserManager } from 'oidc-client-ts';

import { AuthUser, OidcSession } from './auth.models';
import { OidcAdapter, OidcLifecycleHandlers } from './oidc-adapter';
import { safeReturnUrl } from './return-url';

export class OidcClientAdapter implements OidcAdapter {
  private readonly manager: UserManager;
  private handlers: OidcLifecycleHandlers | undefined;

  constructor(manager: UserManager) {
    this.manager = manager;
    manager.events.addUserLoaded((user) => this.handlers?.onSessionLoaded(this.toSession(user)));
    manager.events.addAccessTokenExpired(() => this.handlers?.onSessionExpired());
    manager.events.addSilentRenewError(() => this.handlers?.onRefreshFailed());
    manager.events.addUserUnloaded(() => this.handlers?.onSessionCleared());
  }

  async initialize(): Promise<OidcSession | null> {
    await this.manager.clearStaleState();
    const user = await this.manager.getUser();
    return user && user.expired !== true ? this.toSession(user) : null;
  }

  startSignIn(returnUrl: string): Promise<void> {
    return this.manager.signinRedirect({ state: { returnUrl: safeReturnUrl(returnUrl) } });
  }

  async completeSignInCallback(callbackUrl: string): Promise<OidcSession> {
    return this.toSession(await this.manager.signinRedirectCallback(callbackUrl));
  }

  startSignOut(): Promise<void> {
    return this.manager.signoutRedirect();
  }

  async completeSignOutCallback(callbackUrl: string): Promise<void> {
    await this.manager.signoutRedirectCallback(callbackUrl);
    await this.manager.removeUser();
  }

  clearSession(): Promise<void> {
    return this.manager.removeUser();
  }

  setLifecycleHandlers(handlers: OidcLifecycleHandlers): void {
    this.handlers = handlers;
  }

  private toSession(user: User): OidcSession {
    return {
      accessToken: user.access_token,
      expired: user.expired === true,
      user: this.toAuthUser(user),
      returnUrl: safeReturnUrl(this.readReturnUrl(user.state)),
    };
  }

  private toAuthUser(user: User): AuthUser {
    const subject = typeof user.profile.sub === 'string' ? user.profile.sub : '';
    const name = user.profile['name'];
    const role = user.profile['role'];
    const roles = Array.isArray(role)
      ? role.filter((value): value is string => typeof value === 'string')
      : typeof role === 'string'
        ? [role]
        : [];

    return {
      subject,
      displayName: typeof name === 'string' ? name : null,
      roles,
    };
  }

  private readReturnUrl(state: unknown): unknown {
    if (typeof state !== 'object' || state === null || !('returnUrl' in state)) return undefined;
    return state.returnUrl;
  }
}
