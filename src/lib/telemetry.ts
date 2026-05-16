type TelemetryAttributes = Record<string, string | number | boolean | undefined>;

export function captureTelemetrySpan(name: string, attributes: TelemetryAttributes = {}) {
  const payload = {
    name,
    attributes,
    timestamp: new Date().toISOString(),
  };

  if (process.env.NODE_ENV !== "production") {
    return payload;
  }

  // OpenTelemetry-compatible extension point. Production collectors can replace
  // this no-op with OTLP export without changing API route contracts.
  return payload;
}
