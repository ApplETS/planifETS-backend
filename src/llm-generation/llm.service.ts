import { Injectable, Logger } from '@nestjs/common';

import { ProviderStatusDto } from './dtos/generate.dto';
import { LlmExhaustedException } from './exceptions/llm-exhausted.exception';
import { LlmGenerationResponse } from './interfaces/llm-generation-response.interface';
import { LlmProvider } from './interfaces/llm-provider';
import { GeminiProvider } from './providers/gemini.provider';
import { GroqProvider } from './providers/groq.provider';
import { NvidiaProvider } from './providers/nvidia.provider';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private providers: LlmProvider[];
  private readonly timeoutMs: number;

  private tryProvider(model: string | undefined, apiKey: string | undefined,
    Provider: new (m: string, k: string) => LlmProvider): LlmProvider | null {
    if (!model || !apiKey) {
      return null;
    }

    return new Provider(model, apiKey);
  }

  constructor() {
    this.timeoutMs = parseInt(process.env.LLM_TIMEOUT_MS || '10000', 10);

    this.providers = [
      this.tryProvider(process.env.GROQ_PRIMARY_MODEL, process.env.GROQ_API_KEY, GroqProvider),
      this.tryProvider(process.env.GROQ_FALLBACK_MODEL, process.env.GROQ_API_KEY, GroqProvider),
      this.tryProvider(process.env.NVIDIA_MODEL, process.env.NVIDIA_API_KEY, NvidiaProvider),
      this.tryProvider(process.env.GEMINI_MODEL, process.env.GEMINI_API_KEY, GeminiProvider),
    ].filter(Boolean) as LlmProvider[];

    if (this.providers.length === 0) {
      this.logger.warn('No LLM providers configured. Generation will fail.');
    }
  }

  public async checkStatus(): Promise<ProviderStatusDto[]> {
    const testPrompt = 'Reply with valid JSON: {"courses":[],"explanation":"ok"}';

    return Promise.all(
      this.providers.map(async (provider) => {
        const start = Date.now();
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), provider.timeoutMs ?? this.timeoutMs);
          try {
            await provider.generate(testPrompt, controller.signal);
          } finally {
            clearTimeout(timeout);
          }
          return { name: provider.name, status: 'ok' as const, latencyMs: Date.now() - start };
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          return { name: provider.name, status: 'error' as const, latencyMs: Date.now() - start, error: msg };
        }
      }),
    );
  }

  public async generate(prompt: string): Promise<LlmGenerationResponse> {
    let lastError: Error | undefined;

    for (const provider of this.providers) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), provider.timeoutMs ?? this.timeoutMs);

        this.logger.debug(`Attempting generation with ${provider.name}`);
        try {
          return await provider.generate(prompt, controller.signal);
        } finally {
          clearTimeout(timeout);
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(`Provider ${provider.name} failed: ${lastError.message}`);
      }
    }

    this.logger.error('All LLM providers have been exhausted.', lastError?.message);
    throw new LlmExhaustedException(lastError);
  }
}
