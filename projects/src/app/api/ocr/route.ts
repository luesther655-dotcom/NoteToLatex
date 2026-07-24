import { NextRequest } from "next/server";
import { writeFile, unlink, mkdir, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { PDFDocument } from "pdf-lib";

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

async function saveFilesToTemp(
  files: { base64: string; mimeType: string }[],
  tempDir: string
): Promise<string[]> {
  const paths: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = file.mimeType?.split("/")[1] || "png";
    const fileName = `page_${i + 1}.${ext}`;
    const filePath = join(tempDir, fileName);
    const buffer = Buffer.from(file.base64, "base64");
    await writeFile(filePath, buffer);
    paths.push(filePath);
  }
  return paths;
}

function extFromPath(filePath: string): string {
  const parts = filePath.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "png";
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
    pdf: "application/pdf",
  };
  return mime[ext.toLowerCase()] || "image/png";
}

async function combineImagesToPdf(
  imagePaths: string[],
  outputPath: string
): Promise<string> {
  const pdfDoc = await PDFDocument.create();

  for (const imgPath of imagePaths) {
    const ext = extFromPath(imgPath);
    const imgBuffer = await readFile(imgPath);

    let image;
    if (ext === "png") {
      image = await pdfDoc.embedPng(imgBuffer);
    } else {
      image = await pdfDoc.embedJpg(imgBuffer);
    }

    const page = pdfDoc.addPage([image.width, image.height]);
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
  }

  const pdfBytes = await pdfDoc.save();
  await writeFile(outputPath, Buffer.from(pdfBytes));
  return outputPath;
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

    // Save all files to temp
    const savedFiles = await saveFilesToTemp(files, tempDir);
    tempFiles.push(...savedFiles);

    // Determine if we should combine into a single PDF
    // If single file is already a PDF, submit directly
    // Otherwise, combine all images into one PDF
    let submitPath: string;
    let submitName: string;
    let submitMime: string;

    if (tempFiles.length === 1 && extFromPath(tempFiles[0]) === "pdf") {
      // Single PDF - submit directly
      submitPath = tempFiles[0];
      submitName = "document.pdf";
      submitMime = "application/pdf";
    } else {
      // Combine all images into one PDF
      const combinedPdfPath = join(tempDir, "combined.pdf");
      await combineImagesToPdf(tempFiles, combinedPdfPath);
      tempFiles.push(combinedPdfPath);
      submitPath = combinedPdfPath;
      submitName = "combined.pdf";
      submitMime = "application/pdf";
    }

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Submit one job for all pages
          const jobId = await submitOcrJob(submitPath, submitName, submitMime);
          const markdown = await pollOcrJob(jobId);

          const data = `data: ${JSON.stringify({ text: markdown })}\n\n`;
          controller.enqueue(encoder.encode(data));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : "OCR processing error";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: errorMsg })}\n\n`)
          );
          controller.close();
        } finally {
          // Cleanup temp files
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