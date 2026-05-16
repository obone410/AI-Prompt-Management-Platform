import {
  runModelEvaluation,
  type EvaluationRequest,
} from "@/lib/ai/providers";

export type EvaluationJob = EvaluationRequest & {
  jobId: string;
};

export async function enqueueEvaluationJob(request: EvaluationRequest) {
  const job: EvaluationJob = {
    ...request,
    jobId: crypto.randomUUID(),
  };

  const result = await runModelEvaluation(job);

  return {
    jobId: job.jobId,
    result,
    mode: "inline" as const,
  };
}
