import { Module } from '@nestjs/common';

import { MonitoringService } from './monitoring.service';
import { SentryMonitoringService } from './sentry-monitoring.service';

@Module({
  providers: [
    SentryMonitoringService,
    { provide: MonitoringService, useExisting: SentryMonitoringService },
  ],
  exports: [MonitoringService],
})
export class MonitoringModule {}
