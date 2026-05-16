import OpenAI from "openai";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { serverConfig } from "@/lib/server-config";

export const runtime = "nodejs";

const PromptTestSchema = z.object({
  prompt: z.string().min(10).max(8000),
  input: z.string().max(4000).optional().default(""),
  model: z.string().min(2).max(80).optional(),
  temperature: z.number().min(0).max(1.5).optional(),
});

const buckets = new Map<string, { count: number; resetAt: number }>();

function allowRequest(key: string) {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (existing.count >= 12) {
    return false;
  }

  existing.count += 1;
  return true;
}

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

  if (!allowRequest(ip)) {
    return NextResponse.json(
      { error: "Too many test requests. Please wait a minute and try again." },
      { status: 429 },
    );
  }

  const startedAt = performance.now();
  const parsed = PromptTestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid prompt test payload.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { prompt, input, temperature } = parsed.data;
  const model = parsed.data.model ?? serverConfig.openAiModel;

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
        "You are testing a saved prompt in a prompt management platform. Follow the saved prompt exactly and return the result only.",
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
