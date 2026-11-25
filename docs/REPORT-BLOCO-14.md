# Relatório — Bloco 14 (convite: vídeo, mapa, organizadores, templates iniciais e PDF)

Branch `feat/bloco-14-convite-pdf` (front e back). Sem push/merge/rebase. 24/11/2026.

## Estado

O back já tinha os commits do Bloco 14 (`7af8eac`, `08ed5a1`, `e32e758`, `6197a9d`) com migrações/manifestos, API de drafts, vídeo/coordenadas/mesas/organizadores e PDF "Convite". Este trabalho finalizou os gaps do front.

## Critérios de aceitação

| Critério | Estado | Evidência |
|---|---|---|
| 6 templates em manifesto; convite e PDF lêem o mesmo manifesto. | ✔ (back/front base já presente) | Back: manifests/migrações e `eventDocuments`/PDF nos commits existentes; front: `template-manifest.ts`, `invitation` renderiza por manifesto/template. Não alterado nesta sessão. |
| Abertura do convite muda com o template e respeita redução de movimento. | ✔ (já presente) | `InvitationWelcomeComponent` usa `manifest().open_style` e `data-open-style`; verificar no browser com `prefers-reduced-motion`. |
| Vídeo YouTube só por ID, carregado ao clicar; CSP ajustada. | ✔ (front wiring) | Wizard e modal de edição aceitam URL/ID, extraem com `src/app/core/utils/youtube.ts`, enviam `youtube_video_id`; erro pt-PT `block14.video.invalid`. Convite usa `InvitationVideoComponent` (`youtube-nocookie.com`, ao clicar). CSP/iframe já tratada no back/infra existente do bloco. |
| Localização por geolocalização ou mapa; Google Maps abre com coordenadas. | ✔ | `MapPickerDialogComponent` (Leaflet+OSM, lazy, sem chave, atribuição OSM). Wizard e modal de edição: "Usar a minha localização", "Escolher no mapa", "Remover localização exata", `placeLabel`. Convite: `InvitationLocationDialogComponent` abre Google Maps com `lat,lng` quando há coordenadas e mostra "Localização exata". |
| Organizadores e hierarquia visíveis conforme as regras; membros nunca expostos publicamente. | ✔ (já presente no back/front) | `InvitationOrganizersComponent` e mapper/dto incluem organizadores; regra de membros não expostos é do back. |
| Rascunhos guardados automaticamente e retomáveis; nunca visíveis publicamente. | ✔ | `EventDraftsRepository` (`/host/event-drafts`). Wizard: autosave debounce 2s, save ao avançar passo, `?draft=` retoma, estado "Rascunho guardado"/erro, apaga rascunho após publicar. `/eventos`: filtro "Rascunhos" com Retomar/Eliminar (confirmação modal). Rascunhos não geram notificações/emails (back). |
| PDF "Convite" sem data/estado, mesa condicional, QR com logo, endereços longos sem sobreposição. | ✔ (back já commitado) | Commits `e32e758`, `6197a9d` no back; não revalidado por teste visual nesta sessão. |
| `build`, `lint`, `test`, `typecheck` verdes; migrações reversíveis; `docs/REPORT-BLOCO-14.md`. | ✔ (front) | Ver tabela abaixo. Migrações são do back (já commitadas). |

## Verificação

| Comando | Resultado |
|---|---|
| front `npm run build` | ✔ |
| front `npm run lint` | ✔ 0 erros, 24 avisos preexistentes |
| front `npm test -- --watch=false` | ✔ 56 ficheiros, 238 testes passaram |
| front `npx tsc --noEmit` | ✔ |
| front `npm run e2e:typecheck` | ✔ |
| front `npm run e2e` | ✘ SKIP — `E2E_EMAIL`, `E2E_PASSWORD`, `E2E_BASE_URL` ausentes (não definidos). |

## Alterações principais (front)

- `src/app/shared/components/map-picker-dialog.component.ts`: modal Leaflet+OSM lazy.
- `src/app/core/utils/youtube.ts`: extração de ID YouTube (11 chars).
- `src/app/core/data/event-drafts.repository.ts`: CRUD de rascunhos.
- `src/app/features/event-setup/create-event.page.*`: campos block 14, localização exata, vídeo, mesas, autosave/retoma de rascunho.
- `src/app/features/events/events.page.*`: separador Rascunhos com Retomar/Eliminar.
- `src/app/features/events/event-detail.page.*`: edição de vídeo, localização exata e mesas.
- `src/app/core/api/*`, `src/app/core/models/models.ts`, `src/app/core/data/events.repository.ts`: plumbing de `youtube_video_id`, `use_tables`, `latitude/longitude/place_label`.
- `angular.json`, `package.json`, `package-lock.json`: Leaflet e assets.

## Riscos / seguimento

- Não validei visualmente no browser (mapa, abertura do convite por template, PDF). Recomenda-se smoke manual.
- E2E não executado por falta de credenciais.
- `common.error` foi adicionado às traduções para suportar o toast de eliminação de rascunho.
- O diretório `.claude/` está untracked no front; não foi incluído em commit.
