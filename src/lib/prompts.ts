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

export type PromptWorkspace = {
  categories: PromptCategory[];
  prompts: ManagedPrompt[];
  runs: PromptRun[];
};

export const promptWorkspaceStorageKey = "promptdeck-ai:workspace:v1";

const now = "2026-05-15T08:00:00.000Z";

export const seedWorkspace: PromptWorkspace = {
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
};

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
