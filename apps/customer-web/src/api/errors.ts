export class ApiError extends Error {
  constructor(
    message: string,
    readonly status = 500,
    readonly code = 'UNKNOWN_ERROR',
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}
