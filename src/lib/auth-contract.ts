// Browser-safe auth contract shared by server functions and their callers.
// Any protected server function that is called without a valid session fails
// with an Error whose message starts with AUTH_REQUIRED (and HTTP 401).

export const AUTH_REQUIRED = 'AUTH_REQUIRED' as const

export function authRequiredMessage(detail = 'Sign in required') {
  return `${AUTH_REQUIRED}: ${detail}`
}

/** True when an error thrown by a protected server function means "not signed in". */
export function isAuthRequiredError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : ''
  return message.startsWith(AUTH_REQUIRED) || message.startsWith('Unauthorized')
}
