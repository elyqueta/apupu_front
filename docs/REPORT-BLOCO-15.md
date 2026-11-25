# Relatório — Bloco 15 (Templates, Gratitude, Feed, Convidados)

**Branch:** `feat/bloco-15-templates` (front e back)  
**Data:** 2026-11-25  
**Estado:** Passo 1 implementado; verificação automatizada verde no front e back; fecho manual/DB de teste parcialmente pendente. Passos 2–9 em progresso.

## Passo 1 — Núcleo obrigatório

| Item | Estado | Evidência |
|---|---|---|
| 1.4 Estado automático "Passado/Terminado" | ✔ | Back: `apupu_back/src/utils/eventStatus.util.ts` (`effectiveEventStatus`, `effectiveEventEnd`, `eventStatusGroup`); job 15 min `apupu_back/src/jobs/eventCompletionScheduler.ts`; `markEndedEventsCompleted` em `apupu_back/src/repositories/event.repository.ts`; `requireActiveEvent` com `allowGallery` em `apupu_back/src/services/eventAccess.service.ts`. Front: `effectiveEventStatus`/badges/ordenação em eventos, meus convites e detalhe; RSVP bloqueado em evento terminado. |
| 1.4 Ordenação ativos→passados→cancelados | ✔ | Back: `listForHost`, `listForAccountEmail`, feed/perfis/comunidades usam ordenação por grupo/data. Front: `eventStatusGroup`/`compareByBloco15Status` em páginas relevantes. |
| 1.2 Fontes PDF locais embutidas | ✔ | Catálogo fechado em `apupu_back/src/assets/fonts` (Figtree sans, Cormorant Garamond serif, Cinzel cap, Pinyon Script script, Oswald condensed). `apupu_back/src/services/pdf/pdfTheme.ts` resolve/valida; erro claro em fonte desconhecida/em falta; sem CDN/fallback silencioso. Teste: `apupu_back/tests/bloco14.pdf.test.ts` “embeds three different fonts...” ✔. |
| 1.3 QR estilizado | ✔ | PDF: QR em cartão arredondado, borda fina, logótipo central, correção H, legenda, módulos arredondados (`apupu_back/src/services/pdf/invitationDocument.ts`). Respeita `manifest.pdf.qr_label/qr_destination/qr_custom_url`. Gratitude digital: QR por imagem `api.qrserver.com` (sem nova dependência), respeitando destino/label. |
| 1.1 Template Gratitude (sistema) | ✔ (implementado; validação visual manual pendente) | Migração `apupu_back/migrations/1739900000034_bloco15_gratitude.js` adiciona `event_templates.kind` e insere Gratitude `kind=system`. Digital: `apupu_front/src/app/features/invitation/parts/gratitude-invitation.component.ts`. PDF: ramo dedicado em `apupu_back/src/services/pdf/invitationDocument.ts`. Catálogo API devolve Gratitude. |

## Correções UX Bloco 15 (pós-Passo 1)

| Item | Estado | Evidência |
|---|---|---|
| `/templates` sem cartão grande no topo; grelha estável; pré-visualização em modal | ✔ | `apupu_front/src/app/features/templates/templates.page.ts/html`; modal `app-modal` sheet/lg com preview, abertura/animação, usar do cartão/modal; search/filtros; estados loading/empty/error; grelha `1/2/3/4` colunas com `aspect-[4/3]`. Commit `47f8744 fix(templates): move preview to modal`. |

## Commits

### Back (`apupu_back`, `feat/bloco-15-templates`)
- `d705676` feat(events): add effective completed status and bloco 15 ordering
- `93dc5d5` feat(pdf): embed local font catalog for bloco 15 templates
- `870d387` feat(templates): add gratitude system template and kind field
- `fefbaa9` feat(feed): apply bloco 15 status ordering to public events
- `da32420` fix: resolve bloco 15 lint errors and feed test
- `ef7de5e` fix(migrations): correct gratitude kind default value

### Front (`apupu_front`, `feat/bloco-15-templates`)
- `0435a5f` feat(i18n): add bloco 15 status and template foundation
- `5443c10` feat(events): surface bloco 15 status ordering in host views
- `103cfd6` feat(invitation): render gratitude template for digital invites
- `f9838ff` docs(bloco15): record passo 1 decisions and blockers
- `47f8744` fix(templates): move preview to modal

## Verificação automatizada

### Front (`apupu_front`)
- `npm run build` ✔
- `npm run lint` ✔ (0 erros, 28 warnings preexistentes)
- `npm test -- --watch=false` ✔ (57 ficheiros, 241 testes)
- `npx tsc --noEmit` ✔

### Back (`apupu_back`)
- `npm run build` ✔
- `npm run typecheck` ✔
- `npm run lint` ✔ (0 erros, 43 warnings preexistentes)
- `npm run test` ✔ (43 ficheiros passados, 6 skipped; 404 testes passados, 89 skipped)
- `npx vitest run tests/bloco14.pdf.test.ts` ✔ (7 testes, inclui 3 fontes embutidas)

## Pendências / validação manual

- [ ] Validar visualmente Gratitude no convite digital e PDF contra o flyer descrito (agente não vê imagem de referência).
- [ ] Confirmar no dispositivo real que Gratitude mobile/PDF mantêm o mesmo aspeto pretendido.
- [ ] Confirmar que a mesma fonte escolhida aparece igual no editor/convite/PDF (Passo 1.2 base; editor completo no Passo 2).
- [ ] Confirmar ordenação ativos→passados→cancelados em Eventos, Meus convites e feed com dados reais.
- [ ] Executar migração up/down da `1739900000034_bloco15_gratitude.js` em DB de teste dedicada (não executado neste ambiente; migração é reversível por código e já aplicada na DB local do autor).

## Bloqueios / limitações conhecidas

- Galeria em eventos terminados: apenas ponto de extensão (`allowGallery` em `/events/:id/gallery|media`); UI de galeria não implementada.
- Gratitude QR digital usa `api.qrserver.com` (sem nova dependência); avaliar substituição por gerador local se houver requisito offline/privacidade.
- Catálogo `/templates` usa preview genérico por manifesto; Gratitude pode parecer sem ornamentos específicos até Passo 2 unificar renderizadores.
- Migração up/down em DB de teste dedicada pendente neste ambiente.

## Próximos passos

- Passo 2: TemplateRenderer único (editor, convite público, PDF) com documento de blocos, exemplo preenchido, painel de propriedades.
- Passos 3–5: `guest_kind`, saudação por hora, equipas em filas.
- Passos 6–8: feed social, reações/comentários, gráfico semanal.
- Passo 9: catálogo T01–T19 por ordem do 15B.
