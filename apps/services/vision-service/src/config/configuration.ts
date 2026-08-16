export function validateEnvironment(config: Record<string, unknown>): Record<string, unknown> {
  for (const required of ['VISION_DATABASE_URL', 'CAMERA_API_KEY_PEPPER']) {
    if (typeof config[required] !== 'string' || !config[required]) {
      throw new Error(`Invalid environment: ${required} is required`);
    }
  }
  const numericDefaults: Record<string, number> = {
    VISION_SERVICE_PORT: 3335,
    CAMERA_OFFLINE_AFTER_SECONDS: 10,
    TRACK_STATE_TTL_SECONDS: 5,
    MAX_TRACKS_PER_UPDATE: 100,
    MAX_EVENTS_PER_UPDATE: 50,
    MAX_FUTURE_TIMESTAMP_SECONDS: 60,
    INGEST_RATE_LIMIT_PER_MINUTE: 180,
  };
  for (const [name, fallback] of Object.entries(numericDefaults)) {
    const value = Number(config[name] ?? fallback);
    if (!Number.isInteger(value) || value < 1) {
      throw new Error(`Invalid environment: ${name} must be a positive integer`);
    }
    config[name] = value;
  }
  return config;
}

export const configuration = () => ({
  port: Number(process.env.VISION_SERVICE_PORT ?? 3335),
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:4200,http://localhost:5173')
    .split(',').map((origin) => origin.trim()).filter(Boolean),
  jsonBodyLimit: process.env.JSON_BODY_LIMIT ?? '256kb',
  cameraApiKeyPepper: process.env.CAMERA_API_KEY_PEPPER,
  cameraOfflineAfterSeconds: Number(process.env.CAMERA_OFFLINE_AFTER_SECONDS ?? 10),
  trackStateTtlSeconds: Number(process.env.TRACK_STATE_TTL_SECONDS ?? 5),
  maxTracksPerUpdate: Number(process.env.MAX_TRACKS_PER_UPDATE ?? 100),
  maxEventsPerUpdate: Number(process.env.MAX_EVENTS_PER_UPDATE ?? 50),
  maxFutureTimestampSeconds: Number(process.env.MAX_FUTURE_TIMESTAMP_SECONDS ?? 60),
  ingestRateLimitPerMinute: Number(process.env.INGEST_RATE_LIMIT_PER_MINUTE ?? 180),
  defaultStoreTimezone: process.env.DEFAULT_STORE_TIMEZONE ?? 'Africa/Cairo',
});
