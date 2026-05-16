type ObservabilityPayload = Record<string, string | number | boolean | null | undefined>;

async function capturePostHogEvent(event: string, properties: ObservabilityPayload) {
  const key = process.env.POSTHOG_PROJECT_API_KEY;
  const host = process.env.POSTHOG_HOST ?? "https://app.posthog.com";

  if (!key) {
    return;
  }

  await fetch(`${host.replace(/\/$/, "")}/capture/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: key,
      event,
      distinct_id: properties.distinctId ?? "server",
      properties,
    }),
  }).catch(() => undefined);
}

export function captureServerEvent(event: string, properties: ObservabilityPayload = {}) {
  if (process.env.NODE_ENV !== "production") {
    console.info(`[observability] ${event}`, properties);
  }

  void capturePostHogEvent(event, properties);
}

export function captureServerError(error: unknown, context: ObservabilityPayload = {}) {
  const message = error instanceof Error ? error.message : "Unknown error";

  if (process.env.NODE_ENV !== "production") {
    console.error("[observability:error]", message, context);
  }

  void capturePostHogEvent("server_error", {
    ...context,
    message,
    sentryDsnConfigured: Boolean(process.env.SENTRY_DSN),
  });
}
