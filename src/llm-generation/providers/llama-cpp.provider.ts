import { OpenAiCompatibleProvider } from './openai-compatible.provider';

const DEFAULT_LLAMA_TIMEOUT_MS = 180000;

/**
 * Local llama-server (OpenAI-compatible). No API key required.
 *
 * Thinking is disabled per request via chat_template_kwargs; temperature 0
 * keeps recommendations deterministic (see test/llm-eval README: CPU runs
 * match GPU-assisted quality at temperature 0, device only trades latency).
 */
export class LlamaCppProvider extends OpenAiCompatibleProvider {
  public readonly timeoutMs: number;

  constructor(
    modelName: string,
    baseUrl = process.env.LLAMA_BASE_URL ?? 'http://localhost:8080/v1'
  ) {
    super('llama.cpp', modelName, '');
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.timeoutMs =
      Number(process.env.LLAMA_TIMEOUT_MS) || DEFAULT_LLAMA_TIMEOUT_MS;
  }

  private readonly baseUrl: string;

  public async checkHealth(signal: AbortSignal): Promise<void> {
    const url = new URL(this.baseUrl);
    url.pathname = url.pathname.replace(/\/v1$/, '') + '/health';
    const response = await fetch(url.toString(), { signal });
    if (!response.ok) {
      throw new Error(`llama.cpp health check failed: ${response.status}`);
    }
  }

  protected override getHeaders(): Record<string, string> {
    return { 'Content-Type': 'application/json' };
  }

  protected getUrl(): string {
    return `${this.baseUrl}/chat/completions`;
  }

  protected override getBody(prompt: string): object {
    return {
      ...super.getBody(prompt),
      temperature: 0,
      reasoning_effort: 'none',
      chat_template_kwargs: { enable_thinking: false }
    };
  }
}
