import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { BASE_PATH } from '@talabat/api-customer';
import { APP_CONFIG, provideAppConfig } from '@talabat/core-config';
import { correlationIdInterceptor, problemDetailsInterceptor } from '@talabat/core-http';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideAppConfig(),
    provideHttpClient(withInterceptors([correlationIdInterceptor, problemDetailsInterceptor])),
    {
      provide: BASE_PATH,
      useFactory: () => inject(APP_CONFIG).customerApiBaseUrl,
    },
  ],
};
