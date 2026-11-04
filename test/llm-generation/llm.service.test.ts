import { Logger } from '@nestjs/common';

import { CourseRetrieverService } from '../../src/embedding/course-retriever.service';
import { LlmExhaustedException } from '../../src/llm-generation/exceptions/llm-exhausted.exception';
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
  captureChatbotRequest: jest.fn(),
  captureAiSpan: jest.fn(),
  captureAiGeneration: jest.fn()
} as unknown as PosthogMonitoringService;

const LLAMA_BASE = 'http://llama-server:8080/v1';
const okStream = () =>
  Promise.resolve({
    ok: true,
    body: new ReadableStream({
      start(controller) {
        const text = `data: ${JSON.stringify({ choices: [{ delta: { content: `Programming.\n${STREAM_COURSES_DELIMITER}\n[{"code":"LOG121"}]` } }] })}\n\ndata: [DONE]\n\n`;
        controller.enqueue(new TextEncoder().encode(text));
        controller.close();
      }
    })
  } as Response);

function serviceWithLocalProvider(
  env: Record<string, string> = {}
): LlmService {
  process.env.LLAMA_BASE_URL = env.baseUrl ?? LLAMA_BASE;
  for (const [key, value] of Object.entries(env)) {
    process.env[key] = value;
  }
  return new LlmService(mockCourseRetriever, mockPosthogMonitoring);
}

function firstProvider(service: LlmService): LlmProvider {
  return (service as unknown as { providers: LlmProvider[] }).providers[0];
}

describe('LlmService', () => {
  let fetchMock: jest.Mock;
  let savedEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    savedEnv = { ...process.env };
    delete process.env.LLAMA_BASE_URL;
    delete process.env.LLAMA_MODEL;
    delete process.env.LLAMA_TIMEOUT_MS;
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
    (mockPosthogMonitoring.captureChatbotRequest as jest.Mock).mockClear();
    (mockPosthogMonitoring.captureAiGeneration as jest.Mock).mockClear();
  });

  afterEach(() => {
    process.env = savedEnv;
    jest.restoreAllMocks();
  });

  describe('provider configuration', () => {
    it('configures the single local Gemma provider for llama-server', () => {
      const providers = (
        serviceWithLocalProvider() as unknown as { providers: LlmProvider[] }
      ).providers;

      expect(providers).toHaveLength(1);
      expect(providers[0]).toMatchObject({
        providerName: 'llama.cpp',
        modelName: 'gemma-4-e2b-it-qat'
      });
    });

    it('honours LLAMA_MODEL', () => {
      const [provider] = (
        serviceWithLocalProvider({
          LLAMA_MODEL: 'qwen3.5-2b'
        }) as unknown as {
          providers: LlmProvider[];
        }
      ).providers;

      expect(provider.modelName).toBe('qwen3.5-2b');
    });

    it('logs a warning when LLAMA_BASE_URL is missing', () => {
      const warnSpy = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => {});

      new LlmService(mockCourseRetriever, mockPosthogMonitoring);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No LLM providers configured')
      );
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

    it('defaults the fallback timeout to 10000 ms when LLM_TIMEOUT_MS is not set', () => {
      const service = new LlmService(
        mockCourseRetriever,
        mockPosthogMonitoring
      );

      expect((service as unknown as { timeoutMs: number }).timeoutMs).toBe(
        10000
      );
    });

    it('keeps the 180 s local generation cap regardless of the global fallback timeout', () => {
      const provider = firstProvider(serviceWithLocalProvider());

      expect(provider.timeoutMs).toBe(180000);
    });
  });

  describe('generation', () => {
    it('tracks overlapping requests and latency without including chat content', async () => {
      const service = serviceWithLocalProvider();
      fetchMock.mockImplementation(okStream);
      const first = service.recommendStream('Private prompt', [123]);
      const second = service.recommendStream('Another private prompt');
      await first.next();
      await second.next();
      await collect(first);
      await collect(second);

      const calls = (mockPosthogMonitoring.captureChatbotRequest as jest.Mock)
        .mock.calls;
      expect(
        calls.map(([event, properties]) => [event, properties.active_requests])
      ).toEqual([
        ['chatbot_request_started', 1],
        ['chatbot_request_started', 2],
        ['chatbot_request_finished', 1],
        ['chatbot_request_finished', 0]
      ]);
      expect(calls[2][1]).toMatchObject({
        request_id: calls[0][1].request_id,
        instance_id: calls[0][1].instance_id,
        concurrent_requests_at_start: 1,
        outcome: 'success',
        duration_ms: expect.any(Number),
        time_to_first_token_ms: expect.any(Number),
        model: 'gemma-4-e2b-it-qat',
        course_count: 1
      });
      expect(calls[1][1].request_id).not.toBe(calls[0][1].request_id);
      expect(calls[3][1].concurrent_requests_at_start).toBe(2);
      expect(JSON.stringify(calls)).not.toMatch(
        /Private prompt|Another private prompt|Programming|LOG121/
      );
      expect(calls[2][1].duration_ms).toBeGreaterThanOrEqual(
        calls[2][1].time_to_first_token_ms
      );
    });

    it('records retrieval errors and releases the concurrency count', async () => {
      const service = serviceWithLocalProvider();
      (mockCourseRetriever.retrieveCourses as jest.Mock).mockRejectedValueOnce(
        new Error('private failure')
      );
      await expect(collect(service.recommendStream('AI'))).rejects.toThrow(
        'private failure'
      );
      expect(
        mockPosthogMonitoring.captureChatbotRequest
      ).toHaveBeenLastCalledWith(
        'chatbot_request_finished',
        expect.objectContaining({ active_requests: 0, outcome: 'error' })
      );
      fetchMock.mockImplementation(okStream);
      await collect(service.recommendStream('AI'));
      expect(
        (mockPosthogMonitoring.captureChatbotRequest as jest.Mock).mock
          .calls[2][1].active_requests
      ).toBe(1);
    });

    it.each(['return', 'abort'] as const)(
      'records cancellation on %s exactly once',
      async (method) => {
        const service = serviceWithLocalProvider();
        const controller = new AbortController();
        const stream = service.recommendStream(
          'AI',
          undefined,
          controller.signal
        );
        await stream.next();
        if (method === 'return') {
          await stream.return(undefined);
        } else {
          controller.abort();
          await expect(collect(stream)).rejects.toThrow();
        }
        await stream.return(undefined);
        expect(
          mockPosthogMonitoring.captureChatbotRequest
        ).toHaveBeenCalledTimes(2);
        expect(
          mockPosthogMonitoring.captureChatbotRequest
        ).toHaveBeenLastCalledWith(
          'chatbot_request_finished',
          expect.objectContaining({ active_requests: 0, outcome: 'cancelled' })
        );
      }
    );

    it('allows overlapping streams to reach the provider without a backend admission limit', async () => {
      const service = serviceWithLocalProvider();
      const first = service.recommendStream('AI');
      const second = service.recommendStream('Programming');
      await first.next();
      await second.next();
      fetchMock.mockImplementation(okStream);
      const results = await Promise.all([collect(first), collect(second)]);
      for (const events of results) {
        expect(events).toContainEqual({
          type: 'courses',
          data: [{ code: 'LOG121' }]
        });
      }
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('allows a subsequent generation after a provider failure', async () => {
      const service = serviceWithLocalProvider();
      fetchMock.mockRejectedValueOnce(new Error('down'));
      await expect(collect(service.recommendStream('AI'))).rejects.toThrow(
        LlmExhaustedException
      );
      fetchMock.mockImplementation(okStream);
      await expect(
        collect(service.recommendStream('AI'))
      ).resolves.toContainEqual({
        type: 'courses',
        data: [{ code: 'LOG121' }]
      });
    });

    it.each([
      'listes-moi 5 cours en devops stp',
      'Propose-moi sept cours en IA',
      'Show me 10 AI courses',
      'Recommend only one AI course'
    ])('preserves explicit recommendation counts: %s', async (prompt) => {
      const courses = Array.from({ length: 10 }, (_, i) => ({
        code: `INF${100 + i}`,
        title: `Programming ${i}`,
        description: 'Programming',
        score: 0.8
      }));
      (mockCourseRetriever.retrieveCourses as jest.Mock).mockResolvedValueOnce(
        courses
      );
      fetchMock.mockImplementation(okStream);

      await collect(serviceWithLocalProvider().recommendStream(prompt));
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.messages[0].content).toContain(prompt);
      expect(body.messages[0].content).toContain('USER REQUEST:');
      expect(body.messages[0].content).toContain(
        'If the user explicitly requests a number of recommendations (in digits or words), use that number instead'
      );
      expect(body.messages[0].content).toContain(
        'Never pad with adjacent topics or general-interest courses'
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it.each([
      'Je veux un cours en IA, s’il te plaît.',
      'I want a course in AI',
      'Suggest AI courses'
    ])('defaults to five choices for a learning goal: %s', async (prompt) => {
      fetchMock.mockImplementation(okStream);

      await collect(serviceWithLocalProvider().recommendStream(prompt));

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.messages[0].content).toContain(
        'recommend 5 courses by default'
      );
      expect(body.messages[0].content).toContain(
        'is not an explicit result count: offer 5 options to choose from'
      );
      expect(body.messages[0].content).toContain(
        'If fewer courses clearly match, return fewer and explain why'
      );
      expect(body.messages[0].content).toContain(prompt);
    });

    it('disables thinking and pins temperature 0 on every request', async () => {
      fetchMock.mockImplementation(okStream);

      await collect(
        serviceWithLocalProvider().recommendStream('Suggest AI courses')
      );

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.temperature).toBe(0);
      expect(body.chat_template_kwargs).toEqual({ enable_thinking: false });
    });

    it('treats casual topic mentions as course requests and clarifies only when no topic is given', async () => {
      fetchMock.mockImplementation(okStream);
      await collect(
        serviceWithLocalProvider().recommendStream('how we doing broski')
      );
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.messages[0].content).toContain(
        'For greetings with no course topic, respond briefly and ask what topics or goals the user wants to explore'
      );
      expect(body.messages[0].content).toContain(
        'When the user expresses an interest, names a subject, or asks about courses casually, treat that as a course request'
      );
      expect(body.messages[0].content).toContain(
        'Ask one short clarifying question and return no courses only when the message gives no usable topic or goal'
      );
      expect(body.messages[0].content).toContain(
        "Never infer the user's interests from the AVAILABLE COURSES list"
      );
    });

    it('throws LlmExhaustedException when the local server fails', async () => {
      fetchMock.mockRejectedValue(new Error('all down'));

      await expect(
        collect(
          serviceWithLocalProvider().recommendStream('Suggest AI courses')
        )
      ).rejects.toThrow(LlmExhaustedException);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('throws LlmExhaustedException immediately when no providers are configured', async () => {
      jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});

      await expect(
        collect(
          new LlmService(
            mockCourseRetriever,
            mockPosthogMonitoring
          ).recommendStream('Suggest AI courses')
        )
      ).rejects.toThrow(LlmExhaustedException);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('aborts and throws LlmExhaustedException when generation exceeds the 180 s cap', async () => {
      const service = serviceWithLocalProvider({ LLAMA_TIMEOUT_MS: '50' });
      const provider = firstProvider(service);
      let capturedSignal: AbortSignal | undefined;

      jest
        .spyOn(provider, 'completeStream')
        .mockImplementation(async function* (_prompt, signal) {
          capturedSignal = signal;
          await new Promise<never>((_, reject) => {
            signal.addEventListener('abort', () =>
              reject(
                new DOMException('The operation was aborted.', 'AbortError')
              )
            );
          });
        });

      await expect(
        collect(service.recommendStream('Suggest AI courses'))
      ).rejects.toThrow(LlmExhaustedException);
      expect(capturedSignal?.aborted).toBe(true);
    }, 2000);
  });

  describe('recommendStream', () => {
    it('does not start inference when cancelled during course retrieval', async () => {
      const service = serviceWithLocalProvider();
      let finishRetrieval!: (courses: never[]) => void;
      let retrievalStarted!: () => void;
      const started = new Promise<void>((resolve) => {
        retrievalStarted = resolve;
      });
      (mockCourseRetriever.retrieveCourses as jest.Mock).mockImplementation(
        () =>
          new Promise<never[]>((resolve) => {
            finishRetrieval = resolve;
            retrievalStarted();
          })
      );
      const controller = new AbortController();
      const generator = service.recommendStream(
        'AI',
        undefined,
        controller.signal
      );

      await generator.next();
      const pending = generator.next();
      await started;
      controller.abort();
      finishRetrieval([]);

      await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it.each([
      null,
      {},
      [null],
      [{}],
      [{ code: 42 }],
      [{ code: 'LOG121', reason: 42 }]
    ])('does not admit invalid streamed course shapes: %j', async (value) => {
      const service = serviceWithLocalProvider();
      jest.spyOn(firstProvider(service), 'completeStream').mockImplementation(
        // eslint-disable-next-line @typescript-eslint/require-await
        async function* () {
          yield `No valid courses.\n${STREAM_COURSES_DELIMITER}\n${JSON.stringify(value)}`;
        }
      );
      expect((await collect(service.recommendStream('AI'))).at(-1)).toEqual({
        type: 'courses',
        data: []
      });
    });

    it('falls back to the next provider only before reason text is emitted', async () => {
      const service = serviceWithLocalProvider();
      const provider = firstProvider(service);
      const fallback = {
        ...provider,
        completeStream: jest.fn().mockImplementation(
          // eslint-disable-next-line @typescript-eslint/require-await
          async function* () {
            yield `Fallback.\n${STREAM_COURSES_DELIMITER}\n[{"code":"LOG121"}]`;
          }
        )
      } as unknown as LlmProvider;
      (service as unknown as { providers: LlmProvider[] }).providers.push(
        fallback
      );
      jest.spyOn(provider, 'completeStream').mockImplementation(
        // eslint-disable-next-line @typescript-eslint/require-await
        async function* () {
          throw new Error('first down');
        }
      );
      expect((await collect(service.recommendStream('AI'))).at(-1)).toEqual({
        type: 'courses',
        data: [{ code: 'LOG121' }]
      });
      expect(fallback.completeStream).toHaveBeenCalledTimes(1);
    });

    it('aborts pending inference on disconnect without blocking subsequent requests', async () => {
      const service = serviceWithLocalProvider();
      let started!: () => void;
      const ready = new Promise<void>((resolve) => {
        started = resolve;
      });
      let inferenceSignal: AbortSignal | undefined;
      fetchMock.mockImplementation((_url: string, options: RequestInit) => {
        inferenceSignal = options.signal as AbortSignal;
        started();
        return new Promise((_, reject) => {
          inferenceSignal!.addEventListener(
            'abort',
            () => reject(inferenceSignal!.reason),
            { once: true }
          );
        });
      });
      const controller = new AbortController();
      const pending = collect(
        service.recommendStream('AI', undefined, controller.signal)
      );
      const rejected = expect(pending).rejects.toMatchObject({
        name: 'AbortError'
      });
      await ready;
      controller.abort();
      await rejected;
      expect(inferenceSignal?.aborted).toBe(true);
      fetchMock.mockImplementation(okStream);
      await expect(
        collect(service.recommendStream('AI'))
      ).resolves.toContainEqual({
        type: 'courses',
        data: [{ code: 'LOG121' }]
      });
    });

    it('preserves all ten streamed course cards when the model wraps codes in brackets', async () => {
      const service = serviceWithLocalProvider();
      const courses = Array.from({ length: 10 }, (_, i) => ({
        code: `INF${100 + i}`,
        title: 'Programming',
        description: 'Programming',
        score: 0.8
      }));
      (mockCourseRetriever.retrieveCourses as jest.Mock).mockResolvedValueOnce(
        courses
      );
      jest.spyOn(firstProvider(service), 'completeStream').mockImplementation(
        // eslint-disable-next-line @typescript-eslint/require-await
        async function* () {
          yield 'Ten courses.';
          yield STREAM_COURSES_DELIMITER;
          yield JSON.stringify(
            courses.map(({ code }) => ({ code: `[${code}]` }))
          );
        }
      );

      const events = await collect(
        service.recommendStream('liste moi 10 cours de prog')
      );

      expect(events.at(-1)).toEqual({
        type: 'courses',
        data: courses.map(({ code }) => ({ code }))
      });
      expect(reasonText(events)).toBe('Ten courses.');
      expect(firstProvider(service).completeStream).toHaveBeenCalledTimes(1);
    });

    it('reassembles reason text and yields the parsed courses after the delimiter', async () => {
      const service = serviceWithLocalProvider();
      const provider = firstProvider(service);

      jest.spyOn(provider, 'completeStream').mockImplementation(
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
      expect(events.at(-2)).toEqual({
        type: 'model',
        data: provider.modelName
      });
      expect(events.at(-1)).toEqual({
        type: 'courses',
        data: [{ code: 'LOG121' }]
      });
    });

    it('never leaks a delimiter split across chunk boundaries into the reason text', async () => {
      const service = serviceWithLocalProvider();
      const provider = firstProvider(service);

      const half = STREAM_COURSES_DELIMITER.slice(0, 5);
      const rest = STREAM_COURSES_DELIMITER.slice(5);

      jest.spyOn(provider, 'completeStream').mockImplementation(
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

    it('rethrows once the provider has already streamed reason text', async () => {
      const service = serviceWithLocalProvider();
      const provider = firstProvider(service);

      jest.spyOn(provider, 'completeStream').mockImplementation(
        // eslint-disable-next-line @typescript-eslint/require-await
        async function* () {
          yield 'partial reason';
          throw new Error('stream broke');
        }
      );

      await expect(
        collect(service.recommendStream('Suggest AI courses'))
      ).rejects.toThrow('stream broke');
    });

    it('throws LlmExhaustedException when the provider fails before yielding', async () => {
      const service = serviceWithLocalProvider();
      const provider = firstProvider(service);

      jest.spyOn(provider, 'completeStream').mockImplementation(
        // eslint-disable-next-line @typescript-eslint/require-await
        async function* () {
          throw new Error('llama-server down');
        }
      );

      await expect(
        collect(service.recommendStream('Suggest AI courses'))
      ).rejects.toThrow(LlmExhaustedException);
    });

    it('yields an empty course list and logs a warning when the trailing JSON is malformed', async () => {
      const service = serviceWithLocalProvider();
      const provider = firstProvider(service);

      jest.spyOn(provider, 'completeStream').mockImplementation(
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
      const service = serviceWithLocalProvider();
      const errorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => {});
      const provider = firstProvider(service);

      jest.spyOn(provider, 'completeStream').mockImplementation(
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
          aiProvider: 'llama.cpp',
          aiModel: 'gemma-4-e2b-it-qat'
        })
      );
    });

    it('skips malformed streamed course entries without failing the response', async () => {
      const service = serviceWithLocalProvider();
      const provider = firstProvider(service);

      jest.spyOn(provider, 'completeStream').mockImplementation(
        // eslint-disable-next-line @typescript-eslint/require-await
        async function* () {
          yield 'DevOps recommendation.';
          yield STREAM_COURSES_DELIMITER;
          yield JSON.stringify([{ title: 'Missing code' }, { code: 'LOG121' }]);
        }
      );

      const events = await collect(
        service.recommendStream('Suggest AI courses')
      );

      expect(events.at(-1)).toEqual({
        type: 'courses',
        data: [{ code: 'LOG121' }]
      });
    });
  });

  describe('checkStatus', () => {
    it('reports ok with latency for a responsive provider', async () => {
      fetchMock.mockResolvedValue({ ok: true } as Response);

      const statuses = await serviceWithLocalProvider().checkStatus();

      expect(statuses).toHaveLength(1);
      expect(statuses[0]).toMatchObject({
        name: expect.stringContaining('llama.cpp'),
        status: 'ok',
        latencyMs: expect.any(Number)
      });
      expect(statuses[0].error).toBeUndefined();
      expect(fetchMock).toHaveBeenCalledWith(
        'http://llama-server:8080/health',
        { signal: expect.any(AbortSignal) }
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('reports error with message when the provider fails', async () => {
      fetchMock.mockRejectedValue(new Error('Connection refused'));

      const statuses = await serviceWithLocalProvider().checkStatus();

      expect(statuses[0]).toMatchObject({
        status: 'error',
        error: expect.stringContaining('Connection refused')
      });
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
