import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { hasSupabaseSession, requiresLiveProviderSession } from "@/lib/api-auth";
import { apiError, normalizeApiError } from "@/lib/api-errors";
import { modelCatalog } from "@/lib/ai/catalog";
import { enqueueEvaluationJob } from "@/lib/background-jobs";
import { captureServerError, captureServerEvent } from "@/lib/observability";
import { checkRateLimit } from "@/lib/rate-limit";
import { captureTelemetrySpan } from "@/lib/telemetry";

export const runtime = "nodejs";

const EvaluationSchema = z.object({
  prompt: z.string().min(10).max(12000),
  input: z.string().max(6000).optional().default(""),
  models: z
    .array(z.string())
    .min(1)
    .max(4)
    .refine(
      (models) => models.every((model) => modelCatalog.some((item) => item.id === model)),
      "One or more requested models are not supported.",
    ),
  demoMode: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "local";

  const rate = await checkRateLimit({
    key: `evaluate:${ip}`,
    limit: 8,
    windowSeconds: 60,
  });

  if (!rate.allowed) {
    return apiError("Too many evaluation requests. Please wait a minute.", 429);
  }

  try {
    const parsed = EvaluationSchema.parse(await request.json());

    if ((await requiresLiveProviderSession(parsed.demoMode)) && !(await hasSupabaseSession())) {
      return apiError("Sign in to run live model evaluations.", 401);
    }

    const jobs = await Promise.all(
      parsed.models.map((model) =>
        enqueueEvaluationJob({
          prompt: parsed.prompt,
          input: parsed.input,
          model,
          demoMode: parsed.demoMode,
        }),
      ),
    );

    captureServerEvent("prompt_evaluation_completed", {
      modelCount: parsed.models.length,
      rateLimitSource: rate.source,
    });
    captureTelemetrySpan("llmops.evaluation.completed", {
      modelCount: parsed.models.length,
      rateLimitSource: rate.source,
      jobMode: "inline",
    });

    return NextResponse.json({
      evaluations: jobs.map((job) => job.result),
      jobMode: "inline",
    });
  } catch (error) {
    captureServerError(error, { route: "/api/evaluate-prompt" });
    const normalized = normalizeApiError(error);
    return apiError(normalized.message, normalized.status, normalized.details);
  }
}
