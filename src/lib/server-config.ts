export const serverConfig = {
  openAiModel: process.env.OPENAI_MODEL ?? "gpt-5",
  isOpenAiConfigured: Boolean(process.env.OPENAI_API_KEY),
};
