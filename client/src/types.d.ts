declare module "markdown-it-task-lists" {
  const plugin: (md: unknown, options?: unknown) => void;
  export default plugin;
}

declare module "markdown-it-emoji" {
  const plugin: (md: unknown, options?: unknown) => void;
  export default plugin;
}

declare module "markdown-it-emoji/lib/full.mjs" {
  const plugin: (md: unknown, options?: unknown) => void;
  export default plugin;
}

declare module "plantuml-encoder" {
  const encoder: { encode: (source: string) => string; decode: (encoded: string) => string };
  export default encoder;
}
