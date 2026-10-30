// Shared auth types. Keep these in sync with the backend contract (OpenAPI).

export type LoginValues = {
  email: string;
  password: string;
};

export type AuthErrorCode =
  | "INVALID_CREDENTIALS" // wrong email or password
  | "ACCOUNT_DISABLED" // deactivated staff member
  | "TOO_MANY_ATTEMPTS" // rate limited
  | "NETWORK" // weak or lost connection
  | "UNKNOWN";

/**
 * Throw this from your login handler when the backend rejects the request.
 * LoginForm reads `code` to pick the message and highlight the fields.
 */
export class AuthError extends Error {
  code: AuthErrorCode;

  constructor(code: AuthErrorCode, message?: string) {
    super(message ?? defaultAuthMessages[code]);
    this.name = "AuthError";
    this.code = code;
  }
}

export const defaultAuthMessages: Record<AuthErrorCode, string> = {
  INVALID_CREDENTIALS: "Wrong email or password. Please check them and try again.",
  ACCOUNT_DISABLED: "This account is deactivated. Please contact your business owner.",
  TOO_MANY_ATTEMPTS: "Too many attempts. Please wait a few minutes and try again.",
  NETWORK: "Connection problem. Your details are kept, please try again.",
  UNKNOWN: "Something went wrong. Please try again.",
};
