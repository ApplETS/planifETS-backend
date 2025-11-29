import * as dotenv from 'dotenv';

dotenv.config();

import * as Sentry from "@sentry/nestjs";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

if (process.env.APP_ENV !== 'development' && !process.env.CI) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.APP_ENV,

    integrations: [
      // Add our Profiling integration
      nodeProfilingIntegration(),
      Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
    ],
    // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
    tracesSampleRate: 1,

    // Set profilesSampleRate to 1.0 to profile 100%
    // of sampled transactions.
    // This is relative to tracesSampleRate
    // Learn more at
    // https://docs.sentry.io/platforms/javascript/guides/nestjs/configuration/options/#profilesSampleRate
    profilesSampleRate: 1.0,

    // Enable logs to be sent to Sentry
    enableLogs: true,

    attachStacktrace: true,

    // Enable sending user PII (Personally Identifiable Information)
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
    sendDefaultPii: false,
  });
}