import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { AuthStore } from './auth.store';
import { AUTH_RUNTIME_CONFIG } from './oidc-config';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const config = inject(AUTH_RUNTIME_CONFIG);
  const auth = inject(AuthStore);
  const token = auth.getAccessToken();
  const eligible = isProtectedCustomerRequest(request.url, config.customerApiBaseUrl);
  const outgoing =
    eligible && token && !request.headers.has('Authorization')
      ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : request;

  return next(outgoing).pipe(
    catchError((error: unknown) => {
      if (eligible && hasStatus(error, 401)) auth.handleUnauthorized();
      else if (eligible && hasStatus(error, 403)) auth.handleForbidden();
      return throwError(() => error);
    }),
  );
};

export function isProtectedCustomerRequest(requestUrl: string, configuredBaseUrl: string): boolean {
  try {
    const base = new URL(configuredBaseUrl);
    const request = new URL(requestUrl, base.origin);
    if (request.origin !== base.origin) return false;

    const basePath = base.pathname.replace(/\/$/u, '');
    const protectedPath = `${basePath}/api/me`.replace(/\/+/gu, '/');
    return request.pathname === protectedPath || request.pathname.startsWith(`${protectedPath}/`);
  } catch {
    return false;
  }
}

function hasStatus(error: unknown, status: number): boolean {
  return typeof error === 'object' && error !== null && 'status' in error && error.status === status;
}
