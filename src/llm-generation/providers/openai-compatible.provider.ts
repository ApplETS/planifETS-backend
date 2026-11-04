import { LlmProvider } from '../interfaces/llm-provider';

export abstract class OpenAiCompatibleProvider extends LlmProvider {
  protected getHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  protected getBody(prompt: string): object {
    return {
      model: this.modelName,
      max_tokens: this.maxTokens,
      messages: [{ role: 'user', content: prompt }],
      stream: true
    };
  }

  protected extractDelta(data: unknown): string {
    const d = data as { choices?: { delta?: { content?: string } }[] };
    return d.choices?.[0]?.delta?.content ?? '';
  }
}
