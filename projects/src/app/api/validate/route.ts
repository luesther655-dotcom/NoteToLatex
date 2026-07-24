import { NextRequest, NextResponse } from "next/server";
import { createLLMClient } from "@/lib/llm-config";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { markdown: markdownContent, markdownContent: mdContent, latexContent, apiConfig } = body;
    const text = markdownContent || mdContent;

    if (!text) {
      return NextResponse.json(
        { error: "Missing markdown content" },
        { status: 400 }
      );
    }

    const { client, model } = createLLMClient(apiConfig, request.headers);

    const systemPrompt = latexContent
      ? `You are a LaTeX validation expert. Your task is to compare the original Markdown content with the LaTeX conversion result and validate the accuracy.

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

Output ONLY the JSON, no explanations.`
      : `You are a markdown formatting expert. Your task is to clean up and format the OCR extracted text into well-structured Markdown.

Fix the following issues:
1. **Formatting**: Ensure proper Markdown syntax (headings, lists, code blocks, etc.)
2. **Spacing**: Fix extra spaces, line breaks, and paragraph formatting
3. **Math**: Ensure formulas are properly formatted with $...$ or $$...$$
4. **Tables**: Fix any table formatting issues
5. **Lists**: Ensure proper list indentation and numbering

Output ONLY the cleaned Markdown text, no explanations or extra formatting.`;

    const userMessage = latexContent
      ? `Original Markdown:\n${text}\n\nConverted LaTeX:\n${latexContent}`
      : `Clean up this OCR text into well-formatted Markdown:\n\n${text}`;

    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userMessage },
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