import { NextRequest } from "next/server";
import { streamDeepSeek } from "@/lib/llm-config";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const { latex } = await request.json();

    if (!latex || typeof latex !== "string") {
      return new Response(
        JSON.stringify({ error: "No LaTeX content provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const readable = await streamDeepSeek([
      {
        role: "system",
        content: `You are an expert at converting LaTeX documents back to Markdown format. Convert the given LaTeX content into clean, well-formatted Markdown.

CRITICAL RULE - Content Consistency:
You MUST ensure the converted Markdown content is COMPLETELY CONSISTENT with the original LaTeX. Every piece of information, every math expression, every heading, every paragraph must be preserved exactly. Do NOT add, remove, or modify any content. The Markdown is a faithful representation of the LaTeX - nothing more, nothing less.

Conversion Rules:
1. Convert LaTeX structure to Markdown:
   - \\section{Title} → # Title
   - \\subsection{Title} → ## Title
   - \\subsubsection{Title} → ### Title
   - \\textbf{text} → **text**
   - \\textit{text} → *text*
   - \\emph{text} → *text*
   - $...$ or \\(...\\) inline math → $...$
   - \\[...\\] or $$...$$ display math → $$...$$
   - \\begin{itemize}\\item ... → - ...
   - \\begin{enumerate}\\item ... → 1. ...
   - \\begin{theorem}...\\end{theorem} → **Theorem.** ...
   - \\begin{proof}...\\end{proof} → *Proof.* ...
   
2. Handle mathematical expressions:
   - Keep all math notation intact
   - Convert LaTeX commands to standard math notation where appropriate
   - \\frac{a}{b} → \\frac{a}{b} (keep as-is for complex fractions)
   - \\sum, \\int, \\lim etc. → keep as LaTeX commands in $...$
   
3. Remove LaTeX preamble (\\documentclass, \\usepackage, \\begin{document}, \\end{document})
4. Preserve the semantic meaning and structure
5. Output ONLY the Markdown content, no explanations
6. If the content appears to already be Markdown, return it as-is`,
      },
      {
        role: "user",
        content: `Convert the following LaTeX content to Markdown. Remember: ensure the Markdown content is COMPLETELY CONSISTENT with the original LaTeX - preserve all content exactly:\n\n${latex}`,
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
    const errorMsg = error instanceof Error ? error.message : "Reverse LaTeX conversion failed";
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
