"use client";

import {
  Activity,
  BarChart3,
  Blocks,
  Brain,
  CircleDollarSign,
  Bot,
  Building2,
  Check,
  Clipboard,
  Command,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Filter,
  Gauge,
  GitBranch,
  Heart,
  History,
  Layers3,
  LayoutDashboard,
  Loader2,
  Lock,
  LogIn,
  LogOut,
  Pencil,
  Plus,
  Save,
  Search,
  Rocket,
  Share2,
  ShieldCheck,
  Sparkles,
  ServerCog,
  Trash2,
  Users,
  Variable,
  WandSparkles,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import clsx from "clsx";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { publicConfig } from "@/lib/config";
import {
  modelCatalog,
  type EvaluationResult,
  type PromptOptimizationResult,
} from "@/lib/ai/catalog";
import { buildPromptDiff } from "@/lib/prompt-diff";
import { createAIExecution } from "@/lib/ai-execution";
import {
  extractPromptVariables,
  renderPromptTemplate,
  suggestPromptVariables,
  validatePromptVariables,
} from "@/lib/prompt-variables";
import {
  createId,
  createShareSlug,
  type ManagedPrompt,
  normalizeWorkspace,
  type PromptActivity,
  type PromptEvaluation,
  type PromptExperiment,
  type PromptExperimentResult,
  type PromptExperimentVariant,
  type AIWorkflow,
  type DeploymentEnvironment,
  type PromptDeployment,
  type PromptRun,
  type PromptVersion,
  type PromptWorkspace,
  promptWorkspaceStorageKey,
  seedWorkspace,
} from "@/lib/prompts";
import { buildJsonExport, buildMarkdownExport } from "@/lib/export-prompts";

type UserSession = {
  id: string;
  email: string;
  provider: "Supabase" | "Demo";
};

type PromptForm = {
  title: string;
  description: string;
  content: string;
  categoryId: string;
  tags: string;
  model: string;
  temperature: number;
  isPublic: boolean;
};

type TestResult = {
  output: string;
  model: string;
  provider: "openai" | "demo";
  latencyMs: number;
};

type ActiveView =
  | "operations"
  | "workflows"
  | "benchmarks"
  | "agents"
  | "deployments"
  | "observability"
  | "analytics"
  | "team";

type EvaluationTab = "output" | "metrics" | "notes";

const demoCredentials = {
  email: "demo@promptdeck.ai",
  password: "promptdeck-demo",
};

const emptyForm = (categoryId: string): PromptForm => ({
  title: "",
  description: "",
  content: "You are a helpful AI assistant.\n\nTask:\n{{input}}",
  categoryId,
  tags: "",
  model: "gpt-5",
  temperature: 0.4,
  isPublic: false,
});

type CategoryRow = {
  id: string;
  name: string;
  color: string;
  description: string;
  created_at: string;
};

type PromptRow = {
  id: string;
  category_id: string | null;
  title: string;
  description: string;
  content: string;
  tags: string[];
  model: string;
  temperature: number;
  is_favorite: boolean;
  is_public: boolean;
  share_slug: string | null;
  usage_count: number;
  last_tested_at: string | null;
  created_at: string;
  updated_at: string;
};

type RunRow = {
  id: string;
  prompt_id: string;
  input: string;
  output: string;
  model: string;
  provider: "openai" | "demo";
  latency_ms: number;
  created_at: string;
};

type VersionRow = {
  id: string;
  prompt_id: string;
  version_number: number;
  title: string;
  description: string;
  content: string;
  tags: string[];
  model: string;
  temperature: number;
  notes: string;
  created_at: string;
};

type EvaluationRow = {
  id: string;
  prompt_id: string;
  provider: "openai" | "anthropic" | "google" | "demo";
  model: string;
  input: string;
  output: string;
  latency_ms: number;
  input_token_estimate?: number | null;
  output_token_estimate?: number | null;
  token_estimate: number;
  estimated_cost_usd?: number | null;
  output_length: number;
  quality_score: number;
  created_at: string;
};

function cloneSeedWorkspace() {
  return normalizeWorkspace(JSON.parse(JSON.stringify(seedWorkspace)) as PromptWorkspace);
}

function mapCategory(row: CategoryRow) {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    description: row.description,
    createdAt: row.created_at,
  };
}

function mapPrompt(row: PromptRow) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    content: row.content,
    categoryId: row.category_id ?? "",
    tags: row.tags ?? [],
    model: row.model,
    temperature: Number(row.temperature),
    isFavorite: row.is_favorite,
    isPublic: row.is_public,
    shareSlug: row.share_slug,
    usageCount: row.usage_count,
    lastTestedAt: row.last_tested_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRun(row: RunRow) {
  return {
    id: row.id,
    promptId: row.prompt_id,
    input: row.input,
    output: row.output,
    model: row.model,
    provider: row.provider,
    latencyMs: row.latency_ms,
    createdAt: row.created_at,
  };
}

function mapVersion(row: VersionRow): PromptVersion {
  return {
    id: row.id,
    promptId: row.prompt_id,
    versionNumber: row.version_number,
    title: row.title,
    description: row.description,
    content: row.content,
    tags: row.tags ?? [],
    model: row.model,
    temperature: Number(row.temperature),
    notes: row.notes,
    createdAt: row.created_at,
  };
}

function mapEvaluation(row: EvaluationRow): PromptEvaluation {
  return {
    id: row.id,
    promptId: row.prompt_id,
    provider: row.provider,
    model: row.model,
    input: row.input,
    output: row.output,
    latencyMs: row.latency_ms,
    inputTokenEstimate:
      row.input_token_estimate ?? Math.max(1, Math.ceil(row.input.length / 4)),
    outputTokenEstimate:
      row.output_token_estimate ?? Math.max(1, Math.ceil(row.output.length / 4)),
    tokenEstimate: row.token_estimate,
    estimatedCostUsd: row.estimated_cost_usd ?? 0,
    outputLength: row.output_length,
    qualityScore: row.quality_score,
    createdAt: row.created_at,
  };
}

function toPromptRow(prompt: ManagedPrompt, userId: string) {
  return {
    id: prompt.id,
    user_id: userId,
    category_id: prompt.categoryId || null,
    title: prompt.title,
    description: prompt.description,
    content: prompt.content,
    tags: prompt.tags,
    model: prompt.model,
    temperature: prompt.temperature,
    is_favorite: prompt.isFavorite,
    is_public: prompt.isPublic,
    share_slug: prompt.shareSlug,
    usage_count: prompt.usageCount,
    last_tested_at: prompt.lastTestedAt,
    created_at: prompt.createdAt,
    updated_at: prompt.updatedAt,
  };
}

async function seedSupabaseWorkspace(supabase: SupabaseClient, userId: string) {
  const timestamp = new Date().toISOString();
  const categoryIdBySeedId = new Map<string, string>();
  const categories = seedWorkspace.categories.map((category) => {
    const id = crypto.randomUUID();
    categoryIdBySeedId.set(category.id, id);

    return {
      id,
      name: category.name,
      color: category.color,
      description: category.description,
      createdAt: timestamp,
    };
  });

  const prompts = seedWorkspace.prompts.map((prompt) => ({
    ...prompt,
    id: crypto.randomUUID(),
    categoryId: categoryIdBySeedId.get(prompt.categoryId) ?? categories[0]?.id ?? "",
    shareSlug: prompt.isPublic ? createShareSlug(prompt.title) : null,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));

  const { error: categoryError } = await supabase.from("prompt_categories").insert(
    categories.map((category) => ({
      id: category.id,
      user_id: userId,
      name: category.name,
      color: category.color,
      description: category.description,
      created_at: category.createdAt,
      updated_at: category.createdAt,
    })),
  );

  if (categoryError) {
    throw categoryError;
  }

  const { error: promptError } = await supabase
    .from("prompts")
    .insert(prompts.map((prompt) => toPromptRow(prompt, userId)));

  if (promptError) {
    throw promptError;
  }

  return normalizeWorkspace({ categories, prompts, runs: [] });
}

async function fetchOptionalPromptOpsTables(supabase: SupabaseClient, userId: string) {
  const [versionsResult, evaluationsResult] = await Promise.allSettled([
    supabase
      .from("prompt_versions")
      .select("*")
      .eq("user_id", userId)
      .order("version_number", { ascending: false })
      .limit(200),
    supabase
      .from("prompt_evaluations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const versions =
    versionsResult.status === "fulfilled" && !versionsResult.value.error
      ? ((versionsResult.value.data ?? []) as VersionRow[]).map(mapVersion)
      : [];
  const evaluations =
    evaluationsResult.status === "fulfilled" && !evaluationsResult.value.error
      ? ((evaluationsResult.value.data ?? []) as EvaluationRow[]).map(mapEvaluation)
      : [];

  return { versions, evaluations };
}

async function fetchSupabaseWorkspace(supabase: SupabaseClient, userId: string) {
  const [{ data: categories, error: categoryError }, { data: prompts, error: promptError }] =
    await Promise.all([
      supabase
        .from("prompt_categories")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true }),
      supabase
        .from("prompts")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false }),
    ]);

  if (categoryError) {
    throw categoryError;
  }

  if (promptError) {
    throw promptError;
  }

  if (!categories?.length) {
    return seedSupabaseWorkspace(supabase, userId);
  }

  const { data: runs, error: runError } = await supabase
    .from("prompt_runs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (runError) {
    throw runError;
  }

  const promptOps = await fetchOptionalPromptOpsTables(supabase, userId);

  return normalizeWorkspace({
    categories: (categories as CategoryRow[]).map(mapCategory),
    prompts: (prompts as PromptRow[]).map(mapPrompt),
    runs: ((runs ?? []) as RunRow[]).map(mapRun),
    versions: promptOps.versions,
    evaluations: promptOps.evaluations,
  });
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not tested";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function fileSafeDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatCost(value: number) {
  if (value <= 0) {
    return "$0.000000";
  }

  return `$${value.toFixed(6)}`;
}

function isUuid(value: string | null | undefined) {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      ),
  );
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function PromptConsole() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [ready, setReady] = useState(true);
  const [session, setSession] = useState<UserSession | null>(null);
  const [workspace, setWorkspace] = useState<PromptWorkspace>(() =>
    cloneSeedWorkspace(),
  );
  const [selectedPromptId, setSelectedPromptId] = useState("prompt-prd");
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [form, setForm] = useState<PromptForm>(() => emptyForm("cat-product"));
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [sharedOnly, setSharedOnly] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>("operations");
  const [commandOpen, setCommandOpen] = useState(false);
  const [visiblePromptCount, setVisiblePromptCount] = useState(8);
  const [authEmail, setAuthEmail] = useState(demoCredentials.email);
  const [authPassword, setAuthPassword] = useState(demoCredentials.password);
  const [authMessage, setAuthMessage] = useState("");
  const [testInput, setTestInput] = useState(
    "A founder wants to organize reusable AI prompts for product, hiring, and engineering work.",
  );
  const [testOutput, setTestOutput] = useState("");
  const [testing, setTesting] = useState(false);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [versionNotes, setVersionNotes] = useState("");
  const [evaluationModels, setEvaluationModels] = useState(["gpt-5", "claude-sonnet-4.5"]);
  const [evaluationResults, setEvaluationResults] = useState<EvaluationResult[]>([]);
  const [evaluationTab, setEvaluationTab] = useState<EvaluationTab>("output");
  const [evaluating, setEvaluating] = useState(false);
  const [selectedExperimentId, setSelectedExperimentId] = useState(
    "experiment-prd-optimization",
  );
  const [selectedWorkflowId, setSelectedWorkflowId] = useState("workflow-research-brief");
  const [selectedAgentId, setSelectedAgentId] = useState("agent-research");
  const [selectedBenchmarkSuiteId, setSelectedBenchmarkSuiteId] =
    useState("benchmark-suite-prd");
  const [selectedTraceId, setSelectedTraceId] = useState("trace-agent-research");
  const [deploymentEnvironment, setDeploymentEnvironment] =
    useState<DeploymentEnvironment>("production");
  const [experimentRunning, setExperimentRunning] = useState(false);
  const [workflowRunning, setWorkflowRunning] = useState(false);
  const [agentRunning, setAgentRunning] = useState(false);
  const [benchmarkRunning, setBenchmarkRunning] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [optimization, setOptimization] = useState<PromptOptimizationResult | null>(null);
  const [inviteEmail, setInviteEmail] = useState("teammate@company.com");
  const [toast, setToast] = useState("");
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;

    queueMicrotask(() => {
      const saved = window.localStorage.getItem(promptWorkspaceStorageKey);

      if (saved && mounted) {
        try {
          setWorkspace(normalizeWorkspace(JSON.parse(saved) as PromptWorkspace));
        } catch {
          setWorkspace(cloneSeedWorkspace());
        }
      }
    });

    async function loadAuth() {
      if (!supabase) {
        setReady(true);
        return;
      }

      try {
        const authResult = await Promise.race([
          supabase.auth.getUser(),
          new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 2500)),
        ]);
        const user = authResult?.data.user;

        if (user?.email) {
          setSession({ id: user.id, email: user.email, provider: "Supabase" });
        }
      } finally {
        setReady(true);
      }
    }

    void loadAuth();

    const subscription = supabase?.auth.onAuthStateChange((_event, authSession) => {
      const user = authSession?.user;
      setSession((current) => {
        if (user?.email) {
          return { id: user.id, email: user.email, provider: "Supabase" };
        }

        return current?.provider === "Demo" ? current : null;
      });
    });

    return () => {
      mounted = false;
      subscription?.data.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (ready) {
      window.localStorage.setItem(promptWorkspaceStorageKey, JSON.stringify(workspace));
    }
  }, [ready, workspace]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT";

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((current) => !current);
        return;
      }

      if (event.key === "Escape") {
        setCommandOpen(false);
        return;
      }

      if (isTyping) {
        return;
      }

      if (event.key.toLowerCase() === "n") {
        startCreate();
      }

      if (event.key.toLowerCase() === "a") {
        setActiveView("agents");
      }

      if (event.key.toLowerCase() === "e") {
        setActiveView("benchmarks");
      }

      if (event.key.toLowerCase() === "w") {
        setActiveView("workflows");
      }

      if (event.key.toLowerCase() === "d") {
        setActiveView("deployments");
      }

      if (event.key.toLowerCase() === "o") {
        setActiveView("observability");
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  useEffect(() => {
    const activeSupabase = supabase;
    const activeSession = session;

    if (!activeSupabase || activeSession?.provider !== "Supabase") {
      return;
    }

    const syncedSupabase: SupabaseClient = activeSupabase;
    const userId = activeSession.id;
    let cancelled = false;

    async function loadWorkspace() {
      try {
        const syncedWorkspace = await fetchSupabaseWorkspace(
          syncedSupabase,
          userId,
        );

        if (cancelled) {
          return;
        }

        setWorkspace(syncedWorkspace);
        setSelectedPromptId(syncedWorkspace.prompts[0]?.id ?? "");
        setForm(emptyForm(syncedWorkspace.categories[0]?.id ?? ""));
        setAuthMessage("Supabase workspace synced.");
      } catch (error) {
        setAuthMessage(
          error instanceof Error
            ? error.message
            : "Could not sync the Supabase workspace.",
        );
      }
    }

    void loadWorkspace();

    return () => {
      cancelled = true;
    };
  }, [supabase, session]);

  const categoryById = useMemo(
    () => new Map(workspace.categories.map((category) => [category.id, category])),
    [workspace.categories],
  );

  const filteredPrompts = useMemo(() => {
    const term = query.toLowerCase().trim();

    return workspace.prompts.filter((prompt) => {
      const matchesTerm =
        !term ||
        prompt.title.toLowerCase().includes(term) ||
        prompt.description.toLowerCase().includes(term) ||
        prompt.content.toLowerCase().includes(term) ||
        prompt.tags.some((tag) => tag.toLowerCase().includes(term));

      const matchesCategory =
        categoryFilter === "all" || prompt.categoryId === categoryFilter;

      return (
        matchesTerm &&
        matchesCategory &&
        (!favoriteOnly || prompt.isFavorite) &&
        (!sharedOnly || prompt.isPublic)
      );
    });
  }, [workspace.prompts, query, categoryFilter, favoriteOnly, sharedOnly]);

  const selectedPrompt =
    workspace.prompts.find((prompt) => prompt.id === selectedPromptId) ??
    filteredPrompts[0] ??
    workspace.prompts[0];

  const selectedRuns = workspace.runs
    .filter((run) => run.promptId === selectedPrompt?.id)
    .slice()
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 4);

  const visiblePrompts = filteredPrompts.slice(0, visiblePromptCount);
  const promptVariables = useMemo(
    () => extractPromptVariables(form.content || selectedPrompt?.content || ""),
    [form.content, selectedPrompt?.content],
  );
  const suggestedVariables = useMemo(
    () => suggestPromptVariables(form.content || selectedPrompt?.content || ""),
    [form.content, selectedPrompt?.content],
  );
  const variablePayload = useMemo(
    () => ({
      input: testInput,
      ...variableValues,
    }),
    [testInput, variableValues],
  );
  const missingVariables = useMemo(
    () => validatePromptVariables(promptVariables, variablePayload),
    [promptVariables, variablePayload],
  );
  const renderedPromptPreview = useMemo(
    () =>
      renderPromptTemplate(
        form.content || selectedPrompt?.content || "",
        variablePayload,
      ),
    [form.content, selectedPrompt?.content, variablePayload],
  );
  const selectedVersions = workspace.versions
    .filter((version) => version.promptId === selectedPrompt?.id)
    .slice()
    .sort((a, b) => b.versionNumber - a.versionNumber);
  const latestVersion = selectedVersions[0];
  const activeWorkspace = workspace.workspaces[0];
  const selectedExperiment =
    workspace.experiments.find((experiment) => experiment.id === selectedExperimentId) ??
    workspace.experiments[0];
  const selectedWorkflow =
    workspace.aiWorkflows.find((workflow) => workflow.id === selectedWorkflowId) ??
    workspace.aiWorkflows[0];
  const selectedAgent =
    workspace.agents.find((agent) => agent.id === selectedAgentId) ?? workspace.agents[0];
  const selectedAgentRun =
    workspace.agentRuns.find((run) => run.agentId === selectedAgent?.id) ??
    workspace.agentRuns[0];
  const selectedBenchmarkSuite =
    workspace.benchmarkSuites.find((suite) => suite.id === selectedBenchmarkSuiteId) ??
    workspace.benchmarkSuites[0];
  const selectedTrace =
    workspace.traceSessions.find((trace) => trace.id === selectedTraceId) ??
    workspace.traceSessions[0];
  const selectedPromptIntelligence = selectedPrompt
    ? workspace.promptIntelligence.find(
        (insight) => insight.promptId === selectedPrompt.id,
      )
    : undefined;
  const activeDeployments = workspace.deployments.filter(
    (deployment) => deployment.environment === deploymentEnvironment,
  );
  const analytics = useMemo(() => {
    const categoryUsage = workspace.categories.map((category) => ({
      name: category.name,
      prompts: workspace.prompts.filter((prompt) => prompt.categoryId === category.id).length,
      runs: workspace.prompts
        .filter((prompt) => prompt.categoryId === category.id)
        .reduce((total, prompt) => total + prompt.usageCount, 0),
      color: category.color,
    }));
    const latencyEvents = [...workspace.runs, ...workspace.evaluations]
      .slice()
      .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
      .slice(-8)
      .map((item, index) => ({
        name: `Run ${index + 1}`,
        latency: "latencyMs" in item ? item.latencyMs : 0,
      }));
    const favoritePrompts = workspace.prompts
      .filter((prompt) => prompt.isFavorite)
      .map((prompt) => ({ name: prompt.title.slice(0, 18), runs: prompt.usageCount }));
    const providerUsage = modelCatalog.map((model) => {
      const evaluationCost = workspace.evaluations
        .filter((evaluation) => evaluation.model === model.id)
        .reduce((total, evaluation) => total + evaluation.estimatedCostUsd, 0);
      const experimentCost = workspace.experimentRuns
        .filter((run) => run.model === model.id)
        .reduce((total, run) => total + run.estimatedCostUsd, 0);
      const totalRuns =
        workspace.evaluations.filter((evaluation) => evaluation.model === model.id).length +
        workspace.experimentRuns.filter((run) => run.model === model.id).length;
      const avgLatencyItems = [
        ...workspace.evaluations.filter((evaluation) => evaluation.model === model.id),
        ...workspace.experimentRuns.filter((run) => run.model === model.id),
      ];
      const averageLatency =
        avgLatencyItems.length > 0
          ? Math.round(
              avgLatencyItems.reduce((total, item) => total + item.latencyMs, 0) /
                avgLatencyItems.length,
            )
          : 0;

      return {
        name: model.label,
        cost: Number((evaluationCost + experimentCost).toFixed(6)),
        runs: totalRuns,
        latency: averageLatency,
        provider: model.provider,
      };
    });
    const monthlyUsage = [
      ...workspace.evaluations.map((evaluation) => ({
        month: new Date(evaluation.createdAt).toLocaleString("en-US", { month: "short" }),
        tokens: evaluation.tokenEstimate,
        cost: evaluation.estimatedCostUsd,
      })),
      ...workspace.experimentRuns.map((run) => ({
        month: new Date(run.createdAt).toLocaleString("en-US", { month: "short" }),
        tokens: run.tokenEstimate,
        cost: run.estimatedCostUsd,
      })),
      ...workspace.workflowRuns.map((run) => ({
        month: new Date(run.createdAt).toLocaleString("en-US", { month: "short" }),
        tokens: run.tokenEstimate,
        cost: run.estimatedCostUsd,
      })),
    ].reduce<{ month: string; tokens: number; cost: number }[]>((items, item) => {
      const existing = items.find((entry) => entry.month === item.month);
      if (existing) {
        existing.tokens += item.tokens;
        existing.cost = Number((existing.cost + item.cost).toFixed(6));
      } else {
        items.push({ ...item });
      }
      return items;
    }, []);
    const cheapestProvider = providerUsage
      .filter((item) => item.cost > 0)
      .sort((a, b) => a.cost - b.cost)[0]?.name ?? "Pending";
    const fastestProvider = providerUsage
      .filter((item) => item.latency > 0)
      .sort((a, b) => a.latency - b.latency)[0]?.name ?? "Pending";

    return {
      categoryUsage,
      latencyEvents,
      favoritePrompts,
      providerUsage,
      monthlyUsage,
      cheapestProvider,
      fastestProvider,
      totalEstimatedCost: workspace.evaluations.reduce(
        (total, evaluation) => total + evaluation.estimatedCostUsd,
        workspace.experimentRuns.reduce(
          (total, run) => total + run.estimatedCostUsd,
          workspace.workflowRuns.reduce((total, run) => total + run.estimatedCostUsd, 0),
        ),
      ),
      averageLatency:
        latencyEvents.length > 0
          ? Math.round(
              latencyEvents.reduce((total, item) => total + item.latency, 0) /
                latencyEvents.length,
            )
          : 0,
    };
  }, [
    workspace.categories,
    workspace.evaluations,
    workspace.experimentRuns,
    workspace.prompts,
    workspace.runs,
    workspace.workflowRuns,
  ]);

  const stats = {
    prompts: workspace.prompts.length,
    favorites: workspace.prompts.filter((prompt) => prompt.isFavorite).length,
    shared: workspace.prompts.filter((prompt) => prompt.isPublic).length,
    tests: workspace.runs.length + workspace.evaluations.length,
    experiments: workspace.experiments.length,
    workflows: workspace.aiWorkflows.length,
    deployments: workspace.deployments.length,
    agents: workspace.agents.length,
    benchmarks: workspace.benchmarkSuites.length,
    traces: workspace.traceSessions.length,
    aiRuns: workspace.aiRuns.length,
  };

  function showToast(message: string) {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }

    setToast(message);
    toastTimerRef.current = window.setTimeout(() => {
      setToast("");
      toastTimerRef.current = null;
    }, 2600);
  }

  function supabaseUserId() {
    return session?.provider === "Supabase" ? session.id : null;
  }

  function recordActivity(eventType: string, summary: string, promptId?: string | null) {
    const activity: PromptActivity = {
      id: createId("activity"),
      promptId: promptId ?? null,
      eventType,
      summary,
      createdAt: new Date().toISOString(),
    };

    setWorkspace((current) => ({
      ...current,
      activities: [activity, ...current.activities].slice(0, 60),
    }));
  }

  function buildOperationTrace({
    entityType,
    entityId,
    name,
    model,
    provider,
    latencyMs,
    inputTokens,
    outputTokens,
    cost,
    qualityScore,
    steps,
    artifactTitle,
    artifactContent,
    runId,
    traceId,
  }: {
    entityType: PromptWorkspace["aiRuns"][number]["entityType"];
    entityId: string;
    name: string;
    model: string;
    provider: PromptWorkspace["aiRuns"][number]["provider"];
    latencyMs: number;
    inputTokens: number;
    outputTokens: number;
    cost: number;
    qualityScore: number;
    steps: { label: string; kind: PromptWorkspace["traceNodes"][number]["kind"] }[];
    artifactTitle: string;
    artifactContent: string;
    runId?: string;
    traceId?: string;
  }) {
    return createAIExecution({
      idFactory: promptIdForCurrentMode,
      workspaceId: activeWorkspace?.id ?? "workspace-promptops",
      entityType,
      entityId,
      name,
      model,
      provider,
      latencyMs,
      inputTokens,
      outputTokens,
      cost,
      qualityScore,
      steps,
      artifactTitle,
      artifactContent,
      runId,
      traceId,
    });
  }

  function snapshotPromptVersion(prompt: ManagedPrompt, notes: string) {
    const existingVersions = workspace.versions.filter(
      (version) => version.promptId === prompt.id,
    );

    return {
      id: createId("version"),
      promptId: prompt.id,
      versionNumber:
        existingVersions.reduce(
          (max, version) => Math.max(max, version.versionNumber),
          0,
        ) + 1,
      title: prompt.title,
      description: prompt.description,
      content: prompt.content,
      tags: prompt.tags,
      model: prompt.model,
      temperature: prompt.temperature,
      notes: notes.trim() || "Prompt edited.",
      createdAt: new Date().toISOString(),
    } satisfies PromptVersion;
  }

  function isDemoCredentials() {
    return (
      authEmail.trim().toLowerCase() === demoCredentials.email &&
      authPassword === demoCredentials.password
    );
  }

  async function persistPrompt(prompt: ManagedPrompt) {
    const userId = supabaseUserId();

    if (!supabase || !userId) {
      return;
    }

    const { error } = await supabase
      .from("prompts")
      .upsert(toPromptRow(prompt, userId));

    if (error) {
      showToast(`Supabase sync failed: ${error.message}`);
    }
  }

  async function deleteSupabasePrompt(promptId: string) {
    const userId = supabaseUserId();

    if (!supabase || !userId) {
      return;
    }

    const { error } = await supabase
      .from("prompts")
      .delete()
      .eq("id", promptId)
      .eq("user_id", userId);

    if (error) {
      showToast(`Supabase delete failed: ${error.message}`);
    }
  }

  async function persistRun(run: PromptRun) {
    const userId = supabaseUserId();

    if (!supabase || !userId) {
      return;
    }

    const { error } = await supabase.from("prompt_runs").insert({
      id: run.id,
      user_id: userId,
      prompt_id: run.promptId,
      input: run.input,
      output: run.output,
      model: run.model,
      provider: run.provider,
      latency_ms: run.latencyMs,
      created_at: run.createdAt,
    });

    if (error) {
      showToast(`Run sync failed: ${error.message}`);
    }
  }

  async function persistEvaluation(evaluation: PromptEvaluation) {
    const userId = supabaseUserId();

    if (!supabase || !userId) {
      return;
    }

    const { error } = await supabase.from("prompt_evaluations").insert({
      id: evaluation.id,
      user_id: userId,
      prompt_id: evaluation.promptId,
      input: evaluation.input,
      output: evaluation.output,
      model: evaluation.model,
      provider: evaluation.provider,
      latency_ms: evaluation.latencyMs,
      input_token_estimate: evaluation.inputTokenEstimate,
      output_token_estimate: evaluation.outputTokenEstimate,
      token_estimate: evaluation.tokenEstimate,
      estimated_cost_usd: evaluation.estimatedCostUsd,
      output_length: evaluation.outputLength,
      quality_score: evaluation.qualityScore,
      created_at: evaluation.createdAt,
    });

    if (error && !/prompt_evaluations/i.test(error.message)) {
      showToast(`Evaluation sync failed: ${error.message}`);
    }
  }

  async function persistExperiment(experiment: PromptExperiment) {
    const userId = supabaseUserId();

    if (!supabase || !userId) {
      return;
    }

    const workspaceId = isUuid(experiment.workspaceId) ? experiment.workspaceId : null;
    const promptId = isUuid(experiment.promptId) ? experiment.promptId : null;
    const experimentResult = await supabase.from("prompt_experiments").upsert({
      id: experiment.id,
      user_id: userId,
      workspace_id: workspaceId,
      prompt_id: promptId,
      title: experiment.title,
      hypothesis: experiment.hypothesis,
      status: experiment.status,
      updated_at: experiment.updatedAt,
      created_at: experiment.createdAt,
    });

    if (experimentResult.error) {
      if (!/prompt_experiments/i.test(experimentResult.error.message)) {
        showToast(`Experiment sync failed: ${experimentResult.error.message}`);
      }
      return;
    }

    const variantResult = await supabase.from("prompt_experiment_variants").upsert(
      experiment.variants.map((variant) => ({
        id: variant.id,
        experiment_id: experiment.id,
        prompt_id: isUuid(variant.promptId) ? variant.promptId : null,
        label: variant.label,
        content: variant.content,
        model: variant.model,
        temperature: variant.temperature,
        notes: variant.notes,
      })),
    );

    if (variantResult.error) {
      showToast(`Variant sync failed: ${variantResult.error.message}`);
      return;
    }

    if (!experiment.results.length) {
      return;
    }

    const resultSync = await supabase.from("prompt_experiment_results").upsert(
      experiment.results.map((result) => ({
        id: result.id,
        experiment_id: experiment.id,
        variant_id: result.variantId,
        user_id: userId,
        provider: result.provider,
        model: result.model,
        output: result.output,
        latency_ms: result.latencyMs,
        input_token_estimate: result.inputTokenEstimate,
        output_token_estimate: result.outputTokenEstimate,
        token_estimate: result.tokenEstimate,
        estimated_cost_usd: result.estimatedCostUsd,
        output_length: result.outputLength,
        quality_score: result.qualityScore,
        hallucination_risk: result.hallucinationRisk,
        created_at: result.createdAt,
      })),
    );

    if (resultSync.error) {
      showToast(`Experiment result sync failed: ${resultSync.error.message}`);
    }
  }

  async function startDemoSession() {
    setAuthMessage("");
    await supabase?.auth.signOut({ scope: "local" });

    setSession({
      id: "demo-user",
      email: demoCredentials.email,
      provider: "Demo",
    });
    setAuthMessage("Demo workspace unlocked.");
  }

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthMessage("");

    if (isDemoCredentials()) {
      await startDemoSession();
      return;
    }

    if (!supabase) {
      await startDemoSession();
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword,
    });

    if (data.user?.email) {
      setSession({ id: data.user.id, email: data.user.email, provider: "Supabase" });
      setAuthMessage("Signed in.");
      return;
    }

    if (error) {
      setAuthMessage(error.message);
    }
  }

  async function createAccount() {
    setAuthMessage("");

    if (isDemoCredentials()) {
      await startDemoSession();
      return;
    }

    if (!supabase) {
      await startDemoSession();
      return;
    }

    const signUp = await supabase.auth.signUp({
      email: authEmail,
      password: authPassword,
    });

    if (signUp.error) {
      setAuthMessage(signUp.error.message);
      return;
    }

    setAuthMessage("Account created. Check your email if confirmations are enabled.");
  }

  async function signOut() {
    await supabase?.auth.signOut();
    setSession(null);
    setAuthMessage("");
  }

  function startCreate() {
    const categoryId =
      categoryFilter === "all" ? workspace.categories[0]?.id ?? "" : categoryFilter;

    setEditingPromptId(null);
    setForm(emptyForm(categoryId));
    setOptimization(null);
    setVersionNotes("");
  }

  function startEdit(prompt: ManagedPrompt) {
    setEditingPromptId(prompt.id);
    setSelectedPromptId(prompt.id);
    setForm({
      title: prompt.title,
      description: prompt.description,
      content: prompt.content,
      categoryId: prompt.categoryId,
      tags: prompt.tags.join(", "),
      model: prompt.model,
      temperature: prompt.temperature,
      isPublic: prompt.isPublic,
    });
    setVersionNotes("");
    setOptimization(null);
  }

  function promptIdForCurrentMode(prefix: string) {
    return supabaseUserId() ? crypto.randomUUID() : createId(prefix);
  }

  function savePrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = form.title.trim();
    const content = form.content.trim();

    if (!title || !content) {
      showToast("A title and prompt body are required.");
      return;
    }

    const tags = form.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 8);

    const timestamp = new Date().toISOString();

    if (editingPromptId) {
      const existing = workspace.prompts.find((prompt) => prompt.id === editingPromptId);

      if (!existing) {
        showToast("Prompt not found.");
        return;
      }

      const updatedPrompt: ManagedPrompt = {
        ...existing,
        title,
        description: form.description.trim(),
        content,
        categoryId: form.categoryId,
        tags,
        model: form.model.trim() || "gpt-5",
        temperature: form.temperature,
        isPublic: form.isPublic,
        shareSlug: form.isPublic
          ? existing.shareSlug ?? createShareSlug(title)
          : null,
        updatedAt: timestamp,
      };
      const version = snapshotPromptVersion(existing, versionNotes);

      setWorkspace((current) => ({
        ...current,
        versions: [version, ...current.versions],
        prompts: current.prompts.map((prompt) =>
          prompt.id === editingPromptId ? updatedPrompt : prompt,
        ),
      }));
      recordActivity(
        "prompt.versioned",
        `Saved v${version.versionNumber} before updating ${existing.title}.`,
        existing.id,
      );
      void persistPrompt(updatedPrompt);
    } else {
      const id = promptIdForCurrentMode("prompt");
      const prompt: ManagedPrompt = {
        id,
        title,
        description: form.description.trim(),
        content,
        categoryId: form.categoryId,
        tags,
        model: form.model.trim() || "gpt-5",
        temperature: form.temperature,
        isFavorite: false,
        isPublic: form.isPublic,
        shareSlug: form.isPublic ? createShareSlug(title) : null,
        usageCount: 0,
        lastTestedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      setWorkspace((current) => ({ ...current, prompts: [prompt, ...current.prompts] }));
      setSelectedPromptId(id);
      recordActivity("prompt.created", `Created ${prompt.title}.`, prompt.id);
      void persistPrompt(prompt);
    }

    setEditingPromptId(null);
    setForm(emptyForm(form.categoryId));
    setVersionNotes("");
    showToast(editingPromptId ? "Prompt updated." : "Prompt saved.");
  }

  function deletePrompt(promptId: string) {
    const deletedPrompt = workspace.prompts.find((prompt) => prompt.id === promptId);

    setWorkspace((current) => {
      const prompts = current.prompts.filter((prompt) => prompt.id !== promptId);
      return {
        ...current,
        prompts,
        runs: current.runs.filter((run) => run.promptId !== promptId),
        versions: current.versions.filter((version) => version.promptId !== promptId),
        evaluations: current.evaluations.filter(
          (evaluation) => evaluation.promptId !== promptId,
        ),
      };
    });

    showToast("Prompt deleted.");
    recordActivity(
      "prompt.deleted",
      `Deleted ${deletedPrompt?.title ?? "a prompt"}.`,
      promptId,
    );
    void deleteSupabasePrompt(promptId);
  }

  function toggleFavorite(promptId: string) {
    const existing = workspace.prompts.find((prompt) => prompt.id === promptId);

    if (!existing) {
      return;
    }

    const updatedPrompt = {
      ...existing,
      isFavorite: !existing.isFavorite,
      updatedAt: new Date().toISOString(),
    };

    setWorkspace((current) => ({
      ...current,
      prompts: current.prompts.map((prompt) =>
        prompt.id === promptId ? updatedPrompt : prompt,
      ),
    }));
    recordActivity(
      "prompt.favorite",
      `${updatedPrompt.isFavorite ? "Favorited" : "Unfavorited"} ${updatedPrompt.title}.`,
      promptId,
    );
    void persistPrompt(updatedPrompt);
  }

  function toggleShare(promptId: string) {
    const existing = workspace.prompts.find((prompt) => prompt.id === promptId);

    if (!existing) {
      return;
    }

    const updatedPrompt = {
      ...existing,
      isPublic: !existing.isPublic,
      shareSlug: existing.isPublic
        ? null
        : existing.shareSlug ?? createShareSlug(existing.title),
      updatedAt: new Date().toISOString(),
    };

    setWorkspace((current) => ({
      ...current,
      prompts: current.prompts.map((prompt) =>
        prompt.id === promptId ? updatedPrompt : prompt,
      ),
    }));
    recordActivity(
      "prompt.share",
      `${updatedPrompt.isPublic ? "Shared" : "Privatized"} ${updatedPrompt.title}.`,
      promptId,
    );
    void persistPrompt(updatedPrompt);
  }

  function duplicatePrompt(prompt: ManagedPrompt) {
    const timestamp = new Date().toISOString();
    const copy: ManagedPrompt = {
      ...prompt,
      id: promptIdForCurrentMode("prompt"),
      title: `${prompt.title} Copy`,
      isFavorite: false,
      isPublic: false,
      shareSlug: null,
      usageCount: 0,
      lastTestedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    setWorkspace((current) => ({ ...current, prompts: [copy, ...current.prompts] }));
    setSelectedPromptId(copy.id);
    startEdit(copy);
    showToast("Prompt duplicated.");
    recordActivity("prompt.duplicated", `Duplicated ${prompt.title}.`, copy.id);
    void persistPrompt(copy);
  }

  function rollbackToVersion(version: PromptVersion) {
    const existing = workspace.prompts.find((prompt) => prompt.id === version.promptId);

    if (!existing) {
      showToast("Prompt not found for rollback.");
      return;
    }

    const snapshot = snapshotPromptVersion(
      existing,
      `Rollback point before restoring v${version.versionNumber}.`,
    );
    const restoredPrompt: ManagedPrompt = {
      ...existing,
      title: version.title,
      description: version.description,
      content: version.content,
      tags: version.tags,
      model: version.model,
      temperature: version.temperature,
      updatedAt: new Date().toISOString(),
    };

    setWorkspace((current) => ({
      ...current,
      versions: [snapshot, ...current.versions],
      prompts: current.prompts.map((prompt) =>
        prompt.id === restoredPrompt.id ? restoredPrompt : prompt,
      ),
    }));
    startEdit(restoredPrompt);
    showToast(`Rolled back to v${version.versionNumber}.`);
    recordActivity(
      "prompt.rollback",
      `Rolled back ${existing.title} to v${version.versionNumber}.`,
      existing.id,
    );
    void persistPrompt(restoredPrompt);
  }

  async function copyShareLink(prompt: ManagedPrompt) {
    const slug = prompt.shareSlug ?? createShareSlug(prompt.title);

    if (!prompt.isPublic || !prompt.shareSlug) {
      const updatedPrompt = {
        ...prompt,
        isPublic: true,
        shareSlug: slug,
        updatedAt: new Date().toISOString(),
      };

      setWorkspace((current) => ({
        ...current,
        prompts: current.prompts.map((item) =>
          item.id === prompt.id ? updatedPrompt : item,
        ),
      }));
      recordActivity("prompt.shared", `Enabled public sharing for ${prompt.title}.`, prompt.id);
      void persistPrompt(updatedPrompt);
    }

    await navigator.clipboard.writeText(`${window.location.origin}/share/${slug}`);
    showToast("Share link copied.");
  }

  function exportPrompts(format: "json" | "md") {
    const prompts = filteredPrompts.length ? filteredPrompts : workspace.prompts;
    const name = `promptdeck-${fileSafeDate()}.${format}`;
    const content =
      format === "json"
        ? buildJsonExport(prompts, workspace.categories)
        : buildMarkdownExport(prompts, workspace.categories);

    downloadFile(
      name,
      content,
      format === "json" ? "application/json" : "text/markdown",
    );
    showToast(`${format.toUpperCase()} export downloaded.`);
  }

  async function runPromptTest() {
    if (!selectedPrompt) {
      return;
    }

    if (missingVariables.length) {
      showToast(`Add values for: ${missingVariables.join(", ")}`);
      return;
    }

    setTesting(true);
    setTestOutput("");
    const renderedPrompt = renderPromptTemplate(selectedPrompt.content, variablePayload);

    try {
      const response = await fetch("/api/test-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: renderedPrompt,
          input: testInput,
          model: selectedPrompt.model,
          temperature: selectedPrompt.temperature,
          demoMode: session?.provider === "Demo",
        }),
      });

      const payload = (await response.json()) as TestResult & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Prompt test failed.");
      }

      setTestOutput(payload.output);

      const timestamp = new Date().toISOString();
      const updatedPrompt = {
        ...selectedPrompt,
        usageCount: selectedPrompt.usageCount + 1,
        lastTestedAt: timestamp,
        updatedAt: timestamp,
      };
      const run: PromptRun = {
        id: promptIdForCurrentMode("run"),
        promptId: selectedPrompt.id,
        input: testInput,
        output: payload.output,
        model: payload.model,
        provider: payload.provider,
        latencyMs: payload.latencyMs,
        createdAt: timestamp,
      };
      const operation = buildOperationTrace({
        entityType: "prompt",
        entityId: run.id,
        name: `${selectedPrompt.title} prompt run`,
        model: payload.model,
        provider: payload.provider,
        latencyMs: payload.latencyMs,
        inputTokens: Math.max(1, Math.ceil(renderedPrompt.length / 4)),
        outputTokens: Math.max(1, Math.ceil(payload.output.length / 4)),
        cost: payload.provider === "demo" ? 0 : 0.0012,
        qualityScore: 86,
        steps: [
          { label: "Render prompt template", kind: "prompt" },
          { label: "Call model provider", kind: "model" },
          { label: "Persist response artifact", kind: "artifact" },
        ],
        artifactTitle: `${selectedPrompt.title} output`,
        artifactContent: payload.output,
      });

      setWorkspace((current) => ({
        ...current,
        runs: [run, ...current.runs],
        aiRuns: [operation.run, ...current.aiRuns].slice(0, 300),
        aiTraceEvents: [...operation.traceEvents, ...current.aiTraceEvents].slice(0, 1200),
        aiArtifacts: [operation.artifact, ...current.aiArtifacts].slice(0, 300),
        aiMetrics: [...operation.metrics, ...current.aiMetrics].slice(0, 600),
        traceSessions: [operation.trace, ...current.traceSessions].slice(0, 200),
        traceNodes: [...operation.traceNodes, ...current.traceNodes].slice(0, 1000),
        traceSteps: [...operation.traceSteps, ...current.traceSteps].slice(0, 800),
        traceLogs: [...operation.traceLogs, ...current.traceLogs].slice(0, 800),
        prompts: current.prompts.map((prompt) =>
          prompt.id === selectedPrompt.id ? updatedPrompt : prompt,
        ),
      }));
      setSelectedTraceId(operation.trace.id);
      recordActivity(
        "prompt.tested",
        `Tested ${selectedPrompt.title} with ${payload.provider}.`,
        selectedPrompt.id,
      );
      void persistRun(run);
      void persistPrompt(updatedPrompt);
    } catch (error) {
      setTestOutput(error instanceof Error ? error.message : "Prompt test failed.");
    } finally {
      setTesting(false);
    }
  }

  async function runSideBySideEvaluation() {
    if (!selectedPrompt) {
      return;
    }

    if (missingVariables.length) {
      showToast(`Add values for: ${missingVariables.join(", ")}`);
      return;
    }

    setEvaluating(true);
    const renderedPrompt = renderPromptTemplate(selectedPrompt.content, variablePayload);

    try {
      const response = await fetch("/api/evaluate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: renderedPrompt,
          input: testInput,
          models: evaluationModels,
          demoMode: session?.provider === "Demo",
        }),
      });
      const payload = (await response.json()) as {
        evaluations?: EvaluationResult[];
        error?: string;
      };

      if (!response.ok || !payload.evaluations) {
        throw new Error(payload.error ?? "Evaluation failed.");
      }

      const timestamp = new Date().toISOString();
      const evaluations = payload.evaluations.map((evaluation) => ({
        ...evaluation,
        id: promptIdForCurrentMode("eval"),
        promptId: selectedPrompt.id,
        input: testInput,
        createdAt: timestamp,
      })) satisfies PromptEvaluation[];
      const operations = evaluations.map((evaluation) =>
        buildOperationTrace({
          entityType: "evaluation",
          entityId: evaluation.id,
          name: `${selectedPrompt.title} ${evaluation.model} evaluation`,
          model: evaluation.model,
          provider: evaluation.provider,
          latencyMs: evaluation.latencyMs,
          inputTokens: evaluation.inputTokenEstimate,
          outputTokens: evaluation.outputTokenEstimate,
          cost: evaluation.estimatedCostUsd,
          qualityScore: evaluation.qualityScore,
          steps: [
            { label: "Prepare rubric context", kind: "prompt" },
            { label: "Run model comparison", kind: "model" },
            { label: "Score quality metrics", kind: "artifact" },
          ],
          artifactTitle: `${evaluation.model} evaluation output`,
          artifactContent: evaluation.output,
        }),
      );

      setEvaluationResults(payload.evaluations);
      setWorkspace((current) => ({
        ...current,
        evaluations: [...evaluations, ...current.evaluations].slice(0, 200),
        aiRuns: [...operations.map((operation) => operation.run), ...current.aiRuns].slice(0, 300),
        aiTraceEvents: [
          ...operations.flatMap((operation) => operation.traceEvents),
          ...current.aiTraceEvents,
        ].slice(0, 1200),
        aiArtifacts: [
          ...operations.map((operation) => operation.artifact),
          ...current.aiArtifacts,
        ].slice(0, 300),
        aiMetrics: [
          ...operations.flatMap((operation) => operation.metrics),
          ...current.aiMetrics,
        ].slice(0, 600),
        traceSessions: [
          ...operations.map((operation) => operation.trace),
          ...current.traceSessions,
        ].slice(0, 200),
        traceNodes: [
          ...operations.flatMap((operation) => operation.traceNodes),
          ...current.traceNodes,
        ].slice(0, 1000),
        traceSteps: [
          ...operations.flatMap((operation) => operation.traceSteps),
          ...current.traceSteps,
        ].slice(0, 800),
        traceLogs: [
          ...operations.flatMap((operation) => operation.traceLogs),
          ...current.traceLogs,
        ].slice(0, 800),
      }));
      setSelectedTraceId(operations[0]?.trace.id ?? selectedTraceId);
      evaluations.forEach((evaluation) => {
        void persistEvaluation(evaluation);
      });
      recordActivity(
        "evaluation.completed",
        `Compared ${selectedPrompt.title} across ${evaluations.length} model adapters.`,
        selectedPrompt.id,
      );
      showToast("Side-by-side evaluation complete.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Evaluation failed.");
    } finally {
      setEvaluating(false);
    }
  }

  function createExperimentFromPrompt() {
    if (!selectedPrompt) {
      showToast("Select a prompt before creating an experiment.");
      return;
    }

    const timestamp = new Date().toISOString();
    const structuredVariant = [
      selectedPrompt.content,
      "",
      "Experiment guardrails:",
      "1. Separate facts, assumptions, and recommendations.",
      "2. Score confidence for each recommendation.",
      "3. Flag missing context instead of inventing details.",
      "4. End with measurable next actions.",
    ].join("\n");
    const experiment: PromptExperiment = {
      id: promptIdForCurrentMode("experiment"),
      workspaceId: activeWorkspace?.id ?? "workspace-promptops",
      promptId: selectedPrompt.id,
      title: `${selectedPrompt.title} Experiment`,
      hypothesis:
        "A structured PromptOps variant will increase quality and risk control while keeping latency and cost inside acceptable bounds.",
      status: "draft",
      variants: [
        {
          id: promptIdForCurrentMode("variant"),
          label: "Version A",
          promptId: selectedPrompt.id,
          content: selectedPrompt.content,
          model: selectedPrompt.model,
          temperature: selectedPrompt.temperature,
          notes: "Current production prompt.",
        },
        {
          id: promptIdForCurrentMode("variant"),
          label: "Version B",
          promptId: selectedPrompt.id,
          content: structuredVariant,
          model: selectedPrompt.model,
          temperature: Math.max(0, selectedPrompt.temperature - 0.05),
          notes: "Structured PromptOps variant with evidence boundaries.",
        },
      ],
      results: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    setWorkspace((current) => ({
      ...current,
      experiments: [experiment, ...current.experiments],
    }));
    setSelectedExperimentId(experiment.id);
    setActiveView("benchmarks");
    recordActivity(
      "experiment.created",
      `Created experiment for ${selectedPrompt.title}.`,
      selectedPrompt.id,
    );
    void persistExperiment(experiment);
    showToast("Prompt experiment created.");
  }

  async function runPromptExperiment(experiment: PromptExperiment) {
    if (!experiment.variants.length) {
      showToast("Add variants before running an experiment.");
      return;
    }

    if (missingVariables.length) {
      showToast(`Add values for: ${missingVariables.join(", ")}`);
      return;
    }

    setExperimentRunning(true);
    const timestamp = new Date().toISOString();

    try {
      const batches = await Promise.all(
        experiment.variants.map(async (variant) => {
          const response = await fetch("/api/evaluate-prompt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: renderPromptTemplate(variant.content, variablePayload),
              input: testInput,
              models: evaluationModels,
              demoMode: session?.provider === "Demo",
            }),
          });
          const payload = (await response.json()) as {
            evaluations?: EvaluationResult[];
            error?: string;
          };

          if (!response.ok || !payload.evaluations) {
            throw new Error(payload.error ?? "Experiment evaluation failed.");
          }

          return payload.evaluations.map((evaluation) => ({
            id: promptIdForCurrentMode("experiment-result"),
            variantId: variant.id,
            variantLabel: variant.label,
            model: evaluation.model,
            provider: evaluation.provider,
            output: evaluation.output,
            latencyMs: evaluation.latencyMs,
            inputTokenEstimate: evaluation.inputTokenEstimate,
            outputTokenEstimate: evaluation.outputTokenEstimate,
            tokenEstimate: evaluation.tokenEstimate,
            estimatedCostUsd: evaluation.estimatedCostUsd,
            outputLength: evaluation.outputLength,
            qualityScore: evaluation.qualityScore,
            hallucinationRisk: Math.max(2, 100 - evaluation.qualityMetrics.riskControl),
            createdAt: timestamp,
          })) satisfies PromptExperimentResult[];
        }),
      );
      const results = batches.flat();
      const updatedExperiment = {
        ...experiment,
        status: "completed",
        results,
        updatedAt: timestamp,
      } satisfies PromptExperiment;
      const averageQuality = results.length
        ? Math.round(
            results.reduce((total, result) => total + result.qualityScore, 0) /
              results.length,
          )
        : 0;
      const operation = buildOperationTrace({
        entityType: "experiment",
        entityId: experiment.id,
        name: `${experiment.title} experiment run`,
        model: "multi-model",
        provider: "demo",
        latencyMs: results.reduce((total, result) => total + result.latencyMs, 0),
        inputTokens: results.reduce((total, result) => total + result.inputTokenEstimate, 0),
        outputTokens: results.reduce((total, result) => total + result.outputTokenEstimate, 0),
        cost: Number(
          results
            .reduce((total, result) => total + result.estimatedCostUsd, 0)
            .toFixed(6),
        ),
        qualityScore: averageQuality,
        steps: [
          { label: "Generate prompt variants", kind: "prompt" },
          { label: "Execute model matrix", kind: "parallel" },
          { label: "Rank variants and persist scores", kind: "artifact" },
        ],
        artifactTitle: `${experiment.title} benchmark report`,
        artifactContent: `Ranked ${results.length} variant/model outputs with average score ${averageQuality}.`,
      });

      setWorkspace((current) => ({
        ...current,
        experiments: current.experiments.map((item) =>
          item.id === experiment.id ? updatedExperiment : item,
        ),
        aiRuns: [operation.run, ...current.aiRuns].slice(0, 300),
        aiTraceEvents: [...operation.traceEvents, ...current.aiTraceEvents].slice(0, 1200),
        aiArtifacts: [operation.artifact, ...current.aiArtifacts].slice(0, 300),
        aiMetrics: [...operation.metrics, ...current.aiMetrics].slice(0, 600),
        traceSessions: [operation.trace, ...current.traceSessions].slice(0, 200),
        traceNodes: [...operation.traceNodes, ...current.traceNodes].slice(0, 1000),
        traceSteps: [...operation.traceSteps, ...current.traceSteps].slice(0, 800),
        traceLogs: [...operation.traceLogs, ...current.traceLogs].slice(0, 800),
      }));
      setSelectedTraceId(operation.trace.id);
      recordActivity(
        "experiment.completed",
        `Ran ${experiment.title} across ${results.length} variant/model comparisons.`,
        experiment.promptId,
      );
      void persistExperiment(updatedExperiment);
      showToast("Experiment results ready.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Experiment failed.");
    } finally {
      setExperimentRunning(false);
    }
  }

  function runWorkflow(workflow: AIWorkflow) {
    setWorkflowRunning(true);
    const timestamp = new Date().toISOString();
    const run = {
      id: promptIdForCurrentMode("workflow-run"),
      workflowId: workflow.id,
      status: "completed",
      latencyMs: 900 + workflow.nodes.length * 140,
      tokenEstimate: 420 + workflow.nodes.length * 95,
      estimatedCostUsd: Number((0.0018 + workflow.nodes.length * 0.00084).toFixed(6)),
      logs: [
        "Queued workflow execution.",
        ...workflow.nodes.map((node) => `Executed ${node.kind} node: ${node.label}.`),
        "Stored workflow output and telemetry.",
      ],
      createdAt: timestamp,
    } satisfies PromptWorkspace["workflowRuns"][number];
    const operation = buildOperationTrace({
      entityType: "workflow",
      entityId: run.id,
      name: `${workflow.name} workflow execution`,
      model: "multi-model",
      provider: "demo",
      latencyMs: run.latencyMs,
      inputTokens: Math.round(run.tokenEstimate * 0.55),
      outputTokens: Math.round(run.tokenEstimate * 0.45),
      cost: run.estimatedCostUsd,
      qualityScore: 90,
      steps: [
        { label: "Hydrate workflow state", kind: "prompt" },
        { label: "Run condition and loop nodes", kind: "loop" },
        { label: "Execute parallel model branch", kind: "parallel" },
        { label: "Persist workflow artifact", kind: "artifact" },
      ],
      artifactTitle: `${workflow.name} output artifact`,
      artifactContent: run.logs.join("\n"),
    });

    window.setTimeout(() => {
      setWorkspace((current) => ({
        ...current,
        workflowRuns: [run, ...current.workflowRuns].slice(0, 100),
        aiRuns: [operation.run, ...current.aiRuns].slice(0, 300),
        aiTraceEvents: [...operation.traceEvents, ...current.aiTraceEvents].slice(0, 1200),
        aiArtifacts: [operation.artifact, ...current.aiArtifacts].slice(0, 300),
        aiMetrics: [...operation.metrics, ...current.aiMetrics].slice(0, 600),
        traceSessions: [operation.trace, ...current.traceSessions].slice(0, 200),
        traceNodes: [...operation.traceNodes, ...current.traceNodes].slice(0, 1000),
        traceSteps: [...operation.traceSteps, ...current.traceSteps].slice(0, 800),
        traceLogs: [...operation.traceLogs, ...current.traceLogs].slice(0, 800),
        auditLogs: [
          {
            id: createId("audit"),
            actor: session?.email ?? "demo@promptdeck.ai",
            action: "workflow.run.completed",
            target: workflow.name,
            createdAt: timestamp,
          },
          ...current.auditLogs,
        ],
      }));
      recordActivity(
        "workflow.completed",
        `Completed ${workflow.name} with ${workflow.nodes.length} nodes.`,
        workflow.nodes.find((node) => node.promptId)?.promptId,
      );
      setSelectedTraceId(operation.trace.id);
      setWorkflowRunning(false);
      showToast("Workflow run complete.");
    }, 450);
  }

  function runAgent(agent: PromptWorkspace["agents"][number]) {
    setAgentRunning(true);
    const timestamp = new Date().toISOString();
    const traceId = promptIdForCurrentMode("trace");
    const aiRunId = promptIdForCurrentMode("ai-run");
    const selectedTool =
      workspace.agentTools.find(
        (tool) => tool.agentId === agent.id && tool.name === agent.tools[0],
      ) ?? workspace.agentTools.find((tool) => tool.agentId === agent.id);
    const run = {
      id: promptIdForCurrentMode("agent-run"),
      agentId: agent.id,
      runId: aiRunId,
      traceId,
      objective: `Execute ${agent.name} against the selected AI operations lifecycle.`,
      status: "completed",
      latencyMs: 1750 + agent.tools.length * 180,
      tokenEstimate: 980 + agent.memoryKeys.length * 110,
      estimatedCostUsd: Number((0.0042 + agent.tools.length * 0.0011).toFixed(6)),
      createdAt: timestamp,
      steps: [
        {
          id: promptIdForCurrentMode("agent-step"),
          label: "Plan execution",
          kind: "reasoning",
          status: "completed",
          detail: "Selected tools, memory, and branch strategy.",
          latencyMs: 340,
          tokenEstimate: 210,
        },
        {
          id: promptIdForCurrentMode("agent-step"),
          label: `Invoke ${agent.tools[0] ?? "tool"} tool`,
          kind: "tool_call",
          status: "completed",
          detail: "Tool abstraction returned deterministic demo context.",
          latencyMs: 520,
          tokenEstimate: 260,
        },
        {
          id: promptIdForCurrentMode("agent-step"),
          label: "Persist memory and final artifact",
          kind: "final",
          status: "completed",
          detail: "Stored run trace, memory update, artifact, and metrics.",
          latencyMs: 890,
          tokenEstimate: 610,
        },
      ],
    } satisfies PromptWorkspace["agentRuns"][number];
    const operation = buildOperationTrace({
      entityType: "agent",
      entityId: run.id,
      name: `${agent.name} execution`,
      model: "gpt-5",
      provider: "demo",
      latencyMs: run.latencyMs,
      inputTokens: Math.round(run.tokenEstimate * 0.6),
      outputTokens: Math.round(run.tokenEstimate * 0.4),
      cost: run.estimatedCostUsd,
      qualityScore: 91,
      steps: [
        { label: "Reason about objective", kind: "model" },
        { label: "Call agent tool", kind: "tool" },
        { label: "Write memory and artifact", kind: "artifact" },
      ],
      artifactTitle: `${agent.name} run artifact`,
      artifactContent: run.steps.map((step) => step.detail).join("\n"),
      runId: aiRunId,
      traceId,
    });
    const memory = {
      id: promptIdForCurrentMode("memory"),
      agentId: agent.id,
      key: "latest_run_summary",
      value: `${agent.name} completed a multi-step execution with ${agent.tools.length} tool abstractions.`,
      updatedAt: timestamp,
    } satisfies PromptWorkspace["agentMemory"][number];
    const toolCall = {
      id: promptIdForCurrentMode("agent-tool-call"),
      agentRunId: run.id,
      runId: aiRunId,
      traceId,
      agentId: agent.id,
      toolName: selectedTool?.name ?? agent.tools[0] ?? "mock-tool",
      toolKind: selectedTool?.kind ?? "http",
      inputSummary: "Selected runtime context, benchmark memory, and execution objective.",
      outputSummary: "Returned deterministic demo context for the agent reasoning chain.",
      status: "completed",
      latencyMs: 520,
      tokenEstimate: 260,
      estimatedCostUsd: 0.0011,
      createdAt: timestamp,
    } satisfies PromptWorkspace["agentToolCalls"][number];

    window.setTimeout(() => {
      setWorkspace((current) => ({
        ...current,
        agentRuns: [run, ...current.agentRuns].slice(0, 100),
        agentMemory: [memory, ...current.agentMemory].slice(0, 100),
        agentToolCalls: [toolCall, ...current.agentToolCalls].slice(0, 200),
        aiRuns: [operation.run, ...current.aiRuns].slice(0, 300),
        aiTraceEvents: [...operation.traceEvents, ...current.aiTraceEvents].slice(0, 1200),
        aiArtifacts: [operation.artifact, ...current.aiArtifacts].slice(0, 300),
        aiMetrics: [...operation.metrics, ...current.aiMetrics].slice(0, 600),
        traceSessions: [operation.trace, ...current.traceSessions].slice(0, 200),
        traceNodes: [...operation.traceNodes, ...current.traceNodes].slice(0, 1000),
        traceSteps: [...operation.traceSteps, ...current.traceSteps].slice(0, 800),
        traceLogs: [...operation.traceLogs, ...current.traceLogs].slice(0, 800),
      }));
      setSelectedTraceId(operation.trace.id);
      setAgentRunning(false);
      showToast("Agent execution complete.");
    }, 450);
  }

  function runBenchmarkSuite(suite: PromptWorkspace["benchmarkSuites"][number]) {
    setBenchmarkRunning(true);
    const timestamp = new Date().toISOString();
    const promptId = suite.promptIds[0] ?? selectedPrompt?.id ?? "prompt-prd";
    const model = suite.modelIds[0] ?? "gpt-5";
    const datasetId = suite.datasetIds[0] ?? "benchmark-dataset-product";
    const dataset = workspace.benchmarkDatasets.find((item) => item.id === datasetId);
    const aiRunId = promptIdForCurrentMode("ai-run");
    const run = {
      id: promptIdForCurrentMode("benchmark-run"),
      suiteId: suite.id,
      runId: aiRunId,
      promptId,
      model,
      datasetId,
      status: "completed",
      accuracy: 93,
      hallucinationRate: 7,
      latencyMs: 430,
      estimatedCostUsd: 0.00108,
      consistencyScore: 92,
      regressionDelta: 4,
      createdAt: timestamp,
    } satisfies PromptWorkspace["benchmarkRuns"][number];
    const score = {
      id: promptIdForCurrentMode("benchmark-score"),
      runId: run.id,
      metric: "human feedback placeholder",
      value: 90,
      createdAt: timestamp,
    } satisfies PromptWorkspace["benchmarkScores"][number];
    const result = {
      id: promptIdForCurrentMode("benchmark-result"),
      suiteId: suite.id,
      benchmarkRunId: run.id,
      runId: aiRunId,
      promptId,
      datasetId,
      model,
      taskType: dataset?.taskType ?? "general",
      correctness: run.accuracy,
      hallucinationRate: run.hallucinationRate,
      latencyMs: run.latencyMs,
      estimatedCostUsd: run.estimatedCostUsd,
      consistencyScore: run.consistencyScore,
      rubricScore: 91,
      output: "Generated benchmark output with evidence boundaries, metrics, and rollout risk notes.",
      expectedOutput:
        dataset?.examples[0]?.expected ??
        "A high-quality output that satisfies the selected benchmark rubric.",
      regressionDelta: run.regressionDelta,
      createdAt: timestamp,
    } satisfies PromptWorkspace["benchmarkResults"][number];
    const operation = buildOperationTrace({
      entityType: "benchmark",
      entityId: run.id,
      name: `${suite.name} benchmark run`,
      model,
      provider: "demo",
      latencyMs: run.latencyMs,
      inputTokens: 180,
      outputTokens: 120,
      cost: run.estimatedCostUsd,
      qualityScore: run.accuracy,
      steps: [
        { label: "Load benchmark dataset", kind: "prompt" },
        { label: "Execute model/prompt matrix", kind: "parallel" },
        { label: "Detect regression and update leaderboard", kind: "artifact" },
      ],
      artifactTitle: `${suite.name} report`,
      artifactContent: `Accuracy ${run.accuracy}, hallucination rate ${run.hallucinationRate}, regression delta ${run.regressionDelta}.`,
      runId: aiRunId,
    });

    window.setTimeout(() => {
      setWorkspace((current) => ({
        ...current,
        benchmarkRuns: [run, ...current.benchmarkRuns].slice(0, 120),
        benchmarkResults: [result, ...current.benchmarkResults].slice(0, 240),
        benchmarkScores: [score, ...current.benchmarkScores].slice(0, 240),
        aiRuns: [operation.run, ...current.aiRuns].slice(0, 300),
        aiTraceEvents: [...operation.traceEvents, ...current.aiTraceEvents].slice(0, 1200),
        aiArtifacts: [operation.artifact, ...current.aiArtifacts].slice(0, 300),
        aiMetrics: [...operation.metrics, ...current.aiMetrics].slice(0, 600),
        traceSessions: [operation.trace, ...current.traceSessions].slice(0, 200),
        traceNodes: [...operation.traceNodes, ...current.traceNodes].slice(0, 1000),
        traceSteps: [...operation.traceSteps, ...current.traceSteps].slice(0, 800),
        traceLogs: [...operation.traceLogs, ...current.traceLogs].slice(0, 800),
      }));
      setSelectedTraceId(operation.trace.id);
      setBenchmarkRunning(false);
      showToast("Benchmark suite complete.");
    }, 450);
  }

  function deploySelectedPrompt(environment: DeploymentEnvironment) {
    if (!selectedPrompt) {
      showToast("Select a prompt before deploying.");
      return;
    }

    const timestamp = new Date().toISOString();
    const version = latestVersion ?? snapshotPromptVersion(selectedPrompt, "Deployment snapshot.");
    const deployment: PromptDeployment = {
      id: promptIdForCurrentMode("deployment"),
      promptId: selectedPrompt.id,
      versionId: version.id,
      environment,
      status: "active",
      deployedBy: session?.email ?? "demo@promptdeck.ai",
      metadata: `Deployed from PromptDeck AI v3.1.0 to ${environment}.`,
      createdAt: timestamp,
    };
    const history = {
      id: promptIdForCurrentMode("deployment-history"),
      deploymentId: deployment.id,
      action: "deployed",
      summary: `Deployed ${selectedPrompt.title} to ${environment}.`,
      createdAt: timestamp,
    } satisfies PromptWorkspace["deploymentHistory"][number];
    const release = {
      id: promptIdForCurrentMode("release"),
      deploymentId: deployment.id,
      versionId: version.id,
      tag: `${createShareSlug(selectedPrompt.title)}@${version.versionNumber}.0.0`,
      environment,
      status: environment === "production" ? "watching" : "healthy",
      rolloutPercent: environment === "production" ? 25 : 100,
      healthScore: 88,
      notes: "Release created with benchmark, trace, and rollback metadata.",
      createdAt: timestamp,
    } satisfies PromptWorkspace["promptReleases"][number];
    const operation = buildOperationTrace({
      entityType: "deployment",
      entityId: deployment.id,
      name: `${selectedPrompt.title} ${environment} release`,
      model: selectedPrompt.model,
      provider: "system",
      latencyMs: 180,
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
      qualityScore: release.healthScore,
      steps: [
        { label: "Capture release snapshot", kind: "release" },
        { label: "Apply environment metadata", kind: "artifact" },
        { label: "Start rollout monitor", kind: "release" },
      ],
      artifactTitle: `${release.tag} release note`,
      artifactContent: release.notes,
    });

    setWorkspace((current) => ({
      ...current,
      deployments: [deployment, ...current.deployments],
      deploymentHistory: [history, ...current.deploymentHistory],
      promptReleases: [release, ...current.promptReleases],
      aiRuns: [operation.run, ...current.aiRuns].slice(0, 300),
      aiTraceEvents: [...operation.traceEvents, ...current.aiTraceEvents].slice(0, 1200),
      aiArtifacts: [operation.artifact, ...current.aiArtifacts].slice(0, 300),
      aiMetrics: [...operation.metrics, ...current.aiMetrics].slice(0, 600),
      traceSessions: [operation.trace, ...current.traceSessions].slice(0, 200),
      traceNodes: [...operation.traceNodes, ...current.traceNodes].slice(0, 1000),
      traceSteps: [...operation.traceSteps, ...current.traceSteps].slice(0, 800),
      traceLogs: [...operation.traceLogs, ...current.traceLogs].slice(0, 800),
      auditLogs: [
        {
          id: createId("audit"),
          actor: deployment.deployedBy,
          action: `deploy.${environment}`,
          target: selectedPrompt.title,
          createdAt: timestamp,
        },
        ...current.auditLogs,
      ],
      versions: latestVersion ? current.versions : [version, ...current.versions],
    }));
    recordActivity(
      "deployment.created",
      `Deployed ${selectedPrompt.title} to ${environment}.`,
      selectedPrompt.id,
    );
    setSelectedTraceId(operation.trace.id);
    showToast(`Deployed to ${environment}.`);
  }

  function promoteDeployment(deployment: PromptDeployment) {
    const targetEnvironment =
      deployment.environment === "development"
        ? "staging"
        : deployment.environment === "staging"
          ? "production"
          : "production";
    const promoted = {
      ...deployment,
      id: promptIdForCurrentMode("deployment"),
      environment: targetEnvironment,
      status: "active",
      createdAt: new Date().toISOString(),
    } satisfies PromptDeployment;
    const prompt = workspace.prompts.find((item) => item.id === deployment.promptId);
    const operation = buildOperationTrace({
      entityType: "deployment",
      entityId: promoted.id,
      name: `${prompt?.title ?? "Prompt"} promotion to ${targetEnvironment}`,
      model: prompt?.model ?? "system",
      provider: "system",
      latencyMs: 120,
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
      qualityScore: 90,
      steps: [
        { label: "Read deployment health", kind: "release" },
        { label: "Promote environment pointer", kind: "release" },
        { label: "Emit deployment dry-run trace", kind: "artifact" },
      ],
      artifactTitle: `${targetEnvironment} promotion trace`,
      artifactContent: `Promoted ${prompt?.title ?? "prompt"} from ${deployment.environment} to ${targetEnvironment}.`,
    });

    setWorkspace((current) => ({
      ...current,
      deployments: [promoted, ...current.deployments],
      aiRuns: [operation.run, ...current.aiRuns].slice(0, 300),
      aiTraceEvents: [...operation.traceEvents, ...current.aiTraceEvents].slice(0, 1200),
      aiArtifacts: [operation.artifact, ...current.aiArtifacts].slice(0, 300),
      aiMetrics: [...operation.metrics, ...current.aiMetrics].slice(0, 600),
      traceSessions: [operation.trace, ...current.traceSessions].slice(0, 200),
      traceNodes: [...operation.traceNodes, ...current.traceNodes].slice(0, 1000),
      traceSteps: [...operation.traceSteps, ...current.traceSteps].slice(0, 800),
      traceLogs: [...operation.traceLogs, ...current.traceLogs].slice(0, 800),
      deploymentHistory: [
        {
          id: promptIdForCurrentMode("deployment-history"),
          deploymentId: promoted.id,
          action: "promoted",
          summary: `Promoted ${prompt?.title ?? "prompt"} to ${targetEnvironment}.`,
          createdAt: promoted.createdAt,
        },
        ...current.deploymentHistory,
      ],
    }));
    setSelectedTraceId(operation.trace.id);
    showToast(`Promoted to ${targetEnvironment}.`);
  }

  function rollbackDeployment(deployment: PromptDeployment) {
    const timestamp = new Date().toISOString();
    const prompt = workspace.prompts.find((item) => item.id === deployment.promptId);
    const operation = buildOperationTrace({
      entityType: "deployment",
      entityId: deployment.id,
      name: `${prompt?.title ?? "Prompt"} rollback in ${deployment.environment}`,
      model: prompt?.model ?? "system",
      provider: "system",
      latencyMs: 140,
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
      qualityScore: 84,
      steps: [
        { label: "Locate previous release", kind: "release" },
        { label: "Repoint environment", kind: "release" },
        { label: "Write rollback artifact", kind: "artifact" },
      ],
      artifactTitle: `${deployment.environment} rollback trace`,
      artifactContent: `Rolled back ${prompt?.title ?? "prompt"} in ${deployment.environment}.`,
    });

    setWorkspace((current) => ({
      ...current,
      deployments: current.deployments.map((item) =>
        item.id === deployment.id ? { ...item, status: "rolled_back" } : item,
      ),
      aiRuns: [operation.run, ...current.aiRuns].slice(0, 300),
      aiTraceEvents: [...operation.traceEvents, ...current.aiTraceEvents].slice(0, 1200),
      aiArtifacts: [operation.artifact, ...current.aiArtifacts].slice(0, 300),
      aiMetrics: [...operation.metrics, ...current.aiMetrics].slice(0, 600),
      traceSessions: [operation.trace, ...current.traceSessions].slice(0, 200),
      traceNodes: [...operation.traceNodes, ...current.traceNodes].slice(0, 1000),
      traceSteps: [...operation.traceSteps, ...current.traceSteps].slice(0, 800),
      traceLogs: [...operation.traceLogs, ...current.traceLogs].slice(0, 800),
      deploymentHistory: [
        {
          id: promptIdForCurrentMode("deployment-history"),
          deploymentId: deployment.id,
          action: "rolled_back",
          summary: `Rolled back ${prompt?.title ?? "prompt"} in ${deployment.environment}.`,
          createdAt: timestamp,
        },
        ...current.deploymentHistory,
      ],
    }));
    setSelectedTraceId(operation.trace.id);
    showToast(`Rolled back ${deployment.environment}.`);
  }

  async function improvePrompt() {
    const sourcePrompt = form.content || selectedPrompt?.content;

    if (!sourcePrompt) {
      showToast("Choose or write a prompt first.");
      return;
    }

    setOptimizing(true);

    try {
      const response = await fetch("/api/optimize-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: sourcePrompt,
          demoMode: session?.provider === "Demo",
        }),
      });
      const payload = (await response.json()) as PromptOptimizationResult & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Prompt optimization failed.");
      }

      setOptimization(payload);
      const operation = buildOperationTrace({
        entityType: "prompt",
        entityId: selectedPrompt?.id ?? "draft-prompt",
        name: `${form.title || selectedPrompt?.title || "Draft prompt"} improvement run`,
        model: "gpt-5",
        provider: session?.provider === "Demo" ? "demo" : "openai",
        latencyMs: 520,
        inputTokens: Math.max(1, Math.ceil(sourcePrompt.length / 4)),
        outputTokens: Math.max(1, Math.ceil(payload.improvedPrompt.length / 4)),
        cost: session?.provider === "Demo" ? 0 : 0.0014,
        qualityScore: payload.qualityScore,
        steps: [
          { label: "Score prompt health", kind: "model" },
          { label: "Generate improvement suggestions", kind: "model" },
          { label: "Persist optimization artifact", kind: "artifact" },
        ],
        artifactTitle: "Prompt improvement suggestions",
        artifactContent: payload.suggestions.join("\n"),
      });
      setWorkspace((current) => ({
        ...current,
        aiRuns: [operation.run, ...current.aiRuns].slice(0, 300),
        aiTraceEvents: [...operation.traceEvents, ...current.aiTraceEvents].slice(0, 1200),
        aiArtifacts: [operation.artifact, ...current.aiArtifacts].slice(0, 300),
        aiMetrics: [...operation.metrics, ...current.aiMetrics].slice(0, 600),
        traceSessions: [operation.trace, ...current.traceSessions].slice(0, 200),
        traceNodes: [...operation.traceNodes, ...current.traceNodes].slice(0, 1000),
        traceSteps: [...operation.traceSteps, ...current.traceSteps].slice(0, 800),
        traceLogs: [...operation.traceLogs, ...current.traceLogs].slice(0, 800),
      }));
      setSelectedTraceId(operation.trace.id);
      recordActivity(
        "prompt.optimized",
        `Generated optimization guidance for ${form.title || selectedPrompt?.title || "draft prompt"}.`,
        selectedPrompt?.id,
      );
      showToast("Prompt improvement suggestions ready.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Prompt optimization failed.");
    } finally {
      setOptimizing(false);
    }
  }

  function applyOptimization() {
    if (!optimization) {
      return;
    }

    setForm((current) => ({
      ...current,
      content: optimization.improvedPrompt,
      tags: Array.from(
        new Set([
          ...current.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          "optimized",
          "promptops",
        ]),
      ).join(", "),
    }));
    showToast("Improved prompt applied to the builder.");
  }

  function inviteMember() {
    const email = inviteEmail.trim();

    if (!email) {
      showToast("Enter an email for the invite.");
      return;
    }

    const member = {
      id: createId("member"),
      workspaceId: activeWorkspace?.id ?? "workspace-promptops",
      email,
      role: "viewer",
      status: "invited",
    } satisfies PromptWorkspace["members"][number];

    setWorkspace((current) => ({
      ...current,
      members: [member, ...current.members],
    }));
    recordActivity("workspace.invite", `Queued invite for ${email}.`, null);
    setInviteEmail("");
    showToast("Invite queued.");
  }

  const viewTabs: { view: ActiveView; icon: LucideIcon; label: string }[] = [
    { view: "operations", icon: LayoutDashboard, label: "Operations" },
    { view: "workflows", icon: Blocks, label: "Workflows" },
    { view: "benchmarks", icon: Gauge, label: "Benchmarks" },
    { view: "agents", icon: Bot, label: "Agents" },
    { view: "deployments", icon: Rocket, label: "Releases" },
    { view: "observability", icon: Activity, label: "Observability" },
    { view: "analytics", icon: BarChart3, label: "Analytics" },
    { view: "team", icon: Users, label: "Team" },
  ];

  return (
    <main className="min-h-screen bg-[#f5f7f9] text-[var(--foreground)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-4 py-5 sm:px-6 lg:px-10">
        <header className="pb-6 pt-4">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-4xl">
              <div className="mb-5 flex items-center gap-3">
                <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-black text-white shadow-lg shadow-black/10">
                  <Sparkles size={22} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0f766e]">
                    AI Execution OS v3.1.0
                  </p>
                  <p className="text-sm font-semibold text-black/55">
                    Unified execution, traces, benchmarks, agents, and releases
                  </p>
                </div>
              </div>
              <h1 className="text-4xl font-semibold tracking-tight text-black sm:text-5xl lg:text-6xl">
                PromptDeck AI
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-black/60 sm:text-lg">
                A production-grade AI execution operating system where prompts, versions,
                experiments, evaluations, workflows, agents, releases, and observability
                share one execution model.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <StatusBadge
                  className="hidden sm:inline-flex"
                  icon={ServerCog}
                  label="Redis rate limits"
                />
                <StatusBadge
                  className="hidden lg:inline-flex"
                  icon={Activity}
                  label="PostHog/Sentry hooks"
                />
                <StatusBadge icon={ShieldCheck} label="RLS protected" />
                <StatusBadge icon={GitBranch} label="Backend frozen" />
                <StatusBadge
                  className="hidden sm:inline-flex"
                  icon={CircleDollarSign}
                  label="Cost estimates"
                />
              </div>
            </div>

            <div className="grid w-full grid-cols-2 gap-3 lg:w-[360px] xl:w-[420px]">
              <HeaderMetric label="Prompts" value={stats.prompts} />
              <HeaderMetric label="AI runs" value={stats.aiRuns} />
              <HeaderMetric label="Workflows" value={stats.workflows} />
              <HeaderMetric label="Agents" value={stats.agents} />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <button className="btn-secondary" onClick={() => setCommandOpen(true)}>
              <Command size={16} aria-hidden="true" />
              Cmd+K
            </button>
            <StatusBadge
              icon={publicConfig.isSupabaseConfigured ? ShieldCheck : Lock}
              label={
                publicConfig.isSupabaseConfigured
                  ? "Supabase ready"
                  : "Local demo mode"
              }
            />
            {!session ? (
              <button
                className="btn-secondary"
                disabled={!ready}
                onClick={() => {
                  void startDemoSession();
                }}
              >
                <Sparkles size={16} aria-hidden="true" />
                Use demo
              </button>
            ) : (
              <StatusBadge icon={Sparkles} label={`${session.provider} session`} />
            )}
            <button className="btn-secondary" onClick={() => exportPrompts("json")}>
              <Download size={16} aria-hidden="true" />
              JSON
            </button>
            <button className="btn-secondary" onClick={() => exportPrompts("md")}>
              <Clipboard size={16} aria-hidden="true" />
              Markdown
            </button>
            <button className="btn-primary" onClick={startCreate}>
              <Plus size={17} aria-hidden="true" />
              New prompt
            </button>
          </div>
        </header>

        <nav
          className="sticky top-0 z-30 grid grid-cols-2 gap-2 rounded-3xl border border-black/10 bg-white/85 p-2 shadow-sm shadow-black/[0.03] backdrop-blur sm:grid-cols-4 xl:grid-cols-8"
          aria-label="Primary workspace views"
        >
          {viewTabs.map(({ view, icon: TabIcon, label }) => {
            return (
              <button
                key={view}
                className={clsx(
                  "inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-2xl border px-3 text-sm font-semibold transition",
                  activeView === view
                    ? "border-black bg-black text-white shadow-sm shadow-black/10"
                    : "border-transparent bg-transparent text-black/60 hover:bg-black/[0.04] hover:text-black",
                )}
                onClick={() => setActiveView(view)}
              >
                <TabIcon className="shrink-0" size={15} aria-hidden="true" />
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </nav>

        {activeView === "operations" ? (
          <>
            <OperationsCommandCenter
              workspace={workspace}
              selectedPrompt={selectedPrompt}
              promptIntelligence={selectedPromptIntelligence}
              onOpenBenchmarks={() => setActiveView("benchmarks")}
              onOpenAgents={() => setActiveView("agents")}
              onOpenObservability={() => setActiveView("observability")}
            />
        <section className="grid flex-1 gap-8 py-9 xl:grid-cols-[280px_minmax(0,1fr)_390px]">
          <aside className="flex min-w-0 flex-col gap-5 xl:sticky xl:top-24 xl:self-start">
            <Panel title="Account" icon={Lock}>
              {session ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-black/10 bg-white p-3">
                    <p className="truncate text-sm font-semibold">{session.email}</p>
                    <p className="mt-1 text-xs text-black/55">{session.provider} session</p>
                  </div>
                  <button className="btn-secondary w-full justify-center" onClick={signOut}>
                    <LogOut size={16} aria-hidden="true" />
                    Sign out
                  </button>
                </div>
              ) : (
                <form className="space-y-3" onSubmit={handleAuth}>
                  <TextInput
                    label="Email"
                    value={authEmail}
                    onChange={setAuthEmail}
                    type="email"
                  />
                  <TextInput
                    label="Password"
                    value={authPassword}
                    onChange={setAuthPassword}
                    type="password"
                  />
                  <button
                    className="btn-primary w-full justify-center"
                    type="button"
                    disabled={!ready}
                    onClick={() => {
                      void startDemoSession();
                    }}
                  >
                    <Sparkles size={16} aria-hidden="true" />
                    Use demo
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      className="btn-secondary justify-center"
                      type="submit"
                      disabled={!ready}
                    >
                      <LogIn size={16} aria-hidden="true" />
                      Sign in
                    </button>
                    <button
                      className="btn-secondary justify-center"
                      type="button"
                      disabled={!ready}
                      onClick={() => {
                        void createAccount();
                      }}
                    >
                      <Plus size={16} aria-hidden="true" />
                      Create
                    </button>
                  </div>
                  {authMessage ? (
                    <p className="text-xs font-medium text-[#0f766e]">{authMessage}</p>
                  ) : null}
                </form>
              )}
            </Panel>

            <Panel title="Categories" icon={Filter}>
              <div className="space-y-2">
                <CategoryButton
                  active={categoryFilter === "all"}
                  color="#111827"
                  label="All prompts"
                  count={workspace.prompts.length}
                  onClick={() => setCategoryFilter("all")}
                />
                {workspace.categories.map((category) => (
                  <CategoryButton
                    key={category.id}
                    active={categoryFilter === category.id}
                    color={category.color}
                    label={category.name}
                    count={
                      workspace.prompts.filter(
                        (prompt) => prompt.categoryId === category.id,
                      ).length
                    }
                    onClick={() => setCategoryFilter(category.id)}
                  />
                ))}
              </div>
            </Panel>

            <Panel title="Portfolio Metrics" icon={LayoutDashboard}>
              <dl className="grid grid-cols-2 gap-2">
                <Metric label="Prompts" value={stats.prompts} />
                <Metric label="Favorites" value={stats.favorites} />
                <Metric label="Shared" value={stats.shared} />
                <Metric label="Tests" value={stats.tests} />
              </dl>
            </Panel>
          </aside>

          <section className="grid min-w-0 gap-5 lg:grid-cols-[minmax(280px,0.88fr)_minmax(340px,1.12fr)]">
            <Panel title="Library" icon={Search}>
              <div className="space-y-3">
                <label className="relative block">
                  <span className="sr-only">Search prompts</span>
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black/45"
                    size={16}
                    aria-hidden="true"
                  />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="input pl-9"
                    placeholder="Search title, tag, or prompt body"
                  />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <ToggleButton
                    active={favoriteOnly}
                    icon={Heart}
                    label="Favorites"
                    onClick={() => setFavoriteOnly((value) => !value)}
                  />
                  <ToggleButton
                    active={sharedOnly}
                    icon={Share2}
                    label="Shared"
                    onClick={() => setSharedOnly((value) => !value)}
                  />
                </div>

                <div className="max-h-[720px] space-y-3 overflow-y-auto pr-1">
                  {visiblePrompts.map((prompt) => {
                    const category = categoryById.get(prompt.categoryId);
                    const active = selectedPrompt?.id === prompt.id;

                    return (
                      <article
                        key={prompt.id}
                        className={clsx(
                          "rounded-2xl border bg-white p-4 transition",
                          active
                            ? "border-black shadow-md shadow-black/[0.05]"
                            : "border-black/10 hover:border-black/25 hover:bg-white/95 hover:shadow-sm",
                        )}
                      >
                        <button
                          className="block w-full text-left"
                          onClick={() => setSelectedPromptId(prompt.id)}
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <span
                              className="inline-flex min-w-0 items-center gap-2 text-xs font-semibold text-black/65"
                              title={category?.name}
                            >
                              <span
                                className="size-2.5 shrink-0 rounded-sm"
                                style={{ background: category?.color ?? "#111827" }}
                              />
                              <span className="truncate">{category?.name}</span>
                            </span>
                            <span className="text-xs text-black/45">
                              {prompt.usageCount} runs
                            </span>
                          </div>
                          <h2 className="line-clamp-2 text-lg font-semibold leading-6">
                            {prompt.title}
                          </h2>
                          <p className="mt-1 line-clamp-2 text-sm leading-6 text-black/60">
                            {prompt.description}
                          </p>
                        </button>
                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                          {prompt.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="tag">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div className="mt-3 flex items-center gap-1.5">
                          <IconButton
                            label="Favorite prompt"
                            active={prompt.isFavorite}
                            onClick={() => toggleFavorite(prompt.id)}
                          >
                            <Heart size={15} aria-hidden="true" />
                          </IconButton>
                          <IconButton
                            label="Share prompt"
                            active={prompt.isPublic}
                            onClick={() => toggleShare(prompt.id)}
                          >
                            <Share2 size={15} aria-hidden="true" />
                          </IconButton>
                          <IconButton
                            label="Copy share link"
                            onClick={() => void copyShareLink(prompt)}
                          >
                            <Copy size={15} aria-hidden="true" />
                          </IconButton>
                          <IconButton label="Edit prompt" onClick={() => startEdit(prompt)}>
                            <Pencil size={15} aria-hidden="true" />
                          </IconButton>
                          <IconButton
                            label="Duplicate prompt"
                            onClick={() => duplicatePrompt(prompt)}
                          >
                            <Clipboard size={15} aria-hidden="true" />
                          </IconButton>
                          <IconButton
                            label="Delete prompt"
                            tone="danger"
                            onClick={() => deletePrompt(prompt.id)}
                          >
                            <Trash2 size={15} aria-hidden="true" />
                          </IconButton>
                        </div>
                      </article>
                    );
                  })}

                  {!filteredPrompts.length ? (
                    <div className="rounded-lg border border-dashed border-black/20 bg-white p-6 text-sm text-black/55">
                      No prompts match the active filters.
                    </div>
                  ) : null}
                  {filteredPrompts.length > visiblePromptCount ? (
                    <button
                      className="btn-secondary w-full justify-center"
                      onClick={() => setVisiblePromptCount((count) => count + 8)}
                    >
                      <Layers3 size={16} aria-hidden="true" />
                      Load more prompts
                    </button>
                  ) : null}
                </div>
              </div>
            </Panel>

            <Panel title={editingPromptId ? "Edit Prompt" : "Prompt Builder"} icon={WandSparkles}>
              <form className="space-y-4" onSubmit={savePrompt}>
                <TextInput label="Title" value={form.title} onChange={(value) => setForm({ ...form, title: value })} />
                <TextInput
                  label="Description"
                  value={form.description}
                  onChange={(value) => setForm({ ...form, description: value })}
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="label">Category</span>
                    <select
                      className="input"
                      value={form.categoryId}
                      onChange={(event) =>
                        setForm({ ...form, categoryId: event.target.value })
                      }
                    >
                      {workspace.categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <TextInput
                    label="Model"
                    value={form.model}
                    onChange={(value) => setForm({ ...form, model: value })}
                  />
                </div>

                <label className="space-y-1.5">
                  <span className="label">Prompt body</span>
                  <textarea
                    className="input min-h-52 resize-y leading-6"
                    value={form.content}
                    onChange={(event) =>
                      setForm({ ...form, content: event.target.value })
                    }
                  />
                </label>

                <div className="rounded-2xl border border-black/10 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Variable size={15} aria-hidden="true" />
                      Variables
                    </div>
                    <span className="text-xs text-black/45">
                      {promptVariables.length} detected
                    </span>
                  </div>
                  {promptVariables.length ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {promptVariables.map((variable) => (
                        <label key={variable.name} className="space-y-1">
                          <span className="text-xs font-medium text-black/55">
                            {variable.token}
                          </span>
                          <input
                            className="input"
                            value={
                              variable.name === "input"
                                ? testInput
                                : variableValues[variable.name] ?? ""
                            }
                            onChange={(event) => {
                              if (variable.name === "input") {
                                setTestInput(event.target.value);
                                return;
                              }

                              setVariableValues((current) => ({
                                ...current,
                                [variable.name]: event.target.value,
                              }));
                            }}
                            placeholder={variable.description}
                          />
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-black/55">
                      Add tokens like {"{{audience}}"} or {"{{context}}"} to generate dynamic inputs.
                    </p>
                  )}
                  {suggestedVariables.length ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {suggestedVariables.map((variable) => (
                        <button
                          key={variable}
                          type="button"
                          className="tag hover:bg-black/10"
                          onClick={() =>
                            setForm((current) => ({
                              ...current,
                              content: `${current.content}\n\n${variable}:\n{{${variable}}}`,
                            }))
                          }
                        >
                          + {`{{${variable}}}`}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-[#0b1120] p-3 text-xs leading-5 text-white">
                    {renderedPromptPreview || "Rendered prompt preview"}
                  </pre>
                  {missingVariables.length ? (
                    <p className="mt-2 text-xs font-medium text-[#be123c]">
                      Missing required values: {missingVariables.join(", ")}
                    </p>
                  ) : null}
                </div>

                <TextInput
                  label="Tags"
                  value={form.tags}
                  onChange={(value) => setForm({ ...form, tags: value })}
                  placeholder="strategy, review, workflow"
                />

                {editingPromptId ? (
                  <TextInput
                    label="Version notes"
                    value={versionNotes}
                    onChange={setVersionNotes}
                    placeholder="What changed in this prompt?"
                  />
                ) : null}

                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <label className="space-y-1.5">
                    <span className="label">Temperature</span>
                    <input
                      className="w-full accent-[#0f766e]"
                      type="range"
                      min="0"
                      max="1.5"
                      step="0.05"
                      value={form.temperature}
                      onChange={(event) =>
                        setForm({ ...form, temperature: Number(event.target.value) })
                      }
                    />
                    <span className="text-xs text-black/55">{form.temperature}</span>
                  </label>
                  <label className="flex h-10 items-center gap-2 rounded-lg border border-black/10 bg-white px-3 text-sm font-medium">
                    <input
                      className="accent-[#0f766e]"
                      type="checkbox"
                      checked={form.isPublic}
                      onChange={(event) =>
                        setForm({ ...form, isPublic: event.target.checked })
                      }
                    />
                    Shared
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button className="btn-primary" type="submit">
                    <Save size={16} aria-hidden="true" />
                    {editingPromptId ? "Update prompt" : "Save prompt"}
                  </button>
                  <button
                    className="btn-secondary"
                    type="button"
                    onClick={() => void improvePrompt()}
                    disabled={optimizing}
                  >
                    {optimizing ? (
                      <Loader2 className="animate-spin" size={16} aria-hidden="true" />
                    ) : (
                      <Brain size={16} aria-hidden="true" />
                    )}
                    Improve Prompt
                  </button>
                  <button className="btn-secondary" type="button" onClick={startCreate}>
                    <Plus size={16} aria-hidden="true" />
                    Clear
                  </button>
                </div>

                {optimization ? (
                  <div className="rounded-lg border border-[#0f766e]/25 bg-[#ecfdf5] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">Optimization score {optimization.qualityScore}</p>
                        <p className="mt-1 text-sm leading-6 text-black/65">
                          {optimization.summary}
                        </p>
                      </div>
                      <button
                        className="btn-secondary bg-white"
                        type="button"
                        onClick={applyOptimization}
                      >
                        Apply
                      </button>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                      <ul className="space-y-1">
                        {optimization.suggestions.slice(0, 4).map((suggestion) => (
                          <li key={suggestion}>- {suggestion}</li>
                        ))}
                      </ul>
                      <ul className="space-y-1 text-[#854d0e]">
                        {optimization.riskFlags.length ? (
                          optimization.riskFlags.map((risk) => <li key={risk}>- {risk}</li>)
                        ) : (
                          <li>- No major hallucination risk detected.</li>
                        )}
                      </ul>
                    </div>
                  </div>
                ) : null}
              </form>
            </Panel>
          </section>

          <aside className="min-w-0 xl:sticky xl:top-24 xl:self-start">
            <Panel title="AI Test Bench" icon={Bot}>
              {selectedPrompt ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-black/10 bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {selectedPrompt.title}
                        </p>
                        <p className="mt-1 text-xs text-black/55">
                          {selectedPrompt.model} at {selectedPrompt.temperature}
                        </p>
                      </div>
                      <button
                        className="btn-icon"
                        title="Open share preview"
                        aria-label="Open share preview"
                        onClick={() => {
                          if (selectedPrompt.shareSlug) {
                            window.open(`/share/${selectedPrompt.shareSlug}`, "_blank");
                          } else {
                            showToast("Enable sharing before opening a preview.");
                          }
                        }}
                      >
                        <ExternalLink size={15} aria-hidden="true" />
                      </button>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <Info label="Last test" value={formatDate(selectedPrompt.lastTestedAt)} />
                      <Info label="Visibility" value={selectedPrompt.isPublic ? "Shared" : "Private"} />
                    </dl>
                  </div>

                  <label className="space-y-1.5">
                    <span className="label">Test input</span>
                    <textarea
                      className="input min-h-32 resize-y leading-6"
                      value={testInput}
                      onChange={(event) => setTestInput(event.target.value)}
                    />
                  </label>

                  <button
                    className="btn-primary w-full justify-center"
                    onClick={runPromptTest}
                    disabled={testing}
                  >
                    {testing ? (
                      <Loader2 className="animate-spin" size={16} aria-hidden="true" />
                    ) : (
                      <Sparkles size={16} aria-hidden="true" />
                    )}
                    Test prompt
                  </button>

                  <div className="rounded-lg border border-black/10 bg-white p-3">
                    <div className="mb-3 grid gap-2 sm:flex sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <Brain size={15} aria-hidden="true" />
                        Side-by-side evaluation
                      </div>
                      <div className="flex rounded-md border border-black/10 bg-[#f8fafc] p-0.5">
                        {(["output", "metrics", "notes"] as EvaluationTab[]).map((tab) => (
                          <button
                            key={tab}
                            className={clsx(
                              "rounded px-2 py-1 text-xs font-semibold capitalize",
                              evaluationTab === tab ? "bg-black text-white" : "text-black/55",
                            )}
                            onClick={() => setEvaluationTab(tab)}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid gap-2">
                      {modelCatalog.map((model) => (
                        <label
                          key={model.id}
                          className="flex items-center justify-between gap-3 rounded-md border border-black/10 px-2 py-2 text-sm"
                        >
                          <span>
                            <span className="font-semibold">{model.label}</span>
                            <span className="ml-2 text-xs text-black/45">
                              {model.family} {model.status === "adapter" ? "adapter" : "live"}
                            </span>
                          </span>
                          <input
                            className="accent-[#0f766e]"
                            type="checkbox"
                            checked={evaluationModels.includes(model.id)}
                            onChange={(event) =>
                              setEvaluationModels((current) =>
                                event.target.checked
                                  ? [...new Set([...current, model.id])].slice(0, 4)
                                  : current.filter((item) => item !== model.id),
                              )
                            }
                          />
                        </label>
                      ))}
                    </div>
                    <button
                      className="btn-secondary mt-3 w-full justify-center"
                      onClick={() => void runSideBySideEvaluation()}
                      disabled={evaluating || evaluationModels.length === 0}
                    >
                      {evaluating ? (
                        <Loader2 className="animate-spin" size={16} aria-hidden="true" />
                      ) : (
                        <BarChart3 size={16} aria-hidden="true" />
                      )}
                      Compare models
                    </button>
                  </div>

                  {evaluationResults.length ? (
                    <div className="space-y-2">
                      {evaluationResults.map((evaluation) => (
                        <EvaluationCard
                          key={evaluation.id}
                          evaluation={evaluation}
                          tab={evaluationTab}
                        />
                      ))}
                    </div>
                  ) : null}

                  <div className="min-h-52 rounded-2xl border border-black/10 bg-[#101828] p-4 text-sm leading-6 text-white shadow-inner">
                    {testOutput || "Run a test to see the AI response here."}
                  </div>

                  <div>
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                      <Eye size={15} aria-hidden="true" />
                      Recent runs
                    </div>
                    <div className="space-y-2">
                      {selectedRuns.map((run) => (
                        <button
                          key={run.id}
                          className="block w-full rounded-lg border border-black/10 bg-white p-3 text-left hover:border-black/25"
                          onClick={() => setTestOutput(run.output)}
                        >
                          <div className="flex items-center justify-between gap-3 text-xs text-black/50">
                            <span>{formatDate(run.createdAt)}</span>
                            <span>{run.provider} | {run.latencyMs}ms</span>
                          </div>
                          <p className="mt-2 line-clamp-2 text-sm text-black/70">
                            {run.output}
                          </p>
                        </button>
                      ))}
                      {!selectedRuns.length ? (
                        <p className="rounded-lg border border-dashed border-black/20 bg-white p-4 text-sm text-black/55">
                          No runs saved for this prompt.
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-black/55">Create a prompt to start testing.</p>
              )}
            </Panel>

            <div className="mt-4">
              <Panel title="Version History" icon={History}>
                {selectedPrompt && selectedVersions.length ? (
                  <div className="space-y-3">
                    {selectedVersions.slice(0, 5).map((version) => (
                      <div
                        key={version.id}
                        className="rounded-lg border border-black/10 bg-white p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">
                              v{version.versionNumber} - {formatDate(version.createdAt)}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-black/55">
                              {version.notes}
                            </p>
                          </div>
                          <button
                            className="btn-icon"
                            title="Rollback to this version"
                            aria-label="Rollback to this version"
                            onClick={() => rollbackToVersion(version)}
                          >
                            <History size={15} aria-hidden="true" />
                          </button>
                        </div>
                        {latestVersion?.id === version.id ? (
                          <PromptDiffView
                            before={version.content}
                            after={selectedPrompt.content}
                          />
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed border-black/20 bg-white p-4 text-sm text-black/55">
                    Edits will create historical versions with rollback and diff support.
                  </p>
                )}
              </Panel>
            </div>
          </aside>
        </section>
          </>
        ) : null}

        {activeView === "benchmarks" ? (
          <ExperimentLab
            experiments={workspace.experiments}
            experimentWorkflows={workspace.experimentWorkflows}
            experimentRuns={workspace.experimentRuns}
            datasets={workspace.evaluationDatasets}
            presets={workspace.evaluationPresets}
            benchmarkSuites={workspace.benchmarkSuites}
            benchmarkRuns={workspace.benchmarkRuns}
            benchmarkResults={workspace.benchmarkResults}
            benchmarkDatasets={workspace.benchmarkDatasets}
            selectedBenchmarkSuite={selectedBenchmarkSuite}
            selectedExperiment={selectedExperiment}
            selectedPrompt={selectedPrompt}
            evaluationModels={evaluationModels}
            evaluationResults={evaluationResults}
            evaluationTab={evaluationTab}
            evaluating={evaluating}
            experimentRunning={experimentRunning}
            benchmarkRunning={benchmarkRunning}
            testInput={testInput}
            onTestInputChange={setTestInput}
            onSelectExperiment={setSelectedExperimentId}
            onSelectBenchmarkSuite={setSelectedBenchmarkSuiteId}
            onCreateExperiment={createExperimentFromPrompt}
            onRunExperiment={(experiment) => void runPromptExperiment(experiment)}
            onRunBenchmark={runBenchmarkSuite}
            onRunEvaluation={() => void runSideBySideEvaluation()}
            onEvaluationTabChange={setEvaluationTab}
            onToggleModel={(modelId, checked) =>
              setEvaluationModels((current) =>
                checked
                  ? [...new Set([...current, modelId])].slice(0, 4)
                  : current.filter((item) => item !== modelId),
              )
            }
          />
        ) : null}

        {activeView === "workflows" ? (
          <WorkflowStudio
            workflows={workspace.aiWorkflows}
            selectedWorkflow={selectedWorkflow}
            runs={workspace.workflowRuns}
            running={workflowRunning}
            onSelectWorkflow={setSelectedWorkflowId}
            onRunWorkflow={runWorkflow}
          />
        ) : null}

        {activeView === "agents" ? (
          <AgentOperationsPanel
            agents={workspace.agents}
            agentRuns={workspace.agentRuns}
            agentMemory={workspace.agentMemory}
            agentTools={workspace.agentTools}
            agentToolCalls={workspace.agentToolCalls}
            selectedAgent={selectedAgent}
            selectedRun={selectedAgentRun}
            running={agentRunning}
            onSelectAgent={setSelectedAgentId}
            onRunAgent={runAgent}
          />
        ) : null}

        {activeView === "deployments" ? (
          <DeploymentCenter
            prompts={workspace.prompts}
            versions={workspace.versions}
            deployments={activeDeployments}
            history={workspace.deploymentHistory}
            releases={workspace.promptReleases}
            environment={deploymentEnvironment}
            onEnvironmentChange={setDeploymentEnvironment}
            onDeploy={deploySelectedPrompt}
            onPromote={promoteDeployment}
            onRollback={rollbackDeployment}
          />
        ) : null}

        {activeView === "observability" ? (
          <ObservabilityCenter
            runs={workspace.aiRuns}
            artifacts={workspace.aiArtifacts}
            metrics={workspace.aiMetrics}
            traces={workspace.traceSessions}
            nodes={workspace.traceNodes}
            events={workspace.aiTraceEvents}
            steps={workspace.traceSteps}
            logs={workspace.traceLogs}
            selectedTrace={selectedTrace}
            onSelectTrace={setSelectedTraceId}
          />
        ) : null}

        {activeView === "analytics" ? (
          <AnalyticsDashboard analytics={analytics} activities={workspace.activities} />
        ) : null}

        {activeView === "team" ? (
          <TeamWorkspacePanel
            workspaceName={activeWorkspace?.name ?? "PromptOps Lab"}
            collections={workspace.collections}
            members={workspace.members}
            organizations={workspace.organizations}
            auditLogs={workspace.auditLogs}
            inviteEmail={inviteEmail}
            onInviteEmailChange={setInviteEmail}
            onInvite={inviteMember}
          />
        ) : null}
      </div>

      <CommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        actions={[
          { label: "Create new prompt", icon: Plus, run: startCreate },
          { label: "Improve current prompt", icon: Brain, run: () => void improvePrompt() },
          {
            label: "Run side-by-side evaluation",
            icon: BarChart3,
            run: () => void runSideBySideEvaluation(),
          },
          {
            label: "Create prompt experiment",
            icon: Workflow,
            run: createExperimentFromPrompt,
          },
          {
            label: "Open benchmarking engine",
            icon: Gauge,
            run: () => setActiveView("benchmarks"),
          },
          {
            label: "Open workflow studio",
            icon: Blocks,
            run: () => setActiveView("workflows"),
          },
          {
            label: "Open agent builder",
            icon: Bot,
            run: () => setActiveView("agents"),
          },
          {
            label: "Open release management",
            icon: Rocket,
            run: () => setActiveView("deployments"),
          },
          {
            label: "Open observability traces",
            icon: Activity,
            run: () => setActiveView("observability"),
          },
          {
            label: "Run selected workflow",
            icon: Sparkles,
            run: () => selectedWorkflow && runWorkflow(selectedWorkflow),
          },
          {
            label: "Run selected agent",
            icon: Bot,
            run: () => selectedAgent && runAgent(selectedAgent),
          },
          {
            label: "Run selected benchmark suite",
            icon: Gauge,
            run: () => selectedBenchmarkSuite && runBenchmarkSuite(selectedBenchmarkSuite),
          },
          { label: "Open analytics", icon: Activity, run: () => setActiveView("analytics") },
          { label: "Open team workspace", icon: Users, run: () => setActiveView("team") },
        ]}
      />

      {toast ? (
        <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-lg bg-black px-4 py-3 text-sm font-medium text-white shadow-lg">
          <Check size={16} aria-hidden="true" />
          {toast}
        </div>
      ) : null}
    </main>
  );
}

function OperationsCommandCenter({
  workspace,
  selectedPrompt,
  promptIntelligence,
  onOpenBenchmarks,
  onOpenAgents,
  onOpenObservability,
}: {
  workspace: PromptWorkspace;
  selectedPrompt?: ManagedPrompt;
  promptIntelligence?: PromptWorkspace["promptIntelligence"][number];
  onOpenBenchmarks: () => void;
  onOpenAgents: () => void;
  onOpenObservability: () => void;
}) {
  const totalCost = workspace.aiRuns.reduce(
    (total, run) => total + run.estimatedCostUsd,
    0,
  );
  const averageLatency = workspace.aiRuns.length
    ? Math.round(
        workspace.aiRuns.reduce((total, run) => total + run.latencyMs, 0) /
          workspace.aiRuns.length,
      )
    : 0;
  const errorRate = workspace.aiRuns.length
    ? Math.round(
        (workspace.aiRuns.filter((run) => run.status === "failed").length /
          workspace.aiRuns.length) *
          100,
      )
    : 0;
  const topRuns = workspace.aiRuns
    .slice()
    .sort((a, b) => b.qualityScore - a.qualityScore)
    .slice(0, 4);
  const lifecycle = [
    ["Prompt", workspace.prompts.length],
    ["Version", workspace.versions.length],
    ["Experiment", workspace.experiments.length + workspace.benchmarkSuites.length],
    ["Evaluation", workspace.evaluations.length],
    ["Workflow", workspace.aiWorkflows.length],
    ["Deployment", workspace.deployments.length],
    ["Observation", workspace.traceSessions.length],
    ["Improvement", workspace.promptIntelligence.length],
  ];
  const searchCorpus = [
    ...workspace.prompts.map((item) => ({ label: item.title, type: "Prompt" })),
    ...workspace.aiWorkflows.map((item) => ({ label: item.name, type: "Workflow" })),
    ...workspace.agents.map((item) => ({ label: item.name, type: "Agent" })),
    ...workspace.benchmarkSuites.map((item) => ({ label: item.name, type: "Benchmark" })),
    ...workspace.traceSessions.map((item) => ({ label: item.name, type: "Trace" })),
  ].slice(0, 8);

  return (
    <section className="grid gap-6 py-8 xl:grid-cols-[minmax(0,1.12fr)_0.88fr]">
      <div className="rounded-2xl border border-black/10 bg-white p-7 shadow-sm shadow-black/[0.03] sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0f766e]">
              AI execution lifecycle
            </p>
            <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
              One execution engine for prompts, agents, workflows, benchmarks, and releases.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-black/60">
              Backend architecture is frozen for this release; polish work now stays in the
              product shell, screenshots, documentation, and deployment verification.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={onOpenBenchmarks}>
              <Gauge size={16} aria-hidden="true" />
              Benchmarks
            </button>
            <button className="btn-secondary" onClick={onOpenAgents}>
              <Bot size={16} aria-hidden="true" />
              Agents
            </button>
            <button className="btn-secondary" onClick={onOpenObservability}>
              <Activity size={16} aria-hidden="true" />
              Traces
            </button>
          </div>
        </div>

        <div className="mt-7 grid gap-3 md:grid-cols-4">
          {lifecycle.map(([label, count], index) => (
            <div
              key={label}
              className="rounded-2xl border border-black/10 bg-[#f7f8fb] p-4"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/40">
                {index + 1}. {label}
              </p>
              <p className="mt-2 text-2xl font-semibold">{count}</p>
            </div>
          ))}
        </div>

        <div className="mt-7 grid gap-3 md:grid-cols-4">
          <CostMetric label="Spend" value={totalCost} />
          <Metric label="Avg latency" value={averageLatency} suffix="ms" />
          <Metric label="Error rate" value={errorRate} suffix="%" />
          <Metric label="Traces" value={workspace.traceSessions.length} />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-1">
        <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm shadow-black/[0.03]">
          <p className="text-sm font-semibold">Global search surface</p>
          <div className="mt-3 space-y-2">
            {searchCorpus.map((item) => (
              <div
                key={`${item.type}-${item.label}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-black/10 px-3 py-2 text-sm"
              >
                <span className="truncate font-medium">{item.label}</span>
                <span className="rounded-md bg-black/[0.05] px-2 py-1 text-xs font-semibold">
                  {item.type}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm shadow-black/[0.03]">
          <p className="text-sm font-semibold">Prompt Health Score</p>
          {promptIntelligence && selectedPrompt ? (
            <div className="mt-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-3xl font-semibold">{promptIntelligence.healthScore}</p>
                  <p className="mt-1 text-sm text-black/55">{selectedPrompt.title}</p>
                </div>
                <span className="tag">{promptIntelligence.cluster}</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <ScoreBar label="Clarity" value={promptIntelligence.clarity} />
                <ScoreBar label="Robustness" value={promptIntelligence.robustness} />
              </div>
              <ul className="mt-4 space-y-1 text-sm leading-6 text-black/65">
                {promptIntelligence.suggestions.slice(0, 2).map((suggestion) => (
                  <li key={suggestion}>- {suggestion}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-black/55">
              Prompt intelligence will score clarity, robustness, duplicate risk,
              hallucination risk, and model fit as prompts enter the lifecycle.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm shadow-black/[0.03] md:col-span-2 xl:col-span-1">
          <p className="mb-3 text-sm font-semibold">Top performing AI runs</p>
          <div className="space-y-2">
            {topRuns.map((run) => (
              <div key={run.id} className="grid grid-cols-[1fr_auto] gap-3 rounded-xl border border-black/10 p-3 text-sm">
                <span className="font-medium capitalize">{run.entityType} · {run.model}</span>
                <span className="rounded-full bg-black px-2 py-1 text-xs font-semibold text-white">
                  {run.qualityScore}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ExperimentLab({
  experiments,
  experimentWorkflows,
  experimentRuns,
  datasets,
  presets,
  benchmarkSuites,
  benchmarkRuns,
  benchmarkResults,
  benchmarkDatasets,
  selectedBenchmarkSuite,
  selectedExperiment,
  selectedPrompt,
  evaluationModels,
  evaluationResults,
  evaluationTab,
  evaluating,
  experimentRunning,
  benchmarkRunning,
  testInput,
  onTestInputChange,
  onSelectExperiment,
  onSelectBenchmarkSuite,
  onCreateExperiment,
  onRunExperiment,
  onRunBenchmark,
  onRunEvaluation,
  onEvaluationTabChange,
  onToggleModel,
}: {
  experiments: PromptExperiment[];
  experimentWorkflows: PromptWorkspace["experimentWorkflows"];
  experimentRuns: PromptWorkspace["experimentRuns"];
  datasets: PromptWorkspace["evaluationDatasets"];
  presets: PromptWorkspace["evaluationPresets"];
  benchmarkSuites: PromptWorkspace["benchmarkSuites"];
  benchmarkRuns: PromptWorkspace["benchmarkRuns"];
  benchmarkResults: PromptWorkspace["benchmarkResults"];
  benchmarkDatasets: PromptWorkspace["benchmarkDatasets"];
  selectedBenchmarkSuite?: PromptWorkspace["benchmarkSuites"][number];
  selectedExperiment?: PromptExperiment;
  selectedPrompt?: ManagedPrompt;
  evaluationModels: string[];
  evaluationResults: EvaluationResult[];
  evaluationTab: EvaluationTab;
  evaluating: boolean;
  experimentRunning: boolean;
  benchmarkRunning: boolean;
  testInput: string;
  onTestInputChange: (value: string) => void;
  onSelectExperiment: (id: string) => void;
  onSelectBenchmarkSuite: (id: string) => void;
  onCreateExperiment: () => void;
  onRunExperiment: (experiment: PromptExperiment) => void;
  onRunBenchmark: (suite: PromptWorkspace["benchmarkSuites"][number]) => void;
  onRunEvaluation: () => void;
  onEvaluationTabChange: (tab: EvaluationTab) => void;
  onToggleModel: (modelId: string, checked: boolean) => void;
}) {
  const results = selectedExperiment?.results ?? [];
  const bestResult = results.reduce<PromptExperimentResult | null>(
    (winner, result) =>
      !winner || result.qualityScore > winner.qualityScore ? result : winner,
    null,
  );
  const averageLatency = results.length
    ? Math.round(results.reduce((total, item) => total + item.latencyMs, 0) / results.length)
    : 0;
  const totalCost = results.reduce((total, item) => total + item.estimatedCostUsd, 0);
  const averageRunScore = experimentRuns.length
    ? Math.round(
        experimentRuns.reduce(
          (total, run) =>
            total +
            (run.clarity +
              run.correctness +
              (100 - run.hallucinationLikelihood) +
              run.consistency +
              run.toneAlignment +
              run.formattingQuality) /
              6,
          0,
        ) / experimentRuns.length,
      )
    : 0;
  const leaderboard = benchmarkRuns
    .slice()
    .sort(
      (a, b) =>
        b.accuracy +
        b.consistencyScore -
        b.hallucinationRate -
        (a.accuracy + a.consistencyScore - a.hallucinationRate),
    );
  const regressionAlerts = benchmarkRuns.filter((run) => run.regressionDelta < 0);
  const selectedBenchmarkRuns = selectedBenchmarkSuite
    ? benchmarkRuns.filter((run) => run.suiteId === selectedBenchmarkSuite.id)
    : benchmarkRuns;
  const selectedBenchmarkResults = selectedBenchmarkSuite
    ? benchmarkResults.filter((result) => result.suiteId === selectedBenchmarkSuite.id)
    : benchmarkResults;

  return (
    <section className="grid gap-8 py-8 xl:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="space-y-6">
        <Panel title="Experiment Registry" icon={Workflow}>
          <div className="space-y-3">
            {experiments.map((experiment) => (
              <button
                key={experiment.id}
                className={clsx(
                  "block w-full rounded-lg border p-4 text-left transition",
                  selectedExperiment?.id === experiment.id
                    ? "border-black bg-white shadow-sm"
                    : "border-black/10 bg-white/70 hover:bg-white",
                )}
                onClick={() => onSelectExperiment(experiment.id)}
              >
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0f766e]">
                  {experiment.status}
                </span>
                <p className="mt-2 text-base font-semibold">{experiment.title}</p>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-black/60">
                  {experiment.hypothesis}
                </p>
              </button>
            ))}
            <button className="btn-primary w-full justify-center" onClick={onCreateExperiment}>
              <Plus size={16} aria-hidden="true" />
              New experiment from prompt
            </button>
          </div>
        </Panel>

        <Panel title="Infrastructure Signals" icon={ServerCog}>
          <div className="space-y-3">
            {[
              ["Redis", "rate limit and burst control"],
              ["Queue", "inline job abstraction ready for workers"],
              ["Sentry", "server error capture hook"],
              ["PostHog", "product analytics event hook"],
              ["Edge", "Vercel static and dynamic route split"],
            ].map(([name, detail]) => (
              <div
                key={name}
                className="rounded-lg border border-black/10 bg-white p-4"
              >
                <p className="text-sm font-semibold">{name}</p>
                <p className="mt-1 text-sm leading-6 text-black/60">{detail}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Evaluation Infrastructure" icon={Gauge}>
          <div className="space-y-3">
            {presets.map((preset) => (
              <div key={preset.id} className="rounded-lg border border-black/10 bg-white p-4">
                <p className="text-sm font-semibold">{preset.name}</p>
                <p className="mt-2 text-sm leading-6 text-black/60">{preset.rubric}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {preset.metrics.slice(0, 4).map((metric) => (
                    <span key={metric} className="tag">
                      {metric}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {datasets.map((dataset) => (
              <div key={dataset.id} className="rounded-lg border border-black/10 bg-white p-4">
                <p className="text-sm font-semibold">{dataset.name}</p>
                <p className="mt-1 text-sm text-black/55">
                  {dataset.examples.length} reusable examples
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </aside>

      <div className="min-w-0 space-y-8">
        <Panel title="AI Benchmarking Engine" icon={Gauge}>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-4">
              <div className="rounded-lg border border-black/10 bg-white p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0f766e]">
                  Unified experiments + evaluations
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-normal">
                  Rank prompts and models across datasets before release.
                </h2>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-black/60">
                  Benchmark suites run the same prompt versions across datasets and
                  model adapters, detect regressions, score rubric quality, and update
                  the leaderboard used by release gates.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {benchmarkSuites.map((suite) => (
                    <button
                      key={suite.id}
                      className={clsx(
                        "rounded-lg border px-3 py-2 text-sm font-semibold",
                        selectedBenchmarkSuite?.id === suite.id
                          ? "border-black bg-black text-white"
                          : "border-black/10 bg-white text-black/65",
                      )}
                      onClick={() => onSelectBenchmarkSuite(suite.id)}
                    >
                      {suite.name}
                    </button>
                  ))}
                </div>
                {selectedBenchmarkSuite ? (
                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <button
                      className="btn-primary"
                      onClick={() => onRunBenchmark(selectedBenchmarkSuite)}
                      disabled={benchmarkRunning}
                    >
                      {benchmarkRunning ? (
                        <Loader2 className="animate-spin" size={16} aria-hidden="true" />
                      ) : (
                        <Gauge size={16} aria-hidden="true" />
                      )}
                      Run benchmark suite
                    </button>
                    <span className="tag">{selectedBenchmarkSuite.modelIds.length} models</span>
                    <span className="tag">{selectedBenchmarkSuite.datasetIds.length} datasets</span>
                    <span className="tag">{selectedBenchmarkSuite.metrics.length} metrics</span>
                  </div>
                ) : null}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-black/10 bg-white p-5">
                  <p className="mb-4 text-sm font-semibold">Model performance heatmap</p>
                  <div className="space-y-3">
                    {selectedBenchmarkRuns.map((run) => (
                      <div key={run.id}>
                        <div className="mb-1 flex items-center justify-between text-xs font-semibold">
                          <span>{run.model}</span>
                          <span>{run.accuracy}% accuracy</span>
                        </div>
                        <div className="grid grid-cols-10 gap-1">
                          {Array.from({ length: 10 }).map((_, index) => (
                            <span
                              key={`${run.id}-${index}`}
                              className={clsx(
                                "h-6 rounded",
                                index < Math.round(run.accuracy / 10)
                                  ? "bg-[#0f766e]"
                                  : "bg-black/10",
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-black/10 bg-white p-5">
                  <p className="mb-4 text-sm font-semibold">Regression alerts</p>
                  <div className="space-y-2">
                    {regressionAlerts.map((run) => (
                      <div key={run.id} className="rounded-lg border border-[#f59e0b]/30 bg-[#fffbeb] p-3">
                        <p className="text-sm font-semibold">{run.model}</p>
                        <p className="mt-1 text-xs text-black/55">
                          {run.regressionDelta} point regression on {run.datasetId}
                        </p>
                      </div>
                    ))}
                    {!regressionAlerts.length ? (
                      <p className="rounded-lg border border-dashed border-black/20 p-4 text-sm text-black/55">
                        No benchmark regressions detected.
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-black/10 bg-white p-5">
                <p className="mb-4 text-sm font-semibold">Leaderboard</p>
                <div className="space-y-2">
                  {leaderboard.slice(0, 5).map((run, index) => (
                    <div
                      key={run.id}
                      className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-black/10 p-3"
                    >
                      <span className="text-lg font-semibold">{index + 1}</span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{run.model}</p>
                        <p className="text-xs text-black/50">
                          {run.accuracy}% accuracy / {run.hallucinationRate}% hallucination
                        </p>
                      </div>
                      <span className="rounded-full bg-black px-2 py-1 text-xs font-semibold text-white">
                        {run.consistencyScore}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-black/10 bg-white p-5">
                <p className="mb-4 text-sm font-semibold">Benchmark datasets</p>
                <div className="space-y-3">
                  {benchmarkDatasets.map((dataset) => (
                    <div key={dataset.id} className="rounded-lg border border-black/10 p-3">
                      <p className="text-sm font-semibold">{dataset.name}</p>
                      <p className="mt-1 text-xs text-black/55">
                        {dataset.taskType} · {dataset.examples.length} examples
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-black/10 bg-white p-5">
                <p className="mb-4 text-sm font-semibold">Dataset execution view</p>
                <div className="space-y-3">
                  {selectedBenchmarkResults.slice(0, 4).map((result) => (
                    <div key={result.id} className="rounded-lg border border-black/10 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{result.model}</p>
                          <p className="mt-1 text-xs text-black/50">{result.taskType}</p>
                        </div>
                        <span className="rounded-full bg-black px-2 py-1 text-xs font-semibold text-white">
                          {result.rubricScore}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                        <Info label="Correct" value={`${result.correctness}%`} />
                        <Info label="Risk" value={`${result.hallucinationRate}%`} />
                        <Info label="Cost" value={formatCost(result.estimatedCostUsd)} />
                      </div>
                      <p className="mt-3 line-clamp-3 text-xs leading-5 text-black/55">
                        {result.output}
                      </p>
                    </div>
                  ))}
                  {!selectedBenchmarkResults.length ? (
                    <p className="rounded-lg border border-dashed border-black/20 p-4 text-sm text-black/55">
                      Run a benchmark suite to generate dataset-level results.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </Panel>

        <section className="rounded-lg border border-black/10 bg-white p-6 shadow-sm sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0f766e]">
                AI benchmarking suite
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-normal sm:text-4xl">
                Merge experiments and evaluations into production benchmark gates.
              </h2>
              <p className="mt-4 max-w-3xl text-base leading-8 text-black/60">
                Run A/B prompt variants across model adapters, inspect cost and latency,
                and promote the prompt with the best quality and lowest risk.
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-3">
              <Metric label="Avg latency" value={averageLatency} suffix="ms" />
              <Metric label="Results" value={results.length} />
              <CostMetric label="Est. cost" value={totalCost} />
              <Metric label="Winner" value={bestResult?.qualityScore ?? 0} suffix="/100" />
            </dl>
          </div>
        </section>

        <Panel title="Experiment Workflows" icon={GitBranch}>
          <div className="grid gap-4 lg:grid-cols-2">
            {experimentWorkflows.map((workflow) => (
              <article
                key={workflow.id}
                className="rounded-lg border border-black/10 bg-white p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0f766e]">
                      {workflow.status}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold">{workflow.name}</h3>
                  </div>
                  <span className="rounded-full bg-black px-3 py-1 text-xs font-semibold text-white">
                    {workflow.models.length} models
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-black/60">
                  {workflow.description}
                </p>
                <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                  <Info label="Prompts" value={`${workflow.promptIds.length}`} />
                  <Info label="Datasets" value={`${workflow.datasets.length}`} />
                  <Info label="Avg score" value={`${averageRunScore}/100`} />
                </div>
              </article>
            ))}
          </div>
          <div className="mt-5 h-72 rounded-lg border border-black/10 bg-white p-4">
            <p className="mb-3 text-sm font-semibold">Benchmark performance trends</p>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={experimentRuns}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="model" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="clarity" stroke="#0f766e" strokeWidth={2} />
                <Line type="monotone" dataKey="correctness" stroke="#2563eb" strokeWidth={2} />
                <Line
                  type="monotone"
                  dataKey="formattingQuality"
                  stroke="#b45309"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {selectedExperiment ? (
          <Panel title={selectedExperiment.title} icon={Workflow}>
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div>
                <div className="rounded-lg border border-black/10 bg-white p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-black/45">
                    Hypothesis
                  </p>
                  <p className="mt-3 text-lg leading-8 text-black/70">
                    {selectedExperiment.hypothesis}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      className="btn-primary"
                      onClick={() => onRunExperiment(selectedExperiment)}
                      disabled={experimentRunning || evaluationModels.length === 0}
                    >
                      {experimentRunning ? (
                        <Loader2 className="animate-spin" size={16} aria-hidden="true" />
                      ) : (
                        <BarChart3 size={16} aria-hidden="true" />
                      )}
                      Run experiment
                    </button>
                    <button className="btn-secondary" onClick={onCreateExperiment}>
                      <Workflow size={16} aria-hidden="true" />
                      Fork current prompt
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {selectedExperiment.variants.map((variant) => {
                    const variantResults = results.filter(
                      (result) => result.variantId === variant.id,
                    );
                    const avgScore = variantResults.length
                      ? Math.round(
                          variantResults.reduce(
                            (total, result) => total + result.qualityScore,
                            0,
                          ) / variantResults.length,
                        )
                      : 0;

                    return (
                      <VariantCard
                        key={variant.id}
                        variant={variant}
                        averageScore={avgScore}
                        isWinner={bestResult?.variantId === variant.id}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="rounded-lg border border-black/10 bg-white p-5">
                <p className="text-sm font-semibold">Runtime input</p>
                <textarea
                  className="input mt-3 min-h-40 resize-y leading-6"
                  value={testInput}
                  onChange={(event) => onTestInputChange(event.target.value)}
                />
                <div className="mt-4 space-y-2">
                  {modelCatalog.map((model) => (
                    <label
                      key={model.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-black/10 px-3 py-3 text-sm"
                    >
                      <span>
                        <span className="font-semibold">{model.label}</span>
                        <span className="ml-2 text-xs text-black/45">
                          {model.status}
                        </span>
                      </span>
                      <input
                        className="accent-[#0f766e]"
                        type="checkbox"
                        checked={evaluationModels.includes(model.id)}
                        onChange={(event) => onToggleModel(model.id, event.target.checked)}
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {results.length ? (
              <div className="mt-6">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <h3 className="text-xl font-semibold">Experiment results</h3>
                  <span className="rounded-full bg-black px-3 py-1 text-xs font-semibold text-white">
                    Winner: {bestResult?.variantLabel ?? "pending"}
                  </span>
                </div>
                <div className="grid gap-4 xl:grid-cols-2">
                  {results.map((result) => (
                    <ExperimentResultCard key={result.id} result={result} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-lg border border-dashed border-black/20 bg-white p-8 text-center">
                <p className="text-lg font-semibold">No experiment run yet</p>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-black/60">
                  Run this experiment to generate output panels, quality metrics,
                  token estimates, cost visibility, and hallucination-risk signals.
                </p>
              </div>
            )}
          </Panel>
        ) : (
          <Panel title="Create an experiment" icon={Workflow}>
            <button className="btn-primary" onClick={onCreateExperiment}>
              <Plus size={16} aria-hidden="true" />
              New experiment from {selectedPrompt?.title ?? "selected prompt"}
            </button>
          </Panel>
        )}

        <Panel title="Side-by-side Evaluation Suite" icon={Brain}>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex rounded-lg border border-black/10 bg-[#f7f8fb] p-1">
              {(["output", "metrics", "notes"] as EvaluationTab[]).map((tab) => (
                <button
                  key={tab}
                  className={clsx(
                    "rounded-lg px-3 py-2 text-xs font-semibold capitalize",
                    evaluationTab === tab ? "bg-black text-white" : "text-black/55",
                  )}
                  onClick={() => onEvaluationTabChange(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
            <button
              className="btn-primary"
              onClick={onRunEvaluation}
              disabled={evaluating || evaluationModels.length === 0}
            >
              {evaluating ? (
                <Loader2 className="animate-spin" size={16} aria-hidden="true" />
              ) : (
                <BarChart3 size={16} aria-hidden="true" />
              )}
              Compare selected models
            </button>
          </div>

          {evaluationResults.length ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {evaluationResults.map((evaluation) => (
                <EvaluationCard
                  key={evaluation.id}
                  evaluation={evaluation}
                  tab={evaluationTab}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-black/20 bg-white p-8 text-center">
              <p className="text-lg font-semibold">Run an evaluation to compare model behavior.</p>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-black/60">
                This suite shows output panels, latency badges, token estimates,
                estimated cost, quality sub-scores, and expandable notes.
              </p>
            </div>
          )}
        </Panel>
      </div>
    </section>
  );
}

function VariantCard({
  variant,
  averageScore,
  isWinner,
}: {
  variant: PromptExperimentVariant;
  averageScore: number;
  isWinner: boolean;
}) {
  return (
    <article className="rounded-lg border border-black/10 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold">{variant.label}</p>
          <p className="mt-1 text-sm text-black/50">{variant.notes}</p>
        </div>
        {isWinner ? (
          <span className="rounded-full bg-[#ecfdf5] px-3 py-1 text-xs font-semibold text-[#0f766e]">
            winner
          </span>
        ) : null}
      </div>
      <pre className="mt-4 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-[#0b1120] p-4 text-xs leading-5 text-white">
        {variant.content}
      </pre>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <Info label="Model" value={variant.model} />
        <Info label="Temp" value={`${variant.temperature}`} />
        <Info label="Avg score" value={`${averageScore || "Pending"}`} />
      </dl>
    </article>
  );
}

function ExperimentResultCard({ result }: { result: PromptExperimentResult }) {
  return (
    <article className="rounded-lg border border-black/10 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold">
            {result.variantLabel} · {result.model}
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-black/45">
            {result.provider}
          </p>
        </div>
        <span className="rounded-full bg-black px-3 py-1 text-xs font-semibold text-white">
          {result.qualityScore}/100
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <Info label="Latency" value={`${result.latencyMs}ms`} />
        <Info label="Tokens" value={`${result.tokenEstimate}`} />
        <Info label="Cost" value={formatCost(result.estimatedCostUsd)} />
        <Info label="Risk" value={`${result.hallucinationRisk}%`} />
      </div>
      <details className="mt-4 rounded-lg border border-black/10 bg-[#f7f8fb] p-4">
        <summary className="cursor-pointer text-sm font-semibold">
          Expand output comparison
        </summary>
        <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap text-sm leading-6 text-black/72">
          {result.output}
        </pre>
      </details>
    </article>
  );
}

function AgentOperationsPanel({
  agents,
  agentRuns,
  agentMemory,
  agentTools,
  agentToolCalls,
  selectedAgent,
  selectedRun,
  running,
  onSelectAgent,
  onRunAgent,
}: {
  agents: PromptWorkspace["agents"];
  agentRuns: PromptWorkspace["agentRuns"];
  agentMemory: PromptWorkspace["agentMemory"];
  agentTools: PromptWorkspace["agentTools"];
  agentToolCalls: PromptWorkspace["agentToolCalls"];
  selectedAgent?: PromptWorkspace["agents"][number];
  selectedRun?: PromptWorkspace["agentRuns"][number];
  running: boolean;
  onSelectAgent: (id: string) => void;
  onRunAgent: (agent: PromptWorkspace["agents"][number]) => void;
}) {
  const visibleTools = selectedAgent
    ? agentTools.filter((tool) => tool.agentId === selectedAgent.id)
    : agentTools;
  const visibleMemory = selectedAgent
    ? agentMemory.filter((memory) => memory.agentId === selectedAgent.id)
    : agentMemory;
  const visibleRuns = selectedAgent
    ? agentRuns.filter((run) => run.agentId === selectedAgent.id)
    : agentRuns;
  const visibleToolCalls = selectedAgent
    ? agentToolCalls.filter((call) => call.agentId === selectedAgent.id)
    : agentToolCalls;

  return (
    <section className="grid gap-6 py-8 xl:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="space-y-5">
        <Panel title="Agent Registry" icon={Bot}>
          <div className="space-y-3">
            {agents.map((agent) => (
              <button
                key={agent.id}
                className={clsx(
                  "block w-full rounded-lg border p-4 text-left transition",
                  selectedAgent?.id === agent.id
                    ? "border-black bg-white shadow-sm"
                    : "border-black/10 bg-white/70 hover:bg-white",
                )}
                onClick={() => onSelectAgent(agent.id)}
              >
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0f766e]">
                  {agent.type}
                </span>
                <p className="mt-2 text-base font-semibold">{agent.name}</p>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-black/60">
                  {agent.description}
                </p>
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="Agent Memory" icon={Brain}>
          <div className="space-y-3">
            {visibleMemory.map((memory) => (
              <div key={memory.id} className="rounded-lg border border-black/10 bg-white p-4">
                <p className="text-sm font-semibold">{memory.key}</p>
                <p className="mt-2 text-sm leading-6 text-black/60">{memory.value}</p>
              </div>
            ))}
          </div>
        </Panel>
      </aside>

      <div className="min-w-0 space-y-6">
        <section className="rounded-lg border border-black/10 bg-white p-6 shadow-sm sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0f766e]">
                Agent builder canvas
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-normal">
                Build agents that reason, invoke tools, branch, and remember.
              </h2>
              <p className="mt-4 max-w-3xl text-base leading-8 text-black/60">
                Agents are first-class AI operations entities. Each run writes to
                the unified run log, creates trace nodes/events, persists memory, and can
                be chained into workflows or benchmarks.
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-3">
              <Metric label="Agents" value={agents.length} />
              <Metric label="Runs" value={agentRuns.length} />
              <Metric label="Tools" value={visibleTools.length} />
              <Metric label="Tool calls" value={visibleToolCalls.length} />
            </dl>
          </div>
        </section>

        {selectedAgent ? (
          <Panel title={selectedAgent.name} icon={Bot}>
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="rounded-lg border border-black/10 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0f766e]">
                      {selectedAgent.status} {selectedAgent.type}
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold">{selectedAgent.name}</h3>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-black/60">
                      {selectedAgent.description}
                    </p>
                  </div>
                  <button
                    className="btn-primary"
                    onClick={() => onRunAgent(selectedAgent)}
                    disabled={running}
                  >
                    {running ? (
                      <Loader2 className="animate-spin" size={16} aria-hidden="true" />
                    ) : (
                      <Sparkles size={16} aria-hidden="true" />
                    )}
                    Run agent
                  </button>
                </div>

                <div className="mt-6 min-h-56 overflow-auto rounded-lg border border-black/10 bg-[#f7f8fb] p-5">
                  <div className="flex min-w-[720px] items-center gap-4">
                    {[
                      ["Objective", "Reason about task"],
                      ["Memory", selectedAgent.memoryKeys.join(", ")],
                      ["Tools", selectedAgent.tools.join(", ")],
                      ["Branch", "Decide next action"],
                      ["Artifact", "Persist output"],
                    ].map(([label, detail], index) => (
                      <div
                        key={label}
                        draggable
                        className="w-40 shrink-0 rounded-lg border border-black/10 bg-white p-4 shadow-sm"
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/45">
                          Step {index + 1}
                        </p>
                        <p className="mt-2 text-sm font-semibold">{label}</p>
                        <p className="mt-2 line-clamp-3 text-xs leading-5 text-black/55">
                          {detail}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-lg border border-black/10 bg-white p-5">
                  <p className="mb-3 text-sm font-semibold">Tool invocation viewer</p>
                  <div className="space-y-2">
                    {visibleTools.map((tool) => (
                      <div key={tool.id} className="rounded-lg border border-black/10 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold">{tool.name}</p>
                          <span className="tag">{tool.status}</span>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-black/55">
                          {tool.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-black/10 bg-white p-5">
                  <p className="mb-3 text-sm font-semibold">Run tool calls</p>
                  <div className="space-y-2">
                    {visibleToolCalls.slice(0, 4).map((call) => (
                      <div key={call.id} className="rounded-lg border border-black/10 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold">{call.toolName}</p>
                          <span className="tag">{call.status}</span>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-black/55">
                          {call.outputSummary}
                        </p>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                          <Info label="Latency" value={`${call.latencyMs}ms`} />
                          <Info label="Tokens" value={`${call.tokenEstimate}`} />
                          <Info label="Cost" value={formatCost(call.estimatedCostUsd)} />
                        </div>
                      </div>
                    ))}
                    {!visibleToolCalls.length ? (
                      <p className="rounded-lg border border-dashed border-black/20 p-4 text-sm text-black/55">
                        Agent runs will log tool calls here.
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-lg border border-black/10 bg-white p-5">
                  <p className="mb-3 text-sm font-semibold">Recent agent runs</p>
                  <div className="space-y-2">
                    {visibleRuns.map((run) => (
                      <div key={run.id} className="rounded-lg border border-black/10 p-3">
                        <p className="text-sm font-semibold">{run.status}</p>
                        <p className="mt-1 text-xs text-black/50">
                          {run.latencyMs}ms · {run.tokenEstimate} tokens · {formatCost(run.estimatedCostUsd)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {selectedRun ? (
              <div className="mt-6 rounded-lg border border-black/10 bg-white p-5">
                <p className="mb-4 text-sm font-semibold">Execution trace viewer</p>
                <div className="space-y-3">
                  {selectedRun.steps.map((step, index) => (
                    <div
                      key={step.id}
                      className="grid gap-3 rounded-lg border border-black/10 p-4 md:grid-cols-[48px_minmax(0,1fr)_160px]"
                    >
                      <span className="grid size-9 place-items-center rounded-full bg-black text-sm font-semibold text-white">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold">{step.label}</p>
                        <p className="mt-1 text-sm leading-6 text-black/60">{step.detail}</p>
                      </div>
                      <div className="text-xs text-black/55">
                        <p>{step.kind}</p>
                        <p>{step.latencyMs}ms</p>
                        <p>{step.tokenEstimate} tokens</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </Panel>
        ) : null}
      </div>
    </section>
  );
}

function WorkflowStudio({
  workflows,
  selectedWorkflow,
  runs,
  running,
  onSelectWorkflow,
  onRunWorkflow,
}: {
  workflows: AIWorkflow[];
  selectedWorkflow?: AIWorkflow;
  runs: PromptWorkspace["workflowRuns"];
  running: boolean;
  onSelectWorkflow: (id: string) => void;
  onRunWorkflow: (workflow: AIWorkflow) => void;
}) {
  const workflowRuns = runs.filter((run) => run.workflowId === selectedWorkflow?.id);

  return (
    <section className="grid gap-8 py-8 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="space-y-6">
        <Panel title="Workflow Library" icon={Blocks}>
          <div className="space-y-3">
            {workflows.map((workflow) => (
              <button
                key={workflow.id}
                className={clsx(
                  "block w-full rounded-lg border p-4 text-left",
                  selectedWorkflow?.id === workflow.id
                    ? "border-black bg-white"
                    : "border-black/10 bg-white/70 hover:bg-white",
                )}
                onClick={() => onSelectWorkflow(workflow.id)}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0f766e]">
                  {workflow.status}
                </p>
                <p className="mt-2 text-base font-semibold">{workflow.name}</p>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-black/60">
                  {workflow.description}
                </p>
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="Workflow Analytics" icon={Gauge}>
          <dl className="grid grid-cols-2 gap-3">
            <Metric label="Runs" value={workflowRuns.length} />
            <Metric
              label="Nodes"
              value={selectedWorkflow?.nodes.length ?? 0}
            />
            <CostMetric
              label="Spend"
              value={workflowRuns.reduce((total, run) => total + run.estimatedCostUsd, 0)}
            />
            <Metric
              label="Latency"
              value={
                workflowRuns.length
                  ? Math.round(
                      workflowRuns.reduce((total, run) => total + run.latencyMs, 0) /
                        workflowRuns.length,
                    )
                  : 0
              }
              suffix="ms"
            />
          </dl>
        </Panel>
      </aside>

      <div className="space-y-8">
        <section className="rounded-lg border border-black/10 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0f766e]">
            Workflow Engine v2
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-normal sm:text-4xl">
            Stateful workflow execution with branches, loops, retries, and replay.
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-8 text-black/60">
            Build production workflows for research, support automation, SEO,
            content generation, and evaluation-driven deployment gates with
            dataset execution, node caching, partial re-runs, and failure recovery.
          </p>
        </section>

        <div className="grid gap-3 md:grid-cols-5">
          {[
            ["If/else", "Conditional branching"],
            ["Loop", "Batch datasets"],
            ["Parallel", "Model fan-out"],
            ["Retry", "Fallback strategy"],
            ["Replay", "Debug from trace"],
          ].map(([label, detail]) => (
            <div key={label} className="rounded-lg border border-black/10 bg-white p-4">
              <p className="text-sm font-semibold">{label}</p>
              <p className="mt-1 text-xs leading-5 text-black/55">{detail}</p>
            </div>
          ))}
        </div>

        {selectedWorkflow ? (
          <Panel title={selectedWorkflow.name} icon={Workflow}>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold">{selectedWorkflow.description}</p>
                <p className="mt-1 text-sm text-black/55">
                  Variables: {selectedWorkflow.variables.map((item) => `{{${item}}}`).join(", ")}
                </p>
              </div>
              <button
                className="btn-primary"
                onClick={() => onRunWorkflow(selectedWorkflow)}
                disabled={running}
              >
                {running ? (
                  <Loader2 className="animate-spin" size={16} aria-hidden="true" />
                ) : (
                  <Sparkles size={16} aria-hidden="true" />
                )}
                Run workflow
              </button>
            </div>

            <div className="relative min-h-[260px] overflow-auto rounded-lg border border-black/10 bg-[#f8fafc] p-5">
              <div className="grid min-w-[900px] grid-cols-4 gap-5">
                {selectedWorkflow.nodes.map((node) => (
                  <div
                    key={node.id}
                    draggable
                    className="rounded-lg border border-black/10 bg-white p-4 shadow-sm"
                    title="Drag-and-drop ready workflow node"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/45">
                      {node.kind} node
                    </p>
                    <p className="mt-2 text-lg font-semibold">{node.label}</p>
                    <p className="mt-2 min-h-12 text-sm leading-6 text-black/60">
                      {node.config}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {selectedWorkflow.edges.map((edge) => (
                  <span key={edge.id} className="tag">
                    {edge.from} → {edge.to}: {edge.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-black/10 bg-white p-5">
                <p className="text-sm font-semibold">Execution timeline</p>
                <div className="mt-4 space-y-3">
                  {(workflowRuns[0]?.logs ?? [
                    "Run a workflow to generate execution logs.",
                  ]).map((log) => (
                    <div key={log} className="flex gap-3 text-sm text-black/65">
                      <span className="mt-1 size-2 rounded-full bg-[#0f766e]" />
                      <span>{log}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-black/10 bg-white p-5">
                <p className="text-sm font-semibold">Run history</p>
                <div className="mt-4 space-y-2">
                  {workflowRuns.map((run) => (
                    <div key={run.id} className="rounded-lg bg-black/[0.04] p-3 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="font-semibold">{run.status}</span>
                        <span>{formatDate(run.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-black/55">
                        {run.latencyMs}ms · {run.tokenEstimate} tokens ·{" "}
                        {formatCost(run.estimatedCostUsd)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Panel>
        ) : null}
      </div>
    </section>
  );
}

function DeploymentCenter({
  prompts,
  versions,
  deployments,
  history,
  releases,
  environment,
  onEnvironmentChange,
  onDeploy,
  onPromote,
  onRollback,
}: {
  prompts: ManagedPrompt[];
  versions: PromptVersion[];
  deployments: PromptDeployment[];
  history: PromptWorkspace["deploymentHistory"];
  releases: PromptWorkspace["promptReleases"];
  environment: DeploymentEnvironment;
  onEnvironmentChange: (environment: DeploymentEnvironment) => void;
  onDeploy: (environment: DeploymentEnvironment) => void;
  onPromote: (deployment: PromptDeployment) => void;
  onRollback: (deployment: PromptDeployment) => void;
}) {
  const promptById = new Map(prompts.map((prompt) => [prompt.id, prompt]));
  const versionById = new Map(versions.map((version) => [version.id, version]));
  const environmentReleases = releases.filter((release) => release.environment === environment);
  const averageHealth = environmentReleases.length
    ? Math.round(
        environmentReleases.reduce((total, release) => total + release.healthScore, 0) /
          environmentReleases.length,
      )
    : 0;

  return (
    <section className="space-y-8 py-8">
      <section className="rounded-lg border border-black/10 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0f766e]">
          Release management lifecycle
        </p>
        <div className="mt-3 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <h2 className="text-3xl font-semibold tracking-normal sm:text-4xl">
              Ship prompt releases with staged rollout, A/B checks, and rollback.
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-8 text-black/60">
              Track release notes, deployment health, performance comparison,
              promotion events, rollout percentage, and rollback checkpoints.
            </p>
          </div>
          <div className="grid gap-2">
            <div className="flex rounded-lg border border-black/10 bg-[#f7f8fb] p-1">
              {(["development", "staging", "production"] as DeploymentEnvironment[]).map(
                (item) => (
                  <button
                    key={item}
                    className={clsx(
                      "flex-1 rounded-md px-3 py-2 text-xs font-semibold capitalize",
                      environment === item ? "bg-black text-white" : "text-black/55",
                    )}
                    onClick={() => onEnvironmentChange(item)}
                  >
                    {item}
                  </button>
                ),
              )}
            </div>
            <button className="btn-primary justify-center" onClick={() => onDeploy(environment)}>
              <Rocket size={16} aria-hidden="true" />
              Deploy selected prompt
            </button>
          </div>
        </div>
      </section>

      <Panel title="Deployment Health Dashboard" icon={Gauge}>
        <div className="grid gap-3 md:grid-cols-4">
          <Metric label="Release health" value={averageHealth} suffix="/100" />
          <Metric label="Active releases" value={environmentReleases.length} />
          <Metric
            label="A/B rollout"
            value={environmentReleases.reduce(
              (max, release) => Math.max(max, release.rolloutPercent),
              0,
            )}
            suffix="%"
          />
          <Metric
            label="Rollbacks"
            value={environmentReleases.filter((release) => release.status === "rolled_back").length}
          />
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {environmentReleases.map((release) => (
            <article key={release.id} className="rounded-lg border border-black/10 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{release.tag}</p>
                  <p className="mt-1 text-xs text-black/50">{release.notes}</p>
                </div>
                <span className="tag">{release.status}</span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/10">
                <div
                  className="h-full rounded-full bg-[#0f766e]"
                  style={{ width: `${release.rolloutPercent}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-black/50">
                {release.rolloutPercent}% rollout · health {release.healthScore}
              </p>
            </article>
          ))}
          {!environmentReleases.length ? (
            <div className="rounded-lg border border-dashed border-black/20 bg-white p-6 text-sm text-black/55">
              No release records for this environment yet.
            </div>
          ) : null}
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel title={`${environment} deployments`} icon={Rocket}>
          <div className="grid gap-4 lg:grid-cols-2">
            {deployments.map((deployment) => {
              const prompt = promptById.get(deployment.promptId);
              const version = versionById.get(deployment.versionId);

              return (
                <article
                  key={deployment.id}
                  className="rounded-lg border border-black/10 bg-white p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0f766e]">
                        {deployment.status}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold">
                        {prompt?.title ?? "Prompt deployment"}
                      </h3>
                    </div>
                    <span className="rounded-full bg-black px-3 py-1 text-xs font-semibold text-white">
                      {deployment.environment}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-black/60">
                    {deployment.metadata}
                  </p>
                  <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <Info label="Version" value={version ? `v${version.versionNumber}` : "latest"} />
                    <Info label="Deployed" value={formatDate(deployment.createdAt)} />
                  </dl>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button className="btn-secondary" onClick={() => onPromote(deployment)}>
                      <GitBranch size={16} aria-hidden="true" />
                      Promote
                    </button>
                    <button className="btn-secondary" onClick={() => onRollback(deployment)}>
                      <History size={16} aria-hidden="true" />
                      Rollback
                    </button>
                  </div>
                </article>
              );
            })}
            {!deployments.length ? (
              <div className="rounded-lg border border-dashed border-black/20 bg-white p-8 text-center">
                <p className="text-lg font-semibold">No deployments in {environment}</p>
                <p className="mt-2 text-sm text-black/55">
                  Deploy the selected prompt to create an environment release.
                </p>
              </div>
            ) : null}
          </div>
        </Panel>

        <Panel title="Deployment Timeline" icon={History}>
          <div className="space-y-3">
            {history.slice(0, 10).map((event) => (
              <div key={event.id} className="rounded-lg border border-black/10 bg-white p-4">
                <p className="text-sm font-semibold">{event.summary}</p>
                <p className="mt-1 text-xs text-black/45">
                  {event.action} · {formatDate(event.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </section>
  );
}

function ObservabilityCenter({
  runs,
  artifacts,
  metrics,
  traces,
  nodes,
  events,
  steps,
  logs,
  selectedTrace,
  onSelectTrace,
}: {
  runs: PromptWorkspace["aiRuns"];
  artifacts: PromptWorkspace["aiArtifacts"];
  metrics: PromptWorkspace["aiMetrics"];
  traces: PromptWorkspace["traceSessions"];
  nodes: PromptWorkspace["traceNodes"];
  events: PromptWorkspace["aiTraceEvents"];
  steps: PromptWorkspace["traceSteps"];
  logs: PromptWorkspace["traceLogs"];
  selectedTrace?: PromptWorkspace["traceSessions"][number];
  onSelectTrace: (id: string) => void;
}) {
  const traceNodes = selectedTrace
    ? nodes.filter((node) => node.traceId === selectedTrace.id)
    : [];
  const traceSteps = selectedTrace ? steps.filter((step) => step.traceId === selectedTrace.id) : [];
  const visibleNodes = traceNodes.length
    ? traceNodes
    : traceSteps.map((step) => ({
        id: step.id,
        traceId: step.traceId,
        runId: selectedTrace?.rootRunId ?? "",
        parentNodeId: step.parentStepId,
        label: step.label,
        kind: step.kind,
        status: step.status,
        latencyMs: step.latencyMs,
        inputTokenEstimate: Math.round(step.tokenEstimate * 0.55),
        outputTokenEstimate: Math.round(step.tokenEstimate * 0.45),
        estimatedCostUsd: step.estimatedCostUsd,
        errorMessage: null,
        startedAt: step.startedAt,
        endedAt: step.endedAt,
        depth: step.depth + 1,
      })) satisfies PromptWorkspace["traceNodes"];
  const traceEvents = selectedTrace
    ? events.filter((event) => event.traceId === selectedTrace.id)
    : [];
  const traceLogs = selectedTrace
    ? logs.filter((log) => log.traceId === selectedTrace.id)
    : [];
  const selectedRun = selectedTrace
    ? runs.find((run) => run.id === selectedTrace.rootRunId)
    : undefined;
  const runArtifacts = selectedRun
    ? artifacts.filter((artifact) => artifact.runId === selectedRun.id)
    : [];
  const metricSeries = metrics.slice(0, 10).map((metric) => ({
    name: metric.name,
    value: metric.value,
  }));

  return (
    <section className="grid gap-6 py-8 xl:grid-cols-[360px_minmax(0,1fr)]">
      <aside className="space-y-5">
        <Panel title="Trace Sessions" icon={Activity}>
          <div className="space-y-3">
            {traces.map((trace) => (
              <button
                key={trace.id}
                className={clsx(
                  "block w-full rounded-lg border p-4 text-left transition",
                  selectedTrace?.id === trace.id
                    ? "border-black bg-white shadow-sm"
                    : "border-black/10 bg-white/70 hover:bg-white",
                )}
                onClick={() => onSelectTrace(trace.id)}
              >
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0f766e]">
                  {trace.entityType} · {trace.status}
                </span>
                <p className="mt-2 text-sm font-semibold">{trace.name}</p>
                <p className="mt-1 text-xs text-black/50">
                  {trace.totalLatencyMs}ms · {formatCost(trace.totalCostUsd)}
                </p>
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="Unified AI Runs" icon={ServerCog}>
          <div className="space-y-2">
            {runs.slice(0, 8).map((run) => (
              <div key={run.id} className="rounded-lg border border-black/10 bg-white p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold capitalize">{run.entityType}</p>
                  <span className="tag">{run.status}</span>
                </div>
                <p className="mt-1 text-xs text-black/50">
                  {run.model} · {run.latencyMs}ms · {formatCost(run.estimatedCostUsd)}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </aside>

      <div className="min-w-0 space-y-6">
        <section className="rounded-lg border border-black/10 bg-white p-6 shadow-sm sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0f766e]">
                LangSmith-style trace observability
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-normal">
                Replay every run as a trace tree with node-level debugging.
              </h2>
              <p className="mt-4 max-w-3xl text-base leading-8 text-black/60">
                The trace tree shows nested sub-runs, error context, token usage,
                latency per node, cost breakdown, artifacts, event streams, and logs
                from the same AI execution backbone.
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-3">
              <Metric label="Runs" value={runs.length} />
              <Metric label="Traces" value={traces.length} />
              <Metric label="Nodes" value={nodes.length} />
              <Metric label="Events" value={events.length} />
            </dl>
          </div>
        </section>

        {selectedTrace ? (
          <Panel title={selectedTrace.name} icon={Activity}>
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
              <div className="space-y-3">
                {visibleNodes.map((node) => (
                  <div
                    key={node.id}
                    className="rounded-lg border border-black/10 bg-white p-4"
                    style={{ marginLeft: `${node.depth * 14}px` }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{node.label}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.12em] text-black/45">
                          {node.kind} · {node.status}
                        </p>
                        {node.errorMessage ? (
                          <p className="mt-2 text-xs leading-5 text-[#b91c1c]">
                            {node.errorMessage}
                          </p>
                        ) : null}
                      </div>
                      <span className="rounded-full bg-black px-2 py-1 text-xs font-semibold text-white">
                        {node.latencyMs}ms
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
                      <Info label="Input" value={`${node.inputTokenEstimate}`} />
                      <Info label="Output" value={`${node.outputTokenEstimate}`} />
                      <Info label="Cost" value={formatCost(node.estimatedCostUsd)} />
                      <Info label="Depth" value={`${node.depth}`} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="rounded-lg border border-black/10 bg-white p-5">
                  <p className="mb-3 text-sm font-semibold">Step inspector</p>
                  <Info label="Root run" value={selectedTrace.rootRunId} />
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <Info label="Latency" value={`${selectedTrace.totalLatencyMs}ms`} />
                    <Info label="Cost" value={formatCost(selectedTrace.totalCostUsd)} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <Info label="Trace nodes" value={`${visibleNodes.length}`} />
                    <Info label="Events" value={`${traceEvents.length}`} />
                  </div>
                </div>

                <div className="rounded-lg border border-black/10 bg-white p-5">
                  <p className="mb-3 text-sm font-semibold">Artifacts</p>
                  <div className="space-y-2">
                    {runArtifacts.map((artifact) => (
                      <div key={artifact.id} className="rounded-lg border border-black/10 p-3">
                        <p className="text-sm font-semibold">{artifact.title}</p>
                        <p className="mt-1 line-clamp-3 text-xs leading-5 text-black/55">
                          {artifact.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-black/10 bg-white p-5">
                  <p className="mb-3 text-sm font-semibold">Execution timeline replay</p>
                  <div className="space-y-2">
                    {traceEvents.slice(0, 6).map((event) => (
                      <div key={event.id} className="rounded-lg border border-black/10 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0f766e]">
                          {event.eventType}
                        </p>
                        <p className="mt-1 text-sm font-medium">{event.label}</p>
                        <p className="mt-1 text-xs text-black/50">
                          {event.latencyMs}ms · {event.inputTokenEstimate + event.outputTokenEstimate} tokens
                        </p>
                      </div>
                    ))}
                    {!traceEvents.length ? (
                      <p className="text-sm text-black/55">No trace events for this session.</p>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-lg border border-black/10 bg-white p-5">
                  <p className="mb-3 text-sm font-semibold">Trace logs</p>
                  <div className="space-y-2">
                    {traceLogs.map((log) => (
                      <div key={log.id} className="rounded-lg border border-black/10 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/45">
                          {log.level}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-black/65">{log.message}</p>
                      </div>
                    ))}
                    {!traceLogs.length ? (
                      <p className="text-sm text-black/55">No trace logs for this session.</p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 h-72 rounded-lg border border-black/10 bg-white p-4">
              <p className="mb-3 text-sm font-semibold">Performance breakdown</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={metricSeries}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0f766e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        ) : null}
      </div>
    </section>
  );
}

function EvaluationCard({
  evaluation,
  tab,
}: {
  evaluation: EvaluationResult;
  tab: EvaluationTab;
}) {
  return (
    <article className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold">{evaluation.model}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-black/45">
            {evaluation.provider}
          </p>
        </div>
        <span className="rounded-full bg-[#ecfdf5] px-3 py-1 text-xs font-semibold text-[#0f766e]">
          {evaluation.qualityScore}/100
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <Info label="Latency" value={`${evaluation.latencyMs}ms`} />
        <Info label="Tokens" value={`${evaluation.tokenEstimate}`} />
        <Info label="Cost" value={formatCost(evaluation.estimatedCostUsd)} />
        <Info label="Length" value={`${evaluation.outputLength}`} />
      </div>
      {tab === "output" ? (
        <pre className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-[#0b1120] p-4 text-sm leading-6 text-white">
          {evaluation.output}
        </pre>
      ) : null}
      {tab === "metrics" ? (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <ScoreBar label="Clarity" value={evaluation.qualityMetrics.clarity} />
          <ScoreBar label="Completeness" value={evaluation.qualityMetrics.completeness} />
          <ScoreBar label="Risk control" value={evaluation.qualityMetrics.riskControl} />
        </div>
      ) : null}
      {tab === "notes" ? (
        <ul className="mt-4 space-y-2 text-sm leading-6 text-black/65">
          {evaluation.notes.map((note) => (
            <li key={note}>- {note}</li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-black/10 bg-[#f7f8fb] p-4">
      <div className="flex items-center justify-between text-sm font-semibold">
        <span>{label}</span>
        <span>{value}/100</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/10">
        <div
          className="h-full rounded-full bg-[#0f766e]"
          style={{ width: `${Math.max(4, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

function PromptDiffView({ before, after }: { before: string; after: string }) {
  const rows = buildPromptDiff(before, after).slice(0, 12);

  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-black/10 text-xs">
      {rows.map((row) => (
        <div
          key={row.id}
          className={clsx(
            "grid grid-cols-[28px_minmax(0,1fr)] gap-2 px-2 py-1 font-mono",
            row.kind === "added" && "bg-[#ecfdf5] text-[#166534]",
            row.kind === "removed" && "bg-[#fff1f2] text-[#9f1239]",
            row.kind === "unchanged" && "bg-white text-black/50",
          )}
        >
          <span>{row.kind === "added" ? "+" : row.kind === "removed" ? "-" : " "}</span>
          <span className="truncate">{row.text || " "}</span>
        </div>
      ))}
    </div>
  );
}

function AnalyticsDashboard({
  analytics,
  activities,
}: {
  analytics: {
    categoryUsage: { name: string; prompts: number; runs: number; color: string }[];
    latencyEvents: { name: string; latency: number }[];
    favoritePrompts: { name: string; runs: number }[];
    providerUsage: {
      name: string;
      cost: number;
      runs: number;
      latency: number;
      provider: string;
    }[];
    monthlyUsage: { month: string; tokens: number; cost: number }[];
    cheapestProvider: string;
    fastestProvider: string;
    averageLatency: number;
    totalEstimatedCost: number;
  };
  activities: PromptActivity[];
}) {
  return (
    <section className="grid gap-4 pb-6 xl:grid-cols-[1.2fr_0.8fr]">
      <Panel title="Global AI Execution Dashboard" icon={BarChart3}>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="grid gap-3 lg:col-span-2 lg:grid-cols-3">
            <div className="rounded-lg border border-black/10 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/45">
                Estimated spend
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {formatCost(analytics.totalEstimatedCost)}
              </p>
            </div>
            <div className="rounded-lg border border-black/10 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/45">
                Cheapest provider
              </p>
              <p className="mt-2 text-2xl font-semibold">{analytics.cheapestProvider}</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/45">
                Fastest provider
              </p>
              <p className="mt-2 text-2xl font-semibold">{analytics.fastestProvider}</p>
            </div>
          </div>
          <div className="h-72 rounded-lg border border-black/10 bg-white p-3">
            <p className="mb-2 text-sm font-semibold">Category usage</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={analytics.categoryUsage}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="runs" radius={[6, 6, 0, 0]}>
                  {analytics.categoryUsage.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="h-72 rounded-lg border border-black/10 bg-white p-3">
            <p className="mb-2 text-sm font-semibold">
              Latency trend - avg {analytics.averageLatency}ms
            </p>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={analytics.latencyEvents}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="latency" stroke="#0f766e" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="h-72 rounded-lg border border-black/10 bg-white p-3 lg:col-span-2">
            <p className="mb-2 text-sm font-semibold">Monthly token usage</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={analytics.monthlyUsage}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="tokens" fill="#0f766e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="h-72 rounded-lg border border-black/10 bg-white p-3 lg:col-span-2">
            <p className="mb-2 text-sm font-semibold">Provider efficiency</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={analytics.providerUsage}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="latency" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Panel>

      <Panel title="Activity Timeline" icon={Activity}>
        <div className="mb-4 rounded-lg border border-black/10 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/45">
            Estimated provider usage
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {formatCost(analytics.totalEstimatedCost)}
          </p>
        </div>
        <div className="space-y-2">
          {activities.slice(0, 10).map((activity) => (
            <div key={activity.id} className="rounded-lg border border-black/10 bg-white p-3">
              <p className="text-sm font-semibold">{activity.summary}</p>
              <p className="mt-1 text-xs text-black/45">
                {activity.eventType} - {formatDate(activity.createdAt)}
              </p>
            </div>
          ))}
        </div>
      </Panel>
    </section>
  );
}

function TeamWorkspacePanel({
  workspaceName,
  collections,
  members,
  organizations,
  auditLogs,
  inviteEmail,
  onInviteEmailChange,
  onInvite,
}: {
  workspaceName: string;
  collections: PromptWorkspace["collections"];
  members: PromptWorkspace["members"];
  organizations: PromptWorkspace["organizations"];
  auditLogs: PromptWorkspace["auditLogs"];
  inviteEmail: string;
  onInviteEmailChange: (value: string) => void;
  onInvite: () => void;
}) {
  return (
    <section className="grid gap-4 pb-6 xl:grid-cols-[0.9fr_1.1fr]">
      <Panel title="Workspace Control Plane" icon={Users}>
        <div className="rounded-lg border border-black/10 bg-white p-4">
          <p className="text-lg font-semibold">{workspaceName}</p>
          <p className="mt-1 text-sm leading-6 text-black/60">
            Team ownership, shared collections, and role foundations for a production PromptOps program.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              className="input"
              value={inviteEmail}
              onChange={(event) => onInviteEmailChange(event.target.value)}
              placeholder="teammate@company.com"
            />
            <button className="btn-primary justify-center" onClick={onInvite}>
              <Plus size={16} aria-hidden="true" />
              Invite
            </button>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-black/10 bg-white p-3 text-sm"
            >
              <span className="truncate font-semibold">{member.email}</span>
              <span className="rounded-md bg-black/[0.05] px-2 py-1 text-xs font-semibold">
                {member.role} / {member.status}
              </span>
            </div>
          ))}
        </div>
      </Panel>

      <div className="space-y-4">
        <Panel title="Organizations" icon={Building2}>
          <div className="grid gap-3 md:grid-cols-2">
            {organizations.map((organization) => (
              <article
                key={organization.id}
                className="rounded-lg border border-black/10 bg-white p-4"
              >
                <p className="text-sm font-semibold">{organization.name}</p>
                <p className="mt-1 text-sm text-black/55">{organization.plan}</p>
              </article>
            ))}
          </div>
        </Panel>

        <Panel title="Shared Collections" icon={Layers3}>
          <div className="grid gap-3 md:grid-cols-2">
            {collections.map((collection) => (
              <article
                key={collection.id}
                className="rounded-lg border border-black/10 bg-white p-4"
              >
                <p className="text-sm font-semibold">{collection.name}</p>
                <p className="mt-2 text-sm leading-6 text-black/60">
                  {collection.description}
                </p>
                <div className="mt-3 flex items-center justify-between text-xs text-black/45">
                  <span>{collection.promptIds.length} prompts</span>
                  <span>{collection.visibility}</span>
                </div>
              </article>
            ))}
          </div>
        </Panel>

        <Panel title="Audit Logs" icon={Activity}>
          <div className="space-y-2">
            {auditLogs.slice(0, 8).map((log) => (
              <div key={log.id} className="rounded-lg border border-black/10 bg-white p-3">
                <p className="text-sm font-semibold">{log.action}</p>
                <p className="mt-1 text-xs text-black/55">
                  {log.actor} · {log.target} · {formatDate(log.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </section>
  );
}

function CommandPalette({
  open,
  onClose,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  actions: { label: string; icon: LucideIcon; run: () => void }[];
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 bg-black/30 px-4 py-20 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="mx-auto max-w-xl overflow-hidden rounded-lg border border-white/40 bg-white shadow-2xl"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-black/10 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Command size={16} aria-hidden="true" />
                AI operations command center
              </div>
            </div>
            <div className="p-2">
              {actions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold hover:bg-black/[0.04]"
                    onClick={() => {
                      action.run();
                      onClose();
                    }}
                  >
                    <Icon size={16} aria-hidden="true" />
                    {action.label}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white/82 p-5 shadow-sm shadow-black/[0.03] backdrop-blur sm:p-6">
      <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-black/85">
        <Icon size={16} aria-hidden="true" />
        {title}
      </div>
      {children}
    </section>
  );
}

function StatusBadge({
  icon: Icon,
  label,
  className,
}: {
  icon: LucideIcon;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex h-10 items-center gap-2 rounded-xl border border-black/10 bg-white px-3 text-sm font-medium text-black/70 shadow-sm shadow-black/[0.02]",
        className,
      )}
    >
      <Icon size={15} aria-hidden="true" />
      {label}
    </span>
  );
}

function TextInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="space-y-1.5">
      <span className="label">{label}</span>
      <input
        className="input"
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function CategoryButton({
  active,
  color,
  label,
  count,
  onClick,
}: {
  active: boolean;
  color: string;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      className={clsx(
        "flex h-11 w-full items-center justify-between gap-3 rounded-xl border px-3 text-sm font-medium transition",
        active
          ? "border-black bg-white shadow-sm"
          : "border-black/10 bg-white/70 hover:border-black/20 hover:bg-white",
      )}
      onClick={onClick}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="size-2.5 shrink-0 rounded-sm" style={{ background: color }} />
        <span className="truncate">{label}</span>
      </span>
      <span className="text-xs text-black/45">{count}</span>
    </button>
  );
}

function ToggleButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={clsx(
        "flex h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium transition",
        active
          ? "border-black bg-black text-white"
          : "border-black/10 bg-white text-black/70 hover:border-black/25",
      )}
      onClick={onClick}
    >
      <Icon size={15} aria-hidden="true" />
      {label}
    </button>
  );
}

function IconButton({
  label,
  active,
  tone,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  tone?: "danger";
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      className={clsx(
        "grid size-9 place-items-center rounded-xl border transition",
        active
          ? "border-black bg-black text-white"
          : "border-black/10 bg-white text-black/65 hover:border-black/30",
        tone === "danger" && "hover:border-[#be123c] hover:text-[#be123c]",
      )}
      title={label}
      aria-label={label}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function HeaderMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm shadow-black/[0.03]">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
        {label}
      </dt>
      <dd className="mt-2 text-3xl font-semibold tracking-normal">{value}</dd>
    </div>
  );
}

function Metric({
  label,
  value,
  suffix = "",
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm shadow-black/[0.03]">
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-black/45">
        {label}
      </dt>
      <dd className="mt-2 text-3xl font-semibold tracking-normal">
        {value}
        {suffix ? <span className="text-base text-black/45">{suffix}</span> : null}
      </dd>
    </div>
  );
}

function CostMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm shadow-black/[0.03]">
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-black/45">
        {label}
      </dt>
      <dd className="mt-2 text-2xl font-semibold tracking-normal">
        {formatCost(value)}
      </dd>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-black/[0.04] p-3">
      <dt className="font-medium text-black/45">{label}</dt>
      <dd className="mt-1 truncate font-semibold text-black/75">{value}</dd>
    </div>
  );
}
