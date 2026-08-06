import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { BASE_PATH } from '@talabat/api-customer';
import { authInterceptor, provideAuth } from '@talabat/core-auth';
import { APP_CONFIG, APP_CONFIG_READY, provideAppConfig } from '@talabat/core-config';
import { correlationIdInterceptor, problemDetailsInterceptor } from '@talabat/core-http';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideAppConfig(),
    provideAuth(
      () => inject(APP_CONFIG),
      () => inject(APP_CONFIG_READY),
    ),
    provideHttpClient(
      withInterceptors([
        correlationIdInterceptor,
        authInterceptor,
        problemDetailsInterceptor,
      ]),
    ),
    {
      provide: BASE_PATH,
      useFactory: () => inject(APP_CONFIG).customerApiBaseUrl,
    },
  ],
};
