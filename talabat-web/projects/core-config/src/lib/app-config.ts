import { InjectionToken } from '@angular/core';

export interface AppConfig {
  readonly identityAuthority: string;
  readonly customerApiBaseUrl: string;
  readonly clientId: string;
  readonly scopes: string;
}

export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');
export const APP_CONFIG_READY = new InjectionToken<Promise<void>>('APP_CONFIG_READY');
