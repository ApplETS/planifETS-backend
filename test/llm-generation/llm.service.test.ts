import { Logger } from '@nestjs/common';

import { LlmExhaustedException } from '../../src/llm-generation/exceptions/llm-exhausted.exception';
import { LlmGenerationResponse } from '../../src/llm-generation/interfaces/llm-generation-response.interface';
import { LlmProvider } from '../../src/llm-generation/interfaces/llm-provider';
import { LlmService } from '../../src/llm-generation/llm.service';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

const VALID_LLM_JSON = JSON.stringify({
  courses: [{ code: 'LOG121' }],
  explanation: 'These courses cover the fundamentals.',
});

const okFetch = (content: string) =>
  Promise.resolve({
    ok: true,
    json: async () => ({ choices: [{ message: { content } }] }),
  } as Response);

const errorFetch = (status: number, body = 'error') =>
  Promise.resolve({
    ok: false,
    status,
    text: async () => body,
  } as Response);

describe('LlmService', () => {
  let fetchMock: jest.Mock;
  let savedEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    savedEnv = { ...process.env };
    delete process.env.GROQ_API_KEY;
    delete process.env.GROQ_PRIMARY_MODEL;
    delete process.env.GROQ_FALLBACK_MODEL;
    delete process.env.NVIDIA_API_KEY;
    delete process.env.NVIDIA_MODEL;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_MODEL;
    delete process.env.LLM_TIMEOUT_MS;

    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    process.env = savedEnv;
    jest.restoreAllMocks();
  });

  describe('provider configuration', () => {
    it('includes a provider only when both model name and API key are present', () => {
      process.env.GROQ_API_KEY = 'groq-key';
      process.env.GROQ_PRIMARY_MODEL = 'llama-3.3-70b-versatile';

      const service = new LlmService();

      const providers = (service as unknown as { providers: LlmProvider[] }).providers;
      expect(providers).toHaveLength(1);
      expect(providers[0].name).toContain('Groq');
    });

    it('excludes a provider when the API key is missing', () => {
      process.env.GROQ_PRIMARY_MODEL = 'llama-3.3-70b-versatile';

      const service = new LlmService();

      expect((service as unknown as { providers: LlmProvider[] }).providers).toHaveLength(0);
    });

    it('excludes a provider when the model name is missing', () => {
      process.env.GROQ_API_KEY = 'groq-key';

      const service = new LlmService();

      expect((service as unknown as { providers: LlmProvider[] }).providers).toHaveLength(0);
    });

    it('logs a warning when no providers are configured', () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});

      new LlmService();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No LLM providers configured'),
      );
    });

    it('configures up to four providers when all env vars are set', () => {
      process.env.GROQ_API_KEY = 'groq-key';
      process.env.GROQ_PRIMARY_MODEL = 'llama-3.3';
      process.env.GROQ_FALLBACK_MODEL = 'llama-3.1';
      process.env.NVIDIA_API_KEY = 'nvidia-key';
      process.env.NVIDIA_MODEL = 'nvidia-llama';
      process.env.GEMINI_API_KEY = 'gemini-key';
      process.env.GEMINI_MODEL = 'gemini-2.0-flash';

      const service = new LlmService();

      expect((service as unknown as { providers: LlmProvider[] }).providers).toHaveLength(4);
    });

    it('reads LLM_TIMEOUT_MS from the environment', () => {
      process.env.LLM_TIMEOUT_MS = '3000';

      const service = new LlmService();

      expect((service as unknown as { timeoutMs: number }).timeoutMs).toBe(3000);
    });

    it('defaults the timeout to 10000 ms when LLM_TIMEOUT_MS is not set', () => {
      const service = new LlmService();

      expect((service as unknown as { timeoutMs: number }).timeoutMs).toBe(10000);
    });
  });

  describe('generate', () => {
    it('returns the result from the first provider when it succeeds', async () => {
      process.env.GROQ_API_KEY = 'groq-key';
      process.env.GROQ_PRIMARY_MODEL = 'llama-3.3';
      process.env.NVIDIA_API_KEY = 'nvidia-key';
      process.env.NVIDIA_MODEL = 'nvidia-llama';

      fetchMock.mockReturnValue(okFetch(VALID_LLM_JSON));

      const result = await new LlmService().generate('Suggest AI courses');

      expect(result).toEqual({
        courses: [{ code: 'LOG121' }],
        explanation: 'These courses cover the fundamentals.',
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(GROQ_URL, expect.any(Object));
    });

    it('falls back to the second provider when the first returns an HTTP error', async () => {
      process.env.GROQ_API_KEY = 'groq-key';
      process.env.GROQ_PRIMARY_MODEL = 'llama-3.3';
      process.env.NVIDIA_API_KEY = 'nvidia-key';
      process.env.NVIDIA_MODEL = 'nvidia-llama';

      fetchMock
        .mockReturnValueOnce(errorFetch(429, 'rate limited'))
        .mockReturnValueOnce(okFetch(VALID_LLM_JSON));

      const result = await new LlmService().generate('Suggest AI courses');

      expect(result).toEqual({
        courses: [{ code: 'LOG121' }],
        explanation: 'These courses cover the fundamentals.',
      });
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock).toHaveBeenNthCalledWith(1, GROQ_URL, expect.any(Object));
      expect(fetchMock).toHaveBeenNthCalledWith(2, NVIDIA_URL, expect.any(Object));
    });

    it('falls back to the next provider when the first throws a network error', async () => {
      process.env.GROQ_API_KEY = 'groq-key';
      process.env.GROQ_PRIMARY_MODEL = 'llama-3.3';
      process.env.NVIDIA_API_KEY = 'nvidia-key';
      process.env.NVIDIA_MODEL = 'nvidia-llama';

      fetchMock
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockReturnValueOnce(okFetch(VALID_LLM_JSON));

      const result = await new LlmService().generate('Suggest AI courses');

      expect(result).toEqual({
        courses: [{ code: 'LOG121' }],
        explanation: 'These courses cover the fundamentals.',
      });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('tries all providers in sequence and uses the last working one', async () => {
      process.env.GROQ_API_KEY = 'groq-key';
      process.env.GROQ_PRIMARY_MODEL = 'llama-3.3';
      process.env.GROQ_FALLBACK_MODEL = 'llama-3.1';
      process.env.GEMINI_API_KEY = 'gemini-key';
      process.env.GEMINI_MODEL = 'gemini-2.0-flash';

      fetchMock
        .mockRejectedValueOnce(new Error('primary Groq down'))
        .mockRejectedValueOnce(new Error('fallback Groq down'))
        .mockReturnValueOnce(okFetch(VALID_LLM_JSON));

      const result = await new LlmService().generate('Suggest AI courses');

      expect(result).toEqual({
        courses: [{ code: 'LOG121' }],
        explanation: 'These courses cover the fundamentals.',
      });
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(fetchMock).toHaveBeenNthCalledWith(3, GEMINI_URL, expect.any(Object));
    });

    it('throws LlmExhaustedException when all configured providers fail', async () => {
      process.env.GROQ_API_KEY = 'groq-key';
      process.env.GROQ_PRIMARY_MODEL = 'llama-3.3';
      process.env.NVIDIA_API_KEY = 'nvidia-key';
      process.env.NVIDIA_MODEL = 'nvidia-llama';

      fetchMock.mockRejectedValue(new Error('all down'));

      await expect(new LlmService().generate('Suggest AI courses')).rejects.toThrow(
        LlmExhaustedException,
      );
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('throws LlmExhaustedException immediately when no providers are configured', async () => {
      jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});

      await expect(new LlmService().generate('Suggest AI courses')).rejects.toThrow(
        LlmExhaustedException,
      );
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('logs a warning for each provider that fails', async () => {
      process.env.GROQ_API_KEY = 'groq-key';
      process.env.GROQ_PRIMARY_MODEL = 'llama-3.3';
      process.env.NVIDIA_API_KEY = 'nvidia-key';
      process.env.NVIDIA_MODEL = 'nvidia-llama';

      fetchMock
        .mockRejectedValueOnce(new Error('Groq unavailable'))
        .mockReturnValueOnce(okFetch(VALID_LLM_JSON));

      const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
      await new LlmService().generate('Suggest AI courses');

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Groq'));
    });

    it('falls back to the next provider when the first one times out via AbortSignal', async () => {
      process.env.GROQ_API_KEY = 'groq-key';
      process.env.GROQ_PRIMARY_MODEL = 'llama-3.3';
      process.env.NVIDIA_API_KEY = 'nvidia-key';
      process.env.NVIDIA_MODEL = 'nvidia-llama';

      const service = new LlmService();
      const [groqProvider, nvidiaProvider] = (service as unknown as { providers: LlmProvider[] }).providers;

      // Force a short per-provider timeout (provider.timeoutMs takes precedence over LLM_TIMEOUT_MS)
      (groqProvider as unknown as { timeoutMs: number }).timeoutMs = 50;

      // Groq hangs until its AbortSignal fires — simulates a slow provider
      jest.spyOn(groqProvider, 'generate').mockImplementation(
        (...args: unknown[]) =>
          new Promise<LlmGenerationResponse>((_, reject) => {
            (args[1] as AbortSignal).addEventListener('abort', () =>
              reject(new DOMException('The operation was aborted.', 'AbortError')),
            );
          }),
      );
      jest.spyOn(nvidiaProvider, 'generate').mockResolvedValue({
        courses: [{ code: 'LOG121' }],
        explanation: 'These courses cover the fundamentals.',
      });

      const result = await service.generate('Suggest AI courses');

      expect(result).toEqual({
        courses: [{ code: 'LOG121' }],
        explanation: 'These courses cover the fundamentals.',
      });
      expect(groqProvider.generate).toHaveBeenCalledTimes(1);
      expect(nvidiaProvider.generate).toHaveBeenCalledTimes(1);
    }, 2000);

    it('throws LlmExhaustedException and the AbortSignal is marked aborted when every provider times out', async () => {
      process.env.GROQ_API_KEY = 'groq-key';
      process.env.GROQ_PRIMARY_MODEL = 'llama-3.3';

      const service = new LlmService();
      const [groqProvider] = (service as unknown as { providers: LlmProvider[] }).providers;

      (groqProvider as unknown as { timeoutMs: number }).timeoutMs = 50;

      let capturedSignal: AbortSignal | undefined;
      jest.spyOn(groqProvider, 'generate').mockImplementation(
        (...args: unknown[]) => {
          const signal = args[1] as AbortSignal;
          capturedSignal = signal;
          return new Promise<LlmGenerationResponse>((_, reject) => {
            signal.addEventListener('abort', () =>
              reject(new DOMException('The operation was aborted.', 'AbortError')),
            );
          });
        },
      );

      await expect(service.generate('Suggest AI courses')).rejects.toThrow(
        LlmExhaustedException,
      );
      expect(capturedSignal?.aborted).toBe(true);
    }, 2000);
  });

  describe('checkStatus', () => {
    it('reports ok with latency for a responsive provider', async () => {
      process.env.GROQ_API_KEY = 'groq-key';
      process.env.GROQ_PRIMARY_MODEL = 'llama-3.3';

      fetchMock.mockReturnValue(okFetch(VALID_LLM_JSON));

      const statuses = await new LlmService().checkStatus();

      expect(statuses).toHaveLength(1);
      expect(statuses[0]).toMatchObject({
        name: expect.stringContaining('Groq'),
        status: 'ok',
        latencyMs: expect.any(Number),
      });
      expect(statuses[0].error).toBeUndefined();
    });

    it('reports error with message when a provider fails', async () => {
      process.env.GROQ_API_KEY = 'groq-key';
      process.env.GROQ_PRIMARY_MODEL = 'llama-3.3';

      fetchMock.mockRejectedValue(new Error('Connection refused'));

      const statuses = await new LlmService().checkStatus();

      expect(statuses[0]).toMatchObject({
        status: 'error',
        error: expect.stringContaining('Connection refused'),
      });
    });

    it('checks all configured providers and returns mixed statuses', async () => {
      process.env.GROQ_API_KEY = 'groq-key';
      process.env.GROQ_PRIMARY_MODEL = 'llama-3.3';
      process.env.NVIDIA_API_KEY = 'nvidia-key';
      process.env.NVIDIA_MODEL = 'nvidia-llama';

      fetchMock
        .mockReturnValueOnce(okFetch(VALID_LLM_JSON))
        .mockRejectedValueOnce(new Error('NVIDIA unavailable'));

      const statuses = await new LlmService().checkStatus();

      expect(statuses).toHaveLength(2);
      expect(statuses.find((s) => s.name.includes('Groq'))?.status).toBe('ok');
      expect(statuses.find((s) => s.name.includes('Nvidia'))?.status).toBe('error');
    });

    it('returns an empty array when no providers are configured', async () => {
      jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});

      const statuses = await new LlmService().checkStatus();

      expect(statuses).toEqual([]);
    });
  });
});
