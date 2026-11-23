# Relatório — Bloco 9 (frontend)

**Branch:** `feat/bloco-9-ui-mobile`  
**Data:** 2026-11-21  
**Âmbito:** UI mobile — modais, menu de ações, cabeçalho do evento, sidebar colapsável, card de pendentes e testes browser.

## Objectivo

Corrigir os problemas observados em 360 px — modais de formulário em bottom sheet
sem acesso cómodo a Guardar, menu de três pontinhos a sair do ecrã, cabeçalho do
evento com ações a competir pelo espaço, sidebar sem colapso no desktop e card
de convidados pendentes com nome cortado e sem ação principal — sem alterar
regras de negócio nem criar novas páginas.

## Commits do bloco

| Commit | Assunto |
|---|---|
| `c14746b` | `feat(modal): add centered dialog presentation with full-panel scroll` |
| `94a5abe` | `refactor(modal): keep read-only dialogs as bottom sheets` |
| `2bc3543` | `refine action menu portal positioning and focus` |
| `bd83401` | `add collapsible event panels and improved event header` |
| `54aaef6` | `feat(dashboard): show pending guests with filters and clearer cards` |
| `5b23da9` | `test(e2e): add Playwright coverage for block 9 UI` |

O snapshot `16a83f3 chore: snapshot antes do bloco 9` foi feito na branch anterior.
Não houve push, merge, rebase, `reset --hard` nem eliminação de branches.

## Decisões aplicadas

- `app-modal` passou a ter `presentation: 'dialog' | 'sheet'`, com `dialog` por
  omissão. No modo `dialog` o painel inteiro faz scroll e o rodapé fica no fluxo;
  no modo `sheet` mantém-se o bottom sheet de leitura. A tabela completa está em
  `docs/DECISIONS.md`.
- Formulários e ações usam `dialog`; leitura usa `presentation="sheet"`;
  confirmações usam `dialog size="sm"`. O menu de secções do evento e o prompt de
  conta são `dialog` porque contêm botões, não texto passivo.
- `app-action-menu` deixou de ser um modal: passou a ser um portal no `body`,
  posicionado com `position: fixed`, com abertura para cima quando não cabe
  abaixo e limite direito ao viewport. O foco circula pelos itens, `Escape`
  fecha e devolve o foco ao botão.
- A sidebar desktop tem estado persistido em `apupu.sidebar.collapsed` e larguras
  de `18.5rem`/`4.5rem`. O conteúdo reflui sem scroll horizontal.
- O cabeçalho do evento tem uma única ação primária — `addGuest` →
  `openGuestCreate()` — e um rail para as restantes; o botão “voltar” é curto em
  mobile e completo no desktop.
- O painel de convidados do `/painel` abre em “Sem resposta”. Os chips são
  filtros clicáveis com contagens; a ação principal prefere WhatsApp quando
  existe telefone, senão reenvio por email. Nomes usam até duas linhas com
  `title` completo.
- Todas as novas strings visíveis vivem em `block9-keys.ts` (PT/EN) e são
  registadas em `translations.ts`; nenhum texto novo foi escrito diretamente nos
  templates.

## Ficheiros alterados

| Área | Ficheiros |
|---|---|
| Modal | `shared/components/modal.component.ts`, `modal.component.spec.ts` e 11 componentes com `presentation="sheet"` |
| Menu de ações | `shared/components/action-menu.component.ts`, `action-menu.component.spec.ts` |
| Layout / cabeçalho | `core/layout/shell.component.*`, `shared/components/event-section-shell.component.*`, `features/events/event-detail.page.*`, `features/host-management/management-event.page.*` |
| Painel | `features/dashboard/dashboard.page.*`, `shared/components/person-card.component.ts` |
| i18n | `core/i18n/block9-keys.ts`, `core/i18n/translations.ts` |
| Testes browser | `playwright.config.ts`, `tsconfig.e2e.json`, `e2e/helpers.ts`, `e2e/action-menu.spec.ts`, `e2e/modals.spec.ts`, `e2e/sidebar.spec.ts` |
| Suporte e2e | `features/guests/guests.page.html`, `features/profile/profile.page.html`, `.gitignore`, `package.json`, `package-lock.json` |
| Docs | `docs/DECISIONS.md`, `docs/BLOCKERS.md`, `docs/REPORT-BLOCO-9.md` |

## Testes

### Vitest

| Ficheiro | Cobertura nova |
|---|---|
| `modal.component.spec.ts` | scroll do painel no `dialog`, rodapé no fluxo, foco centrado no campo, persistência do bottom sheet no `sheet` |
| `action-menu.component.spec.ts` | portal no `body`, abertura para cima, limite direito, teclado, `Escape` e clique fora |
| `event-section-shell.component.spec.ts` | ações do rail, botão primário único e menu de secções |
| `shell.component.spec.ts` | persistência do estado recolhido da sidebar |
| `dashboard.page.spec.ts` | filtro inicial `pending`, contagens e ação principal por contacto |

### Playwright

Configuração com quatro projetos: `mobile-light` e `mobile-dark` (360×640),
`desktop-light` e `desktop-dark` (1440×900). Cenários:

1. Menu de três pontinhos do primeiro e do último cartão em `/convidados`,
   `/admin/utilizadores` e `/equipas`: painel visível, dentro do viewport,
   alinhado ao botão e acima/abaixo dele.
2. “Editar perfil” e “Adicionar convidado” em 360×640: diálogo centrado,
   teclado simulado, scroll até ao rodapé e clique em Guardar/Adicionar. O
   formulário de convidado fica inválido de propósito para não criar dados.
3. Sidebar desktop: colapso, persistência em `localStorage`, aumento da largura
   de `main` e ausência de scroll horizontal.
4. Modal de leitura (`admin-user-view`): continua como bottom sheet em mobile.

**Estado da execução:** `24 skipped`. `E2E_EMAIL`, `E2E_PASSWORD` e
`E2E_BASE_URL` não estão definidos neste ambiente, pelo que os testes foram
ignorados antes de iniciar qualquer browser, conforme a regra do bloco. Nenhuma
credencial, URL ou token ficou registado em ficheiro, log ou relatório. Para
executar: definir as três variáveis, correr `npx playwright install chromium` e
depois `npm run e2e`.

## Verificação

| Comando | Resultado |
|---|---|
| `npm run build` | OK |
| `npm run lint` | OK — 0 erros, 24 avisos preexistentes |
| `npm test -- --watch=false` | OK — 49 ficheiros, 209 testes passados |
| `npx tsc --noEmit` | OK |
| `npm run e2e:typecheck` | OK |
| `npm run e2e` (sem credenciais) | OK — 24 testes skipped, exit 0 |

## Backend

Sem alterações. O backend permanece na branch `feat/ajustes-fase-4`, intacto.

## Fora de âmbito

- Redesenho do menu em dropdowns por etapas.
- Novas páginas ou regras de negócio.
- Captura automatizada de contraste/tamanho de alvos; a verificação visual foi
  feita por revisão das classes Tailwind e dos tokens claros/escuros.

## Retificações 9.1

Execução na branch `feat/bloco-10-visibilidade` (front) e `feat/bloco-10-visibilidade` (back), sem push/merge/rebase/reset. Cada ponto em commit próprio `fix(ui): ...` / commit de migração backend no ponto 7.

| Ponto | Estado | Evidência |
|---|---|---|
| 1. Modais de formulário sem ações sticky/fixed | ✔ | `d3642e6`. `modal.component` com `max-height: visualViewport`, margem safe-area, scroll no painel; footer no fluxo; `scrollIntoView` em campos focados. Verificação front: build/lint 0 erros/tsc/test 210/e2e:typecheck/e2e 28 skipped. |
| 2. Carrossel de pendentes | ✔ | `fb8dd0e`. Dashboard com carrossel horizontal snap, setas 44 px, contagem “1 de N”, cards `min-w-[17rem] sm:min-w-[20rem]`, nomes `line-clamp-2`. |
| 3. Gráfico respostas da semana | ✔ | `32c85ec`. Escala pelo máximo da semana, linha fina para zero, tooltip acessível por rato/toque/teclado com dia/data/contagem. |
| 4. Menu lateral comprimido | ✔ | `1223780`. Rail `lg:w-[5rem]`, tooltips CSS em `[data-rail]`, `.no-scrollbar` no nav. |
| 5. Filtros mobile e FAB | ✔ | `e842383`. `app-filter-panel` e `app-mobile-fab` partilhados; FAB com safe-area acima da navegação inferior. |
| 6. Botões do modal de localização | ✔ | `7aae9d3`. Botões usam `ui-btn`/`ui-btn-secondary`, altura/alinhamento consistentes com contacto. |
| 7. Link partilhado por WhatsApp | ✔ | Back `dcf0fc0`: migração reversível `1739900000027_invitation-whatsapp-share.js`, action `guest_whatsapp_shared`, endpoint `POST /host/events/:eventId/invitations/:invitationId/whatsapp-shared`, auditoria/permissões, build/typecheck/lint/test 320 passed 89 skipped 409, migração up→down→up verificada. Front `c6f1d73`: campos `whatsapp_shared_at`/`whatsapp_share_count`, metadados só host-side; “sucesso” = URL válida + `openExternal`. |
| 8. Cards de equipa e detalhe de membro | ✔ | `44c8ea7` (decisão) + `f5a7c71`. Grelha `grid-cols-1 md:grid-cols-2 xl:grid-cols-3`; `app-avatar-stack` com `ids`/seleção 44 px; sheet `team-member-detail-dialog` com dados de `GET /host/teams/:id/members`; e2e `teams.spec.ts` adicionado. |
| 9. Barra superior/navegação do evento e ordem da Visão geral | ✔ | Commit deste ponto. Shell em `/eventos/:id` troca menu principal por chevron voltar e notificações por hambúrguer do evento (`aria-expanded`); `/gestao/evento/:id` recebe os mesmos controlos no cabeçalho público. Drawer direito com fechar, “Adicionar convidado”, secções, “Mais ações”, Escape/backdrop/link, foco preso/devolvido; rail desktop mantido. `app-stat-grid` passa a primeiro elemento da “Visão geral”. |

### Verificação final (ponto 9)

| Comando | Resultado |
|---|---|
| `npm run build` | OK |
| `npx tsc --noEmit` | OK |
| `npm run lint` | OK — 0 erros, 24 avisos preexistentes |
| `npm test -- --watch=false` | OK — 49 ficheiros, 211 testes passados |
| `npm run e2e:typecheck` | OK |
| `npm run e2e` (sem credenciais) | OK — 32 skipped, exit 0; `E2E_EMAIL`/`E2E_PASSWORD`/`E2E_BASE_URL` ausentes, sem credenciais registadas |
