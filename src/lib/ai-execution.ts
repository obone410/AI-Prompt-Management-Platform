import type { PromptWorkspace } from "@/lib/prompts";

type AIRun = PromptWorkspace["aiRuns"][number];
type TraceNodeKind = PromptWorkspace["traceNodes"][number]["kind"];
type TraceStepKind = PromptWorkspace["traceSteps"][number]["kind"];

export type AIExecutionStepInput = {
  label: string;
  kind: TraceNodeKind;
  status?: AIRun["status"];
  latencyMs?: number;
  inputTokenEstimate?: number;
  outputTokenEstimate?: number;
  estimatedCostUsd?: number;
  errorMessage?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
};

export type AIExecutionInput = {
  idFactory: (prefix: string) => string;
  workspaceId: string;
  entityType: AIRun["entityType"];
  entityId: string;
  name: string;
  model: string;
  provider: AIRun["provider"];
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  qualityScore: number;
  steps: AIExecutionStepInput[];
  artifactTitle: string;
  artifactContent: string;
  runId?: string;
  traceId?: string;
};

function toTraceStepKind(kind: TraceNodeKind): TraceStepKind {
  if (kind === "run" || kind === "metric") {
    return "artifact";
  }

  return kind;
}

function eventTypeForKind(kind: TraceNodeKind): PromptWorkspace["aiTraceEvents"][number]["eventType"] {
  if (kind === "model") {
    return "model.called";
  }

  if (kind === "tool") {
    return "tool.called";
  }

  if (kind === "artifact" || kind === "release") {
    return "artifact.created";
  }

  if (kind === "metric") {
    return "metric.recorded";
  }

  return "node.started";
}

export function createAIExecution({
  idFactory,
  workspaceId,
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
  runId = idFactory("ai-run"),
  traceId = idFactory("trace"),
}: AIExecutionInput) {
  const startedAt = new Date().toISOString();
  const completedAt = new Date(Date.now() + latencyMs).toISOString();
  const rootNodeId = idFactory("trace-node");

  const run = {
    id: runId,
    workspaceId,
    entityType,
    entityId,
    traceId,
    status: "completed",
    model,
    provider,
    latencyMs,
    inputTokenEstimate: inputTokens,
    outputTokenEstimate: outputTokens,
    estimatedCostUsd: cost,
    qualityScore,
    startedAt,
    completedAt,
    parentRunId: null,
  } satisfies PromptWorkspace["aiRuns"][number];

  const trace = {
    id: traceId,
    rootRunId: runId,
    workspaceId,
    entityType,
    entityId,
    name,
    status: "completed",
    startedAt,
    endedAt: completedAt,
    totalLatencyMs: latencyMs,
    totalCostUsd: cost,
  } satisfies PromptWorkspace["traceSessions"][number];

  const rootNode = {
    id: rootNodeId,
    traceId,
    runId,
    parentNodeId: null,
    label: name,
    kind: "run",
    status: "completed",
    latencyMs,
    inputTokenEstimate: inputTokens,
    outputTokenEstimate: outputTokens,
    estimatedCostUsd: cost,
    errorMessage: null,
    startedAt,
    endedAt: completedAt,
    depth: 0,
  } satisfies PromptWorkspace["traceNodes"][number];

  const nodeIds = steps.map(() => idFactory("trace-node"));
  const traceNodes = [
    rootNode,
    ...steps.map((step, index) => {
      const stepLatency = step.latencyMs ?? Math.max(40, Math.round(latencyMs / Math.max(1, steps.length)));
      const stepInputTokens =
        step.inputTokenEstimate ?? Math.round(inputTokens / Math.max(1, steps.length));
      const stepOutputTokens =
        step.outputTokenEstimate ?? Math.round(outputTokens / Math.max(1, steps.length));

      return {
        id: nodeIds[index],
        traceId,
        runId,
        parentNodeId: index === 0 ? rootNodeId : nodeIds[index - 1],
        label: step.label,
        kind: step.kind,
        status: step.status ?? "completed",
        latencyMs: stepLatency,
        inputTokenEstimate: stepInputTokens,
        outputTokenEstimate: stepOutputTokens,
        estimatedCostUsd:
          step.estimatedCostUsd ?? Number((cost / Math.max(1, steps.length)).toFixed(6)),
        errorMessage: step.errorMessage ?? null,
        startedAt,
        endedAt: completedAt,
        depth: index + 1,
      } satisfies PromptWorkspace["traceNodes"][number];
    }),
  ];

  const traceSteps = traceNodes.slice(1).map((node) => ({
    id: idFactory("trace-step"),
    traceId,
    parentStepId: null,
    label: node.label,
    kind: toTraceStepKind(node.kind),
    status: node.status,
    latencyMs: node.latencyMs,
    tokenEstimate: node.inputTokenEstimate + node.outputTokenEstimate,
    estimatedCostUsd: node.estimatedCostUsd,
    startedAt: node.startedAt,
    endedAt: node.endedAt,
    depth: node.depth - 1,
  })) satisfies PromptWorkspace["traceSteps"];

  const events = [
    {
      id: idFactory("trace-event"),
      runId,
      traceId,
      nodeId: rootNodeId,
      workspaceId,
      parentEventId: null,
      eventType: "run.started",
      label: `${name} started`,
      level: "info" as const,
      status: "running" as const,
      latencyMs: 0,
      inputTokenEstimate: inputTokens,
      outputTokenEstimate: 0,
      estimatedCostUsd: 0,
      errorMessage: null,
      metadata: { entityType, model, provider },
      createdAt: startedAt,
    },
    ...traceNodes.slice(1).map((node, index) => ({
      id: idFactory("trace-event"),
      runId,
      traceId,
      nodeId: node.id,
      workspaceId,
      parentEventId: null,
      eventType: eventTypeForKind(node.kind),
      label: node.label,
      level: node.status === "failed" ? ("error" as const) : ("info" as const),
      status: node.status,
      latencyMs: node.latencyMs,
      inputTokenEstimate: node.inputTokenEstimate,
      outputTokenEstimate: node.outputTokenEstimate,
      estimatedCostUsd: node.estimatedCostUsd,
      errorMessage: node.errorMessage,
      metadata: steps[index]?.metadata ?? { depth: node.depth },
      createdAt: node.endedAt ?? completedAt,
    })),
    {
      id: idFactory("trace-event"),
      runId,
      traceId,
      nodeId: rootNodeId,
      workspaceId,
      parentEventId: null,
      eventType: "run.completed",
      label: `${name} completed`,
      level: "info" as const,
      status: "completed" as const,
      latencyMs,
      inputTokenEstimate: inputTokens,
      outputTokenEstimate: outputTokens,
      estimatedCostUsd: cost,
      errorMessage: null,
      metadata: { qualityScore },
      createdAt: completedAt,
    },
  ] satisfies PromptWorkspace["aiTraceEvents"];

  const artifact = {
    id: idFactory("artifact"),
    runId,
    workspaceId,
    kind:
      entityType === "agent"
        ? "agent_memory"
        : entityType === "benchmark"
          ? "benchmark_report"
          : entityType === "deployment"
            ? "release_note"
            : entityType === "workflow"
              ? "workflow_output"
              : "prompt_output",
    title: artifactTitle,
    content: artifactContent,
    version: 1,
    createdAt: completedAt,
  } satisfies PromptWorkspace["aiArtifacts"][number];

  const metrics = [
    {
      id: idFactory("metric"),
      runId,
      workspaceId,
      scope: entityType,
      name: "latency",
      value: latencyMs,
      unit: "ms",
      createdAt: completedAt,
    },
    {
      id: idFactory("metric"),
      runId,
      workspaceId,
      scope: entityType,
      name: "quality score",
      value: qualityScore,
      unit: "score",
      createdAt: completedAt,
    },
    {
      id: idFactory("metric"),
      runId,
      workspaceId,
      scope: entityType,
      name: "estimated cost",
      value: cost,
      unit: "usd",
      createdAt: completedAt,
    },
  ] satisfies PromptWorkspace["aiMetrics"];

  const traceLogs = [
    {
      id: idFactory("trace-log"),
      traceId,
      stepId: traceSteps[0]?.id ?? null,
      level: "info",
      message: `${name} entered the unified execution engine.`,
      createdAt: startedAt,
    },
    {
      id: idFactory("trace-log"),
      traceId,
      stepId: traceSteps.at(-1)?.id ?? null,
      level: "info",
      message: `${name} produced 1 artifact and ${metrics.length} normalized metrics.`,
      createdAt: completedAt,
    },
  ] satisfies PromptWorkspace["traceLogs"];

  return {
    run,
    trace,
    traceNodes,
    traceSteps,
    traceEvents: events,
    traceLogs,
    artifact,
    metrics,
  };
}
