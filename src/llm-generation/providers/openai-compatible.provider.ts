import { LlmProvider } from '../interfaces/llm-provider';

export abstract class OpenAiCompatibleProvider extends LlmProvider {
  protected getHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  protected readonly useJsonMode: boolean = false;

  protected getBody(prompt: string): object {
    const body: Record<string, unknown> = {
      model: this.modelName,
      max_tokens: this.maxTokens,
      messages: [{ role: 'user', content: prompt }],
    };

    if (this.useJsonMode) {
      body['response_format'] = { type: 'json_object' };
    }

    return body;
  }

  protected extractText(data: unknown): string {
    const d = data as { choices?: { message?: { content?: string } }[] };
    return d.choices?.[0]?.message?.content ?? '';
  }
}
