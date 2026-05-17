import { Module } from '@nestjs/common';
import { PostHog } from 'posthog-node';
import { PostHogInterceptor } from 'posthog-node/nestjs';

import { POSTHOG_CLIENT, PosthogMonitoringService } from './posthog-monitoring.service';

@Module({
  providers: [
    {
      provide: POSTHOG_CLIENT,
      useFactory: () => {
        const client = new PostHog(process.env.POSTHOG_API_KEY ?? '', {
          host: process.env.POSTHOG_HOST ?? 'https://us.i.posthog.com',
          disabled: process.env.APP_ENV === 'development' || Boolean(process.env.CI),
        });
        client.on('error', (err) => console.error('[PostHog] send error:', err));
        return client;
      },
    },
    PosthogMonitoringService,
    {
      provide: PostHogInterceptor,
      useFactory: (posthog: PostHog) => new PostHogInterceptor(posthog, { captureExceptions: true }),
      inject: [POSTHOG_CLIENT],
    },
  ],
  exports: [PosthogMonitoringService, PostHogInterceptor],
})
export class MonitoringModule {}
