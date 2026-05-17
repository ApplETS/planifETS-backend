import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { PostHog } from 'posthog-node';

export const POSTHOG_CLIENT = 'POSTHOG_CLIENT';

type LogLevel = 'log' | 'warn' | 'error';

const OTLP_SEVERITY: Record<LogLevel, { text: string; number: number }> = {
  log: { text: 'INFO', number: 9 },
  warn: { text: 'WARN', number: 13 },
  error: { text: 'ERROR', number: 17 },
};

@Injectable()
export class PosthogMonitoringService implements OnApplicationShutdown {
  constructor(@Inject(POSTHOG_CLIENT) private readonly posthog: PostHog) {}

  public captureException(exception: unknown, context?: Record<string, unknown>): void {
    const error = exception instanceof Error ? exception : new Error(String(exception));
    this.posthog.captureException(error, 'server', { source: 'backend', ...context });
  }

  public captureLog(level: LogLevel, message: string, attributes?: Record<string, unknown>): void {
    void this.sendOtlpLog(level, message, attributes);
  }

  private async sendOtlpLog(level: LogLevel, message: string, attributes?: Record<string, unknown>): Promise<void> {
    const apiKey = process.env.POSTHOG_API_KEY;
    const host = process.env.POSTHOG_HOST ?? 'https://us.i.posthog.com';
    if (!apiKey || process.env.APP_ENV === 'development' || Boolean(process.env.CI)) {
      return;
    }

    const timeUnixNano = (BigInt(Date.now()) * 1_000_000n).toString();
    const severity = OTLP_SEVERITY[level];

    const otlpAttributes = [
      { key: 'posthogDistinctId', value: { stringValue: 'server' } },
      { key: 'source', value: { stringValue: 'backend' } },
      ...Object.entries(attributes ?? {}).map(([key, value]) => ({
        key,
        value: { stringValue: String(value) },
      })),
    ];

    const payload = {
      resourceLogs: [
        {
          resource: {
            attributes: [{ key: 'service.name', value: { stringValue: 'planifETS-backend' } }],
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
                  attributes: otlpAttributes,
                },
              ],
            },
          ],
        },
      ],
    };

    try {
      await fetch(`${host}/i/v1/logs?token=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error('[PostHog] Failed to send log:', err);
    }
  }

  public async onApplicationShutdown(): Promise<void> {
    await this.posthog.shutdown();
  }
}
