import {
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';

import { APP_CONFIG, APP_CONFIG_READY, AppConfig } from './app-config';

export function provideAppConfig(): EnvironmentProviders {
  let config: AppConfig | undefined;

  return makeEnvironmentProviders([
    {
      provide: APP_CONFIG_READY,
      useFactory: () =>
        (async () => {
          const res = await fetch('/assets/config.json');
          if (!res.ok) throw new Error(`Config load failed: ${res.status}`);
          config = await res.json();
        })(),
    },
    provideAppInitializer(() => inject(APP_CONFIG_READY)),
    {
      provide: APP_CONFIG,
      useFactory: () => {
        if (!config) throw new Error('APP_CONFIG read before initialisation');
        return config;
      },
    },
  ]);
}
