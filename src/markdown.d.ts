/** Guias de ajuda em Markdown carregados como texto (`angular.json` → `loader`). */
declare module '*.md' {
  const content: string;
  export default content;
}
