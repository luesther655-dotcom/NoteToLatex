import { NextRequest } from "next/server";
import { LLMClient, Config, HeaderUtils, type Message } from "coze-coding-dev-sdk";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Support multiple files
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (key === "file" && value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Convert all files to base64 data URIs
    const imageContents = await Promise.all(
      files.map(async (file, index) => {
        const buffer = Buffer.from(await file.arrayBuffer());
        const base64 = buffer.toString("base64");
        const mimeType = file.type || "image/png";
        const dataUri = `data:${mimeType};base64,${base64}`;
        
        return {
          type: "image_url" as const,
          image_url: {
            url: dataUri,
            detail: "high" as const,
          },
        };
      })
    );

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    // Build message content with text prompt and all images
    const userContent: Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string; detail: "high" } }
    > = [
      {
        type: "text" as const,
        text: files.length > 1
          ? `Please transcribe the handwritten notes in these ${files.length} images into well-formatted Markdown with proper LaTeX math notation. The images are pages of the same document, please transcribe them in order and combine into a single document. Output only the transcribed content.`
          : "Please transcribe the handwritten notes in this image into well-formatted Markdown with proper LaTeX math notation. Output only the transcribed content.",
      },
      ...imageContents,
    ];

    const messages: Message[] = [
      {
        role: "system" as const,
        content: `You are an expert OCR engine specialized in handwritten mathematical notes. Your task is to transcribe handwritten content from images into clean, well-structured Markdown.

Rules:
1. Transcribe ALL visible text faithfully - do not omit, summarize, or add content
2. Use proper Markdown formatting:
   - Headings with # ## ### etc.
   - Inline math with $...$
   - Display math with $$...$$
   - Lists with - or 1. 2. 3.
   - Bold with **text**, italic with *text*
3. For mathematical formulas, use LaTeX syntax within $ or $$ delimiters
4. Preserve the original structure and ordering of content
5. If handwriting is ambiguous, choose the most mathematically sensible interpretation
6. For multi-page documents, combine all pages into a single coherent document
7. Output ONLY the transcribed markdown content, no explanations or commentary`,
      },
      {
        role: "user" as const,
        content: userContent,
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
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
