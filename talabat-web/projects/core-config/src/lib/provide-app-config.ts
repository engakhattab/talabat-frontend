import {
  EnvironmentProviders,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';

import { APP_CONFIG, AppConfig } from './app-config';

export function provideAppConfig(): EnvironmentProviders {
  let config: AppConfig | undefined;

  return makeEnvironmentProviders([
    provideAppInitializer(async () => {
      const res = await fetch('/assets/config.json');
      if (!res.ok) throw new Error(`Config load failed: ${res.status}`);
      config = await res.json();
    }),
    {
      provide: APP_CONFIG,
      useFactory: () => {
        if (!config) throw new Error('APP_CONFIG read before initialisation');
        return config;
      },
    },
  ]);
}
