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
  status: "draft" | "running" | "completed";
  variants: PromptExperimentVariant[];
  results: PromptExperimentResult[];
  createdAt: string;
  updatedAt: string;
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
