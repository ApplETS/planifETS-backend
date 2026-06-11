import { LlmGenerationResponse } from './llm-generation-response.interface';

const JSON_FORMAT_INSTRUCTION = `
Respond ONLY with valid JSON matching this exact structure, no markdown code blocks:
{
  "courses": [{ "code": "<course code>" }],
  "explanation": "<explanation>"
}`;

export abstract class LlmProvider {
  public readonly name: string;
  public readonly timeoutMs?: number;

  protected readonly maxTokens = 512;

  constructor(
    providerName: string,
    protected readonly modelName: string,
    protected readonly apiKey: string,
  ) {
    this.name = `${providerName} (${modelName})`;
  }

  public async generate(prompt: string, signal: AbortSignal): Promise<LlmGenerationResponse> {
    const fullPrompt = `${prompt}\n${JSON_FORMAT_INSTRUCTION}`;

    const response = await fetch(this.getUrl(), {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(this.getBody(fullPrompt)),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${this.name} API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return this.parseJsonResponse(this.extractText(data));
  }

  protected abstract getUrl(): string;
  protected abstract getHeaders(): Record<string, string>;
  protected abstract getBody(prompt: string): object;
  protected abstract extractText(data: unknown): string;

  private parseJsonResponse(text: string): LlmGenerationResponse {
    const cleaned = text.replace(/^```json\n?/i, '').replace(/\n?```$/i, '').trim();
    try {
      return JSON.parse(cleaned);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to parse ${this.name} JSON response: ${msg}\nText: ${text}`);
    }
  }
}
