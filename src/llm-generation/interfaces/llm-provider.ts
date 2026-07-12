import { LlmGenerationResponse } from './llm-generation-response.interface';

const JSON_FORMAT_INSTRUCTION = `
Respond ONLY with valid JSON matching this exact structure, no markdown code blocks.
Match the language of the user's request for all values.
Do not include any extra text or markdown.
{
  "courses": [{ "code": "<course code>", "reason": "<brief reason why this course is relevant in the same language as the user's request>" }],
  "explanation": "<brief explanation in the same language as the user's request>"
}`;

export const STREAM_COURSES_DELIMITER = '###COURSES###';

const STREAM_FORMAT_INSTRUCTION = `
Respond in plain text, NOT JSON. Match the language of the user's request. Follow this exact structure:
1. Write a short, friendly explanation (a few sentences of flowing prose, no markdown headers) of the recommended courses.
2. On its own line, write exactly: ${STREAM_COURSES_DELIMITER}
3. After that line, output ONLY a JSON array of the recommended course codes, e.g. [{"code":"LOG635"},{"code":"INF130"}], or [] if none. No markdown code blocks, no extra text.`;

export abstract class LlmProvider {
  public readonly name: string;
  public readonly timeoutMs?: number;

  protected readonly maxTokens = 512;

  constructor(
    providerName: string,
    protected readonly modelName: string,
    protected readonly apiKey: string
  ) {
    this.name = `${providerName} (${modelName})`;
  }

  public async complete(
    prompt: string,
    signal: AbortSignal
  ): Promise<LlmGenerationResponse> {
    const fullPrompt = `${prompt}\n${JSON_FORMAT_INSTRUCTION}`;

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

    const data = await response.json();
    return this.parseJsonResponse(this.extractText(data));
  }

  public async *completeStream(
    prompt: string,
    signal: AbortSignal
  ): AsyncGenerator<string> {
    const fullPrompt = `${prompt}\n${STREAM_FORMAT_INSTRUCTION}`;

    const response = await fetch(this.getUrl(), {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(this.getBody(fullPrompt, true)),
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

    const reader = response.body.getReader();
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

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) {
            continue;
          }

          const data = trimmed.slice('data:'.length).trim();
          if (data === '[DONE]') {
            return;
          }

          try {
            const delta = this.extractDelta(JSON.parse(data));
            if (delta) {
              yield delta;
            }
          } catch {
            // Malformed or partial SSE chunk; skip it.
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  protected abstract getUrl(): string;
  protected abstract getHeaders(): Record<string, string>;
  protected abstract getBody(prompt: string, stream?: boolean): object;
  protected abstract extractText(data: unknown): string;
  protected abstract extractDelta(data: unknown): string;

  private parseJsonResponse(text: string): LlmGenerationResponse {
    const cleaned = text
      .replace(/^```json\n?/i, '')
      .replace(/\n?```$/i, '')
      .trim();
    try {
      return JSON.parse(cleaned);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to parse ${this.name} JSON response: ${msg}\nText: ${text}`
      );
    }
  }
}
