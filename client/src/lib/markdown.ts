import MarkdownIt from "markdown-it";
import emoji from "markdown-it-emoji/lib/full.mjs";
import taskLists from "markdown-it-task-lists";
import katex from "katex";
import plantumlEncoder from "plantuml-encoder";
import "katex/dist/katex.min.css";

function escapeHtml(value: string) {
  return value.replace(/[&<>\"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character] || character);
}

function normalizeCustomImages(source: string) {
  return source.replace(/!\[([^\]]*)\]\(([^\s)]+)\s*=\s*(\d+)x\)/g, (_match, alt, src, width) => {
    return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" width="${width}" style="max-width:100%;height:auto;width:${width}px" loading="lazy">`;
  });
}

export const markdownIt = new MarkdownIt({
  html: true,
  breaks: false,
  linkify: true,
  typographer: true,
});

markdownIt.use(emoji).use(taskLists, { enabled: true });

markdownIt.block.ruler.before("fence", "math_block", (state: any, startLine: number, _endLine: number, silent: boolean) => {
  const start = state.bMarks[startLine] + state.tShift[startLine];
  const firstLine = state.src.slice(start, state.eMarks[startLine]).trim();
  if (firstLine !== "$$") return false;
  let nextLine = startLine + 1;
  while (nextLine < state.lineMax) {
    const lineStart = state.bMarks[nextLine] + state.tShift[nextLine];
    const line = state.src.slice(lineStart, state.eMarks[nextLine]).trim();
    if (line === "$$") break;
    nextLine += 1;
  }
  if (nextLine >= state.lineMax) return false;
  if (silent) return true;
  const token = state.push("math_block", "div", 0);
  token.block = true;
  token.map = [startLine, nextLine + 1];
  token.content = state.getLines(startLine + 1, nextLine, state.blkIndent, true);
  state.line = nextLine + 1;
  return true;
});

markdownIt.block.ruler.before("fence", "plantuml_block", (state: any, startLine: number, _endLine: number, silent: boolean) => {
  const start = state.bMarks[startLine] + state.tShift[startLine];
  const firstLine = state.src.slice(start, state.eMarks[startLine]).trim();
  if (firstLine !== "@startuml") return false;
  let nextLine = startLine + 1;
  while (nextLine < state.lineMax) {
    const lineStart = state.bMarks[nextLine] + state.tShift[nextLine];
    const line = state.src.slice(lineStart, state.eMarks[nextLine]).trim();
    if (line === "@enduml") break;
    nextLine += 1;
  }
  if (nextLine >= state.lineMax) return false;
  if (silent) return true;
  const token = state.push("plantuml_block", "div", 0);
  token.block = true;
  token.map = [startLine, nextLine + 1];
  token.content = state.getLines(startLine + 1, nextLine, state.blkIndent, true);
  state.line = nextLine + 1;
  return true;
});

markdownIt.inline.ruler.before("escape", "math_inline", (state: any, silent: boolean) => {
  const start = state.pos;
  if (state.src[start] !== "$" || state.src[start + 1] === "$" || /\s/.test(state.src[start + 1] || "")) return false;
  const end = state.src.indexOf("$", start + 1);
  if (end === -1 || end === start + 1 || state.src[end + 1] === "$") return false;
  if (!silent) {
    const token = state.push("math_inline", "span", 0);
    token.content = state.src.slice(start + 1, end);
  }
  state.pos = end + 1;
  return true;
});

markdownIt.renderer.rules.math_inline = (tokens, index) => {
  return katex.renderToString(tokens[index].content, { throwOnError: false, displayMode: false });
};

markdownIt.renderer.rules.math_block = (tokens, index) => {
  return `<div class="math-block">${katex.renderToString(tokens[index].content.trim(), { throwOnError: false, displayMode: true })}</div>`;
};

markdownIt.renderer.rules.plantuml_block = (tokens, index) => {
  const encoded = plantumlEncoder.encode(tokens[index].content);
  const source = encodeURIComponent(tokens[index].content);
  return `<figure class="plantuml-card"><div class="diagram-label">PLANTUML · SVG</div><img src="https://www.plantuml.com/plantuml/svg/${encoded}" alt="PlantUML diagram" loading="lazy"><details><summary>ソースを表示</summary><pre><code>${escapeHtml(decodeURIComponent(source))}</code></pre></details></figure>`;
};

markdownIt.renderer.rules.fence = (tokens, index) => {
  const token = tokens[index];
  const language = token.info.trim().split(/\s+/)[0].toLowerCase();
  if (language === "mermaid") {
    return `<div class="mermaid-card"><div class="diagram-label">MERMAID · SVG</div><div class="mermaid-host" data-code="${escapeHtml(encodeURIComponent(token.content))}"><div class="diagram-loading">図を描画しています…</div></div></div>`;
  }
  const className = language ? ` class="language-${escapeHtml(language)}"` : "";
  return `<pre><code${className}>${escapeHtml(token.content)}</code></pre>`;
};

const defaultLinkOpen = markdownIt.renderer.rules.link_open;
markdownIt.renderer.rules.link_open = (tokens, index, options, env, self) => {
  const token = tokens[index];
  token.attrSet("target", "_blank");
  token.attrSet("rel", "noreferrer noopener");
  return defaultLinkOpen ? defaultLinkOpen(tokens, index, options, env, self) : self.renderToken(tokens, index, options);
};

markdownIt.renderer.rules.image = (tokens, index) => {
  const token = tokens[index];
  const src = escapeHtml(String(token.attrGet("src") || ""));
  const alt = escapeHtml(String(token.content || ""));
  const title = token.attrGet("title");
  return `<img class="md-image" src="${src}" alt="${alt}" loading="lazy"${title ? ` title="${escapeHtml(String(title))}"` : ""}>`;
};

export function renderMarkdown(source: string) {
  return markdownIt.render(normalizeCustomImages(source));
}
