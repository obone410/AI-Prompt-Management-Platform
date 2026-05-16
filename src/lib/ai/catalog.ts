export type AIProvider = "openai" | "anthropic" | "google";

export type AIModelOption = {
  id: string;
  label: string;
  provider: AIProvider;
  family: "GPT" | "Claude" | "Gemini";
  status: "live" | "adapter";
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
