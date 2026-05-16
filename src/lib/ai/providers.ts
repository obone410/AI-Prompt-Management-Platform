import OpenAI from "openai";
import { serverConfig } from "@/lib/server-config";

export type AIProvider = "openai" | "anthropic" | "google";

export type AIModelOption = {
  id: string;
  label: string;
  provider: AIProvider;
  family: "GPT" | "Claude" | "Gemini";
  status: "live" | "adapter";
};

export type EvaluationRequest = {
  prompt: string;
  input: string;
  model: string;
  demoMode: boolean;
};

export type EvaluationResult = {
  id: string;
  model: string;
  provider: AIProvider | "demo";
  output: string;
  latencyMs: number;
  tokenEstimate: number;
  outputLength: number;
  qualityScore: number;
  notes: string[];
};

export type PromptOptimizationResult = {
  improvedPrompt: string;
  summary: string;
  suggestions: string[];
  variables: string[];
  riskFlags: string[];
  qualityScore: number;
};

export const modelCatalog: AIModelOption[] = [
  {
    id: "gpt-5",
    label: "GPT-5",
    provider: "openai",
    family: "GPT",
    status: "live",
  },
  {
    id: "gpt-4.1",
    label: "GPT-4.1",
    provider: "openai",
    family: "GPT",
    status: "live",
  },
  {
    id: "claude-sonnet-4.5",
    label: "Claude Sonnet 4.5",
    provider: "anthropic",
    family: "Claude",
    status: "adapter",
  },
  {
    id: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    provider: "google",
    family: "Gemini",
    status: "adapter",
  },
];

function supportsTemperature(model: string) {
  return !/^(gpt-5|o\d|o[134]|gpt-oss)/i.test(model);
}

export function estimateTokens(text: string) {
  return Math.max(1, Math.ceil(text.length / 4));
}

function scoreOutput(output: string, prompt: string) {
  const hasStructure = /(^|\n)(#+|\d+\.|-|\*)\s/.test(output);
  const hasSpecifics = output.length > 240;
  const avoidsHedge =
    !/\b(maybe|probably|it depends|as an ai language model)\b/i.test(output);
  const promptHasVariables = /\{\{[a-zA-Z][a-zA-Z0-9_-]*\}\}/.test(prompt);

  return Math.min(
    98,
    58 +
      (hasStructure ? 12 : 0) +
      (hasSpecifics ? 14 : 0) +
      (avoidsHedge ? 8 : 0) +
      (promptHasVariables ? 6 : 0),
  );
}

function demoEvaluation({ prompt, input, model }: EvaluationRequest) {
  const option = modelCatalog.find((item) => item.id === model);
  const provider = option?.provider ?? "openai";
  const output = [
    `${option?.label ?? model} evaluation draft`,
    "",
    `Task interpreted from the prompt: ${prompt.split(/\s+/).slice(0, 32).join(" ")}`,
    "",
    `Input signal: ${input || "No runtime input supplied."}`,
    "",
    "Recommended response shape:",
    "- Restate the objective clearly.",
    "- Apply the prompt constraints in order.",
    "- Return a concise, reusable output with measurable next steps.",
  ].join("\n");

  return {
    id: crypto.randomUUID(),
    model,
    provider,
    output,
    latencyMs: 120 + model.length * 17,
    tokenEstimate: estimateTokens(prompt + input + output),
    outputLength: output.length,
    qualityScore: scoreOutput(output, prompt),
    notes:
      provider === "openai"
        ? ["Demo mode used; no provider spend."]
        : [`${option?.family ?? "Provider"} adapter is ready for server-only credentials.`],
  } satisfies EvaluationResult;
}

export async function runModelEvaluation(request: EvaluationRequest) {
  const option = modelCatalog.find((item) => item.id === request.model);

  if (request.demoMode || option?.provider !== "openai" || !serverConfig.isOpenAiConfigured) {
    return demoEvaluation(request);
  }

  const startedAt = performance.now();
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: request.model,
    instructions:
      "You are evaluating a saved prompt inside a PromptOps platform. Follow the prompt exactly and produce only the requested output.",
    input: `${request.prompt}\n\nRuntime input:\n${request.input}`,
    max_output_tokens: 900,
    store: false,
    ...(supportsTemperature(request.model) ? { temperature: 0.35 } : {}),
  });
  const output = response.output_text;

  return {
    id: crypto.randomUUID(),
    model: request.model,
    provider: "openai",
    output,
    latencyMs: Math.round(performance.now() - startedAt),
    tokenEstimate: estimateTokens(request.prompt + request.input + output),
    outputLength: output.length,
    qualityScore: scoreOutput(output, request.prompt),
    notes: ["Live OpenAI response captured server-side."],
  } satisfies EvaluationResult;
}

function parseOptimizationJson(text: string): PromptOptimizationResult | null {
  try {
    const parsed = JSON.parse(text) as PromptOptimizationResult;
    if (parsed.improvedPrompt && Array.isArray(parsed.suggestions)) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

function demoOptimization(prompt: string): PromptOptimizationResult {
  const hasRole = /\byou are\b/i.test(prompt);
  const hasVariables = /\{\{[a-zA-Z][a-zA-Z0-9_-]*\}\}/.test(prompt);
  const hasOutputFormat = /return|format|include|sections?|json|markdown/i.test(prompt);
  const riskFlags = [];

  if (!hasRole) {
    riskFlags.push("No explicit role or operating context.");
  }

  if (!hasOutputFormat) {
    riskFlags.push("Output format is underspecified, which can create inconsistent results.");
  }

  if (!/evidence|assumptions|constraints|source/i.test(prompt)) {
    riskFlags.push("Prompt may invite hallucination because evidence boundaries are unclear.");
  }

  const improvedPrompt = [
    hasRole ? prompt.trim() : `You are a precise AI workflow assistant.\n\n${prompt.trim()}`,
    "",
    "Context:",
    "{{context}}",
    "",
    "Instructions:",
    "1. Clarify the user's objective before answering.",
    "2. Separate facts, assumptions, and recommendations.",
    "3. Use concise Markdown sections.",
    "4. Flag missing information instead of inventing details.",
    "",
    "Output format:",
    "- Summary",
    "- Key reasoning",
    "- Recommended next actions",
  ].join("\n");

  return {
    improvedPrompt,
    summary: "Added operating context, evidence boundaries, reusable variables, and a repeatable output contract.",
    suggestions: [
      "Define the assistant role at the top of the prompt.",
      "Add a clear output format to reduce variance.",
      "Use variables for runtime context instead of hard-coded project details.",
      "Ask the model to flag missing information to reduce hallucinations.",
    ],
    variables: hasVariables ? ["context", "format"] : ["input", "context", "audience", "format"],
    riskFlags,
    qualityScore: Math.min(96, 62 + (hasRole ? 10 : 0) + (hasVariables ? 10 : 0) + (hasOutputFormat ? 12 : 0)),
  };
}

export async function optimizePrompt(prompt: string, demoMode: boolean) {
  if (demoMode || !serverConfig.isOpenAiConfigured) {
    return demoOptimization(prompt);
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: serverConfig.openAiModel,
    instructions:
      "Improve a prompt for production PromptOps. Return strict JSON with keys: improvedPrompt, summary, suggestions, variables, riskFlags, qualityScore.",
    input: prompt,
    max_output_tokens: 1200,
    store: false,
  });

  return parseOptimizationJson(response.output_text) ?? demoOptimization(prompt);
}
