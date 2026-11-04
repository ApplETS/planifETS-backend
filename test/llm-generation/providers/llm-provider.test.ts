import { STREAM_COURSES_DELIMITER } from '../../../src/llm-generation/interfaces/llm-provider';
import { LlamaCppProvider } from '../../../src/llm-generation/providers/llama-cpp.provider';

const LLAMA_URL = 'http://llama-server:8080/v1';

const sseFetch = (lines: string[]) => {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const line of lines) {
        controller.enqueue(encoder.encode(line));
      }
      controller.close();
    }
  });
  return Promise.resolve({ ok: true, body: stream } as unknown as Response);
};

async function drain(gen: AsyncGenerator<string>): Promise<string[]> {
  const chunks: string[] = [];
  for await (const chunk of gen) {
    chunks.push(chunk);
  }
  return chunks;
}

describe('LlamaCppProvider', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    delete process.env.LLAMA_TIMEOUT_MS;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('request format', () => {
    it('calls the local completions endpoint without an auth header', async () => {
      fetchMock.mockReturnValue(sseFetch(['data: [DONE]\n']));

      await drain(
        new LlamaCppProvider(
          'qwen3.5-4b',
          'http://host:8080/v1'
        ).completeStream('test', new AbortController().signal)
      );

      expect(fetchMock).toHaveBeenCalledWith(
        'http://host:8080/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.not.objectContaining({
            Authorization: expect.anything()
          })
        })
      );
    });

    it('accepts a base URL with trailing slashes', async () => {
      fetchMock.mockReturnValue(sseFetch(['data: [DONE]\n']));

      await drain(
        new LlamaCppProvider(
          'qwen3.5-4b',
          'http://host:8080/v1///'
        ).completeStream('test', new AbortController().signal)
      );

      expect(fetchMock.mock.calls[0][0]).toBe(
        'http://host:8080/v1/chat/completions'
      );
    });

    it('disables Qwen thinking and pins temperature 0 in the request body', async () => {
      fetchMock.mockReturnValue(sseFetch(['data: [DONE]\n']));

      await drain(
        new LlamaCppProvider('qwen3.5-4b', LLAMA_URL).completeStream(
          'test',
          new AbortController().signal
        )
      );

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.temperature).toBe(0);
      expect(body.reasoning_effort).toBe('none');
      expect(body.chat_template_kwargs).toEqual({ enable_thinking: false });
      expect(body.model).toBe('qwen3.5-4b');
      expect(body.stream).toBe(true);
    });

    it('passes the AbortSignal to fetch', async () => {
      fetchMock.mockReturnValue(sseFetch(['data: [DONE]\n']));

      const controller = new AbortController();
      await drain(
        new LlamaCppProvider('qwen3.5-4b', LLAMA_URL).completeStream(
          'test',
          controller.signal
        )
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal })
      );
    });

    it('defaults the timeout to 180000 ms and reads LLAMA_TIMEOUT_MS', () => {
      expect(new LlamaCppProvider('qwen3.5-4b', LLAMA_URL).timeoutMs).toBe(
        180000
      );
      process.env.LLAMA_TIMEOUT_MS = '240000';
      expect(new LlamaCppProvider('qwen3.5-4b', LLAMA_URL).timeoutMs).toBe(
        240000
      );
    });
  });

  describe('response errors', () => {
    it('throws with status and body when the API returns a non-ok response', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => 'rate limit exceeded'
      } as Response);

      await expect(
        drain(
          new LlamaCppProvider('qwen3.5-4b', LLAMA_URL).completeStream(
            'test',
            new AbortController().signal
          )
        )
      ).rejects.toThrow(/429.*rate limit exceeded/);
    });

    it('propagates the AbortError when the signal is aborted before fetch resolves', async () => {
      const controller = new AbortController();

      fetchMock.mockImplementation(
        (_url: string, options: RequestInit) =>
          new Promise((_, reject) => {
            options.signal?.addEventListener('abort', () => {
              reject(
                new DOMException('The operation was aborted.', 'AbortError')
              );
            });
          })
      );

      const generatePromise = drain(
        new LlamaCppProvider('qwen3.5-4b', LLAMA_URL).completeStream(
          'test',
          controller.signal
        )
      );
      controller.abort();

      await expect(generatePromise).rejects.toMatchObject({
        name: 'AbortError'
      });
    });
  });

  describe('completeStream', () => {
    it('yields delta content from SSE chunks and stops at [DONE]', async () => {
      fetchMock.mockReturnValue(
        sseFetch([
          `data: ${JSON.stringify({ choices: [{ delta: { content: 'Hello ' } }] })}\n`,
          `data: ${JSON.stringify({ choices: [{ delta: { content: 'world' } }] })}\n`,
          `data: [DONE]\n`
        ])
      );

      const chunks = await drain(
        new LlamaCppProvider('qwen3.5-4b', LLAMA_URL).completeStream(
          'test',
          new AbortController().signal
        )
      );

      expect(chunks).toEqual(['Hello ', 'world']);
    });

    it('skips malformed SSE data lines without throwing', async () => {
      fetchMock.mockReturnValue(
        sseFetch([
          `data: not json\n`,
          `data: ${JSON.stringify({ choices: [{ delta: { content: 'ok' } }] })}\n`,
          `data: [DONE]\n`
        ])
      );

      const chunks = await drain(
        new LlamaCppProvider('qwen3.5-4b', LLAMA_URL).completeStream(
          'test',
          new AbortController().signal
        )
      );

      expect(chunks).toEqual(['ok']);
    });

    it('sets stream:true in the request body', async () => {
      fetchMock.mockReturnValue(sseFetch([`data: [DONE]\n`]));

      await drain(
        new LlamaCppProvider('qwen3.5-4b', LLAMA_URL).completeStream(
          'test',
          new AbortController().signal
        )
      );

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.stream).toBe(true);
      expect(body.temperature).toBe(0);
    });

    it('appends the streaming format instructions and delimiter to the prompt', async () => {
      fetchMock.mockReturnValue(sseFetch([`data: [DONE]\n`]));

      await drain(
        new LlamaCppProvider('qwen3.5-4b', LLAMA_URL).completeStream(
          'my prompt',
          new AbortController().signal
        )
      );

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.messages[0].content).toContain('my prompt');
      expect(body.messages[0].content).toContain(STREAM_COURSES_DELIMITER);
      expect(body.messages[0].content).toContain(
        'The delimiter and JSON array are mandatory'
      );
    });
  });

  describe('provider names', () => {
    it('formats the provider name as "<Provider> (<model>)"', () => {
      expect(new LlamaCppProvider('qwen3.5-4b', LLAMA_URL).name).toBe(
        'llama.cpp (qwen3.5-4b)'
      );
    });
  });
});
