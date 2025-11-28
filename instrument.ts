import * as Sentry from "@sentry/nestjs";
// Ensure to call this before requiring any other modules!
Sentry.init({
  dsn: "https://a0534d11d444f4b97d00ef92d380c558@o4510168702451712.ingest.de.sentry.io/4510421601878096",
});