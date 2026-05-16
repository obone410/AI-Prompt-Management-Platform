import { Redis } from "@upstash/redis";

type RateLimitOptions = {
  key: string;
  limit: number;
  windowSeconds: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  source: "upstash" | "memory";
};

const fallbackBuckets = new Map<string, { count: number; resetAt: number }>();

let redis: Redis | null = null;

function getRedisClient() {
  if (redis) {
    return redis;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  redis = new Redis({ url, token });
  return redis;
}

function memoryLimit({ key, limit, windowSeconds }: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const existing = fallbackBuckets.get(key);
  const resetAt = now + windowSeconds * 1000;

  if (!existing || existing.resetAt < now) {
    fallbackBuckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt, source: "memory" };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt, source: "memory" };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
    source: "memory",
  };
}

export async function checkRateLimit(options: RateLimitOptions) {
  const client = getRedisClient();

  if (!client) {
    return memoryLimit(options);
  }

  const bucket = `promptdeck:rate:${options.key}`;
  const count = await client.incr(bucket);

  if (count === 1) {
    await client.expire(bucket, options.windowSeconds);
  }

  const ttl = await client.ttl(bucket);
  const resetAt = Date.now() + Math.max(ttl, 0) * 1000;

  return {
    allowed: count <= options.limit,
    remaining: Math.max(0, options.limit - count),
    resetAt,
    source: "upstash",
  } satisfies RateLimitResult;
}
