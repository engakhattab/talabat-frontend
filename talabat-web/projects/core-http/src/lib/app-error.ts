export const AppErrorCode = {
  ProfileNotCreated: 'ProfileNotCreated',
  InvalidCustomerProfile: 'InvalidCustomerProfile',
  ProfileAlreadyExists: 'ProfileAlreadyExists',
  RestaurantNotFound: 'RestaurantNotFound',
  Unknown: 'Unknown',
} as const;
export type AppErrorCode = (typeof AppErrorCode)[keyof typeof AppErrorCode];

/** ProblemDetails plus RFC 9457 root-level extension members. */
export interface TalabatProblemDetails {
  type?: string | null;
  title?: string | null;
  status?: number | null;
  detail?: string | null;
  instance?: string | null;
  errorCode?: string | null;
}

export interface AppError {
  readonly status: number;
  readonly code: AppErrorCode;
  readonly title: string;
  readonly detail?: string;
  readonly isNetworkError: boolean;
}
