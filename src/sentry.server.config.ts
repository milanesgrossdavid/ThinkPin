import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),
  tracesSampleRate: 0.1,
  beforeSend(event) {
    delete event.request;
    delete event.user;
    event.breadcrumbs = [];
    delete event.extra;
    delete event.contexts;
    delete event.message;
    event.exception?.values?.forEach((exception) => {
      exception.value = exception.type ?? "Error details redacted";
    });
    if (event.transaction) {
      event.transaction = event.transaction.replace(
        /[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi,
        ":id",
      );
    }
    return event;
  },
  beforeSendSpan(span) {
    span.name = span.name
      .split("?")[0]
      .replace(
        /[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi,
        ":id",
      );
    for (const key of Object.keys(span.attributes)) {
      if (/url|query|request|body|token|authorization|cookie/i.test(key)) {
        delete span.attributes[key];
      }
    }
    return span;
  },
});
