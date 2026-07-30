import { Logger } from '@nestjs/common';

import { CourseRetrieverService } from '../../src/embedding/course-retriever.service';
import { LlmExhaustedException } from '../../src/llm-generation/exceptions/llm-exhausted.exception';
import { LlmGenerationResponse } from '../../src/llm-generation/interfaces/llm-generation-response.interface';
import {
  LlmProvider,
  STREAM_COURSES_DELIMITER
} from '../../src/llm-generation/interfaces/llm-provider';
import {
  LlmService,
  LlmStreamEvent
} from '../../src/llm-generation/llm.service';
import { PosthogMonitoringService } from '../../src/monitoring/posthog-monitoring.service';

async function collect(
  gen: AsyncGenerator<LlmStreamEvent>
): Promise<LlmStreamEvent[]> {
  const events: LlmStreamEvent[] = [];
  for await (const event of gen) {
    events.push(event);
  }
  return events;
}

function reasonText(events: LlmStreamEvent[]): string {
  return events
    .filter(
      (e): e is Extract<LlmStreamEvent, { type: 'reason' }> =>
        e.type === 'reason'
    )
    .map((e) => e.data)
    .join('');
}

const mockCourseRetriever = {
  retrieveCourses: jest.fn()
} as unknown as CourseRetrieverService;

const mockPosthogMonitoring = {
  captureAiSpan: jest.fn(),
  captureAiGeneration: jest.fn()
} as unknown as PosthogMonitoringService;

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

const VALID_LLM_JSON = JSON.stringify({
  courses: [{ code: 'LOG121' }],
  explanation: 'These courses cover the fundamentals.'
});

const okFetch = (content: string) =>
  Promise.resolve({
    ok: true,
    json: async () => ({ choices: [{ message: { content } }] })
  } as Response);

const errorFetch = (status: number, body = 'error') =>
  Promise.resolve({
    ok: false,
    status,
    text: async () => body
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
    (mockCourseRetriever.retrieveCourses as jest.Mock).mockResolvedValue([
      {
        code: 'LOG121',
        title: 'Logiciels',
        description: 'Intro course',
        score: 0.9
      }
    ]);
    (mockPosthogMonitoring.captureAiSpan as jest.Mock).mockClear();
    (mockPosthogMonitoring.captureAiGeneration as jest.Mock).mockClear();
  });

  afterEach(() => {
    process.env = savedEnv;
    jest.restoreAllMocks();
  });

  describe('provider configuration', () => {
    it('includes a provider only when both model name and API key are present', () => {
      process.env.GROQ_API_KEY = 'groq-key';
      process.env.GROQ_PRIMARY_MODEL = 'llama-3.3-70b-versatile';

      const service = new LlmService(
        mockCourseRetriever,
        mockPosthogMonitoring
      );

      const providers = (service as unknown as { providers: LlmProvider[] })
        .providers;
      expect(providers).toHaveLength(1);
      expect(providers[0].name).toContain('Groq');
    });

    it('excludes a provider when the API key is missing', () => {
      process.env.GROQ_PRIMARY_MODEL = 'llama-3.3-70b-versatile';

      const service = new LlmService(
        mockCourseRetriever,
        mockPosthogMonitoring
      );

      expect(
        (service as unknown as { providers: LlmProvider[] }).providers
      ).toHaveLength(0);
    });

    it('excludes a provider when the model name is missing', () => {
      process.env.GROQ_API_KEY = 'groq-key';

      const service = new LlmService(
        mockCourseRetriever,
        mockPosthogMonitoring
      );

      expect(
        (service as unknown as { providers: LlmProvider[] }).providers
      ).toHaveLength(0);
    });

    it('logs a warning when no providers are configured', () => {
      const warnSpy = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => {});

      new LlmService(mockCourseRetriever, mockPosthogMonitoring);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No LLM providers configured')
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

      const service = new LlmService(
        mockCourseRetriever,
        mockPosthogMonitoring
      );

      expect(
        (service as unknown as { providers: LlmProvider[] }).providers
      ).toHaveLength(4);
    });

    it('reads LLM_TIMEOUT_MS from the environment', () => {
      process.env.LLM_TIMEOUT_MS = '3000';

      const service = new LlmService(
        mockCourseRetriever,
        mockPosthogMonitoring
      );

      expect((service as unknown as { timeoutMs: number }).timeoutMs).toBe(
        3000
      );
    });

    it('defaults the timeout to 10000 ms when LLM_TIMEOUT_MS is not set', () => {
      const service = new LlmService(
        mockCourseRetriever,
        mockPosthogMonitoring
      );

      expect((service as unknown as { timeoutMs: number }).timeoutMs).toBe(
        10000
      );
    });
  });

  describe('generate', () => {
    it('returns the result from the first provider when it succeeds', async () => {
      process.env.GROQ_API_KEY = 'groq-key';
      process.env.GROQ_PRIMARY_MODEL = 'llama-3.3';
      process.env.NVIDIA_API_KEY = 'nvidia-key';
      process.env.NVIDIA_MODEL = 'nvidia-llama';

      fetchMock.mockReturnValue(okFetch(VALID_LLM_JSON));

      const result = await new LlmService(
        mockCourseRetriever,
        mockPosthogMonitoring
      ).recommend('Suggest AI courses');

      expect(result).toEqual({
        courses: [{ code: 'LOG121' }],
        explanation: 'These courses cover the fundamentals.'
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(GROQ_URL, expect.any(Object));
    });

    it('filters hallucinated courses and logs the model that produced them', async () => {
      process.env.GROQ_API_KEY = 'groq-key';
      process.env.GROQ_PRIMARY_MODEL = 'llama-3.3';

      fetchMock.mockReturnValue(
        okFetch(
          JSON.stringify({
            courses: [{ code: 'LOG121' }, { code: 'FAK999' }],
            explanation: 'These courses cover the fundamentals.'
          })
        )
      );

      const errorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => {});

      const result = await new LlmService(
        mockCourseRetriever,
        mockPosthogMonitoring
      ).recommend('Suggest AI courses');

      expect(result).toEqual({
        courses: [{ code: 'LOG121' }],
        explanation: 'These courses cover the fundamentals.'
      });
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining(
            'Filtered hallucinated course recommendations'
          ),
          aiProvider: 'Groq',
          aiModel: 'llama-3.3',
          invalidCourseCodes: 'FAK999'
        })
      );
    });

    it('falls back to the second provider when the first returns an HTTP error', async () => {
      process.env.GROQ_API_KEY = 'groq-key';
      process.env.GROQ_PRIMARY_MODEL = 'llama-3.3';
      process.env.NVIDIA_API_KEY = 'nvidia-key';
      process.env.NVIDIA_MODEL = 'nvidia-llama';

      fetchMock
        .mockReturnValueOnce(errorFetch(429, 'rate limited'))
        .mockReturnValueOnce(okFetch(VALID_LLM_JSON));

      const result = await new LlmService(
        mockCourseRetriever,
        mockPosthogMonitoring
      ).recommend('Suggest AI courses');

      expect(result).toEqual({
        courses: [{ code: 'LOG121' }],
        explanation: 'These courses cover the fundamentals.'
      });
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        GROQ_URL,
        expect.any(Object)
      );
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        NVIDIA_URL,
        expect.any(Object)
      );
    });

    it('falls back to the next provider when the first throws a network error', async () => {
      process.env.GROQ_API_KEY = 'groq-key';
      process.env.GROQ_PRIMARY_MODEL = 'llama-3.3';
      process.env.NVIDIA_API_KEY = 'nvidia-key';
      process.env.NVIDIA_MODEL = 'nvidia-llama';

      fetchMock
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockReturnValueOnce(okFetch(VALID_LLM_JSON));

      const result = await new LlmService(
        mockCourseRetriever,
        mockPosthogMonitoring
      ).recommend('Suggest AI courses');

      expect(result).toEqual({
        courses: [{ code: 'LOG121' }],
        explanation: 'These courses cover the fundamentals.'
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

      const result = await new LlmService(
        mockCourseRetriever,
        mockPosthogMonitoring
      ).recommend('Suggest AI courses');

      expect(result).toEqual({
        courses: [{ code: 'LOG121' }],
        explanation: 'These courses cover the fundamentals.'
      });
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(fetchMock).toHaveBeenNthCalledWith(
        3,
        GEMINI_URL,
        expect.any(Object)
      );
    });

    it('throws LlmExhaustedException when all configured providers fail', async () => {
      process.env.GROQ_API_KEY = 'groq-key';
      process.env.GROQ_PRIMARY_MODEL = 'llama-3.3';
      process.env.NVIDIA_API_KEY = 'nvidia-key';
      process.env.NVIDIA_MODEL = 'nvidia-llama';

      fetchMock.mockRejectedValue(new Error('all down'));

      await expect(
        new LlmService(mockCourseRetriever, mockPosthogMonitoring).recommend(
          'Suggest AI courses'
        )
      ).rejects.toThrow(LlmExhaustedException);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('throws LlmExhaustedException immediately when no providers are configured', async () => {
      jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});

      await expect(
        new LlmService(mockCourseRetriever, mockPosthogMonitoring).recommend(
          'Suggest AI courses'
        )
      ).rejects.toThrow(LlmExhaustedException);
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

      const warnSpy = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => {});
      await new LlmService(
        mockCourseRetriever,
        mockPosthogMonitoring
      ).recommend('Suggest AI courses');

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Groq'));
    });

    it('falls back to the next provider when the first one times out via AbortSignal', async () => {
      process.env.GROQ_API_KEY = 'groq-key';
      process.env.GROQ_PRIMARY_MODEL = 'llama-3.3';
      process.env.NVIDIA_API_KEY = 'nvidia-key';
      process.env.NVIDIA_MODEL = 'nvidia-llama';

      const service = new LlmService(
        mockCourseRetriever,
        mockPosthogMonitoring
      );
      const [groqProvider, nvidiaProvider] = (
        service as unknown as { providers: LlmProvider[] }
      ).providers;

      // Force a short per-provider timeout (provider.timeoutMs takes precedence over LLM_TIMEOUT_MS)
      (groqProvider as unknown as { timeoutMs: number }).timeoutMs = 50;

      // Groq hangs until its AbortSignal fires — simulates a slow provider
      jest.spyOn(groqProvider, 'complete').mockImplementation(
        (...args: unknown[]) =>
          new Promise<LlmGenerationResponse>((_, reject) => {
            (args[1] as AbortSignal).addEventListener('abort', () =>
              reject(
                new DOMException('The operation was aborted.', 'AbortError')
              )
            );
          })
      );
      jest.spyOn(nvidiaProvider, 'complete').mockResolvedValue({
        courses: [{ code: 'LOG121' }],
        explanation: 'These courses cover the fundamentals.'
      });

      const result = await service.recommend('Suggest AI courses');

      expect(result).toEqual({
        courses: [{ code: 'LOG121' }],
        explanation: 'These courses cover the fundamentals.'
      });
      expect(groqProvider.complete).toHaveBeenCalledTimes(1);
      expect(nvidiaProvider.complete).toHaveBeenCalledTimes(1);
    }, 2000);

    it('throws LlmExhaustedException and the AbortSignal is marked aborted when every provider times out', async () => {
      process.env.GROQ_API_KEY = 'groq-key';
      process.env.GROQ_PRIMARY_MODEL = 'llama-3.3';

      const service = new LlmService(
        mockCourseRetriever,
        mockPosthogMonitoring
      );
      const [groqProvider] = (
        service as unknown as { providers: LlmProvider[] }
      ).providers;

      (groqProvider as unknown as { timeoutMs: number }).timeoutMs = 50;

      let capturedSignal: AbortSignal | undefined;
      jest
        .spyOn(groqProvider, 'complete')
        .mockImplementation((...args: unknown[]) => {
          const signal = args[1] as AbortSignal;
          capturedSignal = signal;
          return new Promise<LlmGenerationResponse>((_, reject) => {
            signal.addEventListener('abort', () =>
              reject(
                new DOMException('The operation was aborted.', 'AbortError')
              )
            );
          });
        });

      await expect(service.recommend('Suggest AI courses')).rejects.toThrow(
        LlmExhaustedException
      );
      expect(capturedSignal?.aborted).toBe(true);
    }, 2000);
  });

  describe('recommendStream', () => {
    it('reassembles reason text and yields the parsed courses after the delimiter', async () => {
      process.env.GROQ_API_KEY = 'groq-key';
      process.env.GROQ_PRIMARY_MODEL = 'llama-3.3';

      const service = new LlmService(
        mockCourseRetriever,
        mockPosthogMonitoring
      );
      const [groqProvider] = (
        service as unknown as { providers: LlmProvider[] }
      ).providers;

      jest.spyOn(groqProvider, 'completeStream').mockImplementation(
        // eslint-disable-next-line @typescript-eslint/require-await
        async function* () {
          yield 'These courses are great for AI.';
          yield STREAM_COURSES_DELIMITER;
          yield JSON.stringify([{ code: 'LOG121' }]);
        }
      );

      const events = await collect(
        service.recommendStream('Suggest AI courses')
      );

      expect(events.slice(0, 2)).toEqual([
        { type: 'status', data: 'SEARCHING_EMBEDDINGS' },
        { type: 'status', data: 'THINKING_AI' }
      ]);
      expect(reasonText(events)).toBe('These courses are great for AI.');
      expect(events.at(-1)).toEqual({
        type: 'courses',
        data: [{ code: 'LOG121' }]
      });
    });

    it('never leaks a delimiter split across chunk boundaries into the reason text', async () => {
      process.env.GROQ_API_KEY = 'groq-key';
      process.env.GROQ_PRIMARY_MODEL = 'llama-3.3';

      const service = new LlmService(
        mockCourseRetriever,
        mockPosthogMonitoring
      );
      const [groqProvider] = (
        service as unknown as { providers: LlmProvider[] }
      ).providers;

      const half = STREAM_COURSES_DELIMITER.slice(0, 5);
      const rest = STREAM_COURSES_DELIMITER.slice(5);

      jest.spyOn(groqProvider, 'completeStream').mockImplementation(
        // eslint-disable-next-line @typescript-eslint/require-await
        async function* () {
          yield 'Explanation text';
          yield half;
          yield rest;
          yield '[]';
        }
      );

      const events = await collect(
        service.recommendStream('Suggest AI courses')
      );

      expect(reasonText(events)).toBe('Explanation text');
      expect(events.at(-1)).toEqual({ type: 'courses', data: [] });
    });

    it('falls back to the next provider when the first fails before yielding anything', async () => {
      process.env.GROQ_API_KEY = 'groq-key';
      process.env.GROQ_PRIMARY_MODEL = 'llama-3.3';
      process.env.NVIDIA_API_KEY = 'nvidia-key';
      process.env.NVIDIA_MODEL = 'nvidia-llama';

      const service = new LlmService(
        mockCourseRetriever,
        mockPosthogMonitoring
      );
      const [groqProvider, nvidiaProvider] = (
        service as unknown as { providers: LlmProvider[] }
      ).providers;

      jest.spyOn(groqProvider, 'completeStream').mockImplementation(
        // eslint-disable-next-line @typescript-eslint/require-await
        async function* () {
          throw new Error('Groq down');
        }
      );
      jest.spyOn(nvidiaProvider, 'completeStream').mockImplementation(
        // eslint-disable-next-line @typescript-eslint/require-await
        async function* () {
          yield 'ok';
          yield STREAM_COURSES_DELIMITER;
          yield JSON.stringify([{ code: 'LOG121' }]);
        }
      );

      const events = await collect(
        service.recommendStream('Suggest AI courses')
      );

      expect(reasonText(events)).toBe('ok');
      expect(events.at(-1)).toEqual({
        type: 'courses',
        data: [{ code: 'LOG121' }]
      });
    });

    it('rethrows and does not fall back once the first provider has already streamed reason text', async () => {
      process.env.GROQ_API_KEY = 'groq-key';
      process.env.GROQ_PRIMARY_MODEL = 'llama-3.3';
      process.env.NVIDIA_API_KEY = 'nvidia-key';
      process.env.NVIDIA_MODEL = 'nvidia-llama';

      const service = new LlmService(
        mockCourseRetriever,
        mockPosthogMonitoring
      );
      const [groqProvider, nvidiaProvider] = (
        service as unknown as { providers: LlmProvider[] }
      ).providers;

      jest.spyOn(groqProvider, 'completeStream').mockImplementation(
        // eslint-disable-next-line @typescript-eslint/require-await
        async function* () {
          yield 'partial reason';
          throw new Error('stream broke');
        }
      );
      const nvidiaSpy = jest.spyOn(nvidiaProvider, 'completeStream');

      await expect(
        collect(service.recommendStream('Suggest AI courses'))
      ).rejects.toThrow('stream broke');
      expect(nvidiaSpy).not.toHaveBeenCalled();
    });

    it('throws LlmExhaustedException when every provider fails before yielding', async () => {
      process.env.GROQ_API_KEY = 'groq-key';
      process.env.GROQ_PRIMARY_MODEL = 'llama-3.3';

      const service = new LlmService(
        mockCourseRetriever,
        mockPosthogMonitoring
      );
      const [groqProvider] = (
        service as unknown as { providers: LlmProvider[] }
      ).providers;

      jest.spyOn(groqProvider, 'completeStream').mockImplementation(
        // eslint-disable-next-line @typescript-eslint/require-await
        async function* () {
          throw new Error('Groq down');
        }
      );

      await expect(
        collect(service.recommendStream('Suggest AI courses'))
      ).rejects.toThrow(LlmExhaustedException);
    });

    it('yields an empty course list and logs a warning when the trailing JSON is malformed', async () => {
      process.env.GROQ_API_KEY = 'groq-key';
      process.env.GROQ_PRIMARY_MODEL = 'llama-3.3';

      const service = new LlmService(
        mockCourseRetriever,
        mockPosthogMonitoring
      );
      const [groqProvider] = (
        service as unknown as { providers: LlmProvider[] }
      ).providers;

      jest.spyOn(groqProvider, 'completeStream').mockImplementation(
        // eslint-disable-next-line @typescript-eslint/require-await
        async function* () {
          yield 'reason';
          yield STREAM_COURSES_DELIMITER;
          yield 'not json';
        }
      );

      const warnSpy = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => {});

      const events = await collect(
        service.recommendStream('Suggest AI courses')
      );

      expect(events.at(-1)).toEqual({ type: 'courses', data: [] });
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse streamed course list')
      );
    });

    it('filters hallucinated streamed courses before emitting them', async () => {
      process.env.GROQ_API_KEY = 'groq-key';
      process.env.GROQ_PRIMARY_MODEL = 'llama-3.3';

      const service = new LlmService(
        mockCourseRetriever,
        mockPosthogMonitoring
      );
      const errorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => {});
      const [groqProvider] = (
        service as unknown as { providers: LlmProvider[] }
      ).providers;

      jest.spyOn(groqProvider, 'completeStream').mockImplementation(
        // eslint-disable-next-line @typescript-eslint/require-await
        async function* () {
          yield 'reason';
          yield STREAM_COURSES_DELIMITER;
          yield JSON.stringify([{ code: 'LOG121' }, { code: 'FAK999' }]);
        }
      );

      const events = await collect(
        service.recommendStream('Suggest AI courses')
      );

      expect(events.at(-1)).toEqual({
        type: 'courses',
        data: [{ code: 'LOG121' }]
      });
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('FAK999'),
          aiProvider: 'Groq',
          aiModel: 'llama-3.3'
        })
      );
    });
  });

  describe('checkStatus', () => {
    it('reports ok with latency for a responsive provider', async () => {
      process.env.GROQ_API_KEY = 'groq-key';
      process.env.GROQ_PRIMARY_MODEL = 'llama-3.3';

      fetchMock.mockReturnValue(okFetch(VALID_LLM_JSON));

      const statuses = await new LlmService(
        mockCourseRetriever,
        mockPosthogMonitoring
      ).checkStatus();

      expect(statuses).toHaveLength(1);
      expect(statuses[0]).toMatchObject({
        name: expect.stringContaining('Groq'),
        status: 'ok',
        latencyMs: expect.any(Number)
      });
      expect(statuses[0].error).toBeUndefined();
    });

    it('reports error with message when a provider fails', async () => {
      process.env.GROQ_API_KEY = 'groq-key';
      process.env.GROQ_PRIMARY_MODEL = 'llama-3.3';

      fetchMock.mockRejectedValue(new Error('Connection refused'));

      const statuses = await new LlmService(
        mockCourseRetriever,
        mockPosthogMonitoring
      ).checkStatus();

      expect(statuses[0]).toMatchObject({
        status: 'error',
        error: expect.stringContaining('Connection refused')
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

      const statuses = await new LlmService(
        mockCourseRetriever,
        mockPosthogMonitoring
      ).checkStatus();

      expect(statuses).toHaveLength(2);
      expect(statuses.find((s) => s.name.includes('Groq'))?.status).toBe('ok');
      expect(statuses.find((s) => s.name.includes('Nvidia'))?.status).toBe(
        'error'
      );
    });

    it('returns an empty array when no providers are configured', async () => {
      jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});

      const statuses = await new LlmService(
        mockCourseRetriever,
        mockPosthogMonitoring
      ).checkStatus();

      expect(statuses).toEqual([]);
    });
  });
});
