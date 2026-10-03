export async function retryTransient<T>(
  operation: () => Promise<T>,
  maxAttempts: number,
  delayMs: number
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Retry only after the preceding attempt fails.
      return await operation(); // NOSONAR: retry only after the preceding attempt fails
    } catch (error) {
      lastError = error;

      if (!isTransientError(error) || attempt === maxAttempts) {
        throw error;
      }

      // Backoff must finish before the next retry.
      await sleep(delayMs * attempt); // NOSONAR: backoff must finish before the next retry
    }
  }

  throw lastError;
}

export function isNotFoundError(error: unknown): boolean {
  return getStatusCode(error) === 404;
}

export function isTransientError(error: unknown): boolean {
  const status = getStatusCode(error);
  const code = getErrorCode(error);

  return (
    status === 408 ||
    status === 429 ||
    isServerErrorStatus(status) ||
    code === 'ECONNRESET' ||
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT'
  );
}

function isServerErrorStatus(status: number | undefined): boolean {
  return typeof status === 'number' && status >= 500;
}

function getStatusCode(error: unknown): number | undefined {
  if (!isRecord(error)) {
    return undefined;
  }

  const status = error.status;

  if (typeof status === 'number') {
    return status;
  }

  const statusCode = error.statusCode;

  if (typeof statusCode === 'number') {
    return statusCode;
  }

  const response = error.response;

  if (isRecord(response) && typeof response.status === 'number') {
    return response.status;
  }

  return undefined;
}

function getErrorCode(error: unknown): string | undefined {
  if (!isRecord(error)) {
    return undefined;
  }

  if (typeof error.code === 'string') {
    return error.code;
  }

  // Node.js native fetch wraps network errors: TypeError("fetch failed", { cause: { code: "ECONNREFUSED" } })
  if (isRecord(error.cause) && typeof error.cause.code === 'string') {
    return error.cause.code;
  }

  return undefined;
}

export function getNestedProperty(value: unknown, path: string[]): unknown {
  return path.reduce<unknown>((currentValue, key) => {
    if (!isRecord(currentValue)) {
      return undefined;
    }

    return currentValue[key];
  }, value);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
