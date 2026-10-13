import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

import { AppError, AppErrorCode, TalabatProblemDetails } from './app-error';

export const publicErrorTitle = 'Something went wrong';

export const problemDetailsInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(catchError((e: HttpErrorResponse) => throwError(() => toAppError(e))));

function isCheckoutUnavailableBody(value: unknown): boolean {
  if (value === null || typeof value !== 'object') return false;

  const candidate = value as Record<string, unknown>;
  if (!('unavailableItems' in candidate)) return false;
  return candidate['unavailableItems'] === null || Array.isArray(candidate['unavailableItems']);
}

function toAppError(e: HttpErrorResponse): AppError {
  if (e.status === 0) {
    return {
      status: 0,
      code: AppErrorCode.Unknown,
      title: 'Cannot reach the server',
      isNetworkError: true,
    };
  }

  const body = e.error as TalabatProblemDetails | null;
  const raw = body?.errorCode ?? undefined;
  const code: AppErrorCode =
    raw && raw in AppErrorCode ? (raw as AppErrorCode) : AppErrorCode.Unknown;

  const typedCheckout422 = isCheckoutUnavailableBody(e.error);

  if (code === AppErrorCode.Unknown) {
    return {
      status: e.status,
      code,
      title: publicErrorTitle,
      isNetworkError: false,
      rawError: typedCheckout422 ? e.error : undefined,
    };
  }

  return {
    status: e.status,
    code,
    title: body?.title ?? publicErrorTitle,
    detail: body?.detail ?? undefined,
    isNetworkError: false,
    rawError: typedCheckout422 ? e.error : undefined,
  };
}
