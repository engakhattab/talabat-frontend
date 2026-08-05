import {
  EnvironmentInjector,
  EnvironmentProviders,
  FactoryProvider,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { UserManager } from 'oidc-client-ts';

import { AuthStore } from './auth.store';
import { OIDC_ADAPTER } from './oidc-adapter';
import { OidcClientAdapter } from './oidc-client.adapter';
import {
  AUTH_CONFIG_READY,
  AUTH_RUNTIME_CONFIG,
  AuthRuntimeConfig,
  createOidcRuntimeConfig,
} from './oidc-config';

export function provideAuth(
  configFactory: () => AuthRuntimeConfig,
  readinessFactory: () => Promise<void>,
): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: AUTH_RUNTIME_CONFIG, useFactory: configFactory } satisfies FactoryProvider,
    { provide: AUTH_CONFIG_READY, useFactory: readinessFactory } satisfies FactoryProvider,
    {
      provide: OIDC_ADAPTER,
      useFactory: () => {
        const config = inject(AUTH_RUNTIME_CONFIG);
        const runtime = createOidcRuntimeConfig(config, window.location.origin, window.sessionStorage);
        return new OidcClientAdapter(new UserManager(runtime.settings));
      },
    },
    provideAppInitializer(async () => {
      const configReady = inject(AUTH_CONFIG_READY);
      const injector = inject(EnvironmentInjector);
      await configReady;
      await injector.get(AuthStore).initialize();
    }),
  ]);
}
