import { randomUUID } from 'node:crypto';

import { Injectable, Logger } from '@nestjs/common';

import { CourseRetrieverService } from '../embedding/course-retriever.service';
import { PosthogMonitoringService } from '../monitoring/posthog-monitoring.service';
import { ProviderStatusDto } from './dtos/generate.dto';
import { LlmExhaustedException } from './exceptions/llm-exhausted.exception';
import {
  LlmCourse,
  LlmGenerationResponse
} from './interfaces/llm-generation-response.interface';
import {
  LlmProvider,
  STREAM_COURSES_DELIMITER
} from './interfaces/llm-provider';
import { GeminiProvider } from './providers/gemini.provider';
import { GroqProvider } from './providers/groq.provider';
import { NvidiaProvider } from './providers/nvidia.provider';

export type LlmStreamEvent =
  | { type: 'reason'; data: string }
  | { type: 'courses'; data: LlmCourse[] };

/**
 * Thrown when a provider fails mid-stream. `yieldedAny` tells the caller
 * whether it's still safe to silently fall back to the next provider.
 */
class ProviderStreamError extends Error {
  constructor(
    public readonly cause: Error,
    public readonly yieldedAny: boolean
  ) {
    super(cause.message);
  }
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly providers: LlmProvider[];
  private readonly timeoutMs: number;

  private throwExhausted(lastError: Error | undefined): never {
    this.logger.error(
      'All LLM providers have been exhausted.',
      lastError?.message
    );
    throw new LlmExhaustedException(lastError);
  }

  private tryProvider(
    model: string | undefined,
    apiKey: string | undefined,
    Provider: new (m: string, k: string) => LlmProvider
  ): LlmProvider | null {
    if (!model || !apiKey) {
      return null;
    }

    return new Provider(model, apiKey);
  }

  constructor(
    private readonly courseRetriever: CourseRetrieverService,
    private readonly posthogMonitoring: PosthogMonitoringService
  ) {
    this.timeoutMs = Number.parseInt(process.env.LLM_TIMEOUT_MS || '10000', 10);

    this.providers = [
      this.tryProvider(
        process.env.GROQ_PRIMARY_MODEL,
        process.env.GROQ_API_KEY,
        GroqProvider
      ),
      this.tryProvider(
        process.env.GROQ_FALLBACK_MODEL,
        process.env.GROQ_API_KEY,
        GroqProvider
      ),
      this.tryProvider(
        process.env.NVIDIA_MODEL,
        process.env.NVIDIA_API_KEY,
        NvidiaProvider
      ),
      this.tryProvider(
        process.env.GEMINI_MODEL,
        process.env.GEMINI_API_KEY,
        GeminiProvider
      )
    ].filter(Boolean) as LlmProvider[];

    if (this.providers.length === 0) {
      this.logger.warn('No LLM providers configured. Generation will fail.');
    }
  }

  public async checkStatus(): Promise<ProviderStatusDto[]> {
    const testPrompt =
      'Reply with valid JSON: {"courses":[],"explanation":"ok"}';

    return Promise.all(
      this.providers.map(async (provider) => {
        const start = Date.now();
        try {
          const controller = new AbortController();
          const timeout = setTimeout(
            () => controller.abort(),
            provider.timeoutMs ?? this.timeoutMs
          );
          try {
            await provider.complete(testPrompt, controller.signal);
          } finally {
            clearTimeout(timeout);
          }
          return {
            name: provider.name,
            status: 'ok' as const,
            latencyMs: Date.now() - start
          };
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          return {
            name: provider.name,
            status: 'error' as const,
            latencyMs: Date.now() - start,
            error: msg
          };
        }
      })
    );
  }

  private async buildEnrichedPrompt(
    traceId: string,
    prompt: string,
    programIds?: number[]
  ): Promise<string> {
    this.logger.debug(
      `Retrieving courses for prompt: "${prompt}"` +
        (programIds?.length ? ` (programIds: ${programIds.join(', ')})` : '')
    );
    const courses = await this.courseRetriever.retrieveCourses(
      prompt,
      programIds?.length ? { programIds } : undefined
    );
    this.logger.log(
      `Retrieved ${courses.length} courses:\n` +
        courses
          .map((c) => `  [${c.score.toFixed(3)}] ${c.code} – ${c.title}`)
          .join('\n')
    );
    this.posthogMonitoring.captureAiSpan({
      traceId,
      name: 'course-retrieval',
      input: { prompt, programIds },
      output: courses.map((c) => ({ code: c.code, score: c.score }))
    });

    const courseContext = courses
      .map((c) => `- [${c.code}] ${c.title}: ${c.description}`)
      .join('\n');

    return `You are a course recommendation assistant at ÉTS university.
      Match the language of the user's request. In French, address the student with "tu", not "vous".
      If the user's question mentions a specific course code, first check whether that course appears in the available courses list. If it does not, say so briefly in the same language as the user's request and return an empty courses array.
      Otherwise, recommend the most relevant courses for the user's request.

      AVAILABLE COURSES:
      ${courseContext}

      USER REQUEST:
      ${prompt}
      `;
  }

  public async recommend(
    prompt: string,
    programIds?: number[]
  ): Promise<LlmGenerationResponse> {
    const traceId = randomUUID();
    const enrichedPrompt = await this.buildEnrichedPrompt(
      traceId,
      prompt,
      programIds
    );

    let lastError: Error | undefined;

    for (const provider of this.providers) {
      const start = Date.now();
      try {
        const controller = new AbortController();
        const timeout = setTimeout(
          () => controller.abort(),
          provider.timeoutMs ?? this.timeoutMs
        );

        this.logger.debug(`Attempting generation with ${provider.name}`);
        try {
          const result = await provider.complete(
            enrichedPrompt,
            controller.signal
          );
          this.captureGeneration(
            traceId,
            provider.providerName,
            provider.modelName,
            enrichedPrompt,
            result,
            Date.now() - start
          );
          return result;
        } finally {
          clearTimeout(timeout);
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.captureGeneration(
          traceId,
          provider.providerName,
          provider.modelName,
          enrichedPrompt,
          undefined,
          Date.now() - start,
          lastError.message
        );
        this.logger.warn(
          `Provider ${provider.name} failed: ${lastError.message}`
        );
      }
    }

    this.throwExhausted(lastError);
  }

  private captureGeneration(
    traceId: string,
    providerName: string,
    modelName: string,
    input: string,
    output: unknown,
    latencyMs: number,
    error?: string
  ): void {
    this.posthogMonitoring.captureAiGeneration({
      traceId,
      provider: providerName,
      model: modelName,
      input,
      output,
      latencyMs,
      error
    });
  }

  public async *recommendStream(
    prompt: string,
    programIds?: number[]
  ): AsyncGenerator<LlmStreamEvent> {
    const traceId = randomUUID();
    const enrichedPrompt = await this.buildEnrichedPrompt(
      traceId,
      prompt,
      programIds
    );

    let lastError: Error | undefined;

    for (const provider of this.providers) {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        provider.timeoutMs ?? this.timeoutMs
      );
      const start = Date.now();

      try {
        this.logger.debug(
          `Attempting streaming generation with ${provider.name}`
        );
        yield* this.streamFromProvider(
          traceId,
          provider,
          enrichedPrompt,
          controller.signal,
          start
        );
        return;
      } catch (error) {
        const streamError = this.toProviderStreamError(error);
        lastError = streamError.cause;
        this.captureGeneration(
          traceId,
          provider.providerName,
          provider.modelName,
          enrichedPrompt,
          undefined,
          Date.now() - start,
          lastError.message
        );
        this.logger.warn(
          `Provider ${provider.name} failed: ${lastError.message}`
        );
        // Once a provider has started streaming to the client, we can no
        // longer silently fall back to another provider mid-response.
        if (streamError.yieldedAny) {
          throw lastError;
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    this.throwExhausted(lastError);
  }

  private async *streamFromProvider(
    traceId: string,
    provider: LlmProvider,
    enrichedPrompt: string,
    signal: AbortSignal,
    start: number
  ): AsyncGenerator<LlmStreamEvent> {
    let yieldedAny = false;
    // Buffer holds text not yet emitted; once past the delimiter it
    // accumulates the raw (unstreamed) course-list JSON instead.
    let buffer = '';
    let sawDelimiter = false;
    let reasonText = '';

    try {
      for await (const chunk of provider.completeStream(
        enrichedPrompt,
        signal
      )) {
        const result = this.consumeStreamChunk(chunk, buffer, sawDelimiter);
        buffer = result.buffer;
        sawDelimiter = result.sawDelimiter;
        if (result.reason !== undefined) {
          yieldedAny = true;
          reasonText += result.reason;
          yield { type: 'reason', data: result.reason };
        }
      }

      if (!sawDelimiter && buffer) {
        // Model never emitted the delimiter; treat the rest as reason text.
        yieldedAny = true;
        reasonText += buffer;
        yield { type: 'reason', data: buffer };
        buffer = '';
      }

      const courses = this.parseCourses(buffer, provider.name);
      this.captureGeneration(
        traceId,
        provider.providerName,
        provider.modelName,
        enrichedPrompt,
        { explanation: reasonText, courses },
        Date.now() - start
      );
      yield { type: 'courses', data: courses };
    } catch (error) {
      throw this.toProviderStreamError(error, yieldedAny);
    }
  }

  private toProviderStreamError(
    error: unknown,
    yieldedAny = false
  ): ProviderStreamError {
    if (error instanceof ProviderStreamError) {
      return error;
    }
    const cause = error instanceof Error ? error : new Error(String(error));
    return new ProviderStreamError(cause, yieldedAny);
  }

  /**
   * Folds one streamed chunk into the reason/course-list buffer, holding
   * back enough trailing text that a delimiter split across chunk
   * boundaries is never emitted as part of the reason.
   */
  private consumeStreamChunk(
    chunk: string,
    buffer: string,
    sawDelimiter: boolean
  ): { buffer: string; sawDelimiter: boolean; reason?: string } {
    if (sawDelimiter) {
      return { buffer: buffer + chunk, sawDelimiter: true };
    }

    const combined = buffer + chunk;
    const delimiterIndex = combined.indexOf(STREAM_COURSES_DELIMITER);

    if (delimiterIndex === -1) {
      const safeLength = Math.max(
        0,
        combined.length - STREAM_COURSES_DELIMITER.length
      );
      if (safeLength === 0) {
        return { buffer: combined, sawDelimiter: false };
      }
      return {
        buffer: combined.slice(safeLength),
        sawDelimiter: false,
        reason: combined.slice(0, safeLength)
      };
    }

    const reasonPart = combined.slice(0, delimiterIndex);
    return {
      buffer: combined.slice(delimiterIndex + STREAM_COURSES_DELIMITER.length),
      sawDelimiter: true,
      reason: reasonPart || undefined
    };
  }

  private parseCourses(text: string, providerName: string): LlmCourse[] {
    const cleaned = text
      .replace(/^```json\n?/i, '')
      .replace(/\n?```$/i, '')
      .trim();

    if (!cleaned) {
      return [];
    }

    try {
      const parsed: unknown = JSON.parse(cleaned);
      return Array.isArray(parsed) ? (parsed as LlmCourse[]) : [];
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to parse streamed course list from ${providerName}: ${msg}\nText: ${cleaned}`
      );
      return [];
    }
  }
}
