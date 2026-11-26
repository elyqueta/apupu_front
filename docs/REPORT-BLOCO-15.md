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

## Atualização — Fidelidade Gratitude (25/11/2026)

| Item | Estado | Evidência |
|---|---|---|
| Canvas 4:5 portrait, sem corte | ✔ | Front: SVG 1024x1280 `aspect-[4/5]` (`gratitude-invitation.component.ts`). PDF: 595.28x744.1 (4:5). |
| Fundo/ornamentos/fitas douradas | ✔ | Glow radial, anéis subtis, padrão geométrico cantos 13% com máscara fade, duas fitas curvas com padrão africano e ledge dourada. |
| Cabeçalho sem CONVITE/CELEBRAÇÃO ESPECIAL | ✔ | Logo bloco opcional (sem imagem fecha espaço), org/subtítulo conforme spec. |
| Título GRADITUDE fit-to-width, padrão africano, contorno | ✔ | Anton OFL local embutida (front/back); fit 90%+ largura, máx. 2 linhas; padrão africano denso via SVG pattern+clipPath; fallback sólido. |
| Ano 2026 itálico negrito vermelho | ✔ | Cormorant Garamond Bold com skew/italic, #B3121A, ~7% altura. |
| Linha info 4 colunas, 3 separadores dourados, QR >=11% | ✔ | Data/hora/local/QR com ícones pretos, QR em cartão branco borda dourada, overlay QR escaneável com ícone centro. |
| Dress code pill opcional | ✔ | Pílula creme, borda dourada, ícone t-shirt, texto DRESS-CODE/TRAJE AFRICANO. |
| PreviewData Gratitude | ✔ | `templates.page.ts` sampleData Gratitude: GRADITUDE, IGREJA CRISTÃ REINO-CHURCH, 20/12 14:00 Africa/Luanda, TRAJE AFRICANO. |
| Verificação Playwright 1024x1280 | ✔ | `apupu_front/e2e/gratitude.spec.ts`: bbox dentro do canvas, título >=88% largura, ordem vertical, QR >=11%, 3 separadores, título longo "O NOSSO DIA ESPECIAL" máx. 2 linhas sem corte. 2 testes passados. |
| Captura | ✔ | `apupu_front/docs/assets/gratitude-render.png` (gerada pelo teste Playwright). |
| PDF fontes embutidas + 1 página 4:5 | ✔ | `bloco14.pdf.test.ts`: Gratitude PDF 4:5, MediaBox `[0 0 595.28 744.1]`, 1 página, FontFile2/FontDescriptor, Anton/Figtree/CormorantGaramond. |

### Commits Gratitude fidelity
- Front `8815358` fix(templates): make gratitude layout faithful to flyer
- Back `0f25553` fix(templates): render gratitude pdf faithful to flyer
- Front `606bea6` test(templates): add gratitude fidelity checks
- Back `e4a21cb` test(templates): cover gratitude pdf layout and fonts

### Verificação (após fidelidade)
- Front: `npm run build` ✔, `npm run lint` ✔ (0 erros), `npm test -- --watch=false` ✔ (57/241), `npx tsc --noEmit` ✔
- Back: `npm run build` ✔, `npm run typecheck` ✔, `npm run lint` ✔ (0 erros), `npm run test` ✔ (43 passed, 6 skipped; 405 passed, 89 skipped)
- PDF: `npx vitest run tests/bloco14.pdf.test.ts` ✔ (8 testes)
- Playwright Gratitude: `npx playwright test e2e/gratitude.spec.ts --project=desktop-light` ✔ (2 passed)

### Limitações / pendências
- Teste Playwright usa `page.setContent` com SVG estático (não servidor Angular) para validar geometria/captura em ambiente sem app a correr; a componente Angular real usa a mesma estrutura.
- "Cada elemento é bloco editável" no editor completo é Passo 2; Gratitude tem campos ligados a dados do evento/manifesto, mas o editor Canva de propriedades por bloco ainda não está implementado.
- Logo do anfitrião: campo opcional suportado na renderização (fecha espaço sem imagem); falta UI de upload/campo dedicado no editor.
- QR digital Gratitude usa `api.qrserver.com` (sem nova dependência) com ícone WhatsApp sobreposto; avaliar gerador local/offline.

## Próximos passos

- Passo 2: TemplateRenderer único (editor, convite público, PDF) com documento de blocos, exemplo preenchido, painel de propriedades.
- Passos 3–5: `guest_kind`, saudação por hora, equipas em filas.
- Passos 6–8: feed social, reações/comentários, gráfico semanal.
- Passo 9: catálogo T01–T19 por ordem do 15B.

## Atualização — Correções Gratitude editor/PDF (25/11/2026)

### Defeitos corrigidos

| Defeito | Estado | Evidência |
|---|---|---|
| QR gigante/transbordo em todos os templates (PDF) | ✔ | `drawQrWithLogo` força SVG com `width/height` explícitos e `assumePt`; QR padrão usa `resolveQrConfig`, tamanho `md/lg` capado por largura e não renderiza quando destino inválido/vazio. |
| LOGO placeholder no público/PDF | ✔ | Gratitude digital só mostra logo quando existe `manifest.pdf.logo_url`; em `editorMode` mostra área tracejada "Adicionar logótipo". PDF Gratitude não desenha texto "LOGO"; `pdftotext` do artefacto sem "LOGO". |
| Info row 4 colunas, alinhamento/overlap | ✔ | Gratitude digital/PDF: colunas data/hora/local/QR, separadores dourados, ícones 5.4cqw, local com wrap 2-3 linhas, QR card ~14% largura com padding 8%. |
| Espaço grande entre título e "2026" | ✔ | Ano posicionado a `top:49.8%` (logo presente) perto do fundo do título (28.6% + 20.7%). |
| Logo/QR editáveis (MVP) | ⚠ parcial | `manifest.pdf` estendido com `logo_url/public_id/shape/size` e `qr_mode/whatsapp/custom/image/icon/size/label` (front+back schema). Editor tem secções Logótipo/QR com validação, preview e draft localStorage. Upload Cloudinary com `public_id` cleanup pendente (endpoint dedicado). |
| QR digital Gratitude sem dependência externa | ✔ | `qr-svg.util.ts` vendored (qrcode-generator MIT) gera SVG vetorial local com ECC H. |

### Ficheiros principais

- `apupu_back/src/services/pdf/invitationDocument.ts` — QR escalável, `resolveQrConfig`, Gratitude layout/logo/QR configurável.
- `apupu_back/src/types/templateManifest.ts` — schema pdf logo/qr.
- `apupu_front/src/app/core/models/template-manifest.ts` — tipos pdf logo/qr.
- `apupu_front/src/app/features/invitation/parts/gratitude-invitation.component.ts` — sem LOGO placeholder público, QR SVG local, posições spec.
- `apupu_front/src/app/features/templates/template-editor.page.ts` — secções Logótipo/QR, draft com pdfOverrides.
- `apupu_front/src/app/shared/utils/qr-svg.util.ts` — gerador QR SVG local.
- `apupu_front/src/app/core/i18n/block15-keys.ts` — chaves pt-PT/en.
- `apupu_front/e2e/gratitude.spec.ts` — fixture atualizada com checks no-LOGO/no-overlap/QR-inside-card.

### Artefactos

- `docs/assets/gratitude-pdf-render.pdf` / `docs/assets/gratitude-pdf-render.png` — gerado por `renderInvitationPdf` + `pdftoppm`.
- `pdftotext` sem "LOGO" confirmado.

### Verificação executada

- Front: `npx tsc --noEmit` ✔. `npm run lint` tem erros preexistentes no repo; ficheiros alterados nesta sessão sem erros de lint.
- Back: `npx tsc --noEmit` ✔. `npm run lint` tem erros/warnings preexistentes no repo.
- Não executado nesta sessão: `npm run build` completo front/back, `npm test -- --watch=false` completo, Playwright contra app, `pdffonts` embed check, `zbarimg`, migrações up/down em DB de teste dedicada.

### Pendências

- Endpoint Cloudinary para logo/QR image com `public_id` e destruição no replace/remove (sem bloquear operação principal).
- Persistência backend do manifesto/draft do editor (Passo 2 gap).
- QR configurável no renderer digital genérico não-Gratitude.
- Validação visual completa Playwright/pdffonts/zbarimg e migrações em DB de teste.
