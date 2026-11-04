export const STREAM_COURSES_DELIMITER = '###COURSES###';

const STREAM_FORMAT_INSTRUCTION = `
Respond in plain text, NOT JSON. Match the language of the user's request. Follow this exact structure:
1. Write at most two short sentences explaining your recommendations, with no markdown headers. Do not repeat course descriptions; the UI shows course cards.
2. On its own line, write exactly: ${STREAM_COURSES_DELIMITER}
3. After that line, output ONLY a JSON array containing every recommended course, using objects with a single "code" field, or [] if none. Include the user's requested number when enough relevant courses are available. No markdown code blocks, no extra text.
Do not stop after the explanation. The delimiter and JSON array are mandatory, including when no courses match.
Example format (replace the explanation and course code with your actual recommendations):
Short explanation.
${STREAM_COURSES_DELIMITER}
[{"code":"COURSE_CODE"}]`;

export abstract class LlmProvider {
  public readonly name: string;
  public readonly timeoutMs?: number;

  protected readonly maxTokens = 512;

  constructor(
    public readonly providerName: string,
    public readonly modelName: string,
    protected readonly apiKey: string
  ) {
    this.name = `${providerName} (${modelName})`;
  }

  public async *completeStream(
    prompt: string,
    signal: AbortSignal
  ): AsyncGenerator<string> {
    const fullPrompt = `${prompt}\n${STREAM_FORMAT_INSTRUCTION}`;

    const response = await fetch(this.getUrl(), {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(this.getBody(fullPrompt)),
      signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `${this.name} API error: ${response.status} - ${errorText}`
      );
    }

    if (!response.body) {
      throw new Error(`${this.name} returned no response body for streaming`);
    }

    for await (const line of this.readSSELines(response.body.getReader())) {
      const result = this.parseSSELine(line);
      if (!result) {
        continue;
      }
      if (result.done) {
        return;
      }
      yield result.delta;
    }
  }

  private async *readSSELines(
    reader: ReadableStreamDefaultReader<Uint8Array>
  ): AsyncGenerator<string> {
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        yield* lines;
      }
    } finally {
      reader.releaseLock();
    }
  }

  private parseSSELine(
    line: string
  ): { done: true; delta?: never } | { done: false; delta: string } | null {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) {
      return null;
    }

    const data = trimmed.slice('data:'.length).trim();
    if (data === '[DONE]') {
      return { done: true };
    }

    try {
      const delta = this.extractDelta(JSON.parse(data));
      return delta
        ? {
            done: false,
            delta
          }
        : null;
    } catch {
      // Malformed or partial SSE chunk; skip it.
      return null;
    }
  }

  protected abstract getUrl(): string;
  protected abstract getHeaders(): Record<string, string>;
  protected abstract getBody(prompt: string): object;
  protected abstract extractDelta(data: unknown): string;

  public abstract checkHealth(signal: AbortSignal): Promise<void>;
}
