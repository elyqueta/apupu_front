# Relatório — Bloco 15 (Templates, Gratitude, Feed, Convidados)

**Branch:** `feat/bloco-15-templates` (front e back)  
**Data:** 2026-11-25  
**Estado:** Passo 1 e catálogo 15B (Passo 9) implementados; verificação automatizada verde no front e no back (com exceção do lint backend pré-existente); fecho manual/DB de teste pendente. Demais passos em progresso.

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
| PDF fontes embutidas + 1 página 4:5 | ✔ | `bloco14.pdf.test.ts`: Gratitude PDF 4:5, MediaBox `[0 0 595.28 744.1]`, 1 página, FontFile2/FontDescriptor, Anton/Montserrat (asserção antiga com Figtree/CormorantGaramond corrigida em 27/11/2026). |

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
- ~~Passo 9: catálogo T01–T19 por ordem do 15B.~~ ✔ Concluído; ver "Atualização — Catálogo 15B e título longo do Gratitude (27/11/2026)".

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

### Verificação executada (estado dessa iteração; superado pela atualização de 27/11/2026 abaixo)

- Front: `npx tsc --noEmit` ✔. `npm run lint` tem erros preexistentes no repo; ficheiros alterados nessa sessão sem erros de lint.
- Back: `npx tsc --noEmit` ✔. `npm run lint` tem erros/warnings preexistentes no repo.
- Não executado nessa sessão: `npm run build` completo front/back, `npm test -- --watch=false` completo, Playwright contra app, `pdffonts` embed check, `zbarimg`, migrações up/down em DB de teste dedicada. Ver a secção final deste relatório para o estado atual.

### Pendências

- Endpoint Cloudinary para logo/QR image com `public_id` e destruição no replace/remove (sem bloquear operação principal).
- Persistência backend do manifesto/draft do editor (Passo 2 gap).
- QR configurável no renderer digital genérico não-Gratitude.
- ~~Validação visual completa Playwright/pdffonts/zbarimg e migrações em DB de teste.~~ ✔ Ver "Resolução das limitações assinaladas" (Playwright e migração real executadas; `zbarimg` continua fora do pipeline automatizado).

## Atualização — Catálogo 15B e título longo do Gratitude (27/11/2026)

### Catálogo T01–T19

| Item | Estado | Evidência |
|---|---|---|
| 19 templates `kind = 'system'` | ✔ | `apupu_front/src/app/core/data/system-templates.ts` é a fonte canónica; espelho em `apupu_back/src/assets/templates/system-templates.json`. Comparação direta front↔back: 19/19 com manifesto, nome, descrição e `supportedFields` idênticos. |
| Ordem de entrega 15B | ✔ | `SYSTEM_TEMPLATES` começa por T01, T03, T05, T08, T11, T13, T17; os restantes seguem depois. |
| `previewData` e miniatura gerada | ✔ | Todos os manifestos trazem `previewData` neutra; `templates.page.ts` alimenta `sampleData()` e `TemplateRendererComponent` gera a miniatura em `mode="preview"` (sem imagem estática de terceiros). Teste: `mostra os 19 templates de sistema e deduplica por slug`, `usa previewData e orientação do manifesto nos cartões`, `abre a pré-visualização com o exemplo e a orientação do template`. |
| Blocos reutilizáveis | ✔ | Fábricas comuns (`title`, `text`, `datetime`, `location`, `timeline`, `buttons`, `countdown`, `gifts`, `qr`, `ornament`, `image`, `gallery`, `musicVideo`) e `TIME_ITEMS` partilhado; os sete primeiros têm documentos v2 mais ricos (17–22 blocos). |
| Merge remoto vs. sistema | ✔ | `templates.repository.ts` junta os locais primeiro e ignora o slug remoto duplicado; coberto por teste. |
| Orientação | ✔ | `orientation` normalizada no front e no schema Zod do back; aplicada à miniatura e ao modal (`tpl-orientation-*`), com `strip`, `card45`, `a5`, `a4`, `landscape` e `story`. |
| Backend/API/migração | ✔ | `1739900000040_bloco15b_catalog.js`: upsert idempotente por slug com `kind = 'system'`; `down` remove só estes slugs quando não usados. `bloco15b.catalog.test.ts` valida schema, 19 manifests, DTO e forma da migração; `bloco15b.migration.test.ts` executa `up/down` num PostgreSQL real. |
| Paridade editor/convite/PDF | ✔ (com aproximação decorativa) | O documento v2 é o contrato comum: `TemplateRendererComponent` e `documentToLines()` no PDF leem os mesmos blocos. O PDF desenha eixo da timeline, pílulas dos botões, divisor rasgado, ornamentos e placeholders de média, além de variantes de canto; relevo 3D, máscaras de gradiente em fotos e interactividade continuam aproximados — ver `BLOCKERS.md`. |
| Fontes e marcas | ✔ | Só papéis do catálogo local (`sans`, `serif`, `cap`, `script`, `condensed`, `anton`, `montserrat`); nomes, marcas e fotos de referência substituídos por dados neutros. |
| Contraste ≥ 4.5:1 | ✔ | Teste puro em `system-templates.spec.ts` valida `ink/bg` e `muted/bg` nos 19 templates. Seis paletas foram ajustadas (T02, T06, T09, T10, T12, T16) onde o texto era pouco legível — um deles tinha contraste 1.00:1. |

### Gratitude — referência e título extenso

| Item | Estado | Evidência |
|---|---|---|
| HTML anexo | ✔ | `docs/assets/gratitude-template.html` incorpora a mesma referência visual (fundo radial, Anton + Montserrat, QR com badge WhatsApp e painel de edição oculto na impressão). |
| Redução gradual no ecrã | ✔ | `fitTitle()` mede com canvas/Anton e aplica `BASE=300`, `MIN=90`, `STEP=10` numa banda `910×300`; se necessário, alarga a viewBox e usa `preserveAspectRatio="xMidYMid meet"` (nunca `none`). |
| Redução gradual no PDF | ✔ | `apupu_back/src/services/pdf/gratitude-title.ts` partilha a regra (`BASE=195`, `MIN=54`, `STEP=5`, banda `0.91×1024`, viewBox base `1024`); `renderGratitudePdf()` mede com a fonte Anton e desenha `<svg>` aninhado com `xMidYMid meet`. |
| Sem corte/distinção | ✔ | `fitGratitudeTitle()` dimensiona a viewBox por `largura × CANVAS_WIDTH / MAX_TITLE_WIDTH`, pelo que o texto escalado se mantém dentro dos 91% da largura mesmo no mínimo. Testes puros em `bloco14.pdf.test.ts`. |
| Artefacto longo | ✔ | `docs/assets/gratitude-long-title.pdf` / `.png` gerados com título "O NOSSO DIA ESPECIAL COM TODA A FAMÍLIA E AMIGOS E VIZINHOS"; `pdftotext` mostra o título completo numa única página 4:5. |
| E2E | ✔ | `npx playwright test e2e/gratitude.spec.ts e2e/gratitude-real.spec.ts --project=desktop-light`: **8 passed** (inclui caso de título longo e 5 capturas 1024×1280). |

### Verificação final desta rodada

- Front: `npm run build` ✔; `npm run lint` ✔ (0 erros, 24 avisos legados); `npm test -- --watch=false` ✔ (63 ficheiros, 285 testes).
- Back: `npm run build` ✔; `npm run typecheck` ✔; `npm run lint` ✔ (0 erros, 60 avisos legados de `explicit-function-return-type`); `npm test` ✔ (50 ficheiros passados, 6 skipped; 444 testes passados, 89 skipped).
- PDF: `npx vitest run tests/bloco14.pdf.test.ts tests/bloco15b.catalog.test.ts tests/bloco15b.migration.test.ts` ✔ (23 testes). A asserção antiga que exigia `Figtree`/`CormorantGaramond` no Gratitude foi corrigida para as fontes reais do template (`Anton` + `Montserrat`).
- E2E com servidor fresco na porta 4201: `npx playwright test e2e/gratitude.spec.ts e2e/gratitude-real.spec.ts --project=desktop-light` ✔ (8 passed) e `npx playwright test e2e/templates-320.spec.ts` ✔ (4 passed em `mobile-light`, `mobile-dark`, `desktop-light`, `desktop-dark`).

### Resolução das limitações assinaladas (27/11/2026)

| Limitação anterior | Resolução | Evidência |
|---|---|---|
| `lint` do back com 159 erros | ✔ Corrigido com tipos reais em `geocode.service.ts` e `invitationDocument.ts`, sem `eslint-disable`, sem alterar regras nem comportamento. | `npm run lint`: 0 erros; `build`, `typecheck` e `npm test` continuam verdes. |
| PDF aproximava blocos ricos | ✔ O documento v2 agora desenha eixo/pontos da timeline, pílulas dos botões, divisores `wave`/`leaf`/`ornament`/`torn-edge`, motivos de ornamento, placeholders de imagem/galeria/música e variantes de canto (`arch`, `organic`, `gold-corners`, `ribbons`, `geo-dark`, `gradient-rings`). | Teste puro de mapeamento e teste de contagem de operadores vetoriais nos fluxos do PDF em `bloco15b.catalog.test.ts`; capturas em `docs/assets/template-t01-pdf.png`, `template-t11-pdf.png`, `template-t13-pdf.png`, `template-t17-pdf.png`. Relevo 3D e máscaras de gradiente continuam aproximados por vetor. |
| Migração sem `up/down` real | ✔ Executada num PostgreSQL real (contentor Docker do projeto, DB descartável) através do `runner` do `node-pg-migrate`, com esquema mínimo das tabelas que a migração toca. | `tests/bloco15b.migration.test.ts`: 19 inserts, `kind = 'system'`, template legado intacto, upsert idempotente, `down` preserva template em uso, round-trip. |
| Sem captura automatizada a 320 px | ✔ Rota auto-contida `__test/templates` e spec Playwright que mede os 19 templates renderizados pelo componente real. | `e2e/templates-320.spec.ts`: cartão visível, `scrollWidth <= clientWidth + 2`, `body`/`documentElement` sem overflow, fonte ≥10 px e título sem corte; 4 projetos passados. A spec detetou e corrigiu um corte real no título do T18. |
| Contraste dos textos | ✔ Seis paletas ajustadas para cumprir o mínimo de 4.5:1 exigido pela especificação 15B. | `src/app/core/data/system-templates.spec.ts` valida as 19 paletas; espelho back atualizado. |
| `PLANO-BLOCO-15.md` divergente | ✔ Plano alinhado com o anexo 15B e com o estado real (ordem do Passo 9, catálogo de fontes, verificações). | `docs/PLANO-BLOCO-15.md`. |

### Notas de ordem documental

`BLOCO-15B-CATALOGO-TEMPLATES.md` define a ordem de entrega T01, T03, T05, T08, T11, T13, T17 primeiro; `PLANO-BLOCO-15.md` tinha uma sequência divergente e foi alinhado nesta rodada. A decisão e a origem da divergência ficam registadas em `DECISIONS.md`.

## Ajustes de UI e convites (27/11/2026 — segunda rodada)

| Pedido | Alteração | Verificação |
|---|---|---|
| Evento de comunidade no PDF | `reportExport.service.ts` resolve `communityRepository.findNameById(event.communityId)` e passa o nome a `renderInvitationPdf()` como substituto do anfitrião; a substituição é aplicada antes de gerar linhas/documento (inclui Gratitude). | `tests/bloco15b.catalog.test.ts`: linha `host` com o nome da comunidade e PDFs diferentes para o mesmo evento com/sem comunidade. |
| Menu inferior mobile do painel | A barra do shell passou a usar a mesma cápsula arredondada, vidro, safe-area e alvos de 44 px do feed. O destino `/tarefas` saiu da barra (continua no drawer "Mais"). | `shell.component.html` / `shell.component.ts`; `e2e/templates-320.spec.ts` continua verde nos 4 projetos. |
| Carrossel de convidados pendentes | O painel deixou de forçar três colunas em qualquer ecrã: agora é 1 coluna em mobile, 2 em `sm` e 3 em `lg`, com espaçamento lateral para não cortar sombras. A paginação continua a agrupar até três convidados. | `dashboard.page.html` / `dashboard.page.ts`; spec de agrupamento mantida. |
| Modal de detalhe do convidado | Cartão com avatar, nome, estado e contactos em blocos separados; email e telefone usam quebra de linha em vez de `truncate`, pelo que o número completo deixa de ficar oculto. Metadados passaram a lista com divisórias. O modal passou a `lg` (704 px) com acções em três colunas a ocupar toda a largura: “Descarregar convite” ficou no mesmo grupo das outras acções e o texto deixou de quebrar. | `event-guests-section.component.ts`; verificado no browser: número visível, download na mesma linha de “Alterar validade” e uma linha de texto. |
| Cartão de convidado em mobile | A versão linear mantém a linha com avatar, nome e menu “⋯”, mas esconde contacto, metadados, estado e acções secundárias. O nome fica alinhado ao centro vertical da bola; os detalhes aparecem no clique. | `person-card.component.ts`; verificado no browser: centro vertical do nome coincide com o da bola e o menu fica à direita. |
| Nome do convidado no PDF Gratitude | O renderer Gratitude passou a usar `invitation.guestName` e a mostrar `Convidado(a): <nome>` entre o subtítulo e o título, com fonte reduzida automaticamente para nomes longos. | `bloco14.pdf.test.ts` compara PDFs com/sem nome; `pdftotext` confirma “Convidado(a): Ana Maria da Conceição”. |
| Botão "Criar" do feed | O botão central da navegação inferior passou a abrir `/criar-evento` (tela de criar convite) via `createInvite()`; visitantes são encaminhados para `/criar-conta`. | Nova chave i18n `block12.feed.createInvite` (pt/en); `feed.page.ts` / `feed.page.html`. |
| Cartões de convidado | O WhatsApp saiu do botão principal e passou a ser a primeira opção do menu "…" (tanto em `/convidados` como no detalhe do evento). Em mobile o nome tem largura reservada, avatar fixo e o texto é truncado em vez de sobrepor as ações. | `guests.page.ts`, `event-guests-section.component.ts`, `person-card.component.ts`. |
| Gratitude — hierarquia inferior | Data/hora/local passaram a três colunas de igual largura; o QR foi movido para baixo, entre essa informação e o dress code. O local é limitado a 3 linhas para não deslocar o QR. O PDF usa o mesmo contrato (grupo QR próprio entre info e dress code). | `e2e/gratitude.spec.ts` (ordem info → QR → dress, QR centrado) e `e2e/gratitude-real.spec.ts` (sem sobreposições, folga para o fito inferior): **8 passed**. |
| "Descarregar bilhete" | Passou a "Descarregar convite" (pt/en), o toast fala em convite e o ficheiro descarregado chama-se `conto-contigo-convite-<nome>.pdf`. | `translations.ts`, `event-detail.page.ts`. |

Verificação desta rodada: front `build`/`lint`/`test` ✔, back `build`/`typecheck`/`lint`/`test` ✔ (444 passed, 89 skipped), Playwright Gratitude 8 passed e UI 4 passed. Nada foi commitado, pusheado ou publicado.
