import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { hasSupabaseSession, requiresLiveProviderSession } from "@/lib/api-auth";
import { apiError, normalizeApiError } from "@/lib/api-errors";
import { optimizePrompt } from "@/lib/ai/providers";
import { captureServerError, captureServerEvent } from "@/lib/observability";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const OptimizeSchema = z.object({
  prompt: z.string().min(10).max(12000),
  demoMode: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "local";

  const rate = await checkRateLimit({
    key: `optimize:${ip}`,
    limit: 10,
    windowSeconds: 60,
  });

  if (!rate.allowed) {
    return apiError("Too many optimization requests. Please wait a minute.", 429);
  }

  try {
    const parsed = OptimizeSchema.parse(await request.json());

    if ((await requiresLiveProviderSession(parsed.demoMode)) && !(await hasSupabaseSession())) {
      return apiError("Sign in to run live prompt optimization.", 401);
    }

    const result = await optimizePrompt(parsed.prompt, parsed.demoMode);

    captureServerEvent("prompt_optimization_completed", {
      qualityScore: result.qualityScore,
      rateLimitSource: rate.source,
    });

    return NextResponse.json(result);
  } catch (error) {
    captureServerError(error, { route: "/api/optimize-prompt" });
    const normalized = normalizeApiError(error);
    return apiError(normalized.message, normalized.status, normalized.details);
  }
}
