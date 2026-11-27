# Plano — Bloco 15 (Templates, Feed, Convidados)

Branch: `feat/bloco-15-templates` (front e back), criada a partir de `feat/bloco-14-convite-pdf`.
Snapshot pré-bloco: back `f436009 chore: snapshot antes do bloco 15`; front sem alterações por commitar.

> **Atualização 27/11/2026:** este plano é o documento de intenção original e contém
> informação pré-implementação (nomeadamente a ordem do Passo 9 e o catálogo de fontes).
> A ordem de entrega efetiva segue `docs/BLOCO-15B-CATALOGO-TEMPLATES.md`, conforme
> decidido em `docs/DECISIONS.md`. O estado real e as evidências estão em
> `docs/REPORT-BLOCO-15.md`; as pendências em `docs/BLOCKERS.md`.

## Leitura base
- `docs/REGRAS-GERAIS.md`, `docs/AUDIT.md`, `docs/REPORT-BLOCO-14.md`
- `docs/BLOCO-15-EDITOR-DE-TEMPLATES.md` (spec principal)
- `docs/BLOCO-15B-CATALOGO-TEMPLATES.md` (catálogo T01–T19)

## Estado atual relevante (confirmado no código)
- Manifesto template v1: `apupu_front/src/app/core/models/template-manifest.ts`, `apupu_back/src/types/templateManifest.ts`. Campos: palette, fonts(display/body: sans|serif|cap|script), ornaments(frame/corners/divider), layout(align, blocks[]), cover, open_style, pdf(frame, qr_position, show_ornaments).
- PDF convite: `apupu_back/src/services/pdf/invitationDocument.ts` usa `pdfkit` + `svg-to-pdfkit` + `qrcode`; o catálogo local embute sete papéis/famílias (sans→Figtree, serif→Cormorant, cap→Cinzel, script→Pinyon, condensed→Oswald, anton→Anton, montserrat→Montserrat) via `resolveCatalogFont` — **gap Passo 1.2 resolvido**; ver `docs/REPORT-BLOCO-15.md`.
- QR PDF: `drawQrWithLogo` em `invitationDocument.ts` — cartão branco, logo símbolo ao centro, correção H. Falta estilo configurável/legenda/bloco posicionável no editor.
- Templates: `event_templates` com `manifest` jsonb (migração 0033). Front: `EventTemplate.manifest`, `TemplatePreviewComponent`, convite usa `manifestStyle`/`InvitationWelcomeComponent`.
- Evento status/ordenação: `HostEvent.status`/`InvitationStatus` calculado; listas em `events.page`, `invitations.page`, feed — precisa auditoria para ordenar ativos→passados→cancelados e estado "Terminado"/"Passado".
- Convidados: sem `guest_kind`; `GuestInput` tem name/email/phone. Migração necessária.
- Feed: `apupu_front/src/app/features/feed/feed.page.ts/html` — layout atual 3 colunas, sem reações/comentários.
- Equipas: `apupu_front/src/app/features/teams/teams.page.ts/html`, back `teams` sem photo_url/photo_public_id.
- Dashboard: saudação/chart no `dashboard.page`.

## Ordem de execução

### Passo 1 — Núcleo obrigatório (primeiro, 100% verde)
1. **1.4 Estado automático "Passado"**
   - Back: cálculo derivado na leitura (ends_at ou fim do dia de starts_at no fuso do evento) + job periódico 15 min para persistir `status=completed` quando aplicável; não depender só do job. Verificar enum/status existente (`completed`/`past`?) e adaptar com migração reversível se necessário.
   - Front/back: ordenação ativos/futuros asc, depois passados, depois cancelados em Eventos, Meus convites, feed/perfis.
   - UI: badge `Ativo`/`Terminado`/`Cancelado`; banner "Evento terminado"; modo leitura exceto galeria (ponto de extensão `allowGallery`, sem galeria completa). Reutilizar/estender `requireActiveEvent`.
   - Ficheiros prováveis: back `event.service/repository/types/schemas`, job/scheduler, front `events.page`, `invitations.page`, `feed`, `event-detail`, `status-badge`.
2. **1.2 Fontes persistentes no PDF**
   - Definir catálogo fechado local em `apupu_back/src/assets/fonts` (condensada grossa, serifa elegante, script caligráfico, sans moderna) + manifest de fontes. Embutir TTF no PDF via `doc.registerFont`; nunca CDN; erro claro se faltar fonte.
   - Estender manifesto/font roles para suportar catálogo (compatível com v1 existente; migrar/adaptar com cuidado). Guardar `fontFamily/fontWeight/fontStyle/fontSize/color/letterSpacing/align` nos blocos do template JSON (Passo 2 base) — mínimo para Gratitude.
   - Teste automatizado: gerar PDF com 3 fontes e verificar fontes embutidas (ler nomes de fontes no buffer PDF / `pdffonts` se disponível, senão parse de objetos Font).
   - Registar catálogo em `docs/DECISIONS.md`.
3. **1.3 QR no estilo pedido**
   - QR em cartão arredondado branco, borda fina dourada/cor template, ícone plataforma ao centro, correção H, legenda curta, cantos módulos ligeiramente arredondados. Campo destino QR: link evento/link convite/URL personalizada.
   - Back PDF: atualizar `drawQrWithLogo`/invitationDocument para estilo manifesto.
   - Front: bloco QR posicionável no editor (mínimo para Gratitude; editor completo no Passo 2).
4. **1.1 Template "Gratitude"**
   - Criar template `kind=system` `gratitude` com manifesto/preset. Assets SVG geométricos próprios (padrão africano, fitas, moldura cantos) em `apupu_front/src/assets/templates/gratitude/` e `apupu_back/src/assets/pdf/` conforme necessário.
   - Renderizar igual no convite digital e PDF (mesmo modelo de dados). Campos editáveis preenchidos por dados do evento com sobreposição manual (mínimo viável; editor completo Passo 2).
   - Teste visual manual documentado; comparação convite/PDF.

### Passo 2 — Editor tipo Canva + TemplateRenderer único
- `TemplateRenderer` único usado em editor, convite público e PDF (back gera a partir do mesmo JSON). Blocos: texto, título, data/hora, local, contagem, timeline, dress code, presentes, imagem/galeria, música/vídeo, QR, botões, mensagem, separador/ornamento.
- Editor: template preenchido com dados fictícios realistas; galeria feed estilo Canva com categorias/chips/pesquisa/"Meus templates"; painel propriedades (bottom sheet mobile); rascunho automático.
- JSON de documento de template com estilos por bloco. Migração reversível para armazenar documento/layout.

### Passo 3 — Género/tipo de convidado
- Migração: `guest_kind` enum (`male`,`female`,`couple`,`family`, nullable) em convidados/invitations; campos cônjuge/nome secundário e contagem lugares conforme necessidade.
- `app-guest-dialog`: seleção tipo; casal abre segundo campo nome cônjuge ou "Casal + apelido"; família nome + nº pessoas opcional.
- `guestAddress(kind, name, locale)` em `block15-keys.ts`/util único; aplicar em convite público, emails, notificações, PDF, WhatsApp, lista.
- Casal conta 2 por defeito; família editável. Existentes `null` => neutro.

### Passo 4 — Saudação por hora
- Util `greetingByHour(date, locale, timezone?)` com `Intl`, default `Africa/Luanda`. Dashboard e feed header; visível mobile, ≥14px, truncar nome.

### Passo 5 — Equipas em filas tipo WhatsApp
- Back: `teams.photo_url`, `photo_public_id` migração; upload/remove Cloudinary reutilizando fluxo avatar.
- Front `/equipas`: lista de filas clicáveis (avatar, nome, atividade/tarefas abertas, membros, badge papel). Modal detalhe (foto grande, descrição, membros, tarefas, "Abrir equipa"); botão "Conversar" desativado com `disabledHint`; reserva "última mensagem" oculta.

### Passo 6 — Feed social
- Cartão evento = capa total (4:5 mobile, 16:10 desktop), header/rodapé vidro; sem capa usa miniatura `TemplateRenderer`. Secção "Modelos" carrossel.
- Reações/comentários: migrações `event_reactions`, `event_comments`; 1 reação por user/evento; comentário texto simples ≤500, sanitizado, 1 nível resposta, apagar próprio/responsável; rate limit; visibilidade respeitada.
- Layout desktop 300/fluido/340 sticky; mobile stories, chips scroll com fade, padding inferior para barra flutuante.
- Links regresso ao feed no painel anfitrião; `app-info-block` (ícone+título+mensagem+ação) aplicado no feed/estados vazios/avisos.

### Passo 7 — Gráfico semanal largura total
- Dashboard chart `w-full`, SVG `viewBox`+`preserveAspectRatio`, min-height 220px, tooltip/foco teclado mantidos.

### Passo 8 — Perfil
- Fora de âmbito; só observações em BLOCKERS/REPORT.

### Passo 9 — Catálogo T01–T19 ✔ (27/11/2026)
- Ordem efetiva de entrega, conforme `BLOCO-15B-CATALOGO-TEMPLATES.md`: primeiro T01, T03, T05, T08, T11, T13, T17; depois T02, T04, T06, T07, T09, T10, T12, T14, T15, T16, T18, T19. Os 19 estão implementados como `kind = 'system'` (a ordem deste plano estava divergente e ficou corrigida em `DECISIONS.md`).
- Padrões de blocos reutilizáveis (torn-edge, fade-photo, envelope-header, monogram, countdown, music-player, timeline-vertical, calendar-month, button-pill, rsvp-panel, dress-code, gift-qr) implementados como fábricas comuns em `system-templates.ts`. Sem marcas/fotos reais; SVG próprio; fontes só do catálogo local.
- Evidências e aproximações do PDF em `REPORT-BLOCO-15.md` e `BLOCKERS.md`.

## Ficheiros/chaves previstos (a confirmar no código)
- Back: `migrations/*_block15_*.js`, `src/types/templateManifest.ts`, `src/types/event.types.ts`, `src/services/pdf/*`, `src/services/event.service.ts`, `src/repositories/event.repository.ts`, `src/services/invitation*`, `src/routes/v1/*`, `src/jobs/*`.
- Front: `src/app/core/models/template-manifest.ts`, `models.ts`, `core/i18n/block15-keys.ts`, `shared/components/template-renderer/*`, `shared/components/app-info-block/*`, `features/invitation/*`, `features/event-setup/*`, `features/events/*`, `features/feed/*`, `features/teams/*`, `features/dashboard/*`, `features/guests/*`, `core/utils/guest-address.ts`.
- Docs: `docs/DECISIONS.md`, `docs/BLOCKERS.md`, `docs/REPORT-BLOCO-15.md`, `docs/REPORT-FINAL.md`.

## Verificação por passo
- Front: `npm run build`, `npm run lint` (0 erros), `npm test -- --watch=false`, `npx tsc --noEmit`.
- Back: `npm run build`, `npm run typecheck`, `npm run lint`, `npm run test`; migrações up/down em BD de teste.
- Passo 1.2: teste automatizado de PDF com 3 fontes embutidas.

## Riscos / decisões a registar
- Manifesto v1 atual é limitado; expandir para blocos/editor pode exigir v2 compatível com v1.
- ~~Fontes PDF: hoje serif/cap/script usam Times padrão (não embutidas).~~ Resolvido: catálogo local fechado, todas embutidas; ver `pdfTheme.ts`.
- "Evento terminado" vs status `completed` existente - confirmar semântica no back/front antes de migrar.
- Catálogo 15B é grande; implementar por ordem de entrega e registar faltantes em BLOCKERS.
- Sem dependências novas; SVG/ornamentos próprios.