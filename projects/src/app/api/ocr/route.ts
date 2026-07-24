import { NextRequest } from "next/server";
import { writeFile, unlink, mkdir, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

export const maxDuration = 300;

const PADDLE_OCR_URL = "https://paddleocr.aistudio-app.com/api/v2/ocr/jobs";
const PADDLE_OCR_TOKEN =
  process.env.PADDLE_OCR_TOKEN || "25b06606a7df2c954d5edeaa68d86f3cab0f5bba";
const PADDLE_OCR_MODEL = "PaddleOCR-VL-1.6";

async function submitOcrJob(
  filePath: string,
  fileName: string,
  mimeType: string
): Promise<string> {
  const buffer = await readFile(filePath);
  const blob = new Blob([buffer], { type: mimeType });
  const form = new FormData();
  form.set("model", PADDLE_OCR_MODEL);
  form.set(
    "optionalPayload",
    JSON.stringify({
      useDocOrientationClassify: false,
      useDocUnwarping: false,
      useChartRecognition: false,
    })
  );
  form.set("file", blob, fileName);

  const response = await fetch(PADDLE_OCR_URL, {
    method: "POST",
    headers: { Authorization: `bearer ${PADDLE_OCR_TOKEN}` },
    body: form,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PaddleOCR job submission failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data.data.jobId;
}

async function pollOcrJob(jobId: string): Promise<string> {
  const maxRetries = 120;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(`${PADDLE_OCR_URL}/${jobId}`, {
      headers: { Authorization: `bearer ${PADDLE_OCR_TOKEN}` },
    });

    if (!response.ok) {
      throw new Error(`PaddleOCR job poll failed: ${response.status}`);
    }

    const data = await response.json();
    const state = data.data.state;

    if (state === "done") {
      const jsonlUrl = data.data.resultUrl.jsonUrl;
      const jsonlResponse = await fetch(jsonlUrl);
      if (!jsonlResponse.ok) {
        throw new Error(`Failed to fetch OCR results: ${jsonlResponse.status}`);
      }

      const jsonlText = await jsonlResponse.text();
      const lines = jsonlText.trim().split("\n").filter(Boolean);

      let markdown = "";
      for (const line of lines) {
        try {
          const result = JSON.parse(line).result;
          for (const res of result.layoutParsingResults) {
            if (markdown) markdown += "\n\n";
            markdown += res.markdown.text;
          }
        } catch {
          // Skip malformed lines
        }
      }
      return markdown;
    } else if (state === "failed") {
      const errorMsg = data.data.errorMsg || "Unknown error";
      throw new Error(`PaddleOCR job failed: ${errorMsg}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  throw new Error("PaddleOCR job timed out");
}

export async function POST(request: NextRequest) {
  const tempDir = join(tmpdir(), "paddle-ocr-" + Date.now());
  const tempFiles: string[] = [];

  try {
    const body = await request.json();
    const { files } = body;

    if (!files || files.length === 0) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    await mkdir(tempDir, { recursive: true });

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.mimeType?.split("/")[1] || "png";
      const fileName = `page_${i + 1}.${ext}`;
      const filePath = join(tempDir, fileName);
      const buffer = Buffer.from(file.base64, "base64");
      await writeFile(filePath, buffer);
      tempFiles.push(filePath);
    }

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          let allMarkdown = "";

          for (let i = 0; i < tempFiles.length; i++) {
            const filePath = tempFiles[i];
            const fileName = `page_${i + 1}.${extFromPath(filePath)}`;
            const mimeType = mimeTypeFromExt(extFromPath(filePath));

            const jobId = await submitOcrJob(filePath, fileName, mimeType);
            const markdown = await pollOcrJob(jobId);

            if (markdown) {
              if (allMarkdown) allMarkdown += "\n\n";
              allMarkdown += markdown;
            }
          }

          const data = `data: ${JSON.stringify({ text: allMarkdown })}\n\n`;
          controller.enqueue(encoder.encode(data));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : "OCR processing error";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMsg })}\n\n`));
          controller.close();
        } finally {
          for (const fp of tempFiles) {
            try { await unlink(fp); } catch { /* ignore */ }
          }
          try { await unlink(tempDir).catch(() => {}); } catch { /* ignore */ }
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
    for (const fp of tempFiles) {
      try { unlink(fp); } catch { /* ignore */ }
    }
    try { unlink(tempDir).catch(() => {}); } catch { /* ignore */ }
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

function extFromPath(filePath: string): string {
  const parts = filePath.split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "png";
}

function mimeTypeFromExt(ext: string): string {
  const mime: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    bmp: "image/bmp",
    tiff: "image/tiff",
    tif: "image/tiff",
  };
  return mime[ext.toLowerCase()] || "image/png";
}