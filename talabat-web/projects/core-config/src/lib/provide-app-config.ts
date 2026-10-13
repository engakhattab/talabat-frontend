import {
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';

import { APP_CONFIG, APP_CONFIG_READY, AppConfig } from './app-config';

const PUBLIC_CONFIG_KEYS = ['identityAuthority', 'customerApiBaseUrl', 'clientId', 'scopes'] as const;

export class AppConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppConfigError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertOnlyPublicKeys(value: Record<string, unknown>): void {
  for (const key of Object.keys(value)) {
    if (!(PUBLIC_CONFIG_KEYS as readonly string[]).includes(key)) {
      throw new AppConfigError(`Invalid runtime config: unexpected key "${key}"`);
    }
  }
  for (const key of PUBLIC_CONFIG_KEYS) {
    if (!(key in value)) {
      throw new AppConfigError(`Invalid runtime config: missing key "${key}"`);
    }
  }
}

function assertNonEmptyString(value: unknown, key: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new AppConfigError(`Invalid runtime config: "${key}" must be a non-empty string`);
  }
}

function assertAbsoluteHttpUrl(value: unknown, key: string): asserts value is string {
  assertNonEmptyString(value, key);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new AppConfigError(`Invalid runtime config: "${key}" must be an absolute URL`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new AppConfigError(`Invalid runtime config: "${key}" must use http or https`);
  }
}

export function parseAppConfig(value: unknown): AppConfig {
  if (!isRecord(value)) {
    throw new AppConfigError('Invalid runtime config: expected a JSON object');
  }
  assertOnlyPublicKeys(value);
  const identityAuthority = value['identityAuthority'];
  const customerApiBaseUrl = value['customerApiBaseUrl'];
  const clientId = value['clientId'];
  const scopes = value['scopes'];
  assertAbsoluteHttpUrl(identityAuthority, 'identityAuthority');
  assertAbsoluteHttpUrl(customerApiBaseUrl, 'customerApiBaseUrl');
  assertNonEmptyString(clientId, 'clientId');
  assertNonEmptyString(scopes, 'scopes');
  return {
    identityAuthority,
    customerApiBaseUrl,
    clientId,
    scopes,
  };
}

export function provideAppConfig(): EnvironmentProviders {
  let config: AppConfig | undefined;

  return makeEnvironmentProviders([
    {
      provide: APP_CONFIG_READY,
      useFactory: () =>
        (async () => {
          let res: Response;
          try {
            res = await fetch('/assets/config.json');
          } catch {
            throw new AppConfigError('Invalid runtime config: config fetch was rejected');
          }
          if (!res.ok) {
            throw new AppConfigError(`Invalid runtime config: load failed with status ${res.status}`);
          }
          let parsed: unknown;
          try {
            parsed = await res.json();
          } catch {
            throw new AppConfigError('Invalid runtime config: response is not valid JSON');
          }
          config = parseAppConfig(parsed);
        })(),
    },
    provideAppInitializer(() => inject(APP_CONFIG_READY)),
    {
      provide: APP_CONFIG,
      useFactory: () => {
        if (!config) throw new AppConfigError('APP_CONFIG read before initialisation');
        return config;
      },
    },
  ]);
}
