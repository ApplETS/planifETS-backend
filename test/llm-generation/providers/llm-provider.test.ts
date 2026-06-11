import { GeminiProvider } from '../../../src/llm-generation/providers/gemini.provider';
import { GroqProvider } from '../../../src/llm-generation/providers/groq.provider';
import { NvidiaProvider } from '../../../src/llm-generation/providers/nvidia.provider';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

const validJson = JSON.stringify({ courses: [{ code: 'LOG121' }], explanation: 'ok' });

const okFetch = (content: string) =>
  Promise.resolve({
    ok: true,
    json: async () => ({ choices: [{ message: { content } }] }),
  } as Response);

describe('LLM providers', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('provider URLs', () => {
    it('GroqProvider calls the Groq completions endpoint', async () => {
      fetchMock.mockReturnValue(okFetch(validJson));

      await new GroqProvider('llama-3.3', 'key').generate('test', new AbortController().signal);

      expect(fetchMock).toHaveBeenCalledWith(GROQ_URL, expect.any(Object));
    });

    it('NvidiaProvider calls the NVIDIA completions endpoint', async () => {
      fetchMock.mockReturnValue(okFetch(validJson));

      await new NvidiaProvider('nvidia-llama', 'key').generate('test', new AbortController().signal);

      expect(fetchMock).toHaveBeenCalledWith(NVIDIA_URL, expect.any(Object));
    });

    it('GeminiProvider calls the Gemini OpenAI-compatible endpoint', async () => {
      fetchMock.mockReturnValue(okFetch(validJson));

      await new GeminiProvider('gemini-2.0-flash', 'key').generate('test', new AbortController().signal);

      expect(fetchMock).toHaveBeenCalledWith(GEMINI_URL, expect.any(Object));
    });
  });

  describe('request format', () => {
    it('sends a POST with Authorization bearer token and JSON content-type', async () => {
      fetchMock.mockReturnValue(okFetch(validJson));

      await new GroqProvider('llama-3.3', 'test-api-key').generate(
        'test',
        new AbortController().signal,
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
            'Content-Type': 'application/json',
          }),
        }),
      );
    });

    it('GroqProvider includes response_format json_object in the request body', async () => {
      fetchMock.mockReturnValue(okFetch(validJson));

      await new GroqProvider('llama-3.3', 'key').generate('test', new AbortController().signal);

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.response_format).toEqual({ type: 'json_object' });
    });

    it('GeminiProvider includes response_format json_object in the request body', async () => {
      fetchMock.mockReturnValue(okFetch(validJson));

      await new GeminiProvider('gemini-2.0-flash', 'key').generate('test', new AbortController().signal);

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.response_format).toEqual({ type: 'json_object' });
    });

    it('NvidiaProvider omits response_format from the request body', async () => {
      fetchMock.mockReturnValue(okFetch(validJson));

      await new NvidiaProvider('nvidia-llama', 'key').generate('test', new AbortController().signal);

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.response_format).toBeUndefined();
    });

    it('sends the user prompt inside the messages array', async () => {
      fetchMock.mockReturnValue(okFetch(validJson));

      await new GroqProvider('llama-3.3', 'key').generate(
        'Suggest AI courses',
        new AbortController().signal,
      );

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.messages).toHaveLength(1);
      expect(body.messages[0]).toMatchObject({ role: 'user' });
      expect(body.messages[0].content).toContain('Suggest AI courses');
    });

    it('appends JSON format instructions to the user prompt', async () => {
      fetchMock.mockReturnValue(okFetch(validJson));

      await new GroqProvider('llama-3.3', 'key').generate(
        'my prompt',
        new AbortController().signal,
      );

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.messages[0].content).toContain('my prompt');
      expect(body.messages[0].content).toContain('"courses"');
      expect(body.messages[0].content).toContain('"explanation"');
    });

    it('passes the AbortSignal to fetch', async () => {
      fetchMock.mockReturnValue(okFetch(validJson));

      const controller = new AbortController();
      await new GroqProvider('llama-3.3', 'key').generate('test', controller.signal);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });
  });

  describe('response parsing', () => {
    it('parses a valid JSON response and returns courses and explanation', async () => {
      fetchMock.mockReturnValue(okFetch(validJson));

      const result = await new GroqProvider('llama-3.3', 'key').generate(
        'test',
        new AbortController().signal,
      );

      expect(result).toEqual({ courses: [{ code: 'LOG121' }], explanation: 'ok' });
    });

    it('strips leading markdown JSON code fences before parsing', async () => {
      const wrappedJson = `\`\`\`json\n${validJson}\n\`\`\``;
      fetchMock.mockReturnValue(okFetch(wrappedJson));

      const result = await new GroqProvider('llama-3.3', 'key').generate(
        'test',
        new AbortController().signal,
      );

      expect(result).toEqual({ courses: [{ code: 'LOG121' }], explanation: 'ok' });
    });

    it('throws when the response text is not valid JSON', async () => {
      fetchMock.mockReturnValue(okFetch('not valid json'));

      await expect(
        new GroqProvider('llama-3.3', 'key').generate('test', new AbortController().signal),
      ).rejects.toThrow(/Failed to parse.*JSON response/);
    });
  });

  describe('error handling', () => {
    it('throws with status and body when the API returns a non-ok response', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => 'rate limit exceeded',
      } as Response);

      await expect(
        new GroqProvider('llama-3.3', 'key').generate('test', new AbortController().signal),
      ).rejects.toThrow(/429.*rate limit exceeded/);
    });

    it('propagates the AbortError when the signal is aborted before fetch resolves', async () => {
      const controller = new AbortController();

      fetchMock.mockImplementation((_url: string, options: RequestInit) =>
        new Promise((_, reject) => {
          options.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        }),
      );

      const generatePromise = new GroqProvider('llama-3.3', 'key').generate(
        'test',
        controller.signal,
      );
      controller.abort();

      await expect(generatePromise).rejects.toMatchObject({ name: 'AbortError' });
    });
  });

  describe('provider names', () => {
    it('formats the provider name as "<Provider> (<model>)"', () => {
      expect(new GroqProvider('llama-3.3-70b-versatile', 'key').name).toBe(
        'Groq (llama-3.3-70b-versatile)',
      );
      expect(new NvidiaProvider('meta/llama-3.3-70b', 'key').name).toBe(
        'Nvidia (meta/llama-3.3-70b)',
      );
      expect(new GeminiProvider('gemini-2.0-flash', 'key').name).toBe(
        'Gemini (gemini-2.0-flash)',
      );
    });
  });
});
