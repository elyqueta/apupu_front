# Plano — Bloco 5: Ajustes pós fase 4 (Conto Contigo)

**Data:** 2026-11-20  
**Branches:** `feat/ajustes-fase-4` em `apupu_front` e `apupu_back` (criadas a partir de `feat/bloco-4-convite-publico`).  
**Estado:** plano aprovado para execução — nenhum código foi alterado até aqui.  
**Documento de referência para o backend:** `apupu_back/docs/PLANO-BLOCO-5.md` (cópia integral das secções de backend).

## 0. Pontos de partida confirmados no código

| Área | Estado real encontrado | Consequência no bloco |
|---|---|---|
| Stack | Front: Angular 22 standalone + Tailwind v4 (CSS-first), Vitest. Back: **Express 4 + TypeScript + `pg` + `node-pg-migrate` + Zod** (não é NestJS/Prisma). | Seguir os padrões reais; não introduzir NestJS, Prisma, Angular Material nem novas dependências. |
| Convite público | `GET /public/invitations/:token`; capa em `invitation-hero.component.ts` com gradiente **e texto por cima** (`hostedBy` + título). Sem capa usa `app-template-artwork`. | Partes A: nova tela de boas-vindas e remoção de todo o texto/gradiente sobre a capa. |
| Modais | `app-modal` já tem bottom sheet, `overflow-y-auto`, `92dvh`, foco e Escape. **Mas** vários diálogos (ex.: `guest-dialog`, `profile-edit-dialog`) põem "Guardar" dentro do corpo; o footer só existe quando se usa `[modal-footer]`. | Parte B: generalizar `[modal-footer]`, ajustar altura com teclado/safe-area e testar 360×640. |
| Ações dos cards | `app-action-menu` já existe: popover no desktop e **bottom sheet no mobile**. | Parte C: transformar no componente único de ações, ancorado ao card também em mobile. |
| Navegação | Shell com sidebar à esquerda. Separadores do evento são uma barra horizontal no topo de `event-detail.page.html` / `management-event.page.html`; ações ("Editar", "Publicar", "Copiar") vivem no header. | Parte C: rail direito do evento + ações na lateral; header só com voltar/título. |
| Partilha | `ShareService` já tem `copy()`, `whatsappUrl()`, `absoluteUrl()`. | Parte D: reutilizar; só falta expor nova mensagem pronta (link + código). |
| Código do gestor | Backend já tem `POST /host/events/:eventId/managers/:managerId/access-code` e `/revoke` (só conta de anfitrião). Falta o gestor poder trocar o próprio código numa sessão sem conta. | Parte D: nova rota autenticada por `managerSessionAuth`. |
| Cancelamento | `events.status` já tem `cancelled`; `PATCH /host/events/:eventId` muda o estado e enfileira e-mail. **Não** há motivo, OTP, bloqueio global nem estado público dedicado. | Parte H (+E): endpoint de cancelamento, guard de API, estado público "Evento cancelado". |
| Mensagens | `invitations.guest_message` (até 500 chars) aparece truncada em `guests.page.ts` e `event-guests-section.component.ts`. Não há inbox, leitura nem resposta. | Parte F: nova caixa de entrada + colunas de estado; remover mensagem dos cards. |
| Super admin | Não existe papel, coluna nem rota. | Parte E: migração + guard + painel. Promoção **só por SQL**, sem UI. |
| Cloudinary | `destroyImage()` já é best-effort. Capa do evento (`cover_public_id`) e capa do perfil (`cover_public_id`) já apagam a anterior. **Avatar não guarda `public_id`**; templates usam só URL externa. Limpeza periódica inexistente. | Parte G: colunas de avatar + `DELETE /host/profile/avatar` + script de órfãs. |
| Segurança dos links | `generateToken()` = 32 bytes aleatórios (256 bits), hash HMAC no link, validade por `link_expires_at` com default `ends_at + 1 dia`. | Manter; acrescentar só configuração explícita da validade na UI/API. |
| Erros | `{ error: { code, message, fields?, details?, request_id } }`, mensagens pt-PT. | Todas as novas mensagens seguem o envelope; erro de evento cancelado terá código `event_cancelled`. |

### Decisões globais deste plano

1. **Idioma:** textos visíveis em **pt-PT**. O projeto já tem `pt-AO` + `en` em `translations.ts`; mantemos a mesma infraestrutura de chaves e escrevemos a variante principal em português de Portugal (ex.: "Guardar", "Copiar link", "Evento cancelado"). Não há texto novo hardcoded em templates.
2. **Tokens:** usar apenas `bg-surface`, `border-line`, `text-ink`, `text-muted`, `text-brand`, `shadow-card`, `rounded-2xl/4xl`. Nenhuma cor/espaçamento novo. Alvo de toque ≥ 44 px, texto ≥ 12 px, claro/escuro e ≥ 320 px.
3. **Migrações:** uma migração reversível (`up`/`down`) por preocupação, com `IF EXISTS` e backfills não destrutivos. Nenhuma migração apaga dados de produção.
4. **Nenhuma dependência nova.** Limpeza de órfãs usa `fetch` + assinatura já implementada em `cloudinary.service.ts`.
5. **Falhas de eliminação no Cloudinary nunca bloqueiam** a operação principal: `destroyImage()` continua best-effort e regista em log; o script de limpeza é a rede de segurança.
6. **Commits pequenos**, um por passo numerado, em inglês (`feat(...)`, `fix(...)`, `refactor(...)`, `docs(...)`). Sem push/merge/rebase.

---

## Parte A — Convite público: capa sem texto e tela de boas-vindas

**Objetivo:** com capa → boas-vindas → "Ver convite" → convite completo sem letras sobre a imagem; sem capa → abre direto no estilo do template. Vale também para pré-visualizações dentro da app.

### Front (`apupu_front`)

| Ficheiro | Alteração |
|---|---|
| `src/app/features/invitation/parts/invitation-welcome.component.ts` (**novo**) | Tela de boas-vindas: capa em destaque **sem texto por cima**, mensagem curta "Olá, [nome]! Tens um convite especial." por baixo, um único botão "Ver convite" (h-12, largura confortável em mobile), `output()` `continue`. Sem lightbox, sem gradientes, sem badges sobre a imagem. |
| `src/app/features/invitation/parts/invitation-hero.component.ts` | Remover o `<span>` de gradiente e o bloco `hostedBy`/título sobreposto à imagem. A imagem continua clicável para ampliar (acesso via `aria-label`), agora **sem conteúdo visual por cima**. Título/anfitrião passam a viver no bloco inferior existente (já há "youAreInvited", "guestGreeting" e tipo; acrescentar linha "Anfitrião: …" abaixo da imagem quando houver capa). |
| `src/app/features/invitation/invitation.page.ts` | Novo sinal `showWelcome = signal(false)`. No carregamento: `showWelcome.set(Boolean(view.event.coverUrl) && !eventBlocked())`. `continueToInvitation()` esconde a boas-vindas. Evento cancelado **nunca** mostra boas-vindas (Parte H). |
| `src/app/features/invitation/invitation.page.html` | `@if (showWelcome() && !eventBlocked())` renderiza `app-invitation-welcome`; `@else` mantém o convite atual. Estrutura extraída para `<main>` pequeno para não duplicar `header`/`footer`. |
| `src/app/features/invitation/invitation.page.spec.ts`, `invitation-welcome.component.spec.ts` (**novo**) | Testes: sem capa abre convite; com capa mostra boas-vindas; clique em "Ver convite" mostra convite; nenhum texto do anfitrião/título dentro do elemento da capa; cancelado não mostra boas-vindas. |
| `src/app/core/i18n/translations.ts` | Chaves `invitation.welcomeTitle`, `invitation.welcomeMessage`, `invitation.welcomeAction`, `invitation.hostInline` (pt-PT + en). |

**Pré-visualizações:** auditar `template-artwork.component.ts`, `event-summary.component.ts` (pré-visualização da capa), `create-event.page.html`, `settings` e `management-event.page.html`. Onde houver texto sobreposto a uma imagem de capa, mover para fora da imagem com o mesmo padrão do `invitation-hero`. Nenhuma pré-visualização nova com texto sobre capa.

### Backend

Sem alteração de contrato: `PublicEventDto` já expõe `cover_url`, `template_id` é opcional no cliente. Se a pré-visualização precisar do template, acrescentar `template_id` a `PublicEventDto` **apenas se** o código o pedir (evitar expor dados novos sem necessidade).

### Aceitação

- [ ] Link com capa → boas-vindas → um clique → convite, capa sem letras.
- [ ] Link sem capa → convite direto com arte do template.
- [ ] Nenhuma imagem de capa na app com texto por cima.

---

## Parte B — Modais, bottom sheets e padrão de chips/botões

### Front

| Ficheiro | Alteração |
|---|---|
| `src/app/shared/components/modal.component.ts` | Panel: `max-h-[calc(100dvh-1rem)] sm:max-h-[min(92dvh,52rem)]`, `min-h-0`, `overscroll-contain`. Corpo: `min-h-0 flex-1 overflow-y-auto` com `scroll-padding-bottom` e `padding-bottom` extra quando teclado virtual reduz a viewport. Footer: `shrink-0 sticky bottom-0`, `bg-surface-solid/95`, safe-area `max(1rem, env(safe-area-inset-bottom))`, sempre visível. Cabeçalho `shrink-0`. `@HostListener('window:resize')`/`visualViewport` opcional para recalcular altura sem nova dependência. |
| `src/app/shared/components/guest-dialog.component.ts`, `src/app/features/profile/profile-edit-dialog.component.ts`, `src/app/features/invitation/parts/invitation-rsvp-dialog.component.ts`, `src/app/features/team/manager-credentials-dialog.component.ts` e demais com botões no corpo | Mover **todos** os pares Guardar/Cancelar para `[modal-footer]`. O formulário mantém `id` e o botão fora do corpo continua com `type="submit"` + `form="<id>"` quando necessário. Nenhum botão de guardar dentro do área com scroll. |
| `src/styles.css` | Definir utilitários partilhados via `@utility` do Tailwind v4 (sem ficheiros CSS novos): `ui-btn`, `ui-btn-secondary`, `ui-btn-danger`, `ui-chip`, `ui-chip-interactive`, `ui-icon-button`, todos com altura mínima 44 px, `gap-2`, `rounded-xl`/`rounded-full`, `text-sm font-semibold`, estados hover/focus/disabled consistentes. |
| Todos os componentes com chips/botões (lista não exaustiva): `features/team/team.page.html`, `features/guests/guests.page.ts`, `features/events/event-detail.page.html`, `features/host-management/management-event.page.html`, `features/dashboard/dashboard.page.html`, `features/templates/templates.page.html`, `shared/components/*.ts` | Substituir classes inline repetidas pelas utilidades acima. Chips pequenos de estado (texto 12 px) mantêm-se informativos; chips **interativos** (ex.: adicionar e-mail, filtros) passam a `ui-chip-interactive` com 44 px. |
| `src/app/shared/components/modal.component.spec.ts` (**atualizar**) + `src/app/shared/components/ui-controls.spec.ts` (**novo**) | Testes: footer presente quando há slot; altura do panel ≤ 100dvh; scroll no corpo; botão de guardar acessível sem scroll extra; chips interativos ≥ 44 px. |

**Verificação manual obrigatória e documentada:** 360×640 e 1440×900, claro/escuro, teclado virtual aberto no campo de mensagem, arrastar até ao fim e guardar sem voltar.

### Backend

Sem alteração.

---

## Parte C — Layout com menu lateral duplo e componente de ações único

### Front

| Ficheiro | Alteração |
|---|---|
| `src/app/shared/components/event-section-shell.component.ts` + `.html` (**novos**) | Layout de duas colunas dentro do shell: conteúdo ao centro, **rail direito** com (1) navegação das secções do evento e (2) lista de ações da secção. Em mobile o rail vira drawer ("Menu do evento") aberto por botão no header; `aria-expanded`, Escape, foco e backdrop reutilizam padrões do shell. |
| `src/app/features/events/event-detail.page.html`, `src/app/features/host-management/management-event.page.html` | Header fica só com **botão Voltar**, contexto e título. Remover da barra superior "Editar/Publicar/Copiar" e a barra horizontal de separadores; passam todos para o rail direito. Separadores continuam em `?separador=` (preservar `sem_conta`/`email`). Nova secção `mensagens` (Parte F) entra no mesmo rail. |
| `src/app/shared/components/action-menu.component.ts` | Passa a ser **o único componente de ações**. Novo input `anchor: 'trigger' \| 'card'`; em mobile, quando `anchor === 'card'`, abre modal estilizado **ancorado/centrado junto ao card** (posição calculada a partir do `getBoundingClientRect()` do trigger, com `position: fixed` e clamp à viewport) em vez do bottomSheet do rodapé. `anchor === 'trigger'` mantém bottom sheet para ações gerais. Editar continua a abrir o modal de edição em bottom sheet. |
| `src/app/shared/components/person-card.component.ts`, listas e cards com "⋯" | Passam a usar o componente único com `anchor="card"`; nenhum menu de ações paralelo. |
| Testes | `event-section-shell.component.spec.ts`, `action-menu.component.spec.ts` (ancoragem, teclado, `Editar` abre bottom sheet). |

**Menu da aplicação:** permanece o sidebar esquerdo atual do `shell.component.html`. Nenhuma ação de secção no header — resolve o problema relatado na tela de utilizadores.

### Backend

Sem alteração.

---

## Parte D — Partilha e acesso do gestor

### Front

| Ficheiro | Alteração |
|---|---|
| `src/app/features/invitation/parts/invitation-details-menu.component.ts` ou novo bloco de partilha em `invitation.page.html` | Botões "Copiar link do convite" e "Partilhar no WhatsApp" usando `ShareService.absoluteUrl('/convite/' + token)` e `whatsappUrl(null, texto)`. Feedback por toast; erro de cópia genérico em pt-PT. |
| `src/app/features/team/manager-credentials-dialog.component.ts` | Botões "Copiar link + código" (mensagem pronta com nome do evento, link, código e validade) e "Partilhar no WhatsApp". Aviso discreto de que é alternativa menos segura ao e-mail. |
| `src/app/features/host-management/management-event.page.html` / `features/events/detail/event-managers-section.component.ts` | Ações existentes "Gerar novo código" e "Revogar acesso" mantidas; acrescentar "Alterar validade do link" onde já existir endpoint. |
| `src/app/features/host-management/management-event.page.ts` (painel do gestor) | Nova **aba "Acesso"** com: código atual, validade, alterar código (rota própria do gestor), copiar mensagem pronta, WhatsApp, e aviso de que o anfitrião pode revogar a sessão a qualquer momento. |
| `src/app/core/data/*repository.ts` | Novos métodos para troca de código pelo gestor e para configuração da validade do convite. |

### Backend

| Ficheiro | Alteração |
|---|---|
| `src/routes/v1/*`, `src/controllers/manageAccess.controller.ts`, `src/services/manageAccess.service.ts` | `POST /public/manage/access-code` (sessão de gestão via `managerSessionAuth`, CSRF, rate limit): gera novo código com `generateAccessCode()`, atualiza hash, revoga sessões antigas se necessário e devolve o código em claro **uma vez**. Erros uniformes (`access_denied`), sem revelar se o código anterior estava certo. |
| `src/services/eventManager.service.ts`, rotas existentes | Garantir que troca de código e revogação funcionam **mesmo sem conta** (o anfitrião pode revogar; o gestor pode trocar o código da sua sessão). Revogação invalida `event_host_sessions`. |
| `src/schemas/manageAccess.schemas.ts`, `src/schemas/invitation.schemas.ts` | Schemas para `{ code }`, `{ expires_at }` e para validade configurável do convite. |
| `src/services/invitation.service.ts`, rotas de host | `PATCH /host/invitations/:invitationId/link` com `expires_at` (data futura, ≤ fim do evento + 30 dias), devolvendo link e validade. Manter default atual e randomicidade de 256 bits. |

### Aceitação

- [ ] Copiar e WhatsApp para link do convite e para link + código do gestor.
- [ ] Gestor sem conta troca o próprio código; anfitrião continua a poder revogar.
- [ ] Erros genéricos mantidos; link com 256 bits e validade configurável.

---

## Parte E — Landing page e super admin

### Front

| Ficheiro | Alteração |
|---|---|
| `src/app/features/landing/landing.page.ts` + `.html` (**novos**) | Primeira tela: header com marca, "Protótipo" badge, hero de apresentação, selo "Produto NS2 Innovation", passos "Criar evento → Convidar → Gerir respostas", secção "Sobre", CTAs "Entrar" (`/entrar`) e "Criar conta" (`/criar-conta`), rodapé. Mobile-first, tokens existentes, sem imagens novas (reutilizar `public/auth-login.webp` / logos). |
| `src/app/app.routes.ts` | `''` → `LandingPage` (pública). `/painel` continua o dashboard autenticado. Nova rota `/administracao` (guard `superAdminGuard`). |
| `src/app/core/api/auth.guard.ts` (ou novo `super-admin.guard.ts`) | Guarda que lê `isSuperAdmin` da sessão; quem não for super admin é redirecionado para `/painel`. |
| `src/app/features/admin/admin.page.ts` + `.html` (**novos**) | Abas: Eventos (todos), Utilizadores (todos), Auditoria. Modal de cancelamento com **motivo obrigatório** + **OTP por e-mail** (6 dígitos, reenviar, erro formatado). Ações desativadas com aviso se o evento já estiver cancelado. |
| `src/app/core/data/admin.repository.ts`, `admin.models.ts` (**novos**) | Chamadas às rotas `/admin/*`. |
| `src/app/core/i18n/translations.ts` | Chaves de landing, admin, cancelamento e auditoria (pt-PT + en). |

### Backend

| Ficheiro | Alteração |
|---|---|
| `migrations/1739900000020_super-admin-and-cancellation.js` (**nova**) | `hosts.is_super_admin boolean not null default false`; `events.cancelled_at timestamptz`, `cancelled_reason text`, `cancelled_by uuid null references hosts(id)`; `admin_audit_log (id uuid pk, admin_id uuid not null references hosts(id), action text not null, target_type text, target_id uuid, reason text, metadata jsonb not null default '{}', created_at timestamptz not null default now())`. `down` remove colunas/tabela. |
| `src/middlewares/requireSuperAdmin.ts` (**novo**) | Depois de `hostAccountAuth`: verifica `is_super_admin`, senão 403 `admin_forbidden` com mensagem pt-PT. |
| `src/routes/v1/admin.routes.ts`, `src/controllers/admin.controller.ts`, `src/services/admin.service.ts` (**novos**) | `GET /admin/events`, `GET /admin/users`, `GET /admin/audit`, `POST /admin/events/:eventId/cancel` (`{ reason, otp }`). Cancelamento valida OTP do e-mail do admin, grava motivo/quem cancelou, escreve auditoria e enfileira notificação `evento_cancelado` ao anfitrião com o motivo. |
| `src/services/auth.service.ts` / `registrationVerification.repository.ts` | Emissão/verificação de OTP com purpose `event_cancel`, reutilizando TTL/tentativas/cooldown existentes. Nunca devolver o código na API. |
| `src/emails/catalog.ts` | Ajustar copy de `evento_cancelado` para incluir "O responsável da plataforma cancelou o evento. Motivo: …"; manter variante para cancelamento pelo anfitrião. |
| `src/services/audit.service.ts` | Registar todas as ações admin (incluindo listagens, com `action`/`target`). |

**Promoção:** apenas por SQL direto na Neon; documentar em `apupu_back/docs/PLANO-BLOCO-5.md` o `UPDATE hosts SET is_super_admin = true WHERE email = …`, sem valores reais.

---

## Parte F — Caixa de entrada de mensagens

### Backend

| Ficheiro | Alteração |
|---|---|
| `migrations/1739900000021_message-inbox.js` (**nova**) | Em `invitations`: `guest_message_at timestamptz`, `message_read_at timestamptz`, `message_answered_at timestamptz`, `message_answer text`. Backfill: `guest_message_at = rsvp_responded_at` onde `guest_message` não é nulo. `down` remove as colunas. |
| `src/types/invitation.types.ts`, `src/dto/invitation.dto.ts`, `src/repositories/invitation.repository.ts` | Mapear novos campos no DTO de gestão; manter `guest.message` no DTO público (o convidado vê a sua própria mensagem). |
| `src/routes/v1/host.routes.ts`, `src/schemas/invitation.schemas.ts`, `src/services/hostGuest.service.ts` | `GET /host/events/:eventId/messages?q=&read=&answered=&from=&to=&page=&page_size=`; `PATCH /host/messages/:invitationId/read` (`{ read: boolean }`); `PATCH /host/messages/:invitationId/answer` (`{ answer: string }`, máx. 1000). Ordenação por `guest_message_at desc`. |
| `src/services/invitation.service.ts` | Ao gravar/alterar mensagem no RSVP, atualizar `guest_message_at` e limpar `message_read_at`/`message_answered_at` (nova mensagem = por ler). |

### Front

| Ficheiro | Alteração |
|---|---|
| `src/app/features/guests/guests.page.ts`, `src/app/features/events/detail/event-guests-section.component.ts` | **Remover** o item "Mensagem: …" dos cards de convidado e a chave `guests.guestMessage` da apresentação. A mensagem passa a viver só na caixa de entrada. |
| `src/app/features/messages/messages-inbox.component.ts` + `.html` (**novos**) | Lista com filtros por convidado, estado de leitura, intervalo de datas e resposta (sim/não); leitura confortável com nome, e-mail, data e mensagem completos; ações "Marcar como lido/não lido" e "Responder"; estados carregar/vazio/erro/sucesso. |
| `src/app/features/messages/messages.page.ts` (**novo**) + rota `/mensagens` | Página global com seletor de evento, reutilizando o componente. |
| `src/app/features/events/event-detail.page.html` + rail direito | Nova secção `?separador=mensagens` e link próprio "Caixa de entrada" no menu do evento. |
| `src/app/core/layout/shell.component.ts` | Item de navegação "Caixa de entrada" → `/mensagens`. |
| `src/app/core/data/messages.repository.ts` (**novo**), i18n,.specs | Serviço/repositório, textos e testes de filtros. |

---

## Parte G — Imagens órfãs no Cloudinary

### Inventário atual

| Local | `public_id` guardado | Apaga anterior | Correção |
|---|---|---|---|
| Capa do evento (`events.cover_public_id`) | ✔ | ✔ upload → upload, upload → URL, remoção | Nenhuma (já coberto). |
| Capa do perfil (`host_profiles.cover_public_id`) | ✔ | ✔ nos três casos | Nenhuma (já coberto). |
| Avatar (`hosts.avatar_url`) | ✘ | ✘ | **Corrigir neste bloco.** |
| Imagens de templates (`preview_image_url`) | N/A — URL externa, sem upload pela plataforma | N/A | Documentar que não há asset no Cloudinary. |
| Outros uploads (capa de equipa, convite) | Não encontrados no código | N/A | Confirmar no plano final; se aparecerem, aplicar o mesmo padrão. |

### Backend

| Ficheiro | Alteração |
|---|---|
| `migrations/1739900000022_avatar-public-id.js` (**nova**) | `hosts.avatar_public_id text`, `hosts.avatar_hash text`. Backfill não destrutivo: extrair `public_id` de URLs `res.cloudinary.com/.../<pasta>/<id>.<ext>` quando a URL pertencer ao cloud configurado; deixar `null` nos restantes. `down` remove colunas. |
| `src/types/host.types.ts`, `src/repositories/host.repository.ts`, `src/schemas/host.schemas.ts` | Incluir `avatarPublicId`/`avatarHash` no mapa e nos dados de atualização. |
| `src/services/avatar.service.ts`, `src/services/profile.service.ts` | `setAvatarFromUrl()` e `uploadAvatar()` passam a gravar `public_id`/hash e a chamar `destroyImage(anterior)`; novo `removeAvatar()`; `update()` com `avatar_url` também apaga o asset antigo quando a URL muda. Idempotência por conteúdo e por URL. |
| `src/routes/v1/host.routes.ts` | `DELETE /host/profile/avatar`. |
| `src/scripts/cleanupCloudinary.ts` (**novo**) + script `cloudinary:cleanup` em `package.json` | Lista assets das pastas configuradas via Admin API, compara com `public_id` presentes nas tabelas, apaga órfãs em modo `--dry-run` por omissão; logs estruturados; `--apply` confirma. Nunca apaga nada que esteja referenciado. Documentar agendamento periódico (cron do Render/worker) sem código de agendamento novo. |

### Front

`src/app/core/data/profile.repository.ts` + `profile-edit-dialog.component.ts`: enviar remoção de avatar (`delete`) e mostrar erro genérico se falhar. Nenhum outro front mexe com `public_id`.

---

## Parte H — Evento cancelado bloqueia tudo

### Backend

| Ficheiro | Alteração |
|---|---|
| `src/middlewares/requireActiveEvent.ts` (**novo**) | Para pedidos de escrita com `eventId` (params ou body) ou recursos ligados ao evento (tarefas, convites, mensagens, equipas, gestores), consulta `events.status`; se `cancelled`, responde **409** `{ error: { code: 'event_cancelled', message: 'Este evento foi cancelado. Já não é possível fazer alterações.', request_id } }`. Ignora GET, rotas públicas de leitura e o próprio endpoint de cancelamento. |
| `src/app.ts` / `src/routes/v1/index.ts` | Montar o guard antes das rotas protegidas. |
| `src/routes/v1/host.routes.ts` | `POST /host/events/:eventId/cancel` com `{ reason?, otp }` (anfitrião). Reutiliza OTP por e-mail; escreve `cancelled_at`/`cancelled_by`, auditoria (quando aplicável) e notificação. |
| `src/services/invitation.service.ts`, `public.controller.ts` | Convite público de evento cancelado devolve `event.status = 'cancelled'` sem dados de RSVP; o front mostra o estado. Continuar a rejeitar RSVP no backend. |
| Testes | Guard bloqueia criar tarefa/gestor/convite e enviar convite; cancelamento com OTP inválido não altera estado; mensagem de erro idêntica em todas as rotas. |

### Front

| Ficheiro | Alteração |
|---|---|
| `src/app/features/invitation/invitation.page.html` + novo `parts/invitation-cancelled.component.ts` | Se `view.event.status === 'cancelled'`, renderiza **só** o estado "Evento cancelado" (com texto simpático e contacto do anfitrião quando disponível), sem boas-vindas, sem capa destacada, sem RSVP. |
| `src/app/features/events/event-detail.page.ts/.html`, `management-event.page.ts/.html`, secções em `detail/` | `eventCancelled()` computed; banner persistente; todas as ações de escrita desativadas (`[disabled]`, `aria-disabled`, tooltip com o mesmo texto do erro), incluindo adicionar tarefa/gestor/membro, editar, enviar convites, respostas da caixa de entrada. Itens do `app-action-menu` usam `disabled` + `disabledHint`. |
| `src/app/core/i18n/translations.ts` | `event.cancelledBanner`, `event.cancelledActionHint`, `invitation.cancelledTitle`, `invitation.cancelledText` (pt-PT + en). |

---

## Ordem de execução e commits previstos

1. `docs: plano do bloco 5 e inventário Cloudinary` (este ficheiro + cópia no back).
2. Parte G — migrações e serviços de imagem (base de dados primeiro; sem dependência das outras).
3. Parte H backend — guard, cancelamento do anfitrião, estado público.
4. Parte E backend — super admin, OTP, auditoria, e-mail.
5. Parte F backend — colunas de mensagens, filtros, leitura/resposta.
6. Parte D backend — código do gestor, validade do link, partilha.
7. Parte A front — boas-vindas + capa sem texto + pré-visualizações.
8. Parte B front — modal/footer + chips/botões.
9. Parte C front — rail direito + action menu único.
10. Parte D front — partilha, aba de acesso do gestor.
11. Parte E front — landing + painel admin.
12. Parte F front — caixa de entrada e remoção dos cards.
13. Parte H front — estado cancelado e bloqueios.
14. Testes, documentação final (`REPORT-BLOCO-5.md`, `DECISIONS.md`, `BLOCKERS.md`, contrato/API) e verificação "verde".

## Verificação obrigatória no fim

**Front** (`apupu_front`): `npm run build`, `npm test -- --watch=false`, `npm run lint` (0 erros; avisos legais registados), `npx tsc --noEmit`.  
**Back** (`apupu_back`): `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run migrate:up` (em BD de teste) e `npm run migrate:down` (reversibilidade).  
**Manual:** convite com/sem capa, modais em 360×640 e desktop com teclado, menu duplo, partilha, troca/revogação de código, landing, admin (motivo + OTP + auditoria), filtros da caixa de entrada, evento cancelado em todas as superfícies.

## Riscos e decisões a registar durante a execução

- **OTP para cancelamento do anfitrião:** o bloco exige OTP mas não diz se o motivo é obrigatório também para o anfitrião. Decisão inicial: OTP obrigatório, motivo opcional no anfitrião e obrigatório no super admin. Registar em `DECISIONS.md`.
- **Guard de evento cancelado:** rotas cujo `eventId` só existe dentro de outro recurso (ex.: `PATCH /host/tasks/:id`) exigem consulta ao repositório para resolver o evento. Se alguma rota não permitir resolução segura, bloquear no front e registar em `BLOCKERS.md` em vez de inventar comportamento.
- **Chips "adicionar e-mail":** não existe implementação única no código atual; o padrão novo será aplicado aos formulários de e-mail existentes (`guest-dialog`, equipas). Se o Elizandro enviar prints com outro componente, ajustar depois — o padrão centralizado facilita.
- **Limpeza de órfãs:** é destrutiva por natureza. O script corre em `--dry-run` por omissão e a documentação recomenda revisão antes de `--apply`; nenhuma limpeza automática será executada contra produção neste bloco.
- **Ausência de capturas automatizadas:** verificação visual continue a ser por revisão de classes + checklist manual, como nos blocos anteriores.

## O que fica por fazer (atualizado no fim do bloco)

A secção "O que ficou por fazer" será preenchida em `docs/REPORT-BLOCO-5.md` com: funcionalidades deliberadamente adiadas, dívida técnica observada e itens que exigem decisão do Elizandro (nomeadamente promoção SQL do super admin e agendamento da limpeza de órfãs).
