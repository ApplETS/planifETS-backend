import { OpenAiCompatibleProvider } from './openai-compatible.provider';

export class GroqProvider extends OpenAiCompatibleProvider {
  protected override readonly useJsonMode = true;

  constructor(modelName: string, apiKey: string) {
    super('Groq', modelName, apiKey);
  }

  protected getUrl(): string {
    return 'https://api.groq.com/openai/v1/chat/completions';
  }
}
