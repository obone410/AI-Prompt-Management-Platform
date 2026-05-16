export type PromptCategory = {
  id: string;
  name: string;
  color: string;
  description: string;
  createdAt: string;
};

export type ManagedPrompt = {
  id: string;
  title: string;
  description: string;
  content: string;
  categoryId: string;
  tags: string[];
  model: string;
  temperature: number;
  isFavorite: boolean;
  isPublic: boolean;
  shareSlug: string | null;
  usageCount: number;
  lastTestedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PromptRun = {
  id: string;
  promptId: string;
  input: string;
  output: string;
  model: string;
  provider: "openai" | "demo";
  latencyMs: number;
  createdAt: string;
};

export type PromptVersion = {
  id: string;
  promptId: string;
  versionNumber: number;
  title: string;
  description: string;
  content: string;
  tags: string[];
  model: string;
  temperature: number;
  notes: string;
  createdAt: string;
};

export type PromptEvaluation = {
  id: string;
  promptId: string;
  model: string;
  provider: "openai" | "anthropic" | "google" | "demo";
  input: string;
  output: string;
  latencyMs: number;
  inputTokenEstimate: number;
  outputTokenEstimate: number;
  tokenEstimate: number;
  estimatedCostUsd: number;
  outputLength: number;
  qualityScore: number;
  createdAt: string;
};

export type PromptExperimentVariant = {
  id: string;
  label: string;
  promptId: string | null;
  content: string;
  model: string;
  temperature: number;
  notes: string;
};

export type PromptExperimentResult = {
  id: string;
  variantId: string;
  variantLabel: string;
  model: string;
  provider: "openai" | "anthropic" | "google" | "demo";
  output: string;
  latencyMs: number;
  inputTokenEstimate: number;
  outputTokenEstimate: number;
  tokenEstimate: number;
  estimatedCostUsd: number;
  outputLength: number;
  qualityScore: number;
  hallucinationRisk: number;
  createdAt: string;
};

export type PromptExperiment = {
  id: string;
  workspaceId: string;
  promptId: string | null;
  title: string;
  hypothesis: string;
  status: "draft" | "running" | "completed" | "archived";
  variants: PromptExperimentVariant[];
  results: PromptExperimentResult[];
  createdAt: string;
  updatedAt: string;
};

export type ExperimentWorkflow = {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  promptIds: string[];
  models: string[];
  datasets: string[];
  metrics: string[];
  createdBy: string;
  status: "draft" | "running" | "completed" | "archived";
  createdAt: string;
};

export type ExperimentRun = {
  id: string;
  experimentId: string;
  promptId: string;
  model: string;
  dataset: string;
  clarity: number;
  correctness: number;
  hallucinationLikelihood: number;
  consistency: number;
  toneAlignment: number;
  formattingQuality: number;
  latencyMs: number;
  tokenEstimate: number;
  estimatedCostUsd: number;
  createdAt: string;
};

export type DeploymentEnvironment = "development" | "staging" | "production";

export type PromptDeployment = {
  id: string;
  promptId: string;
  versionId: string;
  environment: DeploymentEnvironment;
  status: "active" | "promoting" | "rolled_back";
  deployedBy: string;
  metadata: string;
  createdAt: string;
};

export type DeploymentHistory = {
  id: string;
  deploymentId: string;
  action: "deployed" | "promoted" | "rolled_back";
  summary: string;
  createdAt: string;
};

export type WorkflowNodeKind =
  | "prompt"
  | "variable"
  | "condition"
  | "loop"
  | "parallel"
  | "retry"
  | "output";

export type AIWorkflowNode = {
  id: string;
  kind: WorkflowNodeKind;
  label: string;
  promptId: string | null;
  x: number;
  y: number;
  config: string;
};

export type AIWorkflowEdge = {
  id: string;
  from: string;
  to: string;
  label: string;
};

export type AIWorkflow = {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  variables: string[];
  nodes: AIWorkflowNode[];
  edges: AIWorkflowEdge[];
  status: "draft" | "active" | "paused";
  createdAt: string;
  updatedAt: string;
};

export type WorkflowRun = {
  id: string;
  workflowId: string;
  status: "queued" | "running" | "completed" | "failed";
  latencyMs: number;
  tokenEstimate: number;
  estimatedCostUsd: number;
  logs: string[];
  createdAt: string;
};

export type EvaluationDataset = {
  id: string;
  name: string;
  description: string;
  examples: { input: string; expected: string }[];
  createdAt: string;
};

export type EvaluationPreset = {
  id: string;
  name: string;
  metrics: string[];
  rubric: string;
  createdAt: string;
};

export type Organization = {
  id: string;
  name: string;
  plan: string;
  createdAt: string;
};

export type AuditLog = {
  id: string;
  actor: string;
  action: string;
  target: string;
  createdAt: string;
};

export type AIRunKind =
  | "prompt"
  | "evaluation"
  | "experiment"
  | "workflow"
  | "deployment"
  | "agent"
  | "benchmark";

export type AIRunStatus = "queued" | "running" | "completed" | "failed";

export type AIRun = {
  id: string;
  workspaceId: string;
  entityType: AIRunKind;
  entityId: string;
  traceId: string;
  status: AIRunStatus;
  model: string;
  provider: "openai" | "anthropic" | "google" | "demo" | "system";
  latencyMs: number;
  inputTokenEstimate: number;
  outputTokenEstimate: number;
  estimatedCostUsd: number;
  qualityScore: number;
  startedAt: string;
  completedAt: string | null;
  parentRunId: string | null;
};

export type AIArtifact = {
  id: string;
  runId: string;
  workspaceId: string;
  kind: "prompt_output" | "workflow_output" | "agent_memory" | "benchmark_report" | "release_note";
  title: string;
  content: string;
  version: number;
  createdAt: string;
};

export type AIMetric = {
  id: string;
  runId: string;
  workspaceId: string;
  scope: AIRunKind | "system";
  name: string;
  value: number;
  unit: "score" | "ms" | "tokens" | "usd" | "percent" | "count";
  createdAt: string;
};

export type AgentType =
  | "research"
  | "support"
  | "coding"
  | "data-extraction"
  | "evaluation";

export type Agent = {
  id: string;
  workspaceId: string;
  name: string;
  type: AgentType;
  description: string;
  tools: string[];
  memoryKeys: string[];
  status: "draft" | "active" | "paused";
  createdAt: string;
  updatedAt: string;
};

export type AgentRunStep = {
  id: string;
  label: string;
  kind: "reasoning" | "tool_call" | "memory_read" | "branch" | "final";
  status: AIRunStatus;
  detail: string;
  latencyMs: number;
  tokenEstimate: number;
};

export type AgentRun = {
  id: string;
  agentId: string;
  traceId: string;
  objective: string;
  status: AIRunStatus;
  steps: AgentRunStep[];
  latencyMs: number;
  tokenEstimate: number;
  estimatedCostUsd: number;
  createdAt: string;
};

export type AgentMemory = {
  id: string;
  agentId: string;
  key: string;
  value: string;
  updatedAt: string;
};

export type AgentTool = {
  id: string;
  agentId: string;
  name: string;
  kind: "search" | "database" | "code" | "ticketing" | "http" | "evaluation";
  description: string;
  status: "mock" | "connected";
};

export type BenchmarkSuite = {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  promptIds: string[];
  modelIds: string[];
  datasetIds: string[];
  metrics: string[];
  status: "draft" | "running" | "completed" | "archived";
  createdAt: string;
};

export type BenchmarkDataset = {
  id: string;
  name: string;
  taskType: string;
  examples: { input: string; expected: string; difficulty: "easy" | "medium" | "hard" }[];
  createdAt: string;
};

export type BenchmarkRun = {
  id: string;
  suiteId: string;
  promptId: string;
  model: string;
  datasetId: string;
  status: AIRunStatus;
  accuracy: number;
  hallucinationRate: number;
  latencyMs: number;
  estimatedCostUsd: number;
  consistencyScore: number;
  regressionDelta: number;
  createdAt: string;
};

export type BenchmarkScore = {
  id: string;
  runId: string;
  metric: string;
  value: number;
  createdAt: string;
};

export type TraceSession = {
  id: string;
  rootRunId: string;
  workspaceId: string;
  entityType: AIRunKind;
  entityId: string;
  name: string;
  status: AIRunStatus;
  startedAt: string;
  endedAt: string | null;
  totalLatencyMs: number;
  totalCostUsd: number;
};

export type TraceStep = {
  id: string;
  traceId: string;
  parentStepId: string | null;
  label: string;
  kind: "prompt" | "model" | "tool" | "condition" | "loop" | "parallel" | "artifact" | "release";
  status: AIRunStatus;
  latencyMs: number;
  tokenEstimate: number;
  estimatedCostUsd: number;
  startedAt: string;
  endedAt: string | null;
  depth: number;
};

export type TraceLog = {
  id: string;
  traceId: string;
  stepId: string | null;
  level: "info" | "warning" | "error";
  message: string;
  createdAt: string;
};

export type PromptIntelligence = {
  id: string;
  promptId: string;
  healthScore: number;
  clarity: number;
  robustness: number;
  hallucinationRisk: number;
  duplicateRisk: number;
  cluster: string;
  suggestions: string[];
  modelRecommendation: string;
  updatedAt: string;
};

export type PromptRelease = {
  id: string;
  deploymentId: string;
  versionId: string;
  tag: string;
  environment: DeploymentEnvironment;
  status: "healthy" | "watching" | "degraded" | "rolled_back";
  rolloutPercent: number;
  healthScore: number;
  notes: string;
  createdAt: string;
};

export type PromptActivity = {
  id: string;
  promptId: string | null;
  eventType: string;
  summary: string;
  createdAt: string;
};

export type PromptOpsWorkspace = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  createdAt: string;
};

export type SharedCollection = {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  promptIds: string[];
  visibility: "private" | "workspace" | "public";
  createdAt: string;
};

export type WorkspaceMember = {
  id: string;
  workspaceId: string;
  email: string;
  role: "owner" | "admin" | "editor" | "viewer";
  status: "active" | "invited";
};

export type PromptWorkspace = {
  categories: PromptCategory[];
  prompts: ManagedPrompt[];
  runs: PromptRun[];
  versions: PromptVersion[];
  evaluations: PromptEvaluation[];
  experiments: PromptExperiment[];
  experimentWorkflows: ExperimentWorkflow[];
  experimentRuns: ExperimentRun[];
  deployments: PromptDeployment[];
  deploymentHistory: DeploymentHistory[];
  aiWorkflows: AIWorkflow[];
  workflowRuns: WorkflowRun[];
  evaluationDatasets: EvaluationDataset[];
  evaluationPresets: EvaluationPreset[];
  organizations: Organization[];
  auditLogs: AuditLog[];
  aiRuns: AIRun[];
  aiArtifacts: AIArtifact[];
  aiMetrics: AIMetric[];
  agents: Agent[];
  agentRuns: AgentRun[];
  agentMemory: AgentMemory[];
  agentTools: AgentTool[];
  benchmarkSuites: BenchmarkSuite[];
  benchmarkDatasets: BenchmarkDataset[];
  benchmarkRuns: BenchmarkRun[];
  benchmarkScores: BenchmarkScore[];
  traceSessions: TraceSession[];
  traceSteps: TraceStep[];
  traceLogs: TraceLog[];
  promptIntelligence: PromptIntelligence[];
  promptReleases: PromptRelease[];
  activities: PromptActivity[];
  workspaces: PromptOpsWorkspace[];
  collections: SharedCollection[];
  members: WorkspaceMember[];
};

export const promptWorkspaceStorageKey = "promptdeck-ai:workspace:v1";

const now = "2026-05-15T08:00:00.000Z";

export const seedWorkspace: PromptWorkspace = {
  workspaces: [
    {
      id: "workspace-promptops",
      name: "PromptOps Lab",
      slug: "promptops-lab",
      plan: "Scale",
      createdAt: now,
    },
  ],
  members: [
    {
      id: "member-owner",
      workspaceId: "workspace-promptops",
      email: "demo@promptdeck.ai",
      role: "owner",
      status: "active",
    },
    {
      id: "member-reviewer",
      workspaceId: "workspace-promptops",
      email: "reviewer@promptdeck.ai",
      role: "viewer",
      status: "invited",
    },
  ],
  collections: [
    {
      id: "collection-recruiter",
      workspaceId: "workspace-promptops",
      name: "Recruiter Demo Pack",
      description: "Public-ready prompts that show PromptOps maturity.",
      promptIds: ["prompt-prd", "prompt-review"],
      visibility: "workspace",
      createdAt: now,
    },
  ],
  categories: [
    {
      id: "cat-product",
      name: "Product",
      color: "#0f766e",
      description: "Prompts for specs, launch notes, user stories, and roadmaps.",
      createdAt: now,
    },
    {
      id: "cat-recruiting",
      name: "Recruiting",
      color: "#b45309",
      description: "Prompts that sharpen hiring stories, resumes, and interviews.",
      createdAt: now,
    },
    {
      id: "cat-engineering",
      name: "Engineering",
      color: "#2563eb",
      description: "Prompts for code review, debugging, and architecture planning.",
      createdAt: now,
    },
    {
      id: "cat-research",
      name: "Research",
      color: "#be123c",
      description: "Prompts for synthesis, market scans, and decision briefs.",
      createdAt: now,
    },
  ],
  prompts: [
    {
      id: "prompt-prd",
      title: "Turn Notes Into a Product Brief",
      description: "Transforms raw discovery notes into a concise PRD outline.",
      content:
        "You are a senior product manager. Convert the raw notes into a crisp product brief with: user problem, target persona, success metrics, scope, risks, and open questions. Keep each section specific and decision-oriented.\n\nRaw notes:\n{{input}}",
      categoryId: "cat-product",
      tags: ["prd", "strategy", "workflow"],
      model: "gpt-5",
      temperature: 0.3,
      isFavorite: true,
      isPublic: true,
      shareSlug: "product-brief",
      usageCount: 18,
      lastTestedAt: "2026-05-14T15:24:00.000Z",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "prompt-interview",
      title: "Recruiter Screen Story Builder",
      description: "Shapes project experience into metrics-backed interview stories.",
      content:
        "Act as a technical recruiter. Convert this project into a STAR interview story. Emphasize ownership, tradeoffs, measurable impact, and the technologies used. End with 3 likely follow-up questions.\n\nProject:\n{{input}}",
      categoryId: "cat-recruiting",
      tags: ["career", "interview", "storytelling"],
      model: "gpt-5",
      temperature: 0.45,
      isFavorite: false,
      isPublic: false,
      shareSlug: null,
      usageCount: 9,
      lastTestedAt: "2026-05-13T11:10:00.000Z",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "prompt-review",
      title: "High Signal Code Review",
      description: "Finds bugs, missing tests, and risky assumptions in a diff.",
      content:
        "You are reviewing a pull request. Lead with concrete findings ordered by severity. Focus on correctness, security, data loss, performance, and missing tests. Avoid style commentary unless it hides a bug.\n\nDiff or summary:\n{{input}}",
      categoryId: "cat-engineering",
      tags: ["code-review", "quality", "security"],
      model: "gpt-5",
      temperature: 0.2,
      isFavorite: true,
      isPublic: true,
      shareSlug: "code-review",
      usageCount: 27,
      lastTestedAt: "2026-05-15T07:38:00.000Z",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "prompt-market",
      title: "Competitor Signal Scan",
      description: "Summarizes competitive signals into a decision memo.",
      content:
        "Analyze the notes as market research. Return: category trends, competitor moves, customer pain signals, potential positioning, and recommended next experiments. Separate evidence from inference.\n\nNotes:\n{{input}}",
      categoryId: "cat-research",
      tags: ["research", "market", "positioning"],
      model: "gpt-5",
      temperature: 0.35,
      isFavorite: false,
      isPublic: false,
      shareSlug: null,
      usageCount: 12,
      lastTestedAt: null,
      createdAt: now,
      updatedAt: now,
    },
  ],
  runs: [],
  versions: [
    {
      id: "version-prd-1",
      promptId: "prompt-prd",
      versionNumber: 1,
      title: "Turn Notes Into a Product Brief",
      description: "Transforms raw discovery notes into a concise PRD outline.",
      content:
        "Convert the raw notes into a product brief with problem, persona, metrics, scope, risks, and questions.\n\nRaw notes:\n{{input}}",
      tags: ["prd", "strategy"],
      model: "gpt-5",
      temperature: 0.35,
      notes: "Initial reusable PRD workflow.",
      createdAt: "2026-05-13T09:00:00.000Z",
    },
  ],
  evaluations: [
    {
      id: "eval-prd-gpt",
      promptId: "prompt-prd",
      model: "gpt-5",
      provider: "demo",
      input: "Founder notes about organizing reusable prompts.",
      output: "Demo evaluation output for the product brief workflow.",
      latencyMs: 420,
      inputTokenEstimate: 128,
      outputTokenEstimate: 50,
      tokenEstimate: 178,
      estimatedCostUsd: 0.00066,
      outputLength: 58,
      qualityScore: 86,
      createdAt: "2026-05-15T09:30:00.000Z",
    },
  ],
  experiments: [
    {
      id: "experiment-prd-optimization",
      workspaceId: "workspace-promptops",
      promptId: "prompt-prd",
      title: "PRD Generator Optimization",
      hypothesis:
        "A structured PM prompt with evidence boundaries will improve output completeness without materially increasing latency.",
      status: "completed",
      variants: [
        {
          id: "variant-prd-a",
          label: "Version A",
          promptId: "prompt-prd",
          content:
            "Convert raw notes into a concise product brief with problem, persona, metrics, scope, risks, and open questions.\n\nRaw notes:\n{{input}}",
          model: "gpt-5",
          temperature: 0.3,
          notes: "Short baseline prompt.",
        },
        {
          id: "variant-prd-b",
          label: "Version B",
          promptId: "prompt-prd",
          content:
            "You are a senior product manager. Convert raw discovery notes into a decision-ready PRD. Separate facts, assumptions, risks, and open questions. Include success metrics, launch scope, non-goals, and recommended next experiments.\n\nRaw notes:\n{{input}}",
          model: "gpt-5",
          temperature: 0.25,
          notes: "Structured PromptOps variant with risk boundaries.",
        },
      ],
      results: [
        {
          id: "result-prd-a-gpt",
          variantId: "variant-prd-a",
          variantLabel: "Version A",
          model: "gpt-5",
          provider: "demo",
          output: "Concise PRD draft with problem, persona, metrics, scope, risks, and questions.",
          latencyMs: 410,
          inputTokenEstimate: 122,
          outputTokenEstimate: 64,
          tokenEstimate: 186,
          estimatedCostUsd: 0.000793,
          outputLength: 79,
          qualityScore: 82,
          hallucinationRisk: 28,
          createdAt: "2026-05-15T09:40:00.000Z",
        },
        {
          id: "result-prd-b-gpt",
          variantId: "variant-prd-b",
          variantLabel: "Version B",
          model: "gpt-5",
          provider: "demo",
          output: "Decision-ready PRD with evidence boundaries, assumptions, non-goals, risks, metrics, and next experiments.",
          latencyMs: 445,
          inputTokenEstimate: 156,
          outputTokenEstimate: 92,
          tokenEstimate: 248,
          estimatedCostUsd: 0.001115,
          outputLength: 104,
          qualityScore: 91,
          hallucinationRisk: 14,
          createdAt: "2026-05-15T09:41:00.000Z",
        },
      ],
      createdAt: "2026-05-15T09:35:00.000Z",
      updatedAt: "2026-05-15T09:41:00.000Z",
    },
  ],
  experimentWorkflows: [
    {
      id: "experiment-workflow-prd",
      workspaceId: "workspace-promptops",
      name: "PRD Generator Benchmark",
      description:
        "Compares prompt versions and model adapters against a reusable product-discovery dataset.",
      promptIds: ["prompt-prd"],
      models: ["gpt-5", "claude-sonnet-4.5", "gemini-2.5-pro"],
      datasets: ["Product discovery notes", "Ambiguous founder request"],
      metrics: ["clarity", "correctness", "hallucination likelihood", "latency", "cost"],
      createdBy: "demo@promptdeck.ai",
      status: "completed",
      createdAt: "2026-05-15T09:32:00.000Z",
    },
  ],
  experimentRuns: [
    {
      id: "experiment-run-prd-gpt",
      experimentId: "experiment-workflow-prd",
      promptId: "prompt-prd",
      model: "gpt-5",
      dataset: "Product discovery notes",
      clarity: 94,
      correctness: 89,
      hallucinationLikelihood: 12,
      consistency: 91,
      toneAlignment: 88,
      formattingQuality: 96,
      latencyMs: 445,
      tokenEstimate: 248,
      estimatedCostUsd: 0.001115,
      createdAt: "2026-05-15T09:41:00.000Z",
    },
    {
      id: "experiment-run-prd-claude",
      experimentId: "experiment-workflow-prd",
      promptId: "prompt-prd",
      model: "claude-sonnet-4.5",
      dataset: "Product discovery notes",
      clarity: 91,
      correctness: 87,
      hallucinationLikelihood: 16,
      consistency: 88,
      toneAlignment: 93,
      formattingQuality: 90,
      latencyMs: 512,
      tokenEstimate: 261,
      estimatedCostUsd: 0.002172,
      createdAt: "2026-05-15T09:42:00.000Z",
    },
  ],
  deployments: [
    {
      id: "deployment-prd-prod",
      promptId: "prompt-prd",
      versionId: "version-prd-1",
      environment: "production",
      status: "active",
      deployedBy: "demo@promptdeck.ai",
      metadata: "Promoted after PRD benchmark score exceeded 90.",
      createdAt: "2026-05-15T10:00:00.000Z",
    },
    {
      id: "deployment-review-staging",
      promptId: "prompt-review",
      versionId: "version-prd-1",
      environment: "staging",
      status: "active",
      deployedBy: "demo@promptdeck.ai",
      metadata: "Staging validation for code-review workflow.",
      createdAt: "2026-05-15T10:12:00.000Z",
    },
  ],
  deploymentHistory: [
    {
      id: "deployment-history-prd-1",
      deploymentId: "deployment-prd-prod",
      action: "deployed",
      summary: "Deployed PRD prompt to Production after experiment pass.",
      createdAt: "2026-05-15T10:00:00.000Z",
    },
    {
      id: "deployment-history-prd-2",
      deploymentId: "deployment-prd-prod",
      action: "promoted",
      summary: "Promoted from Staging to Production with rollback checkpoint.",
      createdAt: "2026-05-15T10:04:00.000Z",
    },
  ],
  aiWorkflows: [
    {
      id: "workflow-research-brief",
      workspaceId: "workspace-promptops",
      name: "Research Brief Pipeline",
      description:
        "Chains research synthesis, product framing, quality evaluation, and final output packaging.",
      variables: ["topic", "audience", "evidence"],
      nodes: [
        {
          id: "node-variable",
          kind: "variable",
          label: "Input variables",
          promptId: null,
          x: 40,
          y: 70,
          config: "{{topic}}, {{audience}}, {{evidence}}",
        },
        {
          id: "node-research",
          kind: "prompt",
          label: "Research scan",
          promptId: "prompt-market",
          x: 280,
          y: 70,
          config: "Summarize evidence and separate inference.",
        },
        {
          id: "node-condition",
          kind: "condition",
          label: "Confidence gate",
          promptId: null,
          x: 520,
          y: 70,
          config: "Continue when evidence confidence >= 80.",
        },
        {
          id: "node-loop",
          kind: "loop",
          label: "Dataset loop",
          promptId: null,
          x: 640,
          y: 190,
          config: "Batch process evaluation examples with node-level cache.",
        },
        {
          id: "node-parallel",
          kind: "parallel",
          label: "Parallel model check",
          promptId: null,
          x: 760,
          y: 190,
          config: "Run GPT, Claude, and Gemini adapters in parallel.",
        },
        {
          id: "node-retry",
          kind: "retry",
          label: "Fallback retry",
          promptId: null,
          x: 880,
          y: 190,
          config: "Retry once, then fall back to the cheapest passing provider.",
        },
        {
          id: "node-output",
          kind: "output",
          label: "Executive brief",
          promptId: "prompt-prd",
          x: 1000,
          y: 70,
          config: "Return final decision brief.",
        },
      ],
      edges: [
        { id: "edge-1", from: "node-variable", to: "node-research", label: "context" },
        { id: "edge-2", from: "node-research", to: "node-condition", label: "score" },
        { id: "edge-3", from: "node-condition", to: "node-loop", label: "approved" },
        { id: "edge-4", from: "node-loop", to: "node-parallel", label: "batch" },
        { id: "edge-5", from: "node-parallel", to: "node-retry", label: "fallback" },
        { id: "edge-6", from: "node-retry", to: "node-output", label: "release gate" },
      ],
      status: "active",
      createdAt: "2026-05-15T10:18:00.000Z",
      updatedAt: "2026-05-15T10:22:00.000Z",
    },
  ],
  workflowRuns: [
    {
      id: "workflow-run-research-1",
      workflowId: "workflow-research-brief",
      status: "completed",
      latencyMs: 1280,
      tokenEstimate: 824,
      estimatedCostUsd: 0.00492,
      logs: [
        "Loaded runtime variables.",
        "Executed research scan prompt.",
        "Confidence gate passed at 86.",
        "Generated executive brief output.",
      ],
      createdAt: "2026-05-15T10:25:00.000Z",
    },
  ],
  evaluationDatasets: [
    {
      id: "dataset-product-discovery",
      name: "Product Discovery QA",
      description: "Reusable evaluation examples for product and strategy workflows.",
      examples: [
        {
          input: "Founder notes about reusable AI prompts and team workflows.",
          expected: "A structured PRD with scope, risks, metrics, and next experiments.",
        },
        {
          input: "Ambiguous request to improve onboarding conversion.",
          expected: "Clarifying assumptions, measurable success metrics, and experiment plan.",
        },
      ],
      createdAt: "2026-05-15T09:20:00.000Z",
    },
  ],
  evaluationPresets: [
    {
      id: "preset-llmops-quality",
      name: "LLMOps Quality Rubric",
      metrics: [
        "clarity",
        "correctness",
        "hallucination likelihood",
        "consistency",
        "tone alignment",
        "formatting quality",
      ],
      rubric:
        "Score each output from 0-100. Penalize unsupported claims, missing structure, and tone drift.",
      createdAt: "2026-05-15T09:18:00.000Z",
    },
  ],
  organizations: [
    {
      id: "org-promptdeck-demo",
      name: "PromptDeck Demo Org",
      plan: "Enterprise Simulation",
      createdAt: "2026-05-15T08:00:00.000Z",
    },
  ],
  auditLogs: [
    {
      id: "audit-deployment-prd",
      actor: "demo@promptdeck.ai",
      action: "deploy.production",
      target: "Turn Notes Into a Product Brief",
      createdAt: "2026-05-15T10:00:00.000Z",
    },
    {
      id: "audit-workflow-run",
      actor: "demo@promptdeck.ai",
      action: "workflow.run.completed",
      target: "Research Brief Pipeline",
      createdAt: "2026-05-15T10:25:00.000Z",
    },
  ],
  aiRuns: [
    {
      id: "ai-run-prd-eval",
      workspaceId: "workspace-promptops",
      entityType: "evaluation",
      entityId: "eval-prd-gpt",
      traceId: "trace-prd-eval",
      status: "completed",
      model: "gpt-5",
      provider: "demo",
      latencyMs: 420,
      inputTokenEstimate: 128,
      outputTokenEstimate: 50,
      estimatedCostUsd: 0.00066,
      qualityScore: 86,
      startedAt: "2026-05-15T09:30:00.000Z",
      completedAt: "2026-05-15T09:30:00.420Z",
      parentRunId: null,
    },
    {
      id: "ai-run-workflow-research",
      workspaceId: "workspace-promptops",
      entityType: "workflow",
      entityId: "workflow-run-research-1",
      traceId: "trace-workflow-research",
      status: "completed",
      model: "multi-model",
      provider: "demo",
      latencyMs: 1280,
      inputTokenEstimate: 420,
      outputTokenEstimate: 404,
      estimatedCostUsd: 0.00492,
      qualityScore: 90,
      startedAt: "2026-05-15T10:25:00.000Z",
      completedAt: "2026-05-15T10:25:01.280Z",
      parentRunId: null,
    },
    {
      id: "ai-run-agent-research",
      workspaceId: "workspace-promptops",
      entityType: "agent",
      entityId: "agent-run-research-1",
      traceId: "trace-agent-research",
      status: "completed",
      model: "gpt-5",
      provider: "demo",
      latencyMs: 2140,
      inputTokenEstimate: 940,
      outputTokenEstimate: 620,
      estimatedCostUsd: 0.00948,
      qualityScore: 92,
      startedAt: "2026-05-15T11:05:00.000Z",
      completedAt: "2026-05-15T11:05:02.140Z",
      parentRunId: null,
    },
    {
      id: "ai-run-benchmark-prd",
      workspaceId: "workspace-promptops",
      entityType: "benchmark",
      entityId: "benchmark-run-prd-gpt",
      traceId: "trace-benchmark-prd",
      status: "completed",
      model: "gpt-5",
      provider: "demo",
      latencyMs: 445,
      inputTokenEstimate: 156,
      outputTokenEstimate: 92,
      estimatedCostUsd: 0.001115,
      qualityScore: 91,
      startedAt: "2026-05-15T11:20:00.000Z",
      completedAt: "2026-05-15T11:20:00.445Z",
      parentRunId: null,
    },
  ],
  aiArtifacts: [
    {
      id: "artifact-prd-eval-output",
      runId: "ai-run-prd-eval",
      workspaceId: "workspace-promptops",
      kind: "prompt_output",
      title: "Product brief evaluation output",
      content: "Structured PRD output with evidence boundaries and measurable launch scope.",
      version: 1,
      createdAt: "2026-05-15T09:30:00.420Z",
    },
    {
      id: "artifact-workflow-brief",
      runId: "ai-run-workflow-research",
      workspaceId: "workspace-promptops",
      kind: "workflow_output",
      title: "Research brief pipeline artifact",
      content: "Executive decision brief generated after research, confidence gate, and packaging steps.",
      version: 1,
      createdAt: "2026-05-15T10:25:01.280Z",
    },
    {
      id: "artifact-agent-memory",
      runId: "ai-run-agent-research",
      workspaceId: "workspace-promptops",
      kind: "agent_memory",
      title: "Research agent memory update",
      content: "Prefers evidence tables, confidence scores, and contradiction checks for market research tasks.",
      version: 2,
      createdAt: "2026-05-15T11:05:02.140Z",
    },
  ],
  aiMetrics: [
    {
      id: "metric-cost-system",
      runId: "ai-run-workflow-research",
      workspaceId: "workspace-promptops",
      scope: "system",
      name: "estimated spend",
      value: 0.016175,
      unit: "usd",
      createdAt: "2026-05-15T11:30:00.000Z",
    },
    {
      id: "metric-latency-agent",
      runId: "ai-run-agent-research",
      workspaceId: "workspace-promptops",
      scope: "agent",
      name: "agent latency",
      value: 2140,
      unit: "ms",
      createdAt: "2026-05-15T11:05:02.140Z",
    },
    {
      id: "metric-quality-benchmark",
      runId: "ai-run-benchmark-prd",
      workspaceId: "workspace-promptops",
      scope: "benchmark",
      name: "benchmark score",
      value: 91,
      unit: "score",
      createdAt: "2026-05-15T11:20:00.445Z",
    },
  ],
  agents: [
    {
      id: "agent-research",
      workspaceId: "workspace-promptops",
      name: "Research Agent",
      type: "research",
      description:
        "Plans market scans, separates evidence from inference, and writes decision briefs.",
      tools: ["web-scout", "dataset-reader", "rubric-scorer"],
      memoryKeys: ["preferred_citation_style", "risk_language", "decision_template"],
      status: "active",
      createdAt: "2026-05-15T10:50:00.000Z",
      updatedAt: "2026-05-15T11:05:00.000Z",
    },
    {
      id: "agent-support",
      workspaceId: "workspace-promptops",
      name: "Support Agent",
      type: "support",
      description:
        "Classifies tickets, retrieves policy snippets, and drafts customer-safe replies.",
      tools: ["ticket-search", "policy-rag", "sentiment-check"],
      memoryKeys: ["refund_policy", "tone_guardrails"],
      status: "active",
      createdAt: "2026-05-15T10:52:00.000Z",
      updatedAt: "2026-05-15T10:52:00.000Z",
    },
    {
      id: "agent-evaluator",
      workspaceId: "workspace-promptops",
      name: "Evaluation Agent",
      type: "evaluation",
      description:
        "Scores benchmark outputs, detects regressions, and writes evaluation summaries.",
      tools: ["rubric-scorer", "regression-detector", "leaderboard-writer"],
      memoryKeys: ["score_calibration", "risk_thresholds"],
      status: "active",
      createdAt: "2026-05-15T10:54:00.000Z",
      updatedAt: "2026-05-15T10:54:00.000Z",
    },
  ],
  agentRuns: [
    {
      id: "agent-run-research-1",
      agentId: "agent-research",
      traceId: "trace-agent-research",
      objective: "Synthesize competitor signals for a recruiter-facing PromptDeck AI launch memo.",
      status: "completed",
      latencyMs: 2140,
      tokenEstimate: 1560,
      estimatedCostUsd: 0.00948,
      createdAt: "2026-05-15T11:05:00.000Z",
      steps: [
        {
          id: "agent-step-plan",
          label: "Plan evidence scan",
          kind: "reasoning",
          status: "completed",
          detail: "Chose market signals, product positioning, and benchmark proof points.",
          latencyMs: 320,
          tokenEstimate: 180,
        },
        {
          id: "agent-step-tool",
          label: "Invoke dataset reader",
          kind: "tool_call",
          status: "completed",
          detail: "Read 2 benchmark examples and prior experiment outcomes.",
          latencyMs: 520,
          tokenEstimate: 260,
        },
        {
          id: "agent-step-branch",
          label: "Branch on evidence confidence",
          kind: "branch",
          status: "completed",
          detail: "Confidence exceeded 85, so the agent produced a launch-ready memo.",
          latencyMs: 410,
          tokenEstimate: 240,
        },
        {
          id: "agent-step-final",
          label: "Write final brief",
          kind: "final",
          status: "completed",
          detail: "Generated decision brief and persisted memory about evidence boundaries.",
          latencyMs: 890,
          tokenEstimate: 880,
        },
      ],
    },
  ],
  agentMemory: [
    {
      id: "memory-research-citations",
      agentId: "agent-research",
      key: "preferred_citation_style",
      value: "Use short source labels, confidence scores, and separate inference from evidence.",
      updatedAt: "2026-05-15T11:05:02.140Z",
    },
    {
      id: "memory-evaluator-threshold",
      agentId: "agent-evaluator",
      key: "risk_thresholds",
      value: "Flag any prompt release when hallucination rate rises above 18%.",
      updatedAt: "2026-05-15T10:54:00.000Z",
    },
  ],
  agentTools: [
    {
      id: "tool-web-scout",
      agentId: "agent-research",
      name: "web-scout",
      kind: "search",
      description: "Search abstraction for research tasks with citation capture.",
      status: "mock",
    },
    {
      id: "tool-rubric-scorer",
      agentId: "agent-evaluator",
      name: "rubric-scorer",
      kind: "evaluation",
      description: "Scores outputs against reusable benchmark rubrics.",
      status: "mock",
    },
    {
      id: "tool-policy-rag",
      agentId: "agent-support",
      name: "policy-rag",
      kind: "database",
      description: "Retrieves policy fragments before support responses are drafted.",
      status: "mock",
    },
  ],
  benchmarkSuites: [
    {
      id: "benchmark-suite-prd",
      workspaceId: "workspace-promptops",
      name: "PRD Quality Benchmark",
      description:
        "Runs product prompts across examples and models to rank quality, cost, and risk.",
      promptIds: ["prompt-prd", "prompt-market"],
      modelIds: ["gpt-5", "claude-sonnet-4.5", "gemini-2.5-pro"],
      datasetIds: ["benchmark-dataset-product"],
      metrics: [
        "accuracy",
        "hallucination rate",
        "latency",
        "cost per output",
        "consistency",
        "human feedback",
      ],
      status: "completed",
      createdAt: "2026-05-15T11:10:00.000Z",
    },
  ],
  benchmarkDatasets: [
    {
      id: "benchmark-dataset-product",
      name: "Product Strategy Regression Set",
      taskType: "product-strategy",
      examples: [
        {
          input: "Turn ambiguous founder notes into a PRD with non-goals.",
          expected: "Decision-ready PRD with assumptions, risks, and metrics.",
          difficulty: "medium",
        },
        {
          input: "Summarize market notes and recommend experiments.",
          expected: "Evidence-bound market memo with experiment ranking.",
          difficulty: "hard",
        },
      ],
      createdAt: "2026-05-15T11:08:00.000Z",
    },
  ],
  benchmarkRuns: [
    {
      id: "benchmark-run-prd-gpt",
      suiteId: "benchmark-suite-prd",
      promptId: "prompt-prd",
      model: "gpt-5",
      datasetId: "benchmark-dataset-product",
      status: "completed",
      accuracy: 92,
      hallucinationRate: 8,
      latencyMs: 445,
      estimatedCostUsd: 0.001115,
      consistencyScore: 91,
      regressionDelta: 3,
      createdAt: "2026-05-15T11:20:00.000Z",
    },
    {
      id: "benchmark-run-prd-claude",
      suiteId: "benchmark-suite-prd",
      promptId: "prompt-prd",
      model: "claude-sonnet-4.5",
      datasetId: "benchmark-dataset-product",
      status: "completed",
      accuracy: 89,
      hallucinationRate: 12,
      latencyMs: 512,
      estimatedCostUsd: 0.002172,
      consistencyScore: 88,
      regressionDelta: -2,
      createdAt: "2026-05-15T11:21:00.000Z",
    },
    {
      id: "benchmark-run-market-gemini",
      suiteId: "benchmark-suite-prd",
      promptId: "prompt-market",
      model: "gemini-2.5-pro",
      datasetId: "benchmark-dataset-product",
      status: "completed",
      accuracy: 86,
      hallucinationRate: 15,
      latencyMs: 608,
      estimatedCostUsd: 0.00192,
      consistencyScore: 84,
      regressionDelta: -6,
      createdAt: "2026-05-15T11:22:00.000Z",
    },
  ],
  benchmarkScores: [
    {
      id: "score-prd-gpt-accuracy",
      runId: "benchmark-run-prd-gpt",
      metric: "accuracy",
      value: 92,
      createdAt: "2026-05-15T11:20:00.000Z",
    },
    {
      id: "score-prd-gpt-cost",
      runId: "benchmark-run-prd-gpt",
      metric: "cost efficiency",
      value: 94,
      createdAt: "2026-05-15T11:20:00.000Z",
    },
  ],
  traceSessions: [
    {
      id: "trace-prd-eval",
      rootRunId: "ai-run-prd-eval",
      workspaceId: "workspace-promptops",
      entityType: "evaluation",
      entityId: "eval-prd-gpt",
      name: "PRD prompt evaluation",
      status: "completed",
      startedAt: "2026-05-15T09:30:00.000Z",
      endedAt: "2026-05-15T09:30:00.420Z",
      totalLatencyMs: 420,
      totalCostUsd: 0.00066,
    },
    {
      id: "trace-workflow-research",
      rootRunId: "ai-run-workflow-research",
      workspaceId: "workspace-promptops",
      entityType: "workflow",
      entityId: "workflow-run-research-1",
      name: "Research Brief Pipeline run",
      status: "completed",
      startedAt: "2026-05-15T10:25:00.000Z",
      endedAt: "2026-05-15T10:25:01.280Z",
      totalLatencyMs: 1280,
      totalCostUsd: 0.00492,
    },
    {
      id: "trace-agent-research",
      rootRunId: "ai-run-agent-research",
      workspaceId: "workspace-promptops",
      entityType: "agent",
      entityId: "agent-run-research-1",
      name: "Research Agent execution",
      status: "completed",
      startedAt: "2026-05-15T11:05:00.000Z",
      endedAt: "2026-05-15T11:05:02.140Z",
      totalLatencyMs: 2140,
      totalCostUsd: 0.00948,
    },
    {
      id: "trace-benchmark-prd",
      rootRunId: "ai-run-benchmark-prd",
      workspaceId: "workspace-promptops",
      entityType: "benchmark",
      entityId: "benchmark-run-prd-gpt",
      name: "PRD benchmark run",
      status: "completed",
      startedAt: "2026-05-15T11:20:00.000Z",
      endedAt: "2026-05-15T11:20:00.445Z",
      totalLatencyMs: 445,
      totalCostUsd: 0.001115,
    },
  ],
  traceSteps: [
    {
      id: "trace-step-eval-render",
      traceId: "trace-prd-eval",
      parentStepId: null,
      label: "Render prompt variables",
      kind: "prompt",
      status: "completed",
      latencyMs: 24,
      tokenEstimate: 128,
      estimatedCostUsd: 0,
      startedAt: "2026-05-15T09:30:00.000Z",
      endedAt: "2026-05-15T09:30:00.024Z",
      depth: 0,
    },
    {
      id: "trace-step-eval-model",
      traceId: "trace-prd-eval",
      parentStepId: "trace-step-eval-render",
      label: "Model adapter call",
      kind: "model",
      status: "completed",
      latencyMs: 396,
      tokenEstimate: 178,
      estimatedCostUsd: 0.00066,
      startedAt: "2026-05-15T09:30:00.024Z",
      endedAt: "2026-05-15T09:30:00.420Z",
      depth: 1,
    },
    {
      id: "trace-step-workflow-research",
      traceId: "trace-workflow-research",
      parentStepId: null,
      label: "Research scan prompt",
      kind: "prompt",
      status: "completed",
      latencyMs: 440,
      tokenEstimate: 320,
      estimatedCostUsd: 0.0018,
      startedAt: "2026-05-15T10:25:00.000Z",
      endedAt: "2026-05-15T10:25:00.440Z",
      depth: 0,
    },
    {
      id: "trace-step-workflow-condition",
      traceId: "trace-workflow-research",
      parentStepId: "trace-step-workflow-research",
      label: "Confidence gate",
      kind: "condition",
      status: "completed",
      latencyMs: 120,
      tokenEstimate: 40,
      estimatedCostUsd: 0,
      startedAt: "2026-05-15T10:25:00.440Z",
      endedAt: "2026-05-15T10:25:00.560Z",
      depth: 1,
    },
    {
      id: "trace-step-workflow-output",
      traceId: "trace-workflow-research",
      parentStepId: "trace-step-workflow-condition",
      label: "Executive brief output",
      kind: "artifact",
      status: "completed",
      latencyMs: 720,
      tokenEstimate: 464,
      estimatedCostUsd: 0.00312,
      startedAt: "2026-05-15T10:25:00.560Z",
      endedAt: "2026-05-15T10:25:01.280Z",
      depth: 2,
    },
    {
      id: "trace-step-agent-plan",
      traceId: "trace-agent-research",
      parentStepId: null,
      label: "Agent plan",
      kind: "model",
      status: "completed",
      latencyMs: 320,
      tokenEstimate: 180,
      estimatedCostUsd: 0.0012,
      startedAt: "2026-05-15T11:05:00.000Z",
      endedAt: "2026-05-15T11:05:00.320Z",
      depth: 0,
    },
    {
      id: "trace-step-agent-tool",
      traceId: "trace-agent-research",
      parentStepId: "trace-step-agent-plan",
      label: "dataset-reader tool",
      kind: "tool",
      status: "completed",
      latencyMs: 520,
      tokenEstimate: 260,
      estimatedCostUsd: 0.00168,
      startedAt: "2026-05-15T11:05:00.320Z",
      endedAt: "2026-05-15T11:05:00.840Z",
      depth: 1,
    },
    {
      id: "trace-step-agent-final",
      traceId: "trace-agent-research",
      parentStepId: "trace-step-agent-tool",
      label: "Final response artifact",
      kind: "artifact",
      status: "completed",
      latencyMs: 1300,
      tokenEstimate: 1120,
      estimatedCostUsd: 0.0066,
      startedAt: "2026-05-15T11:05:00.840Z",
      endedAt: "2026-05-15T11:05:02.140Z",
      depth: 2,
    },
  ],
  traceLogs: [
    {
      id: "trace-log-agent-1",
      traceId: "trace-agent-research",
      stepId: "trace-step-agent-tool",
      level: "info",
      message: "dataset-reader returned 2 benchmark examples and prior experiment scores.",
      createdAt: "2026-05-15T11:05:00.840Z",
    },
    {
      id: "trace-log-benchmark-regression",
      traceId: "trace-benchmark-prd",
      stepId: null,
      level: "warning",
      message: "Gemini adapter showed a -6 regression delta on product strategy examples.",
      createdAt: "2026-05-15T11:22:00.445Z",
    },
  ],
  promptIntelligence: [
    {
      id: "intel-prd",
      promptId: "prompt-prd",
      healthScore: 92,
      clarity: 94,
      robustness: 90,
      hallucinationRisk: 12,
      duplicateRisk: 8,
      cluster: "Product strategy generators",
      suggestions: [
        "Keep evidence and assumptions separated.",
        "Add non-goals for launch-scope prompts.",
        "Use GPT-5 for highest rubric accuracy, Claude for tone-sensitive variants.",
      ],
      modelRecommendation: "gpt-5",
      updatedAt: "2026-05-15T11:12:00.000Z",
    },
    {
      id: "intel-review",
      promptId: "prompt-review",
      healthScore: 89,
      clarity: 91,
      robustness: 88,
      hallucinationRisk: 15,
      duplicateRisk: 11,
      cluster: "Engineering review copilots",
      suggestions: [
        "Require file and line references before severity assignment.",
        "Add explicit non-finding summary rules.",
      ],
      modelRecommendation: "gpt-5",
      updatedAt: "2026-05-15T11:13:00.000Z",
    },
  ],
  promptReleases: [
    {
      id: "release-prd-prod",
      deploymentId: "deployment-prd-prod",
      versionId: "version-prd-1",
      tag: "prd-generator@1.0.0",
      environment: "production",
      status: "healthy",
      rolloutPercent: 100,
      healthScore: 94,
      notes: "Promoted after benchmark pass and no regression alerts.",
      createdAt: "2026-05-15T10:05:00.000Z",
    },
    {
      id: "release-review-staging",
      deploymentId: "deployment-review-staging",
      versionId: "version-prd-1",
      tag: "code-review@0.9.0",
      environment: "staging",
      status: "watching",
      rolloutPercent: 25,
      healthScore: 88,
      notes: "A/B staging rollout watching hallucination rate and severity precision.",
      createdAt: "2026-05-15T10:15:00.000Z",
    },
  ],
  activities: [
    {
      id: "activity-seed-1",
      promptId: "prompt-prd",
      eventType: "evaluation.completed",
      summary: "Benchmarked Product Brief prompt against the GPT adapter.",
      createdAt: "2026-05-15T09:30:00.000Z",
    },
    {
      id: "activity-seed-2",
      promptId: "prompt-review",
      eventType: "prompt.shared",
      summary: "Published High Signal Code Review to the recruiter collection.",
      createdAt: "2026-05-15T10:10:00.000Z",
    },
  ],
};

function normalizeEvaluations(evaluations: PromptEvaluation[] | undefined) {
  return (evaluations ?? []).map((evaluation) => {
    const inputTokenEstimate =
      evaluation.inputTokenEstimate ?? Math.max(1, Math.ceil(evaluation.input.length / 4));
    const outputTokenEstimate =
      evaluation.outputTokenEstimate ?? Math.max(1, Math.ceil(evaluation.output.length / 4));

    return {
      ...evaluation,
      inputTokenEstimate,
      outputTokenEstimate,
      tokenEstimate: evaluation.tokenEstimate ?? inputTokenEstimate + outputTokenEstimate,
      estimatedCostUsd: evaluation.estimatedCostUsd ?? 0,
    };
  });
}

export function normalizeWorkspace(workspace: Partial<PromptWorkspace>): PromptWorkspace {
  return {
    categories: workspace.categories ?? seedWorkspace.categories,
    prompts: workspace.prompts ?? seedWorkspace.prompts,
    runs: workspace.runs ?? [],
    versions: workspace.versions ?? [],
    evaluations: normalizeEvaluations(workspace.evaluations),
    experiments: workspace.experiments ?? seedWorkspace.experiments,
    experimentWorkflows:
      workspace.experimentWorkflows ?? seedWorkspace.experimentWorkflows,
    experimentRuns: workspace.experimentRuns ?? seedWorkspace.experimentRuns,
    deployments: workspace.deployments ?? seedWorkspace.deployments,
    deploymentHistory:
      workspace.deploymentHistory ?? seedWorkspace.deploymentHistory,
    aiWorkflows: workspace.aiWorkflows ?? seedWorkspace.aiWorkflows,
    workflowRuns: workspace.workflowRuns ?? seedWorkspace.workflowRuns,
    evaluationDatasets:
      workspace.evaluationDatasets ?? seedWorkspace.evaluationDatasets,
    evaluationPresets:
      workspace.evaluationPresets ?? seedWorkspace.evaluationPresets,
    organizations: workspace.organizations ?? seedWorkspace.organizations,
    auditLogs: workspace.auditLogs ?? seedWorkspace.auditLogs,
    aiRuns: workspace.aiRuns ?? seedWorkspace.aiRuns,
    aiArtifacts: workspace.aiArtifacts ?? seedWorkspace.aiArtifacts,
    aiMetrics: workspace.aiMetrics ?? seedWorkspace.aiMetrics,
    agents: workspace.agents ?? seedWorkspace.agents,
    agentRuns: workspace.agentRuns ?? seedWorkspace.agentRuns,
    agentMemory: workspace.agentMemory ?? seedWorkspace.agentMemory,
    agentTools: workspace.agentTools ?? seedWorkspace.agentTools,
    benchmarkSuites: workspace.benchmarkSuites ?? seedWorkspace.benchmarkSuites,
    benchmarkDatasets:
      workspace.benchmarkDatasets ?? seedWorkspace.benchmarkDatasets,
    benchmarkRuns: workspace.benchmarkRuns ?? seedWorkspace.benchmarkRuns,
    benchmarkScores: workspace.benchmarkScores ?? seedWorkspace.benchmarkScores,
    traceSessions: workspace.traceSessions ?? seedWorkspace.traceSessions,
    traceSteps: workspace.traceSteps ?? seedWorkspace.traceSteps,
    traceLogs: workspace.traceLogs ?? seedWorkspace.traceLogs,
    promptIntelligence:
      workspace.promptIntelligence ?? seedWorkspace.promptIntelligence,
    promptReleases: workspace.promptReleases ?? seedWorkspace.promptReleases,
    activities: workspace.activities ?? [],
    workspaces: workspace.workspaces ?? seedWorkspace.workspaces,
    collections: workspace.collections ?? seedWorkspace.collections,
    members: workspace.members ?? seedWorkspace.members,
  };
}

export function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function createShareSlug(title: string) {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 42);

  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base || "prompt"}-${suffix}`;
}
