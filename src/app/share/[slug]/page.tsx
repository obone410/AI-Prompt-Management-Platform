import type { Metadata } from "next";
import { SharedPromptView } from "@/components/shared-prompt-view";

export const metadata: Metadata = {
  title: "Shared Prompt | PromptDeck AI",
};

export default async function SharedPromptPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <SharedPromptView slug={slug} />;
}
