import { NextRequest } from "next/server";
import { LLMClient, Config, HeaderUtils, type Message } from "coze-coding-dev-sdk";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const { markdown } = await request.json();

    if (!markdown || typeof markdown !== "string") {
      return new Response(
        JSON.stringify({ error: "No markdown content provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    const messages: Message[] = [
      {
        role: "system" as const,
        content: `You are an expert LaTeX typesetter. Convert the given Markdown content (which may contain mathematical notation) into clean, compilable LaTeX code.

Rules:
1. Output a complete LaTeX document with proper preamble
2. Include necessary packages:
   - amsmath, amssymb, amsthm for math
   - geometry for page layout
   - graphicx if images are referenced
   - hyperref for links
   - booktabs for tables
   - enumitem for lists
3. Convert Markdown elements to LaTeX:
   - # Heading → \\section{Heading}
   - ## Heading → \\subsection{Heading}
   - ### Heading → \\subsubsection{Heading}
   - **bold** → \\textbf{bold}
   - *italic* → \\textit{italic}
   - $...$ inline math stays as $...$
   - $$...$$ display math stays as \\[...\\]
   - - list items → \\begin{itemize}\\item ...
   - 1. numbered list → \\begin{enumerate}\\item ...
4. Use proper LaTeX environments for theorems, proofs, definitions if detected
5. Ensure the document compiles without errors
6. Output ONLY the LaTeX code, no explanations`,
      },
      {
        role: "user" as const,
        content: `Convert the following Markdown content to a complete, compilable LaTeX document:\n\n${markdown}`,
      },
    ];

    const stream = client.stream(messages, {
      model: "doubao-seed-2-0-pro-260215",
      temperature: 0.1,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.content) {
              const data = `data: ${JSON.stringify({ text: chunk.content.toString() })}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : "Stream error";
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: errorMsg })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "LaTeX conversion failed";
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
