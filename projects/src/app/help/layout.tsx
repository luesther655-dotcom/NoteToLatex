import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "帮助文档 - NoteToLaTeX",
  description: "NoteToLaTeX 手写笔记转换器的完整使用指南，包括上传文件、处理流程、结果编辑、导出、账户管理等功能说明。",
};

export default function HelpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
