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
        content: `You are a meticulous academic proofreader specializing in mathematics and scientific notation. Your task is to review and correct OCR-transcribed handwritten notes.

Your responsibilities:
1. Fix any OCR errors in mathematical formulas (e.g., misread symbols, wrong subscripts/superscripts)
2. Ensure LaTeX syntax is correct and properly delimited ($ for inline, $$ for display)
3. Fix any structural issues in the Markdown formatting
4. Verify mathematical consistency (e.g., equations should balance, theorem numbering should be sequential)
5. Correct common OCR mistakes:
   - '0' vs 'O' in math context
   - '1' vs 'l' vs 'I'
   - Missing or extra braces in LaTeX
   - Incorrect fraction, integral, or sum notation
6. Preserve ALL original content - do not add or remove information
7. Output ONLY the corrected markdown content, no explanations

IMPORTANT - Multi-page/Multi-image Context Coherence:
If the content comes from multiple pages or images that are contextually related:
- Maintain logical coherence between different sections
- Ensure formulas, theorems, and references flow naturally across pages
- If a formula or sentence is split across pages, connect them properly
- Maintain consistent notation and terminology throughout
- Preserve the logical structure and argument flow of the original document

Important: Maintain the original meaning and structure. Only fix clear errors.`,
      },
      {
        role: "user" as const,
        content: `Please review and correct the following OCR-transcribed handwritten notes. Fix any errors in math formulas, LaTeX syntax, and Markdown formatting while preserving all content:\n\n${markdown}`,
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
    const errorMsg = error instanceof Error ? error.message : "Validation failed";
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
