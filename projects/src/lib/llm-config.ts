import { Config, LLMClient, HeaderUtils } from "coze-coding-dev-sdk";

// Default LLM configuration — Coze (for OCR)
export const DEFAULT_LLM_API_KEY = process.env.DEFAULT_LLM_API_KEY || "";
export const DEFAULT_LLM_BASE_URL = process.env.DEFAULT_LLM_BASE_URL || "https://api.coze.cn/v3";
export const DEFAULT_LLM_MODEL = process.env.DEFAULT_LLM_MODEL || "doubao-seed-2-0-pro-260215";

// DeepSeek config (shared by validate, LaTeX, reverse LaTeX)
export const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "sk-3390696ffce44cd68c32523ab7fb7d34";
export const DEEPSEEK_BASE_URL = "https://api.deepseek.com";
export const DEEPSEEK_MODEL = "deepseek-chat";

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

interface DeepSeekMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Create a DeepSeek streaming chat completion via OpenAI-compatible API.
 * Used by validate, LaTeX, and reverse LaTeX routes.
 */
export async function streamDeepSeek(
  messages: DeepSeekMessage[],
  signal?: AbortSignal
): Promise<ReadableStream> {
  const apiKey = process.env.DEEPSEEK_API_KEY || DEEPSEEK_API_KEY;

  const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages,
      stream: true,
      temperature: 0.1,
    }),
    signal,
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `DeepSeek API error: ${response.status} ${response.statusText}${errorBody ? ` - ${errorBody}` : ""}`
    );
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("DeepSeek API returned no response body");
  }

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
              return;
            }
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || "";
              if (content) {
                const sse = `data: ${JSON.stringify({ text: content })}\n\n`;
                controller.enqueue(encoder.encode(sse));
              }
            } catch {
              // skip malformed JSON lines
            }
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Stream error";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: errorMsg })}\n\n`)
        );
        controller.close();
      }
    },
  });
}
