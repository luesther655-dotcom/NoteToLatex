import { Config, LLMClient, HeaderUtils } from "coze-coding-dev-sdk";

// Default LLM configuration from environment variables
export const DEFAULT_LLM_API_KEY = process.env.DEFAULT_LLM_API_KEY || "";
export const DEFAULT_LLM_BASE_URL = process.env.DEFAULT_LLM_BASE_URL || "";
export const DEFAULT_LLM_MODEL = process.env.DEFAULT_LLM_MODEL || "doubao-seed-2-0-pro-260215";

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
