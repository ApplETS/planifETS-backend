import { HttpModule, HttpService } from '@nestjs/axios';
import { Test } from '@nestjs/testing';
import axios, { AxiosAdapter } from 'axios';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { EtsApiService } from '@/common/api-helper/ets/course/ets-api.service';
import { EtsProgramService } from '@/common/api-helper/ets/program/ets-program.service';

const TRANSIENT_STATUSES = [408, 429, 500, 502, 503, 504];
const TRANSIENT_CODES = [
  'ECONNABORTED',
  'ETIMEDOUT',
  'ECONNRESET',
  'EAI_AGAIN',
  'ERR_NETWORK'
];

// Retry the transport only: malformed payloads and assertions must fail immediately.
export function retryingAdapter(adapter: AxiosAdapter): AxiosAdapter {
  return async (config) => {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await adapter(config);
      } catch (error) {
        const transient =
          axios.isAxiosError(error) &&
          (error.response
            ? TRANSIENT_STATUSES.includes(error.response.status)
            : TRANSIENT_CODES.includes(error.code ?? ''));
        if (!transient || attempt >= 2) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
      }
    }
  };
}

export async function createEtsApiTestModule() {
  const moduleRef = await Test.createTestingModule({
    imports: [HttpModule.register({ timeout: 15000 })],
    providers: [EtsApiService, EtsProgramService]
  }).compile();
  const client = moduleRef.get(HttpService).axiosRef;
  client.defaults.adapter = retryingAdapter(
    axios.getAdapter(client.defaults.adapter)
  );
  return { moduleRef, client };
}

export function expectDto<T extends object>(
  dto: ClassConstructor<T>,
  payload: unknown
): T {
  expect(payload).not.toBeNull();
  expect(typeof payload).toBe('object');
  expect(Array.isArray(payload)).toBe(false);
  const instance = plainToInstance(dto, payload);
  // Do not coerce values or reject additional fields that our services do not use.
  // Keeping the full errors makes nested property paths visible on CI failures.
  expect(validateSync(instance, { forbidUnknownValues: true })).toEqual([]);
  return instance;
}
