import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

import { AppError, AppErrorCode, TalabatProblemDetails } from './app-error';

export const problemDetailsInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(catchError((e: HttpErrorResponse) => throwError(() => toAppError(e))));

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

  return {
    status: e.status,
    code,
    title: body?.title ?? 'Something went wrong',
    detail: body?.detail ?? undefined,
    isNetworkError: false,
    rawError: e.error ?? undefined,
  };
}
