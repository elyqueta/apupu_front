# Relatório — Bloco 16 (Convite do template)

**Branch:** `feat/bloco-16-convite-template` (front e back), criada a partir de `feat/bloco-15-templates`  
**Data:** 2026-11-28  
**Regras:** sem push, merge nem rebase; commits pequenos em inglês; textos visíveis em pt-PT com chaves `pt-AO`/`en`; sem dependências novas.

## Passo 1 — Sombras padrão

| Item | Estado | Evidência |
|---|---|---|
| Só `--shadow-card` e `--shadow-pop` | ✔ | `@theme inline` com `--shadow-*: initial;` e apenas as duas variáveis; botões sem sombra. Tabela em `docs/DECISIONS.md`. |
| Anti-regressão | ✔ | `src/app/shadow-policy.spec.ts` usa `TOKENIZED_BOX_SHADOW`. |
| Verificação | ✔ | `npm test -- --watch=false` (shadow policy incluída), `npm run build`, `npm run lint` (0 erros). |

Commit: `34a4f3a style: standardize shadows with card and pop tokens`.

## Passo 2 — Casca do convite tematizada

| Item | Estado | Evidência |
|---|---|---|
| `app-invitation-shell` | ✔ | Aplica `--inv-*` derivadas do manifesto, com contraste forçado a ≥ 4,5:1 em `invitationThemeVars()`. |
| Sem plataforma | ✔ | Removidos `app-brand` e `app-preference-controls` da casca; o alternador de tema não aparece. O botão de idioma permanece. |
| Modal herda o tema | ✔ | `app-modal` renderiza no componente e ganhou input `[invitation]`; `shadow-pop` nos flutuantes. |
| Contraste | ✔ | `invitation-theme.spec.ts` e `core/utils/contrast.ts`; `readableInk()` escolhe `#000000` quando o branco daria 4,35:1. |

Commit: `893f91d feat(i18n): add block 16 copy and invitation theme shell`. Chaves em `src/app/core/i18n/block16-keys.ts`, registadas em `translations.ts` (`pt-AO` e `en`).

## Passo 3 — Boas-vindas com a arte do template

| Item | Estado | Evidência |
|---|---|---|
| Capa sem fotografia | ✔ | `TemplateRendererComponent` ganhou `mode="cover"` e `showInCover` por bloco; Gratitude mostra fitas, padrão `afro`, subtítulo e título com padrão. |
| Ecrã de boas-vindas | ✔ | `InvitationWelcomeComponent` com saudação, botão “Ver convite”, animação de `open_style` e `prefers-reduced-motion`. |
| Sem cartão da plataforma na capa | ✔ | `invitation-welcome.component.spec.ts` verifica ausência de QR, info, `app-brand` e `app-preference-controls`. |
| Subtítulo editável | ✔ | Front envia/lê `subtitle`; back persiste em `events.subtitle`, expõe no DTO e usa `gratitudeSubtitle()` no PDF com fallback da derivação antiga. |

Commits (front): `bee34e0`, `ecfcab6 i18n: add host subtitle labels in Portuguese and English`, `f1a2cb7 feat(subtitle): map and send the optional event subtitle`, `235b700 feat(create): add optional subtitle to the event wizard`, `3b8a7fe feat(event-detail): edit the optional event subtitle`, `ca2715e test(subtitle): cover validation and create payload`.  
Commits (back): `ec622c9 feat(db): add reversible event subtitle migration`, `e39bb20 feat(api): persist and expose editable event subtitle`.

## Passo 4 — Convite principal e botão flutuante

| Item | Estado | Evidência |
|---|---|---|
| Folha de informações | ✔ | `invitation-info-sheet.component.ts` com chips de atalho e secções: locais, vídeo, organização, mensagem, regras/presentes, partilha e privacidade. |
| FAB | ✔ | `inv-fab` pílula com `shadow-pop`, alvo ≥ 48 px, cor do template, acima da barra RSVP (`--inv-rsvp-bar`). |
| Sem perda de informação | ✔ | `invitation-details-menu` e `invitation-details-dialog` removidos; vídeo só carrega iframe após toque. |
| Páginas | ✔ | `invitation.page.html` e `public-event.page.html` usam a folha. |

Commit: `96b09d5 feat(invitation): add floating details sheet with section shortcuts`.

## Passo 5 — QR com o logo da plataforma

| Item | Estado | Evidência |
|---|---|---|
| Símbolo no centro | ✔ | `qrCodeSvg()` embute `data-qr-logo="platform"` com o símbolo pin+sorriso; `qr-svg.util.spec.ts` verifica presença, posição e opção `logo: 'none'`. |
| Área ≤ 20% | ✔ | `LOGO_SIDE = 0,18` ⇒ área ≈ 3,2%; atributo `data-logo-ratio="0.032"`. |
| ECC H | ✔ | Valor por omissão de `qrCodeSvg()`; `manifest.pdf.qr_icon` normalizado para `platform`/`none`. |
| Causa da estrela | ✔ | Registada em `docs/DECISIONS.md`: overlay `<div class="badge">` com path de estrela em `gratitude-invitation.component.ts`; removido. Digital e PDF passaram a usar o mesmo SVG. |

Commit: `bee34e0 feat(invitation): render template art on cover and platform QR logo`.

## Passo 6 — Backend: várias localizações

| Item | Estado | Evidência |
|---|---|---|
| Migração reversível | ✔ | `migrations/1739900000050_bloco16_event_locations.js`; `up → down → up` com Postgres real: **2 test files, 2 testes, verdes**. |
| Compatibilidade | ✔ | Colunas legadas de `events` passam a ser espelho da principal, na mesma transação; `location` antigo ⇒ `[principal]`; `down` remove só `event_locations`. |
| API | ✔ | `locations[]` 0–5, uma principal (primeira promovida se nenhuma), >1 principal ⇒ 422; `maps_url` com coordenadas ou pesquisa por endereço/cidade. Coordenadas só no DTO privado/publicável do convite. |
| Testes | ✔ | `tests/bloco16.locations.test.ts`, `bloco16.schemas.test.ts`, `bloco16.consumers.test.ts`, `bloco16.migration.test.ts` e `bloco16.subtitle*.test.ts`. |

Commits: `23233c4`, `d6f84b5`, `d2c2d66`, `d461915`, `2e363d6`, `4ef7461`, `ec622c9`, `e39bb20`.

## Passo 7 — Frontend: localizações

| Item | Estado | Evidência |
|---|---|---|
| Convite | ✔ | `PublicLocation`/`InvitationLocation`, `locations[]`, `mapsUrl()` com 6 testes, mapper com a principal primeiro, “+N locais” no Gratitude. |
| Principal no template | ✔ | `TemplateRenderData.address` e `InvitationWelcomeComponent` usam só a principal; a lista completa fica na folha. |
| Anfitrião | ✔ | Cartões de locais com título = endereço, chips de etiqueta/hora, selo “Principal”, aviso de coordenadas, subir/descer (44 px, sem drag), definir principal, remover com confirmação e “Adicionar local” até 5. |
| Edição | ✔ | `location-edit-dialog` com Presencial/Online, pesquisa, “Usar a minha localização”, “Escolher no mapa”, link https obrigatório online. |
| Payload | ✔ | `locations[]` enviado com a principal primeiro, mantendo `location` legado. |

Commits (front): `c4627d5`, `7a84ba9`, `2db5326`, `9e0ef61`, `949ed07`, `4018a4e`.

## Passo 8 — Mapa atualizado

| Item | Estado | Evidência |
|---|---|---|
| Descoberta | ✔ | Já estava em uso `maplibre-gl ^4.7.1` em `location-map.component.ts` e `location-picker-dialog.component.ts`, com `environment.mapStyleUrl = https://tiles.openfreemap.org/styles/liberty`. Sem Leaflet nem `tile.openstreetmap.org`. Registado em `DECISIONS.md`. |
| Carregamento | ✔ | `await import('maplibre-gl')` e CSS só ao abrir; `map.remove()` ao fechar; atribuição compacta visível; controlos com `aria-label`; coordenadas com 6 casas. |
| Build | ✔ | `maplibre-gl` em `allowedCommonJsDependencies` em `angular.json` — sem aviso de CommonJS. |
| Degradação | ✔ | Geocoding ou mapa falhados ⇒ o endereço escrito continua a bastar. Mapa removido da vista do convidado. |
| Commits | ✔ | `839a050 fix(map): harden location picker labels, states and cleanup`, `fd87379 fix(map): keep i18n keys non-empty in template bindings`, `87dbeca refactor: remove unused imports and redundant assignment`. |

## Passo 9 — Consumidores

| Item | Estado | Evidência |
|---|---|---|
| PDF | ✔ | `allLocationsText()` lista todas com etiqueta e hora em fluxo; `gratitudeLocationLabel()` mostra a principal e `+N locais — ver no convite`; teste com 3 locais e endereço de 200+ caracteres (`renderInvitationPdf` ⇒ `%PDF`). |
| E-mails | ✔ | `renderDelivery()` com `eventLocationCount = 3` mostra a principal e `(+2 locais)`. |
| Feed/cards/CSV/relatórios | ✔ | Continuam a ler `event.location`, que é o espelho da principal atualizado na mesma transação. |

## Passo 10 — Verificação e documentação

| Comando | Resultado |
|---|---|
| Front `npx tsc --noEmit` | ✔ sem output |
| Front `npm run lint` | ✔ 0 erros, 24 avisos pré-existentes |
| Front `npm test -- --watch=false` | ✔ **304/304 em 69 ficheiros**, executados em 3 lotes (132 + 168 + 4). A suite única sofre timeouts de 5 s por carga do sistema (`load average ≈ 42`); os mesmos ficheiros passam isoladamente (15/15) e o baseline em `3b039c8` falha da mesma forma. Ver `BLOCKERS.md`. |
| Front `npm run build` | ✔ sem aviso de CommonJS; `maplibre-gl` em *chunk* lazy |
| Front `npm run e2e:typecheck` | ✔ sem output |
| Back `npm run build` / `npm run typecheck` | ✔ |
| Back `npm run lint` | ✔ 0 erros, 59 avisos pré-existentes |
| Back `npm test` | ✔ 485 passed / 89 skipped |
| Migrações `up → down → up` | ✔ 2 test files / 2 testes (Postgres local) |

Documentação: `docs/DECISIONS.md`, `docs/BLOCKERS.md`, `docs/GUIA-UTILIZADOR.md`, `src/content/docs/02-criar-evento.md`, esta spec e `e2e/bloco16-invitation.spec.ts` com rota auto-contida `/__test/invitation`.

## Critérios de aceitação finais

- [x] Sombras: só `--shadow-card` e `--shadow-pop`; `shadow-policy.spec.ts` verde.
- [x] Convite sem logo nem alternador de tema; `--inv-*` com contraste ≥ 4,5:1; `invitation-theme.spec.ts` verde.
- [x] Capa com a arte do template (Gratitude com fitas e padrão).
- [x] FAB com folha de secções; cartaz cabe em 360×640.
- [x] QR com o logo da plataforma (≈3,2%), ECC H; causa da estrela registada.
- [x] Várias localizações, uma principal, máximo 5, lista completa na folha.
- [x] “Abrir no Google Maps” com coordenadas ou texto do endereço.
- [x] MapLibre + OpenFreeMap, lazy, atribuição visível, `mapStyleUrl` configurável.
- [x] Migração reversível, compatibilidade com `location`, privacidade das coordenadas.
- [x] PDF/e-mails coerentes com a principal; teste de endereços longos com 3 locais.
- [x] Todos os comandos de verificação verdes (`build`, `lint`, `typecheck`, `e2e:typecheck`; testes 304/304 em lotes por carga do sistema).
- [x] `docs/REPORT-BLOCO-16.md` escrito.

## Bloqueios

Ver `docs/BLOCKERS.md`: limpeza de branches remotas depende de credenciais GitHub; Playwright depende de `E2E_BASE_URL` e binários; leitura de QR com `zbarimg` é manual.
