# PROMPT 1 — Identidade visual e assets (colar no OpenCode)

Contexto: vais implementar a identidade visual da plataforma **Conto Contigo** (app de eventos e convites) neste projeto. Não consegues ler imagens, por isso toda a identidade está descrita em texto e em ficheiros que já estão na pasta `brand-kit/` na raiz do projeto. **Antes de escreveres código, inspeciona o repositório** (framework, pasta de assets públicos, ficheiro de estilos globais, layout raiz) e diz-me em poucas linhas o plano. Só depois implementa.

## 1. A marca em palavras
- Símbolo: um **pin de localização** desenhado a traço contínuo, com um **sorriso** dentro. Transmite "estou contigo, é por aqui".
- Wordmark: "**Conto**" em negrito (peso 800) + "Contigo" em peso regular (400), fonte **Figtree**.
- Cor principal: verde-petróleo `#0F3D3E`. Acento: amarelo-mostarda `#E8B230`. Fundo: off-white quente `#F6F5EF`.
- Ícone da app: quadrado de cantos arredondados `#0F3D3E`, com um arco branco por cima e um "V" amarelo com sorriso por baixo.
- Tom: caloroso, próximo, claro. Escrita em **pt-PT**.

## 2. Ficheiros fornecidos (não os recries; usa-os tal como estão)
```
brand-kit/
  svg/        logo-horizontal(.svg|-white|-mono), logo-stacked(.svg|-white), symbol(.svg|-white|-mono),
              app-icon.svg, app-icon-square.svg, app-icon-maskable.svg
  png/        versões raster dos logos (400/800/1600 px), app-icon-{16..1024}.png
  webp/       logo-horizontal-800, logo-horizontal-white-800, logo-stacked-800, symbol-800, app-icon-192/512, og-image
  favicon/    favicon.ico, favicon.svg, favicon-16x16.png, favicon-32x32.png, apple-touch-icon.png,
              android-chrome-192.png, android-chrome-512.png, maskable-512.png, og-image.png,
              site.webmanifest, head-snippet.html
  tokens/     brand-tokens.css, brand-tokens.json
  fonts/      Figtree-{400,500,600,700,800}.ttf e .woff2
  email/      email-base.html, email-logo-white-480.png, email-logo-dark-480.png
  pdf/        watermark-symbol.svg, watermark-symbol-1200.png
```

## 3. Tarefas (por ordem)
1. **Colocar os assets públicos** na pasta pública do framework (ex.: `public/` em Next.js, `src/` + `angular.json assets` em Angular — adapta ao projeto):
   - Na **raiz pública**: `favicon.ico`, `favicon.svg`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png`, `android-chrome-192.png`, `android-chrome-512.png`, `maskable-512.png`, `og-image.png`, `site.webmanifest`.
   - Em `…/brand/` (ex.: `public/brand/` ou `src/assets/brand/`): todos os SVG, PNG e WebP de logos.
   - Em `…/email/`: as imagens de e-mail (têm de ser servidas por URL absoluto público).
2. **`<head>` / metadata:** aplica o conteúdo de `favicon/head-snippet.html` no layout raiz (em Next.js usa a API de `metadata`; em Angular, `index.html`). Confirma que `theme-color` é `#0F3D3E` e `lang="pt-PT"`.
3. **Tokens:** importa `tokens/brand-tokens.css` uma única vez no estilo global. Se o projeto usa Tailwind, mapeia as variáveis `--cc-*` no `theme.extend.colors` (primary, accent, bg, surface, border, text…) sem remover o que já existe.
4. **Fonte:** usa **Figtree** (fallback `Arial, Helvetica, sans-serif`). Se o projeto permitir, serve os `.woff2` localmente com `font-display: swap` em vez de Google Fonts.
5. **Componente de logo reutilizável** (`Logo`) com as variantes `horizontal | stacked | symbol` e o tema `default | white | mono`, que escolhe o SVG correto. Deve ter `alt="Conto Contigo"`, e altura configurável sem deformar.
6. **Aplicar o logo** onde já existir branding provisório: barra de navegação (horizontal; só símbolo em ecrãs < 480 px), ecrã de login/registo (stacked), rodapé (white sobre fundo `#0F3D3E`), página de carregamento.
7. **Regras de uso do logo:** área de proteção igual à altura do "C" de Conto em todos os lados; largura mínima 120 px (horizontal) / 24 px (símbolo); nunca esticar, rodar, sombrear nem mudar as cores; sobre fundos escuros usa sempre a versão `white`.

## 4. Critérios de aceitação
- `npm run build` (ou equivalente) passa sem erros nem avisos novos.
- O separador do navegador mostra o ícone da marca (claro e escuro).
- Lighthouse/PWA: manifest válido, ícones 192, 512 e maskable detetados.
- Nenhum valor de cor "hardcoded" novo fora dos tokens.
- Não alteres lógica de negócio, rotas nem API.

No fim, lista os ficheiros criados/alterados.
