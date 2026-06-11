import { OpenAiCompatibleProvider } from './openai-compatible.provider';

export class OpenRouterProvider extends OpenAiCompatibleProvider {
  public override readonly timeoutMs = 50_000;
  protected override readonly useJsonMode = true;

  constructor(modelName: string, apiKey: string) {
    super('OpenRouter', modelName, apiKey);
  }

  protected getUrl(): string {
    return 'https://openrouter.ai/api/v1/chat/completions';
  }
}
