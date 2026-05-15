import type { ManagedPrompt, PromptCategory } from "@/lib/prompts";

export function buildJsonExport(
  prompts: ManagedPrompt[],
  categories: PromptCategory[],
) {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      version: 1,
      categories,
      prompts,
    },
    null,
    2,
  );
}

export function buildMarkdownExport(
  prompts: ManagedPrompt[],
  categories: PromptCategory[],
) {
  const categoryName = new Map(categories.map((category) => [category.id, category.name]));

  return prompts
    .map((prompt) => {
      const tags = prompt.tags.length ? prompt.tags.map((tag) => `\`${tag}\``).join(", ") : "None";

      return `# ${prompt.title}

${prompt.description}

- Category: ${categoryName.get(prompt.categoryId) ?? "Uncategorized"}
- Model: ${prompt.model}
- Temperature: ${prompt.temperature}
- Tags: ${tags}
- Favorite: ${prompt.isFavorite ? "Yes" : "No"}
- Shared: ${prompt.isPublic ? "Yes" : "No"}

\`\`\`text
${prompt.content}
\`\`\`
`;
    })
    .join("\n---\n\n");
}
