export interface AuthUser {
  readonly subject: string;
  readonly displayName: string | null;
  readonly roles: readonly string[];
}

export type AuthErrorCode =
  | 'initialization_failed'
  | 'signin_failed'
  | 'callback_failed'
  | 'signout_failed'
  | 'session_expired'
  | 'authorization_failed';

export interface AuthError {
  readonly code: AuthErrorCode;
  readonly message: string;
}

export interface OidcSession {
  readonly accessToken: string;
  readonly expired: boolean;
  readonly user: AuthUser;
  readonly returnUrl: string;
}
