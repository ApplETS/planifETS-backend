import { Inject, Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { PostHog } from 'posthog-node';

export const POSTHOG_CLIENT = 'POSTHOG_CLIENT';

type LogLevel = 'log' | 'warn' | 'error';

const OTLP_SEVERITY: Record<LogLevel, { text: string; number: number }> = {
  log: { text: 'INFO', number: 9 },
  warn: { text: 'WARN', number: 13 },
  error: { text: 'ERROR', number: 17 }
};

@Injectable()
export class PosthogMonitoringService implements OnApplicationShutdown {
  private readonly logger = new Logger(PosthogMonitoringService.name);

  constructor(@Inject(POSTHOG_CLIENT) private readonly posthog: PostHog) {}

  public captureException(
    exception: unknown,
    context?: Record<string, unknown>
  ): void {
    const error =
      exception instanceof Error ? exception : new Error(String(exception));
    this.posthog.captureException(error, 'server', {
      source: 'backend',
      ...context
    });
  }

  public captureLog(
    level: LogLevel,
    message: string,
    attributes?: Record<string, unknown>
  ): void {
    void this.sendOtlpLog(level, message, attributes);
  }

  public captureAiSpan(params: {
    traceId: string;
    name: string;
    input?: unknown;
    output?: unknown;
  }): void {
    this.posthog.capture({
      distinctId: 'server',
      event: '$ai_span',
      properties: {
        $ai_trace_id: params.traceId,
        $ai_span_name: params.name,
        $ai_input_state: params.input,
        $ai_output_state: params.output
      }
    });
    this.logger.debug(
      `Queued $ai_span "${params.name}" for trace ${params.traceId}`
    );
    void this.flushAndLog(`$ai_span "${params.name}"`, params.traceId);
  }

  public captureAiGeneration(params: {
    traceId: string;
    model: string;
    provider: string;
    input: unknown;
    output: unknown;
    latencyMs: number;
    error?: string;
  }): void {
    this.posthog.capture({
      distinctId: 'server',
      event: '$ai_generation',
      properties: {
        $ai_trace_id: params.traceId,
        $ai_model: params.model,
        $ai_provider: params.provider,
        $ai_input: params.input,
        $ai_output_choices: params.output,
        $ai_latency: params.latencyMs / 1000,
        $ai_is_error: Boolean(params.error),
        $ai_error: params.error
      }
    });
    this.logger.debug(
      `Queued $ai_generation (${params.provider}/${params.model}) for trace ${params.traceId}`
    );
    void this.flushAndLog(
      `$ai_generation (${params.provider}/${params.model})`,
      params.traceId
    );
  }

  private async flushAndLog(label: string, traceId: string): Promise<void> {
    try {
      await this.posthog.flush();
      this.logger.debug(`Flushed ${label} for trace ${traceId} to PostHog`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to flush ${label} for trace ${traceId}: ${msg}`);
    }
  }

  private async sendOtlpLog(
    level: LogLevel,
    message: string,
    attributes?: Record<string, unknown>
  ): Promise<void> {
    const apiKey = process.env.POSTHOG_API_KEY;
    const host = process.env.POSTHOG_HOST ?? 'https://us.i.posthog.com';
    if (
      !apiKey ||
      process.env.APP_ENV === 'development' ||
      Boolean(process.env.CI)
    ) {
      return;
    }

    const timeUnixNano = (BigInt(Date.now()) * 1_000_000n).toString();
    const severity = OTLP_SEVERITY[level];

    const otlpAttributes = [
      { key: 'posthogDistinctId', value: { stringValue: 'server' } },
      { key: 'source', value: { stringValue: 'backend' } },
      ...Object.entries(attributes ?? {}).map(([key, value]) => ({
        key,
        value: { stringValue: String(value) }
      }))
    ];

    const payload = {
      resourceLogs: [
        {
          resource: {
            attributes: [
              {
                key: 'service.name',
                value: { stringValue: 'planifETS-backend' }
              }
            ]
          },
          scopeLogs: [
            {
              scope: { name: 'posthog-node' },
              logRecords: [
                {
                  timeUnixNano,
                  observedTimeUnixNano: timeUnixNano,
                  severityNumber: severity.number,
                  severityText: severity.text,
                  body: { stringValue: message },
                  attributes: otlpAttributes
                }
              ]
            }
          ]
        }
      ]
    };

    try {
      const response = await fetch(`${host}/i/v1/logs?token=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.error(
          '[PostHog] Failed to send log:',
          response.status,
          response.statusText
        );
      }
    } catch (err) {
      console.error('[PostHog] Failed to send log:', err);
    }
  }

  public async onApplicationShutdown(): Promise<void> {
    await this.posthog.shutdown();
  }
}
