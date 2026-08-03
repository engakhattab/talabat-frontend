import { HttpInterceptorFn } from '@angular/common/http';

export const correlationIdInterceptor: HttpInterceptorFn = (req, next) =>
  next(
    req.clone({
      setHeaders: { 'X-Correlation-Id': crypto.randomUUID() },
    }),
  );
