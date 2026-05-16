import OpenAI from "openai";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { hasSupabaseSession, requiresLiveProviderSession } from "@/lib/api-auth";
import { apiError } from "@/lib/api-errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { serverConfig } from "@/lib/server-config";

export const runtime = "nodejs";

const PromptTestSchema = z.object({
  prompt: z.string().min(10).max(8000),
  input: z.string().max(4000).optional().default(""),
  model: z.string().min(2).max(80).optional(),
  temperature: z.number().min(0).max(1.5).optional(),
  demoMode: z.boolean().optional().default(false),
});

function demoResponse(prompt: string, input: string) {
  const promptFocus = prompt
    .replace(/\{\{input\}\}/g, input || "the provided input")
    .split(/\s+/)
    .slice(0, 34)
    .join(" ");

  return `Demo response: I would execute the saved prompt by focusing on "${promptFocus}". With live OpenAI credentials configured, this panel returns the real model output, latency, and provider metadata.`;
}

function supportsTemperature(model: string) {
  return !/^(gpt-5|o\d|o[134]|gpt-oss)/i.test(model);
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "local";

  const rate = await checkRateLimit({
    key: `test:${ip}`,
    limit: 12,
    windowSeconds: 60,
  });

  if (!rate.allowed) {
    return apiError("Too many test requests. Please wait a minute and try again.", 429);
  }

  const startedAt = performance.now();
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON prompt test payload." },
      { status: 400 },
    );
  }

  const parsed = PromptTestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid prompt test payload.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { prompt, input, temperature, demoMode } = parsed.data;
  const model = parsed.data.model ?? serverConfig.openAiModel;

  if (demoMode) {
    return NextResponse.json({
      output: demoResponse(prompt, input),
      model,
      provider: "demo",
      latencyMs: Math.round(performance.now() - startedAt),
    });
  }

  if (
    (await requiresLiveProviderSession(demoMode)) &&
    !(await hasSupabaseSession())
  ) {
    return NextResponse.json(
      { error: "Sign in to run live AI prompt tests." },
      { status: 401 },
    );
  }

  if (!serverConfig.isOpenAiConfigured) {
    return NextResponse.json({
      output: demoResponse(prompt, input),
      model,
      provider: "demo",
      latencyMs: Math.round(performance.now() - startedAt),
    });
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const request = {
      model,
      instructions:
        "You are testing a saved prompt in a PromptOps platform. Follow the saved prompt exactly and return the result only.",
      input: prompt.replace(/\{\{input\}\}/g, input || ""),
      max_output_tokens: 900,
      store: false,
      ...(supportsTemperature(model) ? { temperature: temperature ?? 0.4 } : {}),
    };

    const response = await client.responses.create({
      ...request,
    });

    return NextResponse.json({
      output: response.output_text,
      model,
      provider: "openai",
      latencyMs: Math.round(performance.now() - startedAt),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "The AI provider returned an unexpected error.";

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
