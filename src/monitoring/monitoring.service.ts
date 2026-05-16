export interface MonitoringContext {
  tags?: Record<string, string>;
  extras?: Record<string, unknown>;
}

export type MonitoringLogLevel = 'log' | 'warn' | 'error';

export abstract class MonitoringService {
  public abstract captureException(exception: unknown, context?: MonitoringContext): void;
  public abstract captureLog(level: MonitoringLogLevel, message: string, attributes?: Record<string, unknown>): void;
}
