import { NextRequest, NextResponse } from "next/server";
import { createLLMClient } from "@/lib/llm-config";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { latexContent, apiConfig } = body;

    if (!latexContent) {
      return NextResponse.json(
        { error: "Missing latexContent" },
        { status: 400 }
      );
    }

    const { client, model } = createLLMClient(apiConfig, request.headers);

    const messages = [
      {
        role: "system" as const,
        content: `You are a Markdown conversion expert. Convert the following LaTeX code into clean Markdown format.

Rules:
1. Convert all LaTeX commands and environments to proper Markdown equivalents
2. Preserve inline math $...$ and display math $$...$$ exactly as they are
3. Convert LaTeX sections, subsections, etc. to Markdown headings
4. Convert LaTeX lists, tables, and other environments to Markdown equivalents
5. Output ONLY the Markdown content, no explanations or commentary
6. Maintain the document structure with appropriate Markdown formatting`,
      },
      {
        role: "user" as const,
        content: latexContent,
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