import { NextRequest } from "next/server";
import { streamDeepSeek } from "@/lib/llm-config";

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

    const readable = await streamDeepSeek([
      {
        role: "system",
        content: `You are an expert LaTeX typesetter. Convert the given Markdown content (which may contain mathematical notation) into clean, compilable LaTeX code.

CRITICAL RULE - Content Consistency:
You MUST ensure the converted LaTeX content is COMPLETELY CONSISTENT with the original Markdown. Every piece of information, every math expression, every heading, every paragraph must be preserved exactly. Do NOT add, remove, or modify any content. The LaTeX is a faithful representation of the Markdown - nothing more, nothing less.

Formatting Rules:
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
        role: "user",
        content: `Convert the following Markdown content to a complete, compilable LaTeX document. Remember: ensure the LaTeX content is COMPLETELY CONSISTENT with the original Markdown - preserve all content exactly:\n\n${markdown}`,
      },
    ]);

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
