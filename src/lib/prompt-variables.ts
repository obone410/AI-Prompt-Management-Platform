export type PromptVariable = {
  name: string;
  token: string;
  required: boolean;
  description: string;
};

const variablePattern = /\{\{\s*([a-zA-Z][a-zA-Z0-9_-]*)\s*\}\}/g;

export function extractPromptVariables(content: string) {
  const seen = new Set<string>();
  const variables: PromptVariable[] = [];

  for (const match of content.matchAll(variablePattern)) {
    const name = match[1].trim();
    const key = name.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    variables.push({
      name,
      token: `{{${name}}}`,
      required: true,
      description:
        name === "input"
          ? "Primary user-provided task input."
          : `Runtime value for ${name.replace(/[-_]/g, " ")}.`,
    });
  }

  return variables;
}

export function renderPromptTemplate(
  content: string,
  values: Record<string, string | undefined>,
) {
  return content.replace(variablePattern, (_match, rawName: string) => {
    const name = rawName.trim();
    const exactValue = values[name];
    const lowerValue = values[name.toLowerCase()];
    return exactValue ?? lowerValue ?? "";
  });
}

export function validatePromptVariables(
  variables: PromptVariable[],
  values: Record<string, string | undefined>,
) {
  return variables
    .filter((variable) => variable.required)
    .filter((variable) => {
      const value = values[variable.name] ?? values[variable.name.toLowerCase()];
      return !value?.trim();
    })
    .map((variable) => variable.name);
}

export function suggestPromptVariables(content: string) {
  const suggestions = new Set<string>();
  const lower = content.toLowerCase();

  if (/audience|persona|customer|user/.test(lower)) {
    suggestions.add("audience");
  }

  if (/tone|voice|style/.test(lower)) {
    suggestions.add("tone");
  }

  if (/format|json|table|bullets|markdown/.test(lower)) {
    suggestions.add("format");
  }

  if (/context|background|notes/.test(lower)) {
    suggestions.add("context");
  }

  if (/goal|objective|success/.test(lower)) {
    suggestions.add("goal");
  }

  return [...suggestions].filter(
    (name) =>
      !extractPromptVariables(content).some(
        (variable) => variable.name.toLowerCase() === name,
      ),
  );
}
