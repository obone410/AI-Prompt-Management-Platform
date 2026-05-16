export type PromptDiffLine = {
  id: string;
  kind: "added" | "removed" | "unchanged";
  text: string;
};

export function buildPromptDiff(before: string, after: string) {
  const beforeLines = before.split(/\r?\n/);
  const afterLines = after.split(/\r?\n/);
  const rows: PromptDiffLine[] = [];
  const max = Math.max(beforeLines.length, afterLines.length);

  for (let index = 0; index < max; index += 1) {
    const previous = beforeLines[index];
    const next = afterLines[index];

    if (previous === next) {
      rows.push({
        id: `same-${index}`,
        kind: "unchanged",
        text: previous ?? "",
      });
      continue;
    }

    if (previous !== undefined) {
      rows.push({
        id: `removed-${index}`,
        kind: "removed",
        text: previous,
      });
    }

    if (next !== undefined) {
      rows.push({
        id: `added-${index}`,
        kind: "added",
        text: next,
      });
    }
  }

  return rows;
}
