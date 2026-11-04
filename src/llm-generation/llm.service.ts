import { randomUUID } from 'node:crypto';

import { Injectable, Logger } from '@nestjs/common';

import { CourseRetrieverService } from '../embedding/course-retriever.service';
import { PosthogMonitoringService } from '../monitoring/posthog-monitoring.service';
import { ProviderStatusDto } from './dtos/generate.dto';
import { LlmExhaustedException } from './exceptions/llm-exhausted.exception';
import {
  isLlmCourse,
  LlmCourse
} from './interfaces/llm-generation-response.interface';
import {
  LlmProvider,
  STREAM_COURSES_DELIMITER
} from './interfaces/llm-provider';
import { LlamaCppProvider } from './providers/llama-cpp.provider';

const DEFAULT_LLAMA_MODEL = 'gemma-4-e2b-it-qat';
const DEFAULT_RECOMMENDATION_COUNT = 5;

export type LlmStreamEvent =
  | { type: 'status'; data: LlmStreamStatus }
  | { type: 'reason'; data: string }
  | { type: 'model'; data: string }
  | { type: 'courses'; data: LlmCourse[] };

export type LlmStreamStatus = 'SEARCHING_EMBEDDINGS' | 'THINKING_AI';

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
  private readonly instanceId = randomUUID();
  private activeRequests = 0;
  private throwExhausted(lastError: Error | undefined): never {
    this.logger.error(
      'All LLM providers have been exhausted.',
      lastError?.message
    );
    throw new LlmExhaustedException(lastError);
  }

  private tryProvider(
    model: string | undefined,
    baseUrl: string | undefined,
    Provider: new (model: string, baseUrl: string) => LlmProvider
  ): LlmProvider | null {
    return model && baseUrl ? new Provider(model, baseUrl) : null;
  }

  constructor(
    private readonly courseRetriever: CourseRetrieverService,
    private readonly posthogMonitoring: PosthogMonitoringService
  ) {
    this.timeoutMs = Number.parseInt(process.env.LLM_TIMEOUT_MS || '10000', 10);

    this.providers = [
      this.tryProvider(
        process.env.LLAMA_MODEL ?? DEFAULT_LLAMA_MODEL,
        process.env.LLAMA_BASE_URL,
        LlamaCppProvider
      )
    ].filter((provider): provider is LlmProvider => provider !== null);

    if (this.providers.length === 0) {
      this.logger.warn('No LLM providers configured. Generation will fail.');
    }
  }

  public async checkStatus(): Promise<ProviderStatusDto[]> {
    return Promise.all(
      this.providers.map(async (provider) => {
        const start = Date.now();
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          try {
            await provider.checkHealth(controller.signal);
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
  ): Promise<{ prompt: string; allowedCourseCodes: Set<string> }> {
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
      .map((c) => `- ${c.code} ${c.title}: ${c.description}`)
      .join('\n');

    return {
      prompt: `You are a course recommendation assistant at ÉTS university.
        Match the language of the user's request.
        Talk like a fellow ÉTS student giving casual advice, not a formal administrator. If replying in French, use "tu", never "vous".
        For greetings with no course topic, respond briefly and ask what topics or goals the user wants to explore, then return an empty courses array. When the user expresses an interest, names a subject, or asks about courses casually, treat that as a course request even without an explicit question. Recommend the closest relevant available courses; do not ask for clarification just because the request is broad or informal. Ask one short clarifying question and return no courses only when the message gives no usable topic or goal. Never infer the user's interests from the AVAILABLE COURSES list; retrieved courses are candidates, not evidence of what the user wants.
        Only recommend courses that appear in the AVAILABLE COURSES list below — never invent a course or mention one that isn't in that list. If the list is empty or has nothing relevant to the request, say so briefly in the same language as the user's request and return an empty courses array.
        Otherwise, recommend ${DEFAULT_RECOMMENDATION_COUNT} courses by default, picking the most relevant courses only from the list. If the user explicitly requests a number of recommendations (in digits or words), use that number instead, including requests for only one option. A general learning goal such as "Je veux un cours en IA" or "I want a course in AI" is not an explicit result count: offer ${DEFAULT_RECOMMENDATION_COUNT} options to choose from.
        Recommend only courses directly relevant to the user's topic. Return the requested number, or the default number, when enough relevant courses are available. If fewer courses clearly match, return fewer and explain why. Never pad with adjacent topics or general-interest courses.
        Keep the explanation short, not the course list. Return bare course codes without brackets, spaces, or markdown.

        AVAILABLE COURSES:
        ${courseContext}

        USER REQUEST:
        ${prompt}
        `,
      allowedCourseCodes: new Set(courses.map((course) => course.code))
    };
  }

  private sanitizeCourses(
    courses: LlmCourse[],
    allowedCourseCodes: Set<string>,
    providerName: string,
    modelName: string
  ): LlmCourse[] {
    if (courses.length === 0) {
      return courses;
    }

    // Models sometimes copy brackets from course context. Normalize presentation
    // before checking membership; this never admits a code outside the candidates.
    const candidates = courses.filter(
      (course): course is LlmCourse =>
        !!course && typeof course.code === 'string'
    );
    const normalizedCourses = candidates.map((course) => ({
      ...course,
      code: course.code.trim().replace(/^\[([A-Z]{3}[0-9]{3})\]$/, '$1')
    }));
    const validCourses = normalizedCourses.filter((course) =>
      allowedCourseCodes.has(course.code)
    );

    if (validCourses.length === candidates.length) {
      return validCourses;
    }

    const invalidCourseCodes = normalizedCourses
      .filter((course) => !allowedCourseCodes.has(course.code))
      .map((course) => course.code);
    const message =
      `Filtered hallucinated course recommendations from ${providerName} (${modelName}): ` +
      invalidCourseCodes.join(', ');

    this.logger.error({
      message,
      aiProvider: providerName,
      aiModel: modelName,
      invalidCourseCodes: invalidCourseCodes.join(',')
    });

    return validCourses;
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
    programIds?: number[],
    signal?: AbortSignal
  ): AsyncGenerator<LlmStreamEvent> {
    signal?.throwIfAborted();
    const traceId = randomUUID();
    const startedAt = performance.now();
    const concurrentRequestsAtStart = ++this.activeRequests;
    const properties = {
      request_id: traceId,
      instance_id: this.instanceId,
      concurrent_requests_at_start: concurrentRequestsAtStart
    };
    let outcome: 'success' | 'error' | 'cancelled' = 'cancelled';
    let firstTokenMs: number | undefined;
    let model: string | undefined;
    let courseCount = 0;
    this.posthogMonitoring.captureChatbotRequest('chatbot_request_started', {
      ...properties,
      active_requests: this.activeRequests
    });
    try {
      for await (const event of this.generateRecommendationStream(
        traceId,
        prompt,
        programIds,
        signal
      )) {
        if (
          event.type === 'reason' &&
          event.data &&
          firstTokenMs === undefined
        ) {
          firstTokenMs = performance.now() - startedAt;
        }
        if (event.type === 'model') model = event.data;
        if (event.type === 'courses') {
          outcome = 'success';
          courseCount = event.data.length;
        }
        yield event;
      }
    } catch (error) {
      outcome = signal?.aborted ? 'cancelled' : 'error';
      throw error;
    } finally {
      this.activeRequests -= 1;
      this.posthogMonitoring.captureChatbotRequest('chatbot_request_finished', {
        ...properties,
        active_requests: this.activeRequests,
        outcome,
        duration_ms: performance.now() - startedAt,
        time_to_first_token_ms: firstTokenMs,
        model,
        course_count: courseCount
      });
    }
  }

  private async *generateRecommendationStream(
    traceId: string,
    prompt: string,
    programIds?: number[],
    signal?: AbortSignal
  ): AsyncGenerator<LlmStreamEvent> {
    yield { type: 'status', data: 'SEARCHING_EMBEDDINGS' };
    const { prompt: enrichedPrompt, allowedCourseCodes } =
      await this.buildEnrichedPrompt(traceId, prompt, programIds);
    signal?.throwIfAborted();
    yield { type: 'status', data: 'THINKING_AI' };

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
          allowedCourseCodes,
          signal
            ? AbortSignal.any([signal, controller.signal])
            : controller.signal,
          start
        );
        return;
      } catch (error) {
        signal?.throwIfAborted();
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
    allowedCourseCodes: Set<string>,
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

      const courses = this.sanitizeCourses(
        this.parseCourses(buffer, provider.name),
        allowedCourseCodes,
        provider.providerName,
        provider.modelName
      );
      this.captureGeneration(
        traceId,
        provider.providerName,
        provider.modelName,
        enrichedPrompt,
        { explanation: reasonText, courses },
        Date.now() - start
      );
      yield { type: 'model', data: provider.modelName };
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
      return Array.isArray(parsed) ? parsed.filter(isLlmCourse) : [];
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to parse streamed course list from ${providerName}: ${msg}\nText: ${cleaned}`
      );
      return [];
    }
  }
}
