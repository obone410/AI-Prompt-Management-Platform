import type { Metadata } from "next";
import { SharedPromptView } from "@/components/shared-prompt-view";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ManagedPrompt } from "@/lib/prompts";

export const metadata: Metadata = {
  title: "Shared Prompt | PromptDeck OS",
};

type PublicPromptRow = {
  id: string;
  title: string;
  description: string;
  content: string;
  tags: string[] | null;
  model: string;
  temperature: number | string;
  share_slug: string;
  category_name: string | null;
  updated_at: string;
};

async function getPublicPrompt(slug: string): Promise<ManagedPrompt | null> {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .rpc("get_public_prompt_by_slug", { lookup_slug: slug })
    .maybeSingle<PublicPromptRow>();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    content: data.content,
    categoryId: data.category_name ?? "",
    tags: data.tags ?? [],
    model: data.model,
    temperature: Number(data.temperature),
    isFavorite: false,
    isPublic: true,
    shareSlug: data.share_slug,
    usageCount: 0,
    lastTestedAt: null,
    createdAt: data.updated_at,
    updatedAt: data.updated_at,
  };
}

export default async function SharedPromptPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const initialPrompt = await getPublicPrompt(slug);

  return <SharedPromptView slug={slug} initialPrompt={initialPrompt} />;
}
