"use client";

import { Copy, Download, Lock, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  promptWorkspaceStorageKey,
  type ManagedPrompt,
  type PromptWorkspace,
} from "@/lib/prompts";
import { buildMarkdownExport } from "@/lib/export-prompts";

export function SharedPromptView({ slug }: { slug: string }) {
  const [prompt, setPrompt] = useState<ManagedPrompt | null>(null);
  const [workspace, setWorkspace] = useState<PromptWorkspace | null>(null);

  useEffect(() => {
    let mounted = true;

    queueMicrotask(() => {
      const saved = window.localStorage.getItem(promptWorkspaceStorageKey);

      if (!saved || !mounted) {
        return;
      }

      try {
        const parsed = JSON.parse(saved) as PromptWorkspace;
        setWorkspace(parsed);
        setPrompt(
          parsed.prompts.find(
            (item) => item.isPublic && item.shareSlug === slug,
          ) ?? null,
        );
      } catch {
        setPrompt(null);
      }
    });

    return () => {
      mounted = false;
    };
  }, [slug]);

  function copyPrompt() {
    if (prompt) {
      void navigator.clipboard.writeText(prompt.content);
    }
  }

  function downloadPrompt() {
    if (!prompt || !workspace) {
      return;
    }

    const markdown = buildMarkdownExport([prompt], workspace.categories);
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${prompt.shareSlug ?? "shared-prompt"}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--foreground)]">
      <section className="mx-auto max-w-3xl rounded-lg border border-black/10 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-3 border-b border-black/10 pb-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-black text-white">
              <Share2 size={18} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0f766e]">
                Shared prompt
              </p>
              <h1 className="truncate text-2xl font-semibold">
                {prompt?.title ?? "Prompt unavailable"}
              </h1>
            </div>
          </div>
          {prompt ? (
            <div className="flex gap-2">
              <button className="btn-icon" title="Copy prompt" aria-label="Copy prompt" onClick={copyPrompt}>
                <Copy size={16} aria-hidden="true" />
              </button>
              <button className="btn-icon" title="Download prompt" aria-label="Download prompt" onClick={downloadPrompt}>
                <Download size={16} aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>

        {prompt ? (
          <div className="space-y-4">
            <p className="text-sm leading-6 text-black/65">{prompt.description}</p>
            <div className="flex flex-wrap gap-2">
              {prompt.tags.map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                </span>
              ))}
            </div>
            <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap rounded-lg bg-[#101828] p-4 text-sm leading-6 text-white">
              {prompt.content}
            </pre>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-lg border border-dashed border-black/20 bg-[#f8fafc] p-4 text-sm leading-6 text-black/60">
            <Lock className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
            This shared prompt is private, missing, or not synced to this browser. With Supabase configured, public prompt links can be served from Postgres by slug.
          </div>
        )}
      </section>
    </main>
  );
}
