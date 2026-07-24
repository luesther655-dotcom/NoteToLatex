import { Config, LLMClient, HeaderUtils } from "coze-coding-dev-sdk";

// Default LLM configuration — DeepSeek
export const DEFAULT_LLM_API_KEY = process.env.DEFAULT_LLM_API_KEY || "sk-3390696ffce44cd68c32523ab7fb7d34";
export const DEFAULT_LLM_BASE_URL = process.env.DEFAULT_LLM_BASE_URL || "https://api.deepseek.com";
export const DEFAULT_LLM_MODEL = process.env.DEFAULT_LLM_MODEL || "deepseek-chat";

interface ApiConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

/**
 * Create LLM client with user's API config or fallback to environment defaults.
 * Priority: user-provided config > environment variables > SDK defaults
 */
export function createLLMClient(
  apiConfig?: ApiConfig,
  headers?: Headers
): { client: LLMClient; model: string } {
  const config = new Config({
    apiKey: apiConfig?.apiKey || DEFAULT_LLM_API_KEY || undefined,
    baseUrl: apiConfig?.baseUrl || DEFAULT_LLM_BASE_URL || undefined,
  });

  const customHeaders = headers
    ? HeaderUtils.extractForwardHeaders(headers)
    : {};

  const client = new LLMClient(config, customHeaders);
  const model = apiConfig?.model || DEFAULT_LLM_MODEL;

  return { client, model };
}
