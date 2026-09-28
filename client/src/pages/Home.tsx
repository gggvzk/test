import { useEffect, useMemo, useRef, useState } from "react";
import { renderMarkdown } from "../lib/markdown";
import {
  BookOpen,
  Check,
  ChevronDown,
  Download,
  FileCode2,
  FileText,
  FolderOpen,
  Github,
  Hash,
  Keyboard,
  Menu,
  MoreHorizontal,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  PencilLine,
  Play,
  Save,
  Search,
  Sparkles,
  SplitSquareHorizontal,
  Sun,
  X,
} from "lucide-react";
import { toast } from "sonner";

const INITIAL_MARKDOWN = `# Markdown Studio

記事に登場する記法を、**書きながら**確認できます。\n
> 軽やかに書いて、すぐに確かめる。ローカルで完結するMarkdownワークスペースです。

## 対応する記法

- [x] 見出し / 強調 / 取り消し線
- [x] リスト / タスクリスト / 引用
- [x] リンク / 画像 / テーブル
- [x] 数式（LaTeX） / Mermaid / PlantUML
- [ ] ファイルを開いて編集

### 表とインライン記法

| 記法 | プレビュー |
| --- | --- |
| **太字** | 重要な情報 |
| **inline code** | npm run build |
| :sparkles: | 絵文字ショートコード |

インライン数式は $E = mc^2$ のように書けます。  
半角スペース2つで改行できます。

### Mermaid（SVGとして埋め込み）

\`\`\`mermaid
graph TD
  A[アイデア] --> B{検証}
  B -->|OK| C[公開]
  B -->|改善| A
\`\`\`

### PlantUML

@startuml
Alice -> Bob: Hello, Bob!
Bob --> Alice: Hello, Alice!
@enduml

### ブロック数式

$$
\\frac{\\partial y}{\\partial x} = 3x^2
$$

<div class="note-box"><strong>HTML併用</strong><br>このようなHTMLもプレビューできます。</div>

---

[Markdown記法一覧の記事](https://zenn.dev/n_ryosuke/articles/3798c61b8c44df) を参考にしています。
`;

type ViewMode = "split" | "editor" | "preview";
type ThemeMode = "dark" | "light";

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, index)).toFixed(index ? 1 : 0)} ${units[index]}`;
}

function Preview({ value }: { value: string }) {
  const previewRef = useRef<HTMLDivElement>(null);
  const html = useMemo(() => renderMarkdown(value), [value]);

  useEffect(() => {
    const root = previewRef.current;
    if (!root) return;
    let cancelled = false;
    const renderDiagrams = async () => {
      const diagrams = Array.from(root.querySelectorAll<HTMLElement>(".mermaid-host"));
      for (const node of diagrams) {
        try {
          const source = decodeURIComponent(node.dataset.code || "");
          const { default: mermaid } = await import("mermaid");
          mermaid.initialize({ startOnLoad: false, theme: "base", securityLevel: "loose", themeVariables: { primaryColor: "#d8f3ec", primaryTextColor: "#163a37", primaryBorderColor: "#4ca79c", lineColor: "#5f7775", secondaryColor: "#f7efe4" } });
          const id = `mermaid-${Math.random().toString(36).slice(2)}`;
          const result = await mermaid.render(id, source);
          if (!cancelled) node.innerHTML = result.svg;
        } catch (error) {
          if (!cancelled) node.innerHTML = `<div class="diagram-error">Mermaidを描画できませんでした。<pre>${String(error)}</pre></div>`;
        }
      }
    };
    renderDiagrams();
    return () => { cancelled = true; };
  }, [html]);

  return <div ref={previewRef} className="preview-content" dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function Home() {
  const [markdown, setMarkdown] = useState(INITIAL_MARKDOWN);
  const [fileName, setFileName] = useState("untitled.md");
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [saved, setSaved] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const headings = useMemo(() => {
    return markdown.split("\n").filter((line) => /^#{1,6}\s/.test(line)).map((line) => {
      const level = line.match(/^#+/)?.[0].length || 1;
      return { level, text: line.replace(/^#+\s*/, "") };
    });
  }, [markdown]);

  const downloadMarkdown = () => {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName.endsWith(".md") ? fileName : `${fileName}.md`;
    link.click();
    URL.revokeObjectURL(url);
    setSaved(true);
    toast.success("Markdownをダウンロードしました", { description: link.download });
  };

  const openMarkdown = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setMarkdown(String(reader.result || ""));
      setFileName(file.name);
      setSaved(true);
      toast.success("ファイルを開きました", { description: file.name });
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const updateMarkdown = (value: string) => {
    setMarkdown(value);
    setSaved(false);
  };

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("markdown-studio-theme");
    if (storedTheme === "light" || storedTheme === "dark") setThemeMode(storedTheme);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("markdown-studio-theme", themeMode);
  }, [themeMode]);

  useEffect(() => {
    const saveShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        downloadMarkdown();
      }
    };
    window.addEventListener("keydown", saveShortcut);
    return () => window.removeEventListener("keydown", saveShortcut);
  });

  const insertAtCursor = (before: string, after = "") => {
    const editor = editorRef.current;
    if (!editor) return;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selected = markdown.slice(start, end) || "テキスト";
    updateMarkdown(`${markdown.slice(0, start)}${before}${selected}${after}${markdown.slice(end)}`);
    requestAnimationFrame(() => {
      editor.focus();
      editor.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  };

  return (
    <div className={`studio-shell theme-${themeMode}`}>
      <header className="topbar">
        <div className="brand-block">
          <button className="icon-button mobile-menu" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="サイドバーを切り替え"><Menu size={18} /></button>
          <div className="brand-mark"><PencilLine size={19} strokeWidth={2.6} /></div>
          <div>
            <div className="brand-name">Markdown Studio</div>
            <div className="brand-subtitle">WRITE / PREVIEW / SHIP</div>
          </div>
        </div>
        <div className="document-name"><FileText size={15} /><span>{fileName}</span>{!saved && <span className="unsaved-dot" title="未保存" />}</div>
        <div className="top-actions">
          <button className="button secondary" onClick={() => fileInputRef.current?.click()}><FolderOpen size={16} /> <span className="desktop-label">開く</span></button>
          <input ref={fileInputRef} type="file" accept=".md,.markdown,.txt" onChange={openMarkdown} hidden />
          <button className="theme-toggle" onClick={() => setThemeMode(themeMode === "dark" ? "light" : "dark")} aria-label={`${themeMode === "dark" ? "ライト" : "ダーク"}モードに切り替え`} title={`${themeMode === "dark" ? "ライト" : "ダーク"}モードに切り替え`}><span className="theme-toggle-icon">{themeMode === "dark" ? <Moon size={15} /> : <Sun size={15} />}</span><span className="theme-toggle-label">{themeMode === "dark" ? "Dark" : "Light"}</span></button>
          <button className="button primary" onClick={downloadMarkdown}><Download size={16} /> <span>ダウンロード</span></button>
          <button className="icon-button desktop-only" aria-label="その他"><MoreHorizontal size={18} /></button>
        </div>
      </header>

      <div className="workspace">
        <aside className={`left-rail ${sidebarOpen ? "is-open" : "is-closed"}`}>
          <div className="rail-header"><span>ワークスペース</span><button className="icon-button" onClick={() => setSidebarOpen(false)} aria-label="サイドバーを閉じる"><PanelLeftClose size={16} /></button></div>
          <div className="file-card active-file"><div className="file-icon"><FileCode2 size={16} /></div><div className="file-meta"><strong>{fileName}</strong><span>{formatBytes(new Blob([markdown]).size)} · 編集中</span></div><Check size={15} className="file-check" /></div>
          <div className="rail-section"><div className="rail-label"><span>ツール</span><span className="rail-count">3</span></div><button className="rail-link active"><PencilLine size={15} />エディター</button><button className="rail-link"><Search size={15} />検索 <kbd>⌘K</kbd></button><button className="rail-link"><Keyboard size={15} />ショートカット</button></div>
          <div className="rail-section outline-section"><div className="rail-label"><span>アウトライン</span><button className="mini-button" onClick={() => setOutlineOpen(!outlineOpen)}>{outlineOpen ? <ChevronDown size={14} /> : <ChevronDown size={14} className="rotated" />}</button></div>{outlineOpen && <div className="outline-list">{headings.map((heading, index) => <button key={`${heading.text}-${index}`} className={`outline-item level-${heading.level}`} onClick={() => toast.info("見出しへの移動", { description: heading.text })}><Hash size={12} />{heading.text}</button>)}</div>}</div>
          <div className="rail-footer"><div className="status-line"><span className="status-dot" />ローカル編集</div><div className="version-line">Markdown-it · KaTeX · Mermaid</div></div>
        </aside>

        {!sidebarOpen && <button className="reopen-left icon-button" onClick={() => setSidebarOpen(true)} aria-label="サイドバーを開く"><PanelLeftOpen size={17} /></button>}

        <main className="main-area">
          <div className="editor-toolbar">
            <div className="toolbar-left"><span className="eyebrow">DOCUMENT</span><span className="toolbar-divider" /><span className="toolbar-title">{fileName}</span><span className="live-badge"><span />LIVE</span></div>
            <div className="toolbar-right"><div className="view-switcher" role="group" aria-label="表示モード"><button className={viewMode === "editor" ? "selected" : ""} onClick={() => setViewMode("editor")}><PencilLine size={14} />編集</button><button className={viewMode === "split" ? "selected" : ""} onClick={() => setViewMode("split")}><SplitSquareHorizontal size={14} />分割</button><button className={viewMode === "preview" ? "selected" : ""} onClick={() => setViewMode("preview")}><Play size={14} />プレビュー</button></div><button className="icon-button" onClick={() => setOutlineOpen(!outlineOpen)} aria-label="アウトライン"><PanelRightOpen size={17} /></button></div>
          </div>
          <div className={`document-grid mode-${viewMode}`}>
            {(viewMode === "editor" || viewMode === "split") && <section className="editor-pane"><div className="pane-header"><span><span className="pane-dot teal" />MARKDOWN</span><span className="pane-hint">{markdown.split("\n").length} 行</span></div><div className="editor-wrap"><div className="line-numbers">{markdown.split("\n").map((_, i) => <span key={i}>{String(i + 1).padStart(2, "0")}</span>)}</div><textarea ref={editorRef} value={markdown} onChange={(event) => updateMarkdown(event.target.value)} spellCheck={false} aria-label="Markdownエディター" /></div><div className="editor-footer"><span>Markdown / GFM</span><span><kbd>⌘</kbd><kbd>S</kbd> で保存</span></div></section>}
            {(viewMode === "preview" || viewMode === "split") && <section className="preview-pane"><div className="pane-header"><span><span className="pane-dot coral" />PREVIEW</span><span className="pane-hint">Rendered HTML</span></div><div className="preview-scroll"><Preview value={markdown} /></div><div className="preview-footer"><span><Sparkles size={13} /> SVG diagrams enabled</span><span>安全なローカルプレビュー</span></div></section>}
          </div>
        </main>

        {outlineOpen && <aside className="right-rail"><div className="right-rail-header"><span>クイックリファレンス</span><button className="icon-button" onClick={() => setOutlineOpen(false)} aria-label="リファレンスを閉じる"><PanelRightClose size={16} /></button></div><div className="reference-card"><div className="ref-kicker">SUPPORTED</div><h3>記事の記法を<br />すべてプレビュー</h3><p>標準MarkdownからGFM拡張、Mermaidまで。</p><div className="ref-tags"><span>GFM</span><span>LaTeX</span><span>SVG</span></div></div><div className="shortcut-list"><div className="rail-label">ショートカット</div><div className="shortcut-row"><span>保存 / ダウンロード</span><span><kbd>⌘</kbd><kbd>S</kbd></span></div><div className="shortcut-row"><span>太字を挿入</span><span><kbd>⌘</kbd><kbd>B</kbd></span></div><div className="shortcut-row"><span>斜体を挿入</span><span><kbd>⌘</kbd><kbd>I</kbd></span></div></div><div className="help-card"><BookOpen size={17} /><div><strong>記法を試す</strong><span>左のサンプルを自由に編集</span></div><ChevronDown size={15} className="help-arrow" /></div></aside>}
        {!outlineOpen && <button className="reopen-right icon-button" onClick={() => setOutlineOpen(true)} aria-label="リファレンスを開く"><PanelRightOpen size={17} /></button>}
      </div>
      <footer className="app-footer"><span><span className="footer-mark" />Markdown Studio</span><span className="footer-center">文章のリズムを、プレビューで確かめる</span><span className="footer-right"><Github size={14} /> Built for focused writing</span></footer>
    </div>
  );
}
