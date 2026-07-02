import { OpenAiCompatibleProvider } from './openai-compatible.provider';

export class NvidiaProvider extends OpenAiCompatibleProvider {
  constructor(modelName: string, apiKey: string) {
    super('Nvidia', modelName, apiKey);
  }

  protected getUrl(): string {
    return 'https://integrate.api.nvidia.com/v1/chat/completions';
  }
}
