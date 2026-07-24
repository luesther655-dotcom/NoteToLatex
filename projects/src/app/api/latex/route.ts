import { NextRequest, NextResponse } from "next/server";
import { createLLMClient } from "@/lib/llm-config";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { markdownContent, apiConfig } = body;

    if (!markdownContent) {
      return NextResponse.json(
        { error: "Missing markdownContent" },
        { status: 400 }
      );
    }

    const { client, model } = createLLMClient(apiConfig, request.headers);

    const messages = [
      {
        role: "system" as const,
        content: `You are a LaTeX conversion expert. Convert the following Markdown content into valid LaTeX code.

Rules:
1. Convert all Markdown formatting to proper LaTeX equivalents
2. Preserve inline math $...$ and display math $$...$$ exactly as they are
3. Use proper LaTeX environments (equation, align, etc.) for mathematical content
4. Maintain the document structure with appropriate LaTeX commands
5. Output ONLY the LaTeX code, no explanations or commentary
6. Do NOT include \\\\begin{document} or \\\\end{document} - just the content body`,
      },
      {
        role: "user" as const,
        content: markdownContent,
      },
    ];

    const stream = client.stream(messages, { model, temperature: 0.1 });

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
          const errorData = `data: ${JSON.stringify({ error: errorMsg })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
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
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Conversion failed";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}