"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";
import { ChevronLeft, ExternalLink, Download } from "lucide-react";

const sections = [
  { id: "overview", title: "概述" },
  { id: "getting-started", title: "快速开始" },
  { id: "file-upload", title: "输入方式" },
  { id: "camera-capture", title: "拍照输入" },
  { id: "writing-pad", title: "手写板输入" },
  { id: "processing-pipeline", title: "处理流程" },
  { id: "results-panel", title: "结果面板" },
  { id: "export", title: "导出结果" },
  { id: "bidirectional-edit", title: "双向编辑" },
  { id: "account", title: "账户管理" },
  { id: "history", title: "转换历史" },
  { id: "api-config", title: "API 配置" },
  { id: "theme", title: "主题切换" },
  { id: "faq", title: "常见问题" },
  { id: "tips", title: "使用技巧" },
];

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* 顶栏 */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            返回主页
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-12">
        {/* 标题 */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#B8956A]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7V4h16v3" />
                <path d="M9 20h6" />
                <path d="M12 4v16" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold tracking-tight">帮助文档</h1>
              <p className="text-sm text-muted-foreground">NoteToLaTeX — 手写笔记转换器 使用指南</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
            NoteToLaTeX 是一款利用 AI 技术将手写笔记（图片或 PDF 格式）自动转换为出版级 LaTeX 代码的在线工具。
            本帮助文档将引导您了解全部功能与使用方法。
          </p>
          <a
            href="/evaluation-guide.pdf"
            download
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-md bg-[#B8956A] text-white text-sm font-medium hover:bg-[#A6845C] transition-colors"
          >
            <Download className="h-4 w-4" />
            下载技术文档 (PDF)
          </a>
        </div>

        <div className="flex gap-12">
          {/* 侧边目录 — 桌面端 */}
          <nav className="hidden lg:block w-56 shrink-0">
            <div className="sticky top-24 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">目录</p>
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="block text-sm text-muted-foreground hover:text-foreground transition-colors py-1 border-l-2 border-transparent hover:border-[#B8956A] pl-3"
                >
                  {s.title}
                </a>
              ))}
            </div>
          </nav>

          {/* 正文 */}
          <div className="flex-1 min-w-0 prose prose-sm dark:prose-invert max-w-none
            prose-headings:font-serif prose-headings:tracking-tight prose-headings:text-foreground
            prose-h1:text-2xl prose-h1:font-bold prose-h1:mt-0 prose-h1:mb-6
            prose-h2:text-xl prose-h2:font-semibold prose-h2:mt-10 prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b prose-h2:border-border
            prose-h3:text-lg prose-h3:font-semibold prose-h3:mt-8 prose-h3:mb-3
            prose-p:text-sm prose-p:leading-relaxed prose-p:text-muted-foreground
            prose-strong:text-foreground prose-strong:font-semibold
            prose-code:text-xs prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:text-foreground
            prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-lg
            prose-li:text-sm prose-li:text-muted-foreground
            prose-a:text-[#B8956A] prose-a:no-underline hover:prose-a:underline
            prose-blockquote:border-l-[#B8956A] prose-blockquote:text-muted-foreground prose-blockquote:not-italic
            prose-ul:my-2 prose-ol:my-2
          ">

            {/* 1. 概述 */}
            <section id="overview">
              <h2>概述</h2>
              <p>
                <strong>NoteToLaTeX</strong> 是一个基于 AI 的全栈 Web 应用，旨在帮助研究人员、学生和数学爱好者将手写的数学笔记快速转换为格式规范的 LaTeX 代码。
              </p>
              <p><strong>核心功能：</strong></p>
              <ul>
                <li><strong>OCR 识别</strong> — 利用 AI 模型读取手写内容，支持数学公式和文字</li>
                <li><strong>智能校验</strong> — 自动检测并修正 OCR 识别中的错误，确保内容准确性</li>
                <li><strong>LaTeX 转换</strong> — 将识别结果转换为标准的 LaTeX 代码，可直接用于学术出版</li>
                <li><strong>双向编辑</strong> — 编辑 Markdown 后自动重新生成 LaTeX，反之亦然</li>
                <li><strong>多种导出</strong> — 支持导出为 PDF、.tex 文件、.md 文件或直接复制</li>
                <li><strong>历史记录</strong> — 登录后可保存和浏览所有转换记录</li>
              </ul>
            </section>

            {/* 2. 快速开始 */}
            <section id="getting-started">
              <h2>快速开始</h2>
              <h3>基本流程</h3>
              <ol>
                <li>访问 NoteToLaTeX 主页</li>
                <li>选择一种输入方式：上传文件、拍照或手写</li>
                <li>点击「开始转换」按钮</li>
                <li>等待 AI 完成识别、校验和转换</li>
                <li>在结果面板中查看、编辑或导出 LaTeX 代码</li>
              </ol>
              <div className="bg-muted/30 rounded-lg p-4 my-4 border border-border">
                <p className="text-sm text-muted-foreground mb-0">
                  <strong className="text-foreground">💡 提示：</strong>需要登录后才能使用转换功能。注册后可以保存和浏览历史记录，以及自定义 API 配置。
                </p>
              </div>
            </section>

            {/* 3. 输入方式 */}
            <section id="file-upload">
              <h2>输入方式</h2>
              <p>NoteToLaTeX 提供三种输入方式，您可以根据实际情况选择最方便的方式：</p>

              <h3>方式一：文件上传</h3>
              <h4>支持的格式</h4>
              <table>
                <thead>
                  <tr>
                    <th>格式</th>
                    <th>说明</th>
                    <th>限制</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>PNG</td><td>便携式网络图形</td><td>计为 1 页</td></tr>
                  <tr><td>JPG / JPEG</td><td>JPEG 图像</td><td>计为 1 页</td></tr>
                  <tr><td>WebP</td><td>WebP 图像格式</td><td>计为 1 页</td></tr>
                  <tr><td>PDF</td><td>可移植文档格式</td><td>按实际页数计算</td></tr>
                </tbody>
              </table>

              <p className="mt-3 text-sm text-muted-foreground">
                单次转换上限：最多 <strong>200 页</strong>，文件总大小不超过 <strong>30MB</strong>。
              </p>

              <p>您可以通过拖拽文件到上传区域，或点击上传区域从文件选择器中选取文件。</p>

              <h4>多文件处理</h4>
              <p>
                您可以同时上传多个文件（包括混合图片和 PDF）。多文件上传后，AI 会分批处理各页内容
                并合并为一份完整的输出。PDF 文件的每一页会自动转换为图片进行处理。
              </p>

              <h4>文件管理</h4>
              <p>上传后，您可以在文件列表中查看所有已选文件，支持查看文件名、移除单个文件或清空全部文件。</p>
            </section>

            {/* 4. 拍照输入 */}
            <section id="camera-capture">
              <h2>拍照输入</h2>
              <p>
                如果您有摄像头（如笔记本电脑、手机或外接摄像头），可以直接在页面中拍照，无需先将照片保存到设备再上传。
              </p>

              <h3>使用步骤</h3>
              <ol>
                <li>点击上传区域的「拍照输入」按钮</li>
                <li>允许浏览器访问摄像头</li>
                <li>调整拍摄角度，确保笔记内容清晰可见</li>
                <li>点击拍照按钮完成拍摄</li>
                <li>预览照片，满意则点击「确认」，不满意可重新拍摄</li>
              </ol>

              <h3>摄像头切换</h3>
              <p>
                如果设备有多个摄像头（如前置和后置），可以点击切换按钮在前后摄像头之间切换。
              </p>

              <div className="bg-muted/30 rounded-lg p-4 my-4 border border-border">
                <p className="text-sm text-muted-foreground mb-0">
                  <strong className="text-foreground">💡 提示：</strong>拍摄时请确保光线充足，页面平整，以获得最佳识别效果。拍照后可以继续使用文件上传或手写板添加更多内容。
                </p>
              </div>
            </section>

            {/* 5. 手写板输入 */}
            <section id="writing-pad">
              <h2>手写板输入</h2>
              <p>
                如果您使用触屏设备或鼠标，可以直接在浏览器中手写笔记，无需纸笔或外部文件。
              </p>

              <h3>使用步骤</h3>
              <ol>
                <li>点击上传区域的「手写板输入」按钮</li>
                <li>在画布上使用鼠标或触控笔书写内容</li>
                <li>点击「确认」将手写内容加入待转换列表</li>
              </ol>

              <h3>画笔工具</h3>
              <ul>
                <li><strong>画笔模式</strong> — 默认模式，可自由书写</li>
                <li><strong>橡皮擦</strong> — 擦除写错的内容</li>
                <li><strong>颜色选择</strong> — 切换画笔颜色（黑色、蓝色、红色、绿色等）</li>
                <li><strong>粗细调节</strong> — 调整画笔线条的粗细</li>
              </ul>

              <h3>其他操作</h3>
              <ul>
                <li><strong>撤销</strong> — 撤销上一步绘画操作</li>
                <li><strong>清空</strong> — 一键清空画布所有内容</li>
              </ul>

              <div className="bg-muted/30 rounded-lg p-4 my-4 border border-border">
                <p className="text-sm text-muted-foreground mb-0">
                  <strong className="text-foreground">💡 提示：</strong>手写板内容会以图片形式传入 AI 处理，书写时尽量工整以获得更好的识别效果。三种输入方式可以混合使用。
                </p>
              </div>
            </section>

            {/* 6. 处理流程 */}
            <section id="processing-pipeline">
              <h2>处理流程</h2>
              <p>上传文件并点击「开始转换」后，系统会按以下四个步骤进行处理：</p>

              <h3>步骤 1：上传文件</h3>
              <p>文件被发送到服务端。对于 PDF 文件，系统会先将每一页转换为图片再进行后续处理。</p>

              <h3>步骤 2：OCR 识别</h3>
              <p>
                AI 模型读取图片中的手写内容，将其转换为可编辑的 Markdown 格式文本。
                如果上传了多个文件或 PDF 多页，系统会分批处理并显示处理进度：「正在处理第 X-Y 页 (共 Z 页)」。
              </p>

              <h3>步骤 3：校验修正</h3>
              <p>
                AI 对 OCR 识别结果进行检查和修正，确保数学公式的准确性和文本的完整性。
                对于长文本，系统会智能分块处理，避免在 LaTeX 环境中间断开。
              </p>

              <h3>步骤 4：LaTeX 转换</h3>
              <p>将校验后的 Markdown 内容转换为标准的 LaTeX 代码，包括文档结构、数学环境和格式标记。</p>

              <div className="bg-muted/30 rounded-lg p-4 my-4 border border-border">
                <p className="text-sm text-muted-foreground mb-0">
                  <strong className="text-foreground">⏹ 终止处理：</strong>处理过程中，您可以随时点击顶栏的「终止」按钮取消当前操作。
                </p>
              </div>
            </section>

            {/* 7. 结果面板 */}
            <section id="results-panel">
              <h2>结果面板</h2>
              <p>处理完成后，右侧结果面板提供三种视图：</p>

              <h3>预览模式（预览）</h3>
              <p>
                实时渲染 Markdown 内容和 LaTeX 数学公式。支持标题、列表、表格、代码块、引用等
                Markdown 语法，以及通过 KaTeX 渲染的数学公式（包括行内公式和独立公式）。
              </p>

              <h3>LaTeX 模式（LaTeX）</h3>
              <p>显示完整的 LaTeX 源代码，您可以直接在此编辑修改，编辑后将自动反向转换为 Markdown。</p>

              <h3>Markdown 编辑器（Markdown）</h3>
              <p>编辑 AI 识别后的 Markdown 文本，编辑后将自动重新生成 LaTeX 代码。</p>

              <h3>保存修改</h3>
              <p>
                登录用户可以在任意模式下点击「保存修改」按钮，将当前内容保存到历史记录中。
                当内容有未保存的更改时，保存按钮会高亮显示。
              </p>
            </section>

            {/* 8. 导出结果 */}
            <section id="export">
              <h2>导出结果</h2>
              <p>根据当前所在的标签页，提供不同的导出选项：</p>

              <h3>预览模式</h3>
              <ul>
                <li><strong>导出 PDF</strong> — 以打印方式生成包含渲染内容的 PDF 文档</li>
                <li><strong>导出 .md</strong> — 下载 Markdown 源文件</li>
              </ul>

              <h3>LaTeX 模式</h3>
              <ul>
                <li><strong>复制</strong> — 将 LaTeX 代码复制到剪贴板</li>
                <li><strong>导出 .tex</strong> — 下载 LaTeX 源文件</li>
              </ul>
            </section>

            {/* 9. 双向编辑 */}
            <section id="bidirectional-edit">
              <h2>双向编辑</h2>
              <p>
                NoteToLaTeX 支持 Markdown 和 LaTeX 之间的双向同步编辑，让您可以灵活地调整内容：
              </p>

              <h3>Markdown → LaTeX</h3>
              <p>
                在 Markdown 编辑器中修改内容后，系统会等待 1.5 秒的防抖时间后自动触发 LaTeX 重新生成。
                您也可以点击「重新生成 LaTeX」按钮立即触发转换。
              </p>

              <h3>LaTeX → Markdown</h3>
              <p>
                在 LaTeX 编辑器中修改代码后，系统同样会等待 1.5 秒后自动将 LaTeX 反向转换为 Markdown，
                保持两个视图的内容同步。
              </p>

              <div className="bg-muted/30 rounded-lg p-4 my-4 border border-border">
                <p className="text-sm text-muted-foreground mb-0">
                  <strong className="text-foreground">⚠️ 注意：</strong>编辑过程中请勿频繁操作，等待自动转换完成后再进行下一次编辑，以避免转换冲突。
                </p>
              </div>
            </section>

            {/* 10. 账户管理 */}
            <section id="account">
              <h2>账户管理</h2>

              <h3>注册账户</h3>
              <p>在主页点击右上角「登录」按钮，切换到「注册」选项卡，填写以下信息即可创建账户：</p>
              <ul>
                <li><strong>用户名</strong> — 至少 2 个字符，用于显示您的身份</li>
                <li><strong>邮箱</strong> — 用于登录</li>
                <li><strong>密码</strong> — 至少 6 个字符</li>
              </ul>
              <p>注册成功后即可直接登录，无需邮箱验证。</p>

              <h3>个性设置</h3>
              <p>登录后，点击右上角用户头像或用户名打开菜单，选择「个性设置」：</p>
              <ul>
                <li><strong>头像</strong> — 上传自定义头像（支持 JPG、PNG，最大 2MB）</li>
                <li><strong>用户名</strong> — 修改您的显示名称</li>
              </ul>
            </section>

            {/* 11. 转换历史 */}
            <section id="history">
              <h2>转换历史</h2>
              <p>
                登录后，主页左侧会显示历史记录侧边栏。每次完成转换后，系统会自动保存历史记录。
              </p>

              <h3>浏览历史</h3>
              <p>侧边栏按时间倒序列出所有转换记录，显示文件名和转换日期。</p>

              <h3>管理历史</h3>
              <ul>
                <li><strong>重命名</strong> — 悬停在记录上，点击铅笔图标修改标题</li>
                <li><strong>删除</strong> — 悬停在记录上，点击垃圾桶图标删除记录</li>
                <li><strong>展开/收起</strong> — 点击侧边栏右上角的折叠按钮可收起侧边栏</li>
              </ul>

              <h3>加载历史</h3>
              <p>点击任意历史记录，系统会加载该次转换的 Markdown 和 LaTeX 内容，您可以继续编辑和导出。</p>
            </section>

            {/* 12. API 配置 */}
            <section id="api-config">
              <h2>API 配置</h2>
              <p>
                NoteToLaTeX 允许您自定义 OCR 识别和 LLM 模型所使用的 AI 服务商和模型。
                登录后点击用户菜单中的「API 配置」即可打开配置面板。
              </p>

              <h3>配置项说明</h3>
              <table>
                <thead>
                  <tr>
                    <th>字段</th>
                    <th>说明</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>服务商</td><td>AI 服务提供商名称（如 coze、openai 等）</td></tr>
                  <tr><td>模型名称</td><td>使用的 AI 模型 ID</td></tr>
                  <tr><td>API Key</td><td>调用 API 所需的密钥</td></tr>
                  <tr><td>Base URL</td><td>API 的基础地址（可选，留空使用默认地址）</td></tr>
                </tbody>
              </table>

              <h3>模型绑定</h3>
              <p>
                OCR 识别模型可以独立配置不同的服务商和 API Key。正反向 LaTeX 转换与校验 LLM 
                <strong>共享同一模型配置</strong>，修改校验 LLM 时三者同步变化。
              </p>

              <h3>默认配置</h3>
              <p>
                未自定义 API 时，系统使用以下默认模型：
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>OCR 识别</strong>：Coze 服务（内置）</li>
                <li><strong>LaTeX 转换 / 校验 LLM / 反向 LaTeX</strong>：DeepSeek（deepseek-chat）</li>
              </ul>
              <p className="mt-2">
                自定义 API 配置仅在需要更换模型或服务商时使用。
              </p>

              <div className="bg-muted/30 rounded-lg p-4 my-4 border border-border">
                <p className="text-sm text-muted-foreground mb-0">
                  <strong className="text-foreground">🔒 隐私说明：</strong>API 配置保存在浏览器本地存储中，仅对当前浏览器生效。API Key 不会上传到服务器，请放心使用。留空则使用系统默认配置。
                </p>
              </div>
            </section>

            {/* 13. 主题切换 */}
            <section id="theme">
              <h2>主题切换</h2>
              <p>
                点击页面顶栏右侧的主题切换按钮（太阳/月亮图标），可在亮色模式和暗色模式之间切换。
                主题选择会自动保存，下次访问时保持上次的选择。
              </p>
              <p>
                亮色模式采用温暖舒适的米白底色，暗色模式采用深邃的深色背景，均针对 LaTeX 和
                数学公式阅读进行了优化。
              </p>
            </section>

            {/* 14. 常见问题 */}
            <section id="faq">
              <h2>常见问题</h2>

              <h3>Q：支持哪些语言的手写笔记？</h3>
              <p>AI 模型主要针对中文和英文手写内容进行了优化，可以处理包含混合语言（中英文 + 数学公式）的笔记。</p>

              <h3>Q：转换的准确率如何？</h3>
              <p>准确率取决于手写内容的清晰度。建议使用清晰的扫描件或拍摄良好的照片以获得最佳效果。对于复杂的数学公式，校验步骤会帮助修正识别错误。</p>

              <h3>Q：有文件大小和页数限制吗？</h3>
              <p>单次转换上限为 <strong>200 页</strong>，文件总大小不超过 <strong>30MB</strong>。图片每张计为 1 页，PDF 按实际页数计算。如果超出限制，请分批上传。</p>

              <h3>Q：转换需要多长时间？</h3>
              <p>单张图片通常在几秒到几十秒内完成。处理时间取决于文件数量、页面内容和 AI 模型的响应速度。</p>

              <h3>Q：为什么我的转换失败了？</h3>
              <p>可能的原因包括：文件格式不支持、网络连接中断、AI 服务不可用、API Key 配置错误等。请检查错误提示信息，必要时重试。</p>

              <h3>Q：我的数据安全吗？</h3>
              <p>上传的文件仅用于本次转换处理，系统不会永久存储您的原始文件。登录后保存的转换记录包含处理结果，您随时可以删除。</p>

              <h3>Q：如何在 LaTeX 中使用生成的代码？</h3>
              <p>您可以直接复制 LaTeX 代码到您的 .tex 文件中，或下载 .tex 文件后在本地 LaTeX 环境（如 TeX Live、Overleaf）中编译。</p>
            </section>

            {/* 15. 使用技巧 */}
            <section id="tips">
              <h2>使用技巧</h2>

              <h3>提高识别准确率</h3>
              <ul>
                <li>使用高分辨率扫描或拍摄，确保文字清晰</li>
                <li>保持页面平整，避免弯曲阴影</li>
                <li>书写尽量工整，避免连笔过度</li>
                <li>使用白纸和深色笔书写，增强对比度</li>
              </ul>

              <h3>处理多页文档</h3>
              <ul>
                <li>可以将多张图片合并为一个 PDF 后上传</li>
                <li>也可以同时选择多个图片文件一起上传</li>
                <li>系统会自动将多页内容合并为一份输出</li>
              </ul>

              <h3>编辑技巧</h3>
              <ul>
                <li>在 Markdown 编辑器中修正识别错误后，LaTeX 会自动同步更新</li>
                <li>在 LaTeX 编辑器中可以直接调整格式和添加自定义命令</li>
                <li>编辑后记得点击「保存修改」以保留更改</li>
              </ul>

              <h3>批量工作流</h3>
              <p>
                对于大量笔记，建议分批处理：每次上传一个章节或主题的内容，
                处理完成后保存到历史记录，再继续下一批。这样便于管理和组织。
              </p>
            </section>

            {/* 页脚 */}
            <div className="mt-16 pt-8 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">
                NoteToLaTeX — 手写笔记转换器 &middot; 基于 AI 技术构建
              </p>
              <p className="text-xs text-muted-foreground text-center mt-1">
                联系我们：<a href="mailto:2041834361@qq.com" className="text-[#B8956A] hover:underline">2041834361@qq.com</a>
              </p>
              <div className="flex justify-center gap-4 mt-3">
                <a
                  href="/"
                  className="inline-flex items-center gap-1 text-xs text-[#B8956A] hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  返回主页
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
