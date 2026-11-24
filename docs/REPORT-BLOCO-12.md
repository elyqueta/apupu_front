# Relatório — Bloco 12 (feed público, pesquisa, amigos e ajuda)

Branch `feat/bloco-12-feed` (front e back). Sem push/merge/rebase. 24/11/2026.

## Critérios de aceitação

| Critério | Estado | Evidência |
|---|---|---|
| `/` abre o feed público sem login; `/sobre` abre a landing (também com sessão). | ✔ | Rotas `''` → `FeedPage`, `sobre` → `LandingPage`; redirect da landing para `/painel` removido; destino pós-login (incluindo Google) passa a `/`. Specs atualizados (`landing.page.spec.ts`, `login-success.page.spec.ts`). Browser: `/` com título "Conto Contigo · Descobrir eventos" e meta description; `/sobre` abre a landing com sessão. |
| Visitante vê eventos públicos; perfis só limitados; CTAs de criar conta. | ✔ | Feed, `/comunidade/:slug` e `/pessoas/:id` funcionam sem conta; pessoas abrem o convite "Crie uma conta para ver perfis"; cartão "Junte-se" (desktop) e faixa (mobile). `feed.page.spec.ts`. |
| Eventos e perfis privados nunca aparecem (testes negativos no back). | ✔ | `tests/bloco12.test.ts` (13 testes): SQL do feed/pesquisa exige `visibility = 'public'`, não removido, próximo/a decorrer; pessoas exigem `profile_visibility = 'public'`; perfil privado → 404; DTO de pessoa sem contactos. Curl: o evento privado "Casamento dos loucos" não aparece. |
| Amizades funcionam; "em comum" só com conta. | ✔ | `friendships` (par único independente da ordem), pedir/aceitar/recusar/remover/listar, limite de 30/dia, notificações in-app. "Amigos e comunidades em comum" só em `GET /host/profiles/:id` (exige conta). Página `/amigos` (recebidos, enviados, amigos). |
| Pesquisa do feed segura (escape, rate limit). | ✔ | `ILIKE … ESCAPE` com `escapeLike`, parâmetros ligados, mínimo 2 caracteres, 5 por grupo, limitadores por IP próprios. Front: debounce de 250 ms e sequência (só a resposta mais recente). |
| `/ajuda` publicada com os guias; SSR com título e meta. | ✔ | 9 guias em `src/content/docs/*.md`, renderer próprio seguro, índice lateral/acordeões e pesquisa (testada no browser); `docs/GUIA-UTILIZADOR.md`. Títulos e descrição por `Title`/`Meta` (SSR ativo). |
| build, lint, test, typecheck verdes; relatório. | ✔ | Ver tabela abaixo. |

## Redesenho após revisão do autor

O autor não gostou da primeira versão (grelha de cartões) e pediu para seguir as referências (`docs/REFERENCIAS-FEED-BLOCO-12.md`):

- **Desktop, três colunas:** cartão de perfil (capa, avatar, contagens, "O meu perfil") ou convite a criar conta, e atalhos | compositor "Partilhe um evento…" com Evento/Comunidade e "Público", separadores, "Ordenar: Próximos", publicações (autor, tempo, ⋮, texto com etiquetas, imagem grande, copiar/WhatsApp/"Ver evento") | "Próximos eventos" e "Sugestões para si" com "Adicionar".
- **Mobile imersivo:** grelha/marca/sino no topo, faixa de avatares em anel com "Criar", publicações em que a imagem ocupa o cartão, com pílula de vidro do autor, ⋮ circular translúcido (abre um sheet com Ver evento, Copiar link, WhatsApp), legenda e contadores sobre gradiente, e navegação inferior flutuante em pílula.
- O backend passou a devolver o avatar de quem organiza, um excerto da mensagem pública e a data de publicação (commit `cb53190`, feito na branch do Bloco 13 porque já descende da do 12).

## Verificação

| Comando | Resultado |
|---|---|
| back `npm run build` / `typecheck` | OK |
| back `npm run lint` | OK — 0 erros (23 avisos "missing return type" em DTOs/funções novas) |
| back `npm test` | OK — 368 passados, 89 ignorados |
| back `migrate up → down → up` (0031) | OK |
| front `npm run build` | OK |
| front `npx tsc --noEmit` | OK |
| front `npm run lint` | OK — 0 erros, 24 avisos preexistentes |
| front `npm test` | OK — 55 ficheiros, 234 testes |
| Browser | 360/390 px e 1440 px, claro e escuro: feed, `/sobre`, `/ajuda` (pesquisa), `/comunidade/:slug`, `/amigos`; sem scroll horizontal. Corrigido um erro de hidratação SSR (links `<a>` aninhados à volta do `app-brand`). |

**Atenção:** a ajuda usa o carregador `.md` do `angular.json`; depois de mudar para esta branch é preciso reiniciar o `ng serve`.

## Commits

Back: `7cdc57b`, `1f43f09`, `2addd70`, `cb53190` (na branch do Bloco 13).
Front: `615906e`, `361c189`, `0be7d71`, `0d952d5`.

## Decisões

`docs/DECISIONS.md`, secção "Bloco 12".
