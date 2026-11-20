# Relatório — Bloco 1 (Fundações)

**Data:** 2026-11-20  
**Branches:** `feat/bloco-1-fundacoes` em `apupu_front/` e `apupu_back/`.  
**Push / merge / rebase:** nenhum.

## Critérios de aceitação

| Critério | Estado | Evidência |
|---|---|---|
| `npm run lint` (0 erros), `npm run build` e `npm test` verdes | ✔ | Front: build exit 0; 21 ficheiros / 113 testes passaram; lint 0 erros, 24 avisos legados. Backend: `build`, `typecheck` e `test` exit 0; 254 passaram / 86 skipped. |
| `app-modal` em todos os diálogos listados; zero `window.confirm` | ✔ | `grep -R "window.confirm" src/app` sem resultados. Diálogos migrados nos commits `ec396fa` e `9189ede`; exceção lightbox documentada em `BLOCKERS.md`. |
| `app-stat-grid` em 6 páginas | ✔ | `dashboard`, `events`, `guests`, `team`, `tasks`, `reports`. |
| `app-person-card` em convidados, detalhe do evento e dashboard; tabelas longas removidas | ✔ | `src/app/shared/components/person-card.component.ts`; `grep -R "<table" src/app/features/guests src/app/features/events/event-detail.page.html src/app/features/dashboard` sem resultados. |
| Nenhum `app-stat-card` fora de `app-stat-grid` | ✔ | Revisão de todos os 27 usos: todos dentro de `<app-stat-grid>` (inclui o painel de gestores em `team.page.html`). |
| Lista de convidados do detalhe do evento com o mesmo card, 10 por página e pesquisa na API | ✔ | `event-detail.page.ts/html`, `guests.repository.ts`; `PAGE_SIZE = 10`, `q`, `page`, `page_size`; estado `confirmed` convertido para `accepted`. |
| Pesquisa da barra de navegação abre com cursor e sugestões sem escrever, em mobile e desktop | ✔ | `shell.component.html/ts`, `search.service.ts`, `shell.component.spec.ts`. `focus()` síncrono via `viewChild`, input sempre no DOM, grupos vazios: recentes, próximos eventos, convidados recentes e atalhos. |
| Textos novos em `pt-AO` e `en` em `translations.ts` | ✔ | Novas chaves `search.groupRecent`, `search.groupShortcuts`, `search.clearRecent`, stats/paginação/estados vazios e rótulos de cartão. |
| Claro/escuro e 320 px verificados no código | ✔ | Componentes usam apenas tokens Tailwind existentes (`surface`, `line`, `ink`, `muted`, `brand`, `shadow-card`) e classes responsivas; alvos de toque de 44 px. |
| `docs/REPORT-BLOCO-1.md` escrito | ✔ | Este ficheiro. |

## Commits do bloco

### `apupu_front/` (branch `feat/bloco-1-fundacoes`)

- `55c7a62` `chore(lint): configure angular-eslint rules`
- `ec396fa` `feat(ui): add shared app-modal component`
- `9189ede` `refactor(dialogs): migrate legacy dialogs to app-modal`
- `c622999` `feat(ui): add responsive stat grid and migrate pages`
- `fb5c19b` `feat(guests): replace tables with person cards and server-side lists`
- `f768f4f` `feat(ui): improve action menu keyboard and mobile behaviour`
- `93981f4` `feat(ui): share page headers across main lists`
- `9882725` `feat(search): add empty-state suggestions and remote results`
- `9b26710` `feat(shell): open search ready to type with keyboard support`

### `apupu_back/` (branch `feat/bloco-1-fundacoes`)

- `a805ede` `feat(api): escape guest search terms and match phone`

## Resultado dos comandos

| Repositório | Comando | Resultado |
|---|---|---|
| `apupu_front` | `npm run build` | exit 0, bundle gerado em `dist/conta_comigo_front` |
| `apupu_front` | `npm test -- --watch=false` | 21 ficheiros, 113 testes, 0 falhas |
| `apupu_front` | `npm run lint` | 0 erros, 24 avisos legados |
| `apupu_back` | `npm run build` | exit 0 |
| `apupu_back` | `npm run typecheck` | exit 0 |
| `apupu_back` | `npm test` | 26 ficheiros / 254 testes passaram; 6 ficheiros / 86 testes skipped |

## Decisões e bloqueios

- Decisões: `docs/DECISIONS.md`.
- Bloqueios: nenhum; observações em `docs/BLOCKERS.md`.

## Testes manuais recomendados antes do merge

1. Abrir `/convidados` em 320 px e verificar cards sem overflow, pesquisa, filtros e paginação.
2. Abrir o detalhe de um evento com convidados e confirmar o mesmo cartão e 10 por página.
3. Em mobile, tocar uma vez na lupa: teclado abre, sugestões aparecem sem escrever; setas, Enter e Escape funcionam.
4. Em desktop, focar a pesquisa e confirmar `aria-expanded`, sugestões e limpeza ao sair.
5. Abrir um menu de três pontinhos em desktop e em mobile; verificar navegação por setas, Escape, clique fora e folha inferior.
