import { InjectionToken } from '@angular/core';
import { InMemoryWebStorage, UserManagerSettings, WebStorageStateStore } from 'oidc-client-ts';

export const SIGNIN_CALLBACK_PATH = '/signin-callback';
export const SIGNOUT_CALLBACK_PATH = '/signout-callback';

export interface AuthRuntimeConfig {
  readonly identityAuthority: string;
  readonly customerApiBaseUrl: string;
  readonly clientId: string;
  readonly scopes: string;
}

export const AUTH_RUNTIME_CONFIG = new InjectionToken<AuthRuntimeConfig>('AUTH_RUNTIME_CONFIG');
export const AUTH_CONFIG_READY = new InjectionToken<Promise<void>>('AUTH_CONFIG_READY');

export interface OidcRuntimeConfig {
  readonly settings: UserManagerSettings;
  readonly usesTransientSessionStorage: boolean;
  readonly usesInMemoryUserStorage: boolean;
}

export function createOidcRuntimeConfig(
  config: AuthRuntimeConfig,
  browserOrigin: string,
  transactionStorage: Storage,
): OidcRuntimeConfig {
  const origin = new URL(browserOrigin).origin;

  return {
    settings: {
      authority: config.identityAuthority,
      client_id: config.clientId,
      redirect_uri: `${origin}${SIGNIN_CALLBACK_PATH}`,
      post_logout_redirect_uri: `${origin}${SIGNOUT_CALLBACK_PATH}`,
      response_type: 'code',
      scope: config.scopes,
      disablePKCE: false,
      automaticSilentRenew: true,
      monitorSession: false,
      loadUserInfo: false,
      validateSubOnSilentRenew: true,
      staleStateAgeInSeconds: 900,
      stateStore: new WebStorageStateStore({
        prefix: 'talabat.oidc.transaction.',
        store: transactionStorage,
      }),
      userStore: new WebStorageStateStore({
        prefix: 'talabat.oidc.user.',
        store: new InMemoryWebStorage(),
      }),
    },
    usesTransientSessionStorage: true,
    usesInMemoryUserStorage: true,
  };
}
