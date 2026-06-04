import {
  getNestedProperty,
  isNotFoundError,
  isRecord,
  isTransientError,
  retryTransient,
} from '../../src/embedding/qdrant-error.util';

describe('isRecord', () => {
  it('returns true for plain objects', () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord({ a: 1 })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isRecord(null)).toBe(false);
  });

  it('returns false for primitives', () => {
    expect(isRecord(42)).toBe(false);
    expect(isRecord('str')).toBe(false);
    expect(isRecord(true)).toBe(false);
    expect(isRecord(undefined)).toBe(false);
  });

  it('returns true for arrays', () => {
    expect(isRecord([])).toBe(true);
  });
});

describe('getNestedProperty', () => {
  it('retrieves a value at a nested path', () => {
    expect(getNestedProperty({ a: { b: { c: 42 } } }, ['a', 'b', 'c'])).toBe(42);
  });

  it('returns undefined when an intermediate key is missing', () => {
    expect(getNestedProperty({ a: 1 }, ['a', 'b'])).toBeUndefined();
  });

  it('returns undefined when an intermediate value is not a record', () => {
    expect(getNestedProperty({ a: 42 }, ['a', 'b'])).toBeUndefined();
  });

  it('returns the root value for an empty path', () => {
    const obj = { a: 1 };
    expect(getNestedProperty(obj, [])).toBe(obj);
  });

  it('returns undefined when root value is not a record', () => {
    expect(getNestedProperty(null, ['a'])).toBeUndefined();
  });
});

describe('isNotFoundError', () => {
  it('returns true for an error with status 404', () => {
    expect(isNotFoundError({ status: 404 })).toBe(true);
  });

  it('returns false for other status codes', () => {
    expect(isNotFoundError({ status: 500 })).toBe(false);
    expect(isNotFoundError({ status: 200 })).toBe(false);
  });

  it('returns false for non-record errors', () => {
    expect(isNotFoundError(null)).toBe(false);
    expect(isNotFoundError('not found')).toBe(false);
  });
});

describe('isTransientError', () => {
  it('returns true for status 408', () => {
    expect(isTransientError({ status: 408 })).toBe(true);
  });

  it('returns true for status 429', () => {
    expect(isTransientError({ status: 429 })).toBe(true);
  });

  it('returns true for 5xx status codes', () => {
    expect(isTransientError({ status: 500 })).toBe(true);
    expect(isTransientError({ status: 503 })).toBe(true);
    expect(isTransientError({ status: 599 })).toBe(true);
  });

  it('returns false for 4xx codes that are not 408/429', () => {
    expect(isTransientError({ status: 400 })).toBe(false);
    expect(isTransientError({ status: 404 })).toBe(false);
  });

  it('returns true for ECONNRESET', () => {
    expect(isTransientError({ code: 'ECONNRESET' })).toBe(true);
  });

  it('returns true for ECONNREFUSED', () => {
    expect(isTransientError({ code: 'ECONNREFUSED' })).toBe(true);
  });

  it('returns true for ETIMEDOUT', () => {
    expect(isTransientError({ code: 'ETIMEDOUT' })).toBe(true);
  });

  it('reads statusCode as a fallback when status is absent', () => {
    expect(isTransientError({ statusCode: 500 })).toBe(true);
  });

  it('reads response.status as a fallback when both status and statusCode are absent', () => {
    expect(isTransientError({ response: { status: 503 } })).toBe(true);
  });

  it('returns false for non-record errors', () => {
    expect(isTransientError(null)).toBe(false);
    expect(isTransientError('error')).toBe(false);
  });
});

describe('retryTransient', () => {
  it('resolves immediately when the operation succeeds on the first attempt', async () => {
    const operation = jest.fn().mockResolvedValue('ok');
    await expect(retryTransient(operation, 3, 0)).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('retries on a transient error and resolves on the next attempt', async () => {
    const operation = jest.fn()
      .mockRejectedValueOnce({ status: 503 })
      .mockResolvedValueOnce('ok');
    await expect(retryTransient(operation, 3, 0)).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('throws immediately on non-transient errors without retrying', async () => {
    const error = new Error('bad request');
    const operation = jest.fn().mockRejectedValue(error);
    await expect(retryTransient(operation, 3, 0)).rejects.toBe(error);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('throws after exhausting all attempts on persistent transient errors', async () => {
    const error = { status: 503 };
    const operation = jest.fn().mockRejectedValue(error);
    await expect(retryTransient(operation, 3, 0)).rejects.toBe(error);
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('throws on the last attempt even if error is transient', async () => {
    const transientError = { status: 429 };
    const operation = jest.fn().mockRejectedValue(transientError);
    await expect(retryTransient(operation, 1, 0)).rejects.toBe(transientError);
    expect(operation).toHaveBeenCalledTimes(1);
  });
});
