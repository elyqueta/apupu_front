# Bloco 15 — Editor de templates por blocos

> Depende do Bloco 14 (manifesto de template, renderer, catálogo). Branch: `feat/bloco-15-editor-templates`. Backend e frontend. Lê primeiro `REGRAS-GERAIS.md`, `docs/DECISIONS.md` (Blocos 9 e 14) e o manifesto v1 do Bloco 14.

## Objetivo

O anfitrião personaliza o convite **por blocos** (título, data, local…), escolhendo estilo e ordem, com pré-visualização em direto, sobretudo no telemóvel. Pode guardar o resultado como **template próprio**, privado ou publicado para todos. O convite online, o PDF e os cartões de eventos realizados usam o **mesmo manifesto**.

## Regras de produto (decididas)

- Edição **por blocos** (sem arrastar livre). Edição livre tipo Canva fica para uma fase futura.
- O anfitrião pode editar o convite **até o evento terminar** (`ends_at`; sem `ends_at`, fim do dia de `starts_at` no fuso do evento).
- **Rascunhos automáticos**: tudo o que se edita é guardado sozinho (ver Passo 5).
- Templates próprios: ao guardar, o anfitrião escolhe **Privado (só eu)** ou **Publicado (para todos)**; pode mudar depois. Publicados aparecem no catálogo no separador "Da comunidade" com o nome do autor.
- Moderação: o super admin pode **despublicar** qualquer template; qualquer utilizador com conta pode **denunciar** um template publicado. Template despublicado volta a privado do autor; eventos que já o usam **não mudam** (têm snapshot).
- **Snapshot por evento**: ao escolher um template, o evento guarda uma cópia do manifesto (`events.template_snapshot`). Editar o convite do evento altera só o snapshot; editar o template original não altera eventos existentes. O convite online, o PDF e os cartões de eventos passados leem o snapshot.
- Elementos **obrigatórios** que nunca se apagam nem se escondem: **título**, **quem convidou** (anfitrião/organização), **data e hora**, **local** (ou "Evento online") e **prazo de resposta** (quando definido). Os restantes blocos podem ser ocultados.

## Passo 1 — Modelo de dados (backend)

Migração reversível:
- `templates`: acrescentar `owner_id uuid null` (null = template da plataforma), `visibility text not null default 'private'` (`private | public`), `status text not null default 'ready'` (`draft | ready`), `version int not null default 1`, `reported_count int not null default 0`, `unpublished_by uuid null`, `unpublished_at timestamptz null`.
- `events.template_snapshot jsonb null` (+ `template_id` mantém-se como origem).
- `template_assets (id, template_id null, owner_id, event_id null, url, public_id, width, height, bytes, kind background|image|ornament, created_at)` — todos os uploads com `public_id` (para o apagar no Cloudinary quando o asset é removido ou o template eliminado, como no Bloco 5, Parte G).
- `template_reports (id, template_id, reporter_id, reason text, created_at)`; um por utilizador e template.
- `template_versions (id, template_id, version, manifest jsonb, created_at)` — últimas 20 por template (histórico).

## Passo 2 — Manifesto: blocos (v1.1, compatível com o v1)

Acrescentar ao manifesto `blocks: Block[]`:
- `Block = { id, type, visible, required, style, content? }`.
- `type`: `cover`, `title`, `host`, `datetime`, `location`, `rsvp_deadline`, `message`, `video`, `organizers`, `custom_text`, `divider`, `image`.
- `style` (valores **discretos**, nunca CSS livre): `font` (um dos tokens do manifesto), `size` (`sm|md|lg|xl|2xl`), `weight` (`regular|medium|bold`), `align` (`left|center|right`), `color` (`ink|accent|muted|on_accent` — tokens da paleta), `transform` (`none|uppercase`), `spacing_after` (`none|sm|md|lg`).
- `content` só para `custom_text` (texto simples, máx. 280 caracteres, sem HTML), `image` (referência a `template_assets`, `alt` obrigatório) e `divider` (`line|ornament|dots`).
- `order` é a posição no array. `required: true` para título, anfitrião, data/hora, local e prazo.
- Schema Zod no back e tipos no front; validação estrita (rejeitar chaves desconhecidas, tamanho máx. do manifesto 64 KB, máx. 20 blocos).
- Migrar os 6 templates iniciais para a forma com `blocks`.

## Passo 3 — Renderer único

- `TemplateRendererComponent` (front) que recebe manifesto + dados do evento e desenha o convite. Usado por: palco do editor, convite público, catálogo, cartões de eventos realizados e pré-visualização no wizard.
- Renderer do PDF (back, `pdfkit`) lê o mesmo manifesto: percorre `blocks` por ordem, em fluxo, com quebra de linha e altura variável (sem sobreposição), mapeando fontes/paleta/ornamentos. Testes de texto extraído e render de um exemplo por template.
- Fontes: conjunto curado de **10 fontes** self-hosted (woff2, `font-display: swap`, subset latin + acentos pt), com fallback. Lista em `DECISIONS.md`; registar as mesmas no PDF.

## Passo 4 — UX do editor (mobile first)

Rota `/eventos/:eventId/convite/editar` e `/modelos/:templateId/editar` (modelo próprio). Cabeçalho com "Voltar", título, estado do rascunho ("Guardado há instantes"), botões **Desfazer / Refazer** e **Pré-visualizar**.

- **Mobile (< `lg`)**: pré-visualização do convite ocupa a parte superior (altura ~55 dvh, com scroll próprio), por baixo um **painel de controlos** com separadores: **Blocos | Estilo | Fundo | Abertura | PDF**. O painel nunca tapa a pré-visualização inteira e tem botão para expandir/recolher.
- **Desktop (≥ `lg`)**: três colunas (lista de blocos | palco central como uma "folha" | propriedades), colapsáveis (padrão do Bloco 9).
- **Blocos**: lista com ícone, nome e interruptor de visível (desativado nos obrigatórios, com `disabledHint`); **reordenar** com botões subir/descer (44 px, acessíveis por teclado) e alça de arrastar opcional; tocar num bloco abre o seu editor em **modal `dialog`** (Bloco 9): fonte, tamanho, peso, alinhamento, cor, maiúsculas, espaçamento; para `custom_text` o texto; para `image` o upload e o `alt`. Adicionar bloco (`custom_text`, `divider`, `image`) em modal.
- **Estilo**: escolher paleta (presets do template + "Personalizada" com 5 cores), fontes de display e de corpo, moldura/ornamentos disponíveis no template. **Verificador de contraste** (texto/fundo ≥ 4,5:1): aviso claro com sugestão automática; não bloquear.
- **Fundo**: cor sólida, gradiente de 2 cores ou imagem enviada (com sobreposição para legibilidade); regra do Bloco 5 mantém-se: **nunca texto por cima da capa** do evento.
- **Abertura**: escolher `open_style` (`none | envelope | curtain | fade | fold`) com pré-visualização da animação.
- **PDF**: pré-visualização do estilo do PDF (moldura, posição do QR) lida do mesmo manifesto.
- Estados obrigatórios: a carregar (`app-skeleton`), erro com "Tentar de novo", sucesso por toast; texto em pt-PT e `en`; tudo ≥ 12 px, alvos ≥ 44 px, `aria-label` em ícones, claro/escuro **na interface do editor** (o convite mantém sempre a paleta do template).

## Passo 5 — Rascunhos, histórico e conflitos

- **Guardar automático**: debounce 2 s após cada alteração e ao sair da página (`visibilitychange`/`pagehide`); estado visível ("A guardar…" / "Guardado" / "Falhou, a tentar de novo"). Em falha de rede, mantém em memória e repete com backoff.
- Evento: o rascunho grava `events.template_snapshot` (o evento já está em rascunho ou publicado; edições a um evento publicado aplicam-se **só depois de "Aplicar alterações"** para o convidado não ver estados intermédios).
- Modelo próprio: grava em `templates` com `status = 'draft'` até "Guardar template".
- **Histórico**: botão "Versões" (modal `sheet` de leitura) com as últimas 20; "Restaurar" cria nova versão.
- **Conflitos**: `updated_at`/`version` como `if_version`; se mudou noutro dispositivo, modal a perguntar "Manter a minha versão / Carregar a versão guardada".
- Desfazer/refazer em sessão (pilha de 50 comandos).

## Passo 6 — Templates próprios e catálogo

- "Guardar como meu template" (modal `dialog`): nome, descrição curta, categoria (aniversário, casamento, igreja, jovens, corporativo, outro), visibilidade (**Privado** / **Publicado para todos**, com aviso "Qualquer pessoa poderá usar este template. Não inclui os seus dados do evento.").
- Ao publicar, guardar **só** o manifesto (nunca título, nomes, datas, local ou contactos do evento; os blocos de dados ficam com marcadores dinâmicos). Assets enviados (imagens) incluem-se com `alt`.
- Catálogo `/modelos`: separadores **Plataforma | Da comunidade | Os meus**; pesquisa, filtro por categoria e ordenação (recentes, mais usados); pré-visualização pelo renderer; ações no menu de três pontinhos (usar, duplicar, editar, publicar/tornar privado, eliminar com confirmação, denunciar). Contador "usado em N eventos" (só contagem).
- Eliminar template próprio **não** afeta eventos existentes (snapshot) e apaga os seus assets órfãos.

## Passo 7 — Uploads de imagens (seguro)

- Aceitar `image/png`, `image/jpeg`, `image/webp`; **máx. 5 MB**; validar tipo pelo conteúdo (magic bytes), não só pela extensão; redimensionar no servidor para ≤ 2000 px no maior lado; remover metadados EXIF/GPS.
- Máx. **10 assets por template** e **50 por utilizador**; rate limit no endpoint; guardar `public_id`; apagar no Cloudinary ao remover (best-effort, como no Bloco 5) e incluir no script de limpeza de órfãs.
- Nenhum SVG enviado pelo utilizador (risco de script); ornamentos vêm só do template da plataforma.

## Passo 8 — Backend: rotas e moderação

- `GET/POST /host/templates`, `GET/PATCH/DELETE /host/templates/:id`, `POST /host/templates/:id/duplicate`, `POST /host/templates/:id/publish`, `POST /host/templates/:id/unpublish`, `POST /host/templates/:id/report`, `GET /host/templates/:id/versions`, `POST …/versions/:version/restore`.
- `PUT /host/events/:eventId/template-snapshot` (permissão de edição do evento; bloqueado após o fim do evento e em evento cancelado com `event_cancelled`), `POST /host/events/:eventId/template-snapshot/apply`.
- `POST /host/template-assets` (multipart), `DELETE /host/template-assets/:id`.
- Admin (`requireSuperAdmin`, auditoria): `GET /admin/templates?status=&reported=`, `POST /admin/templates/:id/unpublish` (com motivo). Nova aba "Modelos" no `/admin` com denúncias.
- Permissões: só o dono edita/elimina/publica o seu template; gestores de comunidade editam o convite dos eventos da comunidade; utilizadores só veem templates `public` de outros.
- Todos os erros no envelope padrão, pt-PT, sem detalhes técnicos.

## Critérios de aceitação

- [ ] Editar por blocos: ordem, visibilidade (exceto obrigatórios), estilo discreto, texto e imagens; pré-visualização em direto em 360 px sem ser tapada.
- [ ] Títulos, anfitrião, data/hora, local e prazo nunca se apagam nem ocultam.
- [ ] Rascunhos automáticos, desfazer/refazer, histórico de 20 versões e deteção de conflitos.
- [ ] Snapshot por evento: editar o template original não muda eventos existentes; convite online, PDF e cartões de eventos passados leem o snapshot.
- [ ] Template próprio guardado como privado ou publicado; publicado nunca contém dados do evento; super admin despublica; denúncias funcionam.
- [ ] Uploads validados (tipo, tamanho, EXIF removido), com `public_id` e limpeza de órfãos.
- [ ] Verificador de contraste presente; acessível por teclado (reordenar, modais).
- [ ] Testes: schema do manifesto (rejeita lixo), renderer, PDF (sem sobreposição com texto longo), permissões, uploads, e2e Playwright do fluxo "escolher template → editar → publicar convite" em 360×640.
- [ ] `build`, `lint`, `test`, `typecheck` verdes; migrações reversíveis; `docs/REPORT-BLOCO-15.md`.

## Fora de âmbito

Edição livre tipo Canva (arrastar/redimensionar/rodar), editor de animações, colaboração em tempo real, venda de templates, chat.
