import { NextRequest, NextResponse } from "next/server";
import { createLLMClient } from "@/lib/llm-config";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { markdownContent, latexContent, apiConfig } = body;

    if (!markdownContent || !latexContent) {
      return NextResponse.json(
        { error: "Missing markdownContent or latexContent" },
        { status: 400 }
      );
    }

    const { client, model } = createLLMClient(apiConfig, request.headers);

    const messages = [
      {
        role: "system" as const,
        content: `You are a LaTeX validation expert. Your task is to compare the original Markdown content with the LaTeX conversion result and validate the accuracy.

Compare the following:
1. **Content Completeness**: Does the LaTeX output contain all the information from the original?
2. **Mathematical Accuracy**: Are all formulas correctly converted to LaTeX?
3. **Structural Integrity**: Are headings, lists, and document structure preserved?
4. **Formatting Quality**: Is the LaTeX syntax correct and well-formatted?

For each category, provide a score (1-10) and a brief explanation.

Then provide an OVERALL score (1-10) and a FINAL VERDICT: "PASS" if overall >= 7, otherwise "NEEDS_IMPROVEMENT".

Format your response as JSON:
{
  "contentCompleteness": { "score": number, "comment": "string" },
  "mathematicalAccuracy": { "score": number, "comment": "string" },
  "structuralIntegrity": { "score": number, "comment": "string" },
  "formattingQuality": { "score": number, "comment": "string" },
  "overallScore": number,
  "verdict": "PASS" | "NEEDS_IMPROVEMENT",
  "suggestions": ["string", ...]
}

Output ONLY the JSON, no explanations.`,
      },
      {
        role: "user" as const,
        content: `Original Markdown:\n${markdownContent}\n\nConverted LaTeX:\n${latexContent}`,
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
    const errorMsg = err instanceof Error ? err.message : "Validation failed";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}