import { InjectionToken } from '@angular/core';

import { OidcSession } from './auth.models';

export interface OidcLifecycleHandlers {
  readonly onSessionLoaded: (session: OidcSession) => void;
  readonly onSessionExpired: () => void;
  readonly onRefreshFailed: () => void;
  readonly onSessionCleared: () => void;
}

export interface OidcAdapter {
  initialize(): Promise<OidcSession | null>;
  startSignIn(returnUrl: string): Promise<void>;
  completeSignInCallback(callbackUrl: string): Promise<OidcSession>;
  startSignOut(): Promise<void>;
  completeSignOutCallback(callbackUrl: string): Promise<void>;
  clearSession(): Promise<void>;
  setLifecycleHandlers(handlers: OidcLifecycleHandlers): void;
}

export const OIDC_ADAPTER = new InjectionToken<OidcAdapter>('OIDC_ADAPTER');
