"use client";

import {
  Bot,
  Check,
  Clipboard,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Filter,
  Heart,
  LayoutDashboard,
  Loader2,
  Lock,
  LogIn,
  LogOut,
  Pencil,
  Plus,
  Save,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  Trash2,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { publicConfig } from "@/lib/config";
import {
  createId,
  createShareSlug,
  type ManagedPrompt,
  type PromptRun,
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

function cloneSeedWorkspace() {
  return JSON.parse(JSON.stringify(seedWorkspace)) as PromptWorkspace;
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

  return { categories, prompts, runs: [] };
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

  return {
    categories: (categories as CategoryRow[]).map(mapCategory),
    prompts: (prompts as PromptRow[]).map(mapPrompt),
    runs: ((runs ?? []) as RunRow[]).map(mapRun),
  };
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
  const [ready, setReady] = useState(false);
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
  const [authEmail, setAuthEmail] = useState("demo@promptdeck.ai");
  const [authPassword, setAuthPassword] = useState("promptdeck-demo");
  const [authMessage, setAuthMessage] = useState("");
  const [testInput, setTestInput] = useState(
    "A founder wants to organize reusable AI prompts for product, hiring, and engineering work.",
  );
  const [testOutput, setTestOutput] = useState("");
  const [testing, setTesting] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    let mounted = true;

    queueMicrotask(() => {
      const saved = window.localStorage.getItem(promptWorkspaceStorageKey);

      if (saved && mounted) {
        try {
          setWorkspace(JSON.parse(saved) as PromptWorkspace);
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

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.email) {
        setSession({ id: user.id, email: user.email, provider: "Supabase" });
      }

      setReady(true);
    }

    void loadAuth();

    const subscription = supabase?.auth.onAuthStateChange((_event, authSession) => {
      const user = authSession?.user;
      setSession(
        user?.email
          ? { id: user.id, email: user.email, provider: "Supabase" }
          : null,
      );
    });

    return () => {
      mounted = false;
      subscription?.data.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (ready) {
      window.localStorage.setItem(promptWorkspaceStorageKey, JSON.stringify(workspace));
    }
  }, [ready, workspace]);

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

  const stats = {
    prompts: workspace.prompts.length,
    favorites: workspace.prompts.filter((prompt) => prompt.isFavorite).length,
    shared: workspace.prompts.filter((prompt) => prompt.isPublic).length,
    tests: workspace.runs.length,
  };

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  function supabaseUserId() {
    return session?.provider === "Supabase" ? session.id : null;
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

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthMessage("");

    if (!supabase) {
      setSession({
        id: "demo-user",
        email: authEmail || "demo@promptdeck.ai",
        provider: "Demo",
      });
      setAuthMessage("Demo workspace unlocked.");
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

      setWorkspace((current) => ({
        ...current,
        prompts: current.prompts.map((prompt) =>
          prompt.id === editingPromptId ? updatedPrompt : prompt,
        ),
      }));
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
      void persistPrompt(prompt);
    }

    setEditingPromptId(null);
    setForm(emptyForm(form.categoryId));
    showToast(editingPromptId ? "Prompt updated." : "Prompt saved.");
  }

  function deletePrompt(promptId: string) {
    setWorkspace((current) => {
      const prompts = current.prompts.filter((prompt) => prompt.id !== promptId);
      return {
        ...current,
        prompts,
        runs: current.runs.filter((run) => run.promptId !== promptId),
      };
    });

    showToast("Prompt deleted.");
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
    void persistPrompt(copy);
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

    setTesting(true);
    setTestOutput("");

    try {
      const response = await fetch("/api/test-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: selectedPrompt.content,
          input: testInput,
          model: selectedPrompt.model,
          temperature: selectedPrompt.temperature,
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

      setWorkspace((current) => ({
        ...current,
        runs: [run, ...current.runs],
        prompts: current.prompts.map((prompt) =>
          prompt.id === selectedPrompt.id ? updatedPrompt : prompt,
        ),
      }));
      void persistRun(run);
      void persistPrompt(updatedPrompt);
    } catch (error) {
      setTestOutput(error instanceof Error ? error.message : "Prompt test failed.");
    } finally {
      setTesting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1520px] flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-black/10 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-black text-white">
              <Sparkles size={22} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0f766e]">
                AI workflow console
              </p>
              <h1 className="truncate text-2xl font-semibold tracking-normal sm:text-3xl">
                PromptDeck AI
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              icon={publicConfig.isSupabaseConfigured ? ShieldCheck : Lock}
              label={
                publicConfig.isSupabaseConfigured
                  ? "Supabase ready"
                  : "Local demo mode"
              }
            />
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

        <section className="grid flex-1 gap-4 py-4 xl:grid-cols-[280px_minmax(0,1fr)_380px]">
          <aside className="flex min-w-0 flex-col gap-4">
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
                    type="submit"
                    disabled={!ready}
                  >
                    <LogIn size={16} aria-hidden="true" />
                    Continue
                  </button>
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

          <section className="grid min-w-0 gap-4 lg:grid-cols-[minmax(280px,0.92fr)_minmax(340px,1.08fr)]">
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

                <div className="max-h-[640px] space-y-2 overflow-y-auto pr-1">
                  {filteredPrompts.map((prompt) => {
                    const category = categoryById.get(prompt.categoryId);
                    const active = selectedPrompt?.id === prompt.id;

                    return (
                      <article
                        key={prompt.id}
                        className={clsx(
                          "rounded-lg border bg-white p-3 transition",
                          active
                            ? "border-black shadow-sm"
                            : "border-black/10 hover:border-black/25",
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
                          <h2 className="line-clamp-2 text-base font-semibold">
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
                </div>
              </div>
            </Panel>

            <Panel title={editingPromptId ? "Edit Prompt" : "Prompt Builder"} icon={WandSparkles}>
              <form className="space-y-3" onSubmit={savePrompt}>
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

                <TextInput
                  label="Tags"
                  value={form.tags}
                  onChange={(value) => setForm({ ...form, tags: value })}
                  placeholder="strategy, review, workflow"
                />

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
                  <button className="btn-secondary" type="button" onClick={startCreate}>
                    <Plus size={16} aria-hidden="true" />
                    Clear
                  </button>
                </div>
              </form>
            </Panel>
          </section>

          <aside className="min-w-0">
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

                  <div className="min-h-44 rounded-lg border border-black/10 bg-[#101828] p-4 text-sm leading-6 text-white">
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
          </aside>
        </section>
      </div>

      {toast ? (
        <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-lg bg-black px-4 py-3 text-sm font-medium text-white shadow-lg">
          <Check size={16} aria-hidden="true" />
          {toast}
        </div>
      ) : null}
    </main>
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
    <section className="rounded-lg border border-black/10 bg-[#f8fafc] p-3 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
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
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <span className="inline-flex h-10 items-center gap-2 rounded-lg border border-black/10 bg-white px-3 text-sm font-medium text-black/70">
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
        "flex h-10 w-full items-center justify-between gap-3 rounded-lg border px-3 text-sm font-medium",
        active ? "border-black bg-white" : "border-black/10 bg-white/70 hover:bg-white",
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
        "flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium",
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
        "grid size-8 place-items-center rounded-md border transition",
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

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-black/10 bg-white p-3">
      <dt className="text-xs font-medium text-black/50">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold">{value}</dd>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-black/[0.04] p-2">
      <dt className="font-medium text-black/45">{label}</dt>
      <dd className="mt-1 truncate font-semibold text-black/75">{value}</dd>
    </div>
  );
}
