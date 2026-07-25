import { OpenAiCompatibleProvider } from './openai-compatible.provider';

export class GeminiProvider extends OpenAiCompatibleProvider {
  protected override readonly useJsonMode = true;

  constructor(modelName: string, apiKey: string) {
    super('Gemini', modelName, apiKey);
  }

  protected getUrl(): string {
    return 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
  }
}
