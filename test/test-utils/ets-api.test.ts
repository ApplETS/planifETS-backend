import {
  AxiosAdapter,
  AxiosError,
  AxiosHeaders,
  AxiosResponse,
  InternalAxiosRequestConfig
} from 'axios';

import { retryingAdapter } from './ets-api';

describe('ETS test request retries', () => {
  const config: InternalAxiosRequestConfig = {
    headers: new AxiosHeaders()
  };
  const response: AxiosResponse = {
    data: {},
    status: 200,
    statusText: 'OK',
    headers: {},
    config
  };

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('returns successful requests without retrying', async () => {
    const adapter = jest
      .fn<ReturnType<AxiosAdapter>, Parameters<AxiosAdapter>>()
      .mockResolvedValue(response);
    await expect(retryingAdapter(adapter)(config)).resolves.toBe(response);
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(adapter).toHaveBeenCalledWith(config);
  });

  it.each([408, 429, 500, 502, 503, 504])(
    'retries transient HTTP %i responses with backoff',
    async (status) => {
      const error = new AxiosError(
        'Temporary failure',
        undefined,
        config,
        undefined,
        {
          ...response,
          status
        }
      );
      const adapter = jest
        .fn<ReturnType<AxiosAdapter>, Parameters<AxiosAdapter>>()
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValue(response);
      const pending = retryingAdapter(adapter)(config);
      await jest.advanceTimersByTimeAsync(499);
      expect(adapter).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(1);
      expect(adapter).toHaveBeenCalledTimes(2);
      await jest.advanceTimersByTimeAsync(999);
      expect(adapter).toHaveBeenCalledTimes(2);
      await jest.advanceTimersByTimeAsync(1);
      await expect(pending).resolves.toBe(response);
      expect(adapter).toHaveBeenCalledTimes(3);
    }
  );

  it.each([
    'ECONNABORTED',
    'ETIMEDOUT',
    'ECONNRESET',
    'EAI_AGAIN',
    'ERR_NETWORK'
  ])('retries transient network error %s', async (code) => {
    const adapter = jest
      .fn<ReturnType<AxiosAdapter>, Parameters<AxiosAdapter>>()
      .mockRejectedValueOnce(new AxiosError('Network failure', code))
      .mockResolvedValue(response);
    const pending = retryingAdapter(adapter)(config);
    await jest.advanceTimersByTimeAsync(500);
    await expect(pending).resolves.toBe(response);
    expect(adapter).toHaveBeenCalledTimes(2);
  });

  it('stops after three attempts and preserves the request error', async () => {
    const error = new AxiosError('Timeout', 'ECONNABORTED');
    const adapter = jest
      .fn<ReturnType<AxiosAdapter>, Parameters<AxiosAdapter>>()
      .mockRejectedValue(error);
    const assertion = expect(retryingAdapter(adapter)(config)).rejects.toBe(
      error
    );
    await jest.advanceTimersByTimeAsync(1500);
    await assertion;
    expect(adapter).toHaveBeenCalledTimes(3);
  });

  it.each([400, 401, 403, 404, 422])(
    'does not retry permanent HTTP %i responses',
    async (status) => {
      const error = new AxiosError(
        'Permanent failure',
        undefined,
        config,
        undefined,
        {
          ...response,
          status
        }
      );
      const adapter = jest
        .fn<ReturnType<AxiosAdapter>, Parameters<AxiosAdapter>>()
        .mockRejectedValue(error);
      await expect(retryingAdapter(adapter)(config)).rejects.toBe(error);
      expect(adapter).toHaveBeenCalledTimes(1);
      expect(jest.getTimerCount()).toBe(0);
    }
  );

  it.each([
    new Error('Invalid DTO'),
    new AxiosError('Cancelled', 'ERR_CANCELED'),
    new AxiosError('Invalid hostname', 'ENOTFOUND')
  ])(
    'does not retry assertions, cancellations or configuration errors: %s',
    async (error) => {
      const adapter = jest
        .fn<ReturnType<AxiosAdapter>, Parameters<AxiosAdapter>>()
        .mockRejectedValue(error);
      await expect(retryingAdapter(adapter)(config)).rejects.toBe(error);
      expect(adapter).toHaveBeenCalledTimes(1);
    }
  );
});
