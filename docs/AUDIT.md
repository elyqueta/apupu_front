# Auditoria do front-end — Conto Contigo (Bloco 0)

**Convenção de caminhos:** todos os caminhos são relativos a `/home/elyqueta/Documentos/projectos/apupu`. `apupu_front/` é o frontend, `apupu_back/` o backend. Linhas indicadas com `:n` referem-se ao *working tree* observado em 2026-11-19. Quando um número de linha pode ter mudado por edição concorrente, indica-se apenas o ficheiro.

**Estado da branch:** `feat/equipas`. Durante a auditoria, outros processos alteraram ficheiros de `src/` (ver §11 e §13). Esta auditoria é só de leitura: nenhum ficheiro de código, configuração ou dependência foi alterado por ela; o único ficheiro criado é este.

---

## 1. Resumo executivo

- A aplicação é Angular 22 com componentes standalone, signals, formulários reativos, Tailwind v4 e SSR/Express; não há `zone.js` nas dependências (`apupu_front/package.json:15-31`) nem `provideZonelessChangeDetection` explícito (`apupu_front/src/app/app.config.ts:10-21`).
- `npm run build` passou (exit 0) antes e depois das alterações concorrentes; `lint` **NÃO ENCONTRADO** (sem script e sem target) — detalhes em §13.
- O sistema de design real está em `src/styles.css` + `src/styles/brand-tokens.css`, com tokens claros/escuros e aliases Tailwind; `frontend/design-system.md:5-24` está desatualizado face ao código.
- Os 4 cards de convidados usam `app-stat-card` numa grelha `grid-cols-2 xl:grid-cols-4` (`apupu_front/src/app/features/guests/guests.page.html:18-46`); o dashboard usa `sm:grid-cols-2 xl:grid-cols-4` (`dashboard.page.html:37`) — padrões divergentes.
- O menu de 3 pontinhos é `app-action-menu`, reutilizável mas usado uma única vez (`apupu_front/src/app/shared/components/action-menu.component.ts:27`; `guests.page.html:269-273`).
- Não existe componente base de modal nem bottom sheet: todos os diálogos são `<div fixed>` por componente; `window.confirm` ainda aparece em 3 sítios (§5).
- A página `/equipas` lista equipas; no estado final o botão «Abrir equipa» (`team.page.html:399`) leva a `/equipas/:teamId` → `TeamDetailPage`, com separadores «Tarefas» e «Membros» — esta página surgiu durante a auditoria.
- Criar/editar equipa abre em modal (`team-form-dialog.component.ts`); o detalhe permite adicionar membros num drawer lateral, promover/despromover/remover/reenviar convite e gerir tarefas — mas não é bottom sheet (§5, §6).
- É possível criar gestor de evento sem equipa: o formulário só pede `email` e a tabela `event_managers` não tem `team_id` (§6.4).
- Autenticação por cookies HttpOnly + CSRF, sem refresh; o atalho «criar conta sem OTP» existe mas aceita qualquer convite não revogado com o mesmo email (§7.2).
- Notificações: in-app e e-mail (Brevo/Resend/SMTP via outbox); push/Firebase/SMS **NÃO ENCONTRADO** (§9).
- Convite público implementado; QR/PDF só no backend; mapas, coordenadas, províncias/municípios e editor de templates estilo Canva **NÃO ENCONTRADO** (§10).
- Maior risco para os próximos blocos: duplicação entre `event-detail` e `management-event`, detalhe de equipa recém-criado sem validação estável, e documentação/código desalinhados (§11).

---

## 2. Stack e estrutura

### 2.1 Stack

| Camada | Tecnologia | Evidência |
|---|---|---|
| Framework | Angular `^22.0.0`, componentes standalone, `@if`/`@for`, signals | `apupu_front/package.json:16-22`; `apupu_front/src/app/features/guests/guests.page.html:191` |
| Estado | Signals + stores próprios (`WorkspaceStore`, `TeamsStore`, `TeamTasksStore`) | `apupu_front/src/app/core/services/workspace.store.ts`; `apupu_front/src/app/core/services/teams.store.ts:21-97`; `apupu_front/src/app/core/services/team-tasks.store.ts:20-123` |
| Formulários | Reactive Forms com `NonNullableFormBuilder`; sem biblioteca externa | `apupu_front/src/app/shared/components/guest-dialog.component.ts:2,195`; `apupu_front/src/app/core/api/auth.service.ts` |
| HTTP | `HttpClient` + 2 interceptors (`apiRequestInterceptor`, `apiErrorInterceptor`) | `apupu_front/src/app/app.config.ts:4,19`; `apupu_front/src/app/core/api/api.interceptor.ts:85-101,138-149` |
| UI/CSS | Tailwind CSS v4.1 via PostCSS, sem `tailwind.config.*` | `apupu_front/package.json:37,43`; `apupu_front/.postcssrc.json:1-5`; `apupu_front/src/styles.css:1-4` |
| Ícones | Font Awesome (core, solid, regular, brands) via `FaIconComponent`; catálogo `ICONS` | `apupu_front/package.json:24-28`; `apupu_front/src/app/core/ui/icons.ts:92-200`; `apupu_front/src/app/app.config.ts:20` |
| Datas | **NÃO ENCONTRADO** biblioteca de datas; formatação própria via `Intl`/utilitários | Dependências em `apupu_front/package.json:15-45`; `apupu_front/src/app/core/i18n/i18n.service.ts:28-37` |
| Gráficos | **NÃO ENCONTRADO** biblioteca; sparkline é SVG inline | `apupu_front/package.json:15-45`; `apupu_front/src/app/shared/components/stat-card.component.ts:74-92` |
| Testes | Vitest `^4.0.8` via `@angular/build:unit-test`, jsdom | `apupu_front/package.json:40,45`; `apupu_front/angular.json:104-106` |
| Formatação | Prettier (`printWidth: 100`, `singleQuote: true`, parser angular) | `apupu_front/.prettierrc:1-11` |
| SSR | `@angular/ssr` + Express; `outputMode: server`, `RenderMode.Server` | `apupu_front/package.json:23,29`; `apupu_front/angular.json:31-41`; `apupu_front/src/server.ts` |
| i18n | Serviço próprio com `pt-AO` e `en`, dicionário único | `apupu_front/src/app/core/i18n/i18n.service.ts:6-18,28-37`; `apupu_front/src/app/core/i18n/translations.ts` |

### 2.2 Árvore de pastas (2–3 níveis)

```
apupu_front/
├─ src/app/
│  ├─ core/          api (cliente, contratos, mappers, guards, interceptors, erros),
│  │                 data (repositórios de acesso à API), i18n, layout (shell),
│  │                 models (interfaces de vista), services (stores, toast, share),
│  │                 theme (tema e tamanho de letra), ui (catálogo de ícones), utils
│  ├─ features/      auth, dashboard, events, event-setup, guests, host-management,
│  │                 invitation, my-invitations, not-found, notifications, profile,
│  │                 reports, settings, tasks, team, templates
│  └─ shared/        components (17 componentes reutilizáveis), directives, services
├─ src/environments/ environment.ts (local) e environment.remote.ts (produção/protótipo)
├─ src/styles.css + src/styles/brand-tokens.css   estilos globais e tokens
├─ public/          assets, logótipos, fontes e um protótipo HTML legado (§11)
├─ docs/            prompts de backend já parcialmente desatualizados (§11)
├─ frontend/        documentação de produto/API/design system
└─ brand-kit/       guide de marca e prompts de mensagens
```

Evidência da árvore: `apupu_front/src/app/core/` e `apupu_front/src/app/features/` (listagem de diretórios), `apupu_front/angular.json:28-30`, `apupu_front/src/environments/environment.ts:1-3`, `apupu_front/src/environments/environment.remote.ts:1-3`.

### 2.3 Comunicação front ↔ back

- Base URL por ambiente injetada por `API_BASE_URL`: `apupu_front/src/app/core/api/api-config.ts:1-7`. Local: `http://localhost:3000/api/v1` (`apupu_front/src/environments/environment.ts:1-3`); remoto: `/api/v1` relativo (`apupu_front/src/environments/environment.remote.ts:1-3`). Concatenação em `apupu_front/src/app/core/api/api-client.ts:204-206`. **Nenhum valor de segredo foi copiado.**
- `ApiClient` desembrulha envelopes `{ data }`, trata paginação e erros: `apupu_front/src/app/core/api/api-client.ts:43-71,120-178`; `apupu_front/src/app/core/api/api-error.ts:4-64`.
- Sessão de conta em cookies HttpOnly geridos pelo backend; `csrf_token` em memória enviado em `X-CSRF-Token`: `apupu_front/src/app/core/api/auth.service.ts:7-18`; `apupu_front/src/app/core/api/api-client.ts:180-202`; `apupu_front/src/app/core/api/api.interceptor.ts:85-113`.
- Escopos CSRF: `auth`, `guest` e `host:<eventId>`; em SSR, o cookie é repassado com verificação de host: `apupu_front/src/app/core/api/api.interceptor.ts:26-43,66-82,115-136`.
- O backend monta tudo sob `/api/v1`: `apupu_back/src/app.ts:111-121`; agregador em `apupu_back/src/routes/v1/index.ts:17-25`.

### 2.4 Scripts

`dev`/`start` = `ng serve`; `build` = `ng build`; `build:prototype` = `ng build --configuration=prototype`; `watch`; `test` = `ng test`; `serve:ssr:conta_comigo_front`. Não existe `lint` (`apupu_front/package.json:4-12`). O default de build é `prototype` (`apupu_front/angular.json:90`). Resultados em §13.

---

## 3. Mapa de rotas

Todas as rotas em `apupu_front/src/app/app.routes.ts` (do início ao wildcard final). Não existem guards por papel (anfitrião/gestor/membro): **NÃO ENCONTRADO** — pesquisa por `canActivate|canMatch|guard` no ficheiro só devolve `authenticatedGuard` na raiz do shell (`:44`) e um `canMatch` de redirect (`:81`). Nenhuma rota abre um modal: os diálogos são componentes dentro das páginas (§5).

| Rota | Componente/página | Acesso | Guard | Tipo | Evidência |
|---|---|---|---|---|---|
| `/entrar` | `AuthPage` (login) | Público | — | Página | `app.routes.ts:7-12` |
| `/criar-conta` | `AuthPage` (registo) | Público | — | Página | `app.routes.ts:13-18` |
| `/registar` | redirect → `/criar-conta` | Público | — | Redirect | `app.routes.ts:19-23` |
| `/recuperar-senha` | `PasswordPage` (forgot) | Público | — | Página | `app.routes.ts:24-29` |
| `/redefinir-senha` | `PasswordPage` (reset) | Público | — | Página | `app.routes.ts:30-35` |
| `/repor-senha` | redirect → `/redefinir-senha` | Público | — | Redirect | `app.routes.ts:36-40` |
| `/painel` | `DashboardPage` | Autenticado (anfitrião) | `authenticatedGuard` no shell | Página | `app.routes.ts:41-56` |
| `/eventos` | `EventsPage` (lista de eventos) | Autenticado | idem | Página | `app.routes.ts:57-61` |
| `/eventos/:eventId/equipas?equipa=` | redirect → `/equipas?evento=` | Autenticado | idem | Alias | `app.routes.ts:63-77` |
| `/eventos/:eventId?tarefa=` | redirect → `/tarefas?q=` | Autenticado | `canMatch` + guard | Alias | `app.routes.ts:78-94` |
| `/eventos/:eventId` | `EventDetailPage` (detalhe de evento) | Autenticado (anfitrião) | idem | Página | `app.routes.ts:95-100` |
| `/criar-evento` | `CreateEventPage` (wizard) | Autenticado | idem | Página | `app.routes.ts:101-106` |
| `/tarefas` | `TasksPage` | Autenticado | idem | Página | `app.routes.ts:107-111` |
| `/notificacoes` | `NotificationsPage` | Autenticado | idem | Página | `app.routes.ts:112-117` |
| `/convidados` | `GuestsPage` | Autenticado | idem | Página | `app.routes.ts:118-122` |
| `/equipas` | `TeamPage` (listagem) | Autenticado | idem | Página | `app.routes.ts:130-134` |
| `/equipas/:teamId` | `TeamDetailPage` (tarefas, membros, administração) | Autenticado | idem | Página | `app.routes.ts:124-128`; `team-detail.page.ts:48-61` |
| `/convites` | `InvitationsPage` («Meus convites») | Autenticado | idem | Página | `app.routes.ts:135-140` |
| `/templates` | `TemplatesPage` (catálogo) | Autenticado | idem | Página | `app.routes.ts:141-146` |
| `/relatorios` | `ReportsPage` | Autenticado | idem | Página | `app.routes.ts:147-151` |
| `/definicoes` | `SettingsPage` | Autenticado | idem | Página | `app.routes.ts:152-157` |
| `/perfil` | `ProfilePage` | Autenticado | idem | Página | `app.routes.ts:158-162` |
| `/gestao` | `ManagementEntryPage` (entrada por link/sem conta) | Público com token/sessão de gestão | — | Página | `app.routes.ts:165-170` |
| `/gerir/:token` | `ManagementEntryPage` | Público com token | — | Página | `app.routes.ts:171-176` |
| `/gestao/evento/:eventId` | `ManagementEventPage` (detalhe do evento por link) | Gestor sem conta | — | Página isolada, fora do shell | `app.routes.ts:177-182` |
| `/gestao/evento` | redirect → `/gestao` | Público | — | Redirect | `app.routes.ts:183-187` |
| `/gestao/:token` | `ManagementEntryPage` (rota ampla, sobrepõe-se a `:token`) | Público com token | — | Página | `app.routes.ts:188-193` |
| `/convite/:token` | `InvitationPage` (convite + confirmação de presença) | Público com token de convite | — | Página | `app.routes.ts:194-199` |
| `/i/:token` | `InvitationPage` (alias curto) | Público com token | — | Página | `app.routes.ts:200-205` |
| `**` | `NotFoundPage` | Todos | — | Página | `app.routes.ts:206-210` |

**Confirmação de presença:** não tem rota própria; é feita dentro de `InvitationPage` por `PUT /public/invitations/{token}/rsvp` (`apupu_front/src/app/features/invitation/invitation.page.ts:177-200`) com modais de aceitar/recusar (`invitation.page.html:640-660`). Convite de equipa por link: rota frontend **NÃO ENCONTRADO**; só existe no backend (`apupu_back/src/routes/v1/teamInvitePublic.routes.ts:64-70,198-206`).

---

## 4. Design system (o que está em código)

### 4.1 Tokens

- Ficheiros: `apupu_front/src/styles.css:1-87` (`@import 'tailwindcss'`, `@import './styles/brand-tokens.css'`, `@custom-variant dark`, `@theme inline`) e `apupu_front/src/styles/brand-tokens.css:51-116`. Styles globais registados em `apupu_front/angular.json:28-30`. Não existe `tailwind.config.*` — **NÃO ENCONTRADO** (pesquisa na raiz até profundidade 3).
- Marca (comuns): `--cc-primary-900 #0a2b2c`, `-700 #0f3d3e`, `-600 #185556`, `-500 #2a7270`, `-300 #8fb5b2`, `-100 #e3eeec`, `-50 #f1f7f6`, `--cc-on-primary #ffffff` (`brand-tokens.css:53-60`); accent `-700 #a87a0c`, `-600 #c9951a`, `-500 #e8b230`, `-200 #f6dc95`, `-100 #fbf1d6` (`:61-65`).
- Claro (`:root`): fundo `#f6f5ef`, superfície `#ffffff`, superfície alternativa `#f1f7f6`, borda `#e4e2d8`, texto `#14201f`, muted `#5b6b69`, subtle `#8a9694` (`brand-tokens.css:67-74`). Estados: success `#2e7d4f`, danger `#b3382c`, warning `#b7791f`, info `#2a6f97` e respetivos fundos (`:76-85`).
- Escuro (`.dark`): fundo `#0a1e1f`, superfície `#102a2b`, alternativa `#18302f`, borda `#1e4243`, texto `#f1f5f4`, muted `#a9bab8`, subtle `#7c908e` (`brand-tokens.css:97-104`); estados em `:106-115`. Aplicação por classe `dark`/`light` no `<html>`, não por `data-theme` (`apupu_front/src/app/core/theme/theme.service.ts:58-68`; `apupu_front/src/index.html:2,14-33`).
- Aliases Tailwind: `--color-cc-*`, `--color-canvas/surface/line/ink/muted/brand/...`, `--shadow-card` (`apupu_front/src/styles.css:11-40,56-83`); camada semântica `--ap-*` clara em `:89-112` e escura em `:155-177`.
- Tipografia: `Figtree` com `@font-face` local para 400/500/600/700/800 (`brand-tokens.css:11-49`); `--font-sans`/`--font-display` em `styles.css:7-8`; escala `--text-xs…--text-9xl` multiplicada por `--ap-font-scale` (`styles.css:42-54`), controlada por `data-font-size` (`apupu_front/src/app/core/theme/font-size.service.ts:4-6,25-37`; `styles.css:114-152`).
- Espaçamentos: **NÃO ENCONTRADO** tokens próprios; usam-se utilitários Tailwind (`p-3.5`, `gap-2.5`, `size-11`, ex. `apupu_front/src/app/shared/components/stat-card.component.ts:39-41`).
- Raios: `--cc-radius-sm 6px`, `-md 10px`, `-lg 16px`, `-xl 24px` (`brand-tokens.css:88-91`); aliases `--radius-4xl 2rem`, `--radius-5xl 2.5rem` (`styles.css:80-81`).
- Sombras: `--cc-shadow-card: 0 1px 2px rgb(15 61 62 / .06), 0 8px 24px rgb(15 61 62 / .08)` (`brand-tokens.css:93`); no escuro `--ap-shadow-card: 0 4px 14px rgb(0 0 0 / .22)` (`styles.css:176`). Animações `--animate-rise`/`--animate-screen` em `styles.css:85-86`, com `prefers-reduced-motion` em `:221-230`.
- Acessibilidade base: foco visível global (`styles.css:199-202`), scroll suave (`:180-183`), scrollbars finas (`:204-219`).

### 4.2 Componentes partilhados

Todos com template inline, em `apupu_front/src/app/shared/components/`.

| Componente | Caminho | Props principais | Uso principal |
|---|---|---|---|
| `app-logo` | `logo.component.ts:41-63` | `variant`, `theme`, `height` | `shell.component.html:401-411`, `invitation.page.html:13-18` |
| `app-brand` | `brand.component.ts:10-23` | — | `shell.component.html:73`, páginas públicas |
| `app-avatar` | `avatar.component.ts:13-57` | `name`, `size`, `imageUrl`; iniciais por fallback | convidados, dashboard, perfil, shell |
| `app-avatar-stack` | `avatar-stack.component.ts:5-46` | `names`, `images`, `max` | só `event-card.component.ts:121` e cartões de equipa (estado atual) |
| `app-status-badge` | `status-badge.component.ts:9-81` | `value`, `label` via i18n; cor/ícone por estado | muito difundido (eventos, convidados, equipas, perfil) |
| `app-action-menu` | `action-menu.component.ts:8-82` | `items`, `triggerLabel`, `disabledHint` (tooltip quando desativado); output `selected` | `guests.page.html:269-273` e `team-detail.page.html:53` (ações de editar/eliminar equipa) |
| `app-stat-card` | `stat-card.component.ts:35-123` | `label`, `value`, `hint`, `icon`, `tone`, `trend`, `sparkline` | 16 instâncias: `guests.page.html:19,26,33,40`; `dashboard.page.html:38,46,54,63`; `events.page.html:29,36,43,50`; `reports.page.html:103,111,120,128` |
| `app-event-card` | `event-card.component.ts:14-165` | `event`; computeds de stats/tipo | `dashboard.page.html:372`, `events.page.html:134` |
| `app-template-artwork` | `template-artwork.component.ts:10-88` | `templateId`, `variant`, `title`, `subtitle`, `kicker` | capas estáticas em várias páginas |
| `app-skeleton` | `skeleton.component.ts:3-98` | `variant` (dashboard/cards/detail/table/profile/chart/invitation) | `shell.component.html:414` e 7 páginas |
| `app-toast-host` | `toast-host.component.ts:8-64` | — | `apupu_front/src/app/app.html:2` |
| `app-preference-controls` | `preference-controls.component.ts:8-46` | — | shell e páginas públicas |
| `app-confirm-dialog` | `confirm-dialog.component.ts:6-87` | `open`, `title`, `message`, `confirmLabel`, `tone` | remover convidado, RSVP, cancelar evento |
| `app-guest-dialog` | `guest-dialog.component.ts:13-289` | `open`, `fixedEventId`, `guest`; output `closed` | criar/editar convidado |
| `app-image-lightbox` | `image-lightbox.component.ts:14-89` | `src`, `alt`, `closeLabel` | capa do convite e «meus convites» |
| `app-search-suggestions` | `search-suggestions.component.ts:13-76` | `groups`, `term`, `activeId` | pesquisa do shell |
| `app-auth-layout` | `auth-layout.component.ts:21-162` | `reverse`, `heroImage`, `heroAlt` | `auth.page.ts:47,425`, `password.page.ts:24,173` |
| `app-team-form-dialog` (novo,working tree) | `apupu_front/src/app/features/team/team-form-dialog.component.ts:1-80` | `open`, `team`, `events`, `defaultEventId`; outputs `saved`/`cancel` | criar/editar equipa em `team.page.html:559` |

**NÃO ENCONTRADO:** componente genérico de botão, de input, de tabela e de empty state — pesquisa por `selector:` em `src/app` e por `<table`; exemplos inline em `guests.page.html:144-166` e `guests.page.html:176-187`. `src/app/core/ui/` contém só `icons.ts` (`apupu_front/src/app/core/ui/icons.ts:92-200`).

### 4.3 Card de dashboard em grelha (página de convidados)

- Contentor: `<div class="grid grid-cols-2 gap-3 xl:grid-cols-4">` em `apupu_front/src/app/features/guests/guests.page.html:18`: **2 colunas** até `xl` e **4 colunas** só em ≥1280px. Não há `sm:`/`md:` nesta página; o dashboard usa `grid gap-3 sm:grid-cols-2 xl:grid-cols-4` (`dashboard.page.html:37`).
- São 4 instâncias de `app-stat-card`, componente reutilizável, não código copiado: `guests.page.html:19-25` (Convidados totais, `tone="brand"`, ícone `guests`), `:26-32` (Confirmados, `tone="mint"`, `userCheck`), `:33-39` (Pendentes, `tone="amber"`, `hourglass`), `:40-46` (Recusados, `tone="coral"`, `error`). Textos em `apupu_front/src/app/core/i18n/translations.ts:509-515`.
- Estrutura interna do cartão: `<article class="rounded-4xl border border-line bg-surface p-3.5 shadow-card backdrop-blur-2xl transition duration-300 hover:-translate-y-0.5 hover:border-brand/35 sm:p-5">` (`stat-card.component.ts:38-40`); label `text-[10px] uppercase tracking-[0.18em] text-muted sm:text-[11px]` (`:43-47`); valor `font-display text-2xl sm:text-3xl` (`:48-52`); quadrado de ícone `size-9 … rounded-2xl sm:size-11` com `group-hover:scale-105` (`:54-59`); hint e badge de `trend` (`:62-72`); sparkline SVG opcional (`:74-92`, não usado nestes 4 cards).
- Números vêm de `store.globalStats` (`guests.page.ts:60`), derivado de `total_invitations/accepted/pending/declined` (`apupu_front/src/app/core/services/workspace.store.ts:156-175`). Não há estado de loading/vazio próprio dos cards: o shell esconde o router outlet e mostra `app-skeleton` (`shell.component.html:395-414`).

### 4.4 Card de convidado/utilizador

**Não existe grelha de cards de convidados:** há dois layouts mutuamente exclusivos.

- Mobile: lista vertical (`md:hidden`) em `apupu_front/src/app/features/guests/guests.page.html:190-286`, com `<li class="rounded-2xl border border-line bg-surface-raised/45 p-3">` (`:192`). Cabeçalho: `app-avatar size="sm"` (`:194`), nome `truncate text-sm font-semibold text-ink` (`:196`), email (`:197`), telefone condicional (`:198-200`) e `app-status-badge` (`:202`). Linha do evento com ícone `calendar` (`:205-218`), metadados de abertura/resposta (`:220-243`) e ações: WhatsApp desativado sem telefone (`:247-260`), reenviar (`:261-268`), `app-action-menu` se anfitrião (`:269-273`), ou link «ver evento» (`:275-281`). **É markup inline, não componente reutilizável**; existe código paralelo em `dashboard.page.html:524-545` e `event-detail.page.html:1071`.
- Desktop: tabela em `guests.page.html:289-413` (§4.6).
- Cartão do anfitrião na sidebar: link `/perfil` com `app-avatar size="md"`, nome e email em `apupu_front/src/app/core/layout/shell.component.html:156-173`; versão compacta em `:375-385`. Também inline.

### 4.5 Menu de 3 pontinhos

`app-action-menu` em `apupu_front/src/app/shared/components/action-menu.component.ts:27`: gatilho `size-11` (44px) com `faEllipsis` (`:31-41`), overlay de clique-fora (`:43-49`), painel `role="menu" w-52 rounded-2xl shadow-card animate-rise` (`:50-66`), fecho por `Escape` (`:103-108`). Interface `ActionMenuItem` em `:8-16` (`id`, `label`, `icon`, `tone?`, `disabled?`). É reutilizável por contrato e, no estado final, é usado em `guests.page.html:269-273` e `team-detail.page.html:53`. Em convidados, os itens vêm de `guests.page.ts:161-177` (`view`, `edit`, `remove`) e são tratados em `:179-193`; no detalhe de equipa, os itens vêm de `team-detail.page.ts:128-143` e são tratados em `:191-201`. `disabledHint`(`action-menu.component.ts:80`) mostra tooltip em itens desativados. Na tabela desktop de convidados não há menu: há botões individuais (`guests.page.html:356-405`).

### 4.6 Tabelas longas

| Página | Colunas | Paginação | Mobile | Evidência |
|---|---|---|---|---|
| Convidados | 7 (Convidado, Evento, Estado, Aberto, Convidado em, Respondido, Acções) |Não | Escondida (`hidden md:block`); cartões em mobile | `guests.page.html:289-303` |
| Detalhe de evento | 7 (Convidado, Estado, Aberto, Mesa, Convidado em, Respondido, Acções) | Não | Só `overflow-x-auto`, sem cartões alternativos | `event-detail.page.html:1049-1065` |
| Relatórios | 4 (Evento, Convidados, Confirmados, Taxa) | Não (top 4) | `overflow-x-auto` | `reports.page.html:260-271`; `reports.page.ts:91` |
| Perfil | 4 (Nome, Data, Convidados, Estado) | Não | Colunas `hidden sm/md:table-cell` + linha compacta | `profile.page.html:240-274` |

Não existe componente de tabela genérico. Listas com paginação fora de `<table>`: notificações (`notifications.page.ts:35,115-146`), tarefas (`tasks.page.ts:34,170-175`), equipas (`team.page.ts:103,303-309`), atividade de gestão e de evento (`management-event.page.ts:259-271`; `event-detail.page.ts:345-349`).

---

## 5. Modais e formulários

### 5.1 Implementação atual

**NÃO ENCONTRADO** componente base, serviço de diálogo, rota de modal, `<dialog>` nativo ou biblioteca de modal — pesquisa por `role="dialog"`, `aria-modal`, `<dialog`, `showModal(`, `modal`, `sheet` em `src/app/**/*.{ts,html}`. Padrão real: cada diálogo é um componente com `@if (open())`, `<div class="fixed inset-0 z-[100] grid place-items-center">`, botão de backdrop, painel `role="dialog" aria-modal="true"`, comunicação por `input()`/`output()`. Exemplos: `confirm-dialog.component.ts:9-23`, `guest-dialog.component.ts:16-29`, `image-lightbox.component.ts:17-23`, `team-form-dialog.component.ts:25-40`, `management-entry.page.html:10-100`.

### 5.2 Inventário

| Modal | Ações que o abrem | Evidência |
|---|---|---|
| `app-confirm-dialog` | Remover convidado; recusar convite; mudar para confirmado; cancelar evento | `guests.page.html:430-439`; `invitation.page.html:640-660`; `event-detail.page.html:1635-1644` |
| `app-guest-dialog` | Adicionar convidado (botão e FAB mobile); editar convidado via menu; criar/editar convidado dentro do detalhe de evento | `guests.page.html:424-428,441-446`; `event-detail.page.html:1628-1633` |
| `app-image-lightbox` | Clicar na capa do convite; ampliar capa em «meus convites» | `invitation.page.html:39,662-667`; `invitations.page.html:133,266-271` |
| `app-profile-edit-dialog` | «Editar perfil» | `profile.page.html:411`; `profile.page.ts:49,90` |
| `app-team-form-dialog` (novo) | «Nova equipa»; edição de equipa no detalhe | `team.page.html:559`; `team-detail.page.html:438`; `team.page.ts:434-465` |
| Drawer de adicionar membros + diálogos de confirmação (novos, inline) | «Adicionar membro», remover membro, eliminar equipa, bloqueios por tarefas abertas | `team-detail.page.html:309-330,448-575`; `team-detail.page.ts:297-319,399-505` |
| Prompt de conta inline em `/gestao` | Continuar sem conta / criar conta | `management-entry.page.html:10-100`; `management-entry.page.ts:45,104,124-168` |
| `window.confirm` nativo | Remover todas as notificações; remover convidado e atividade em gestão | `notifications.page.ts:225`; `management-event.page.ts:205,227` |

Fecho por `Escape` existe em `confirm-dialog.component.ts:82-87`, `image-lightbox.component.ts:84-89` e `action-menu.component.ts:103-108`; **NÃO ENCONTRADO** em `guest-dialog.component.ts`, `profile-edit-dialog.component.ts` e `team-form-dialog.component.ts` (pesquisa por `@HostListener('document:keydown.escape')`). **NÃO ENCONTRADO** focus trap em nenhum modal.

### 5.3 Candidatos a refatoração (ainda não modal)

- Adicionar gestor de evento: formulário inline no detalhe do evento — `event-detail.page.html:1484-1531`; lógica em `event-detail.page.ts:489-506`.
- Criar tarefa: painel inline em `/tarefas` — `tasks.page.html:20-75`; `tasks.page.ts:179-201`.
- Adicionar membro de equipa / convidar por e-mail: no estado final existe um **drawer lateral** em `team-detail.page.html:309-330` (dois modos: conta individual e lista de emails, `team-detail.page.ts:86-90,297-319`); é candidato a modal/bottom sheet, porque não é um bottom sheet e é um painel deslizante à direita. A aceitação pública do convite de equipa continua sem UI (§6).
- Convidar convidado de evento: já é modal (`guest-dialog`), exceto no wizard de criação de evento, onde a adição é inline — `create-event.page.html:862-903`.
- Exceção de produto: o convite público é uma tela, não modal — `app.routes.ts:187-198`.

### 5.4 Mobile / bottom sheet

**NÃO ENCONTRADO bottom sheet modal** — pesquisa por `sheet`, `bottom-sheet`, `rounded-t-`, `inset-x-0 bottom`, `translate-y` em `src/app`. O que existe: layout de auth com `rounded-t-[32px]` (`auth-layout.component.ts:14-15,72`, é ecrã, não diálogo), barra de navegação inferior (`shell.component.html:456-458`) e barra de ações do wizard (`create-event.page.html:1078`).

### 5.5 Validação

Reactive Forms com `NonNullableFormBuilder` (`guest-dialog.component.ts:2,195`; `profile-edit-dialog.component.ts:2,306`; `create-event.page.ts:51`; `auth.page.ts:429`); exceção com `FormBuilder` em `management-event.page.ts:4,51`. `FormsModule` aparece em `notifications.page.ts:2,24`, mas **NÃO ENCONTRADO** `ngModel` em `src/app` — na prática todos os formulários são reativos. Validators padrão e custom: `guest-dialog.component.ts:213-218`, `profile-edit-dialog.component.ts:325-332,469-490`, `auth.page.ts:496-516` (`passwordsMatch`), `create-event.page.ts:84-102,266-313`. Padrão de submissão `if (form.invalid || saving()) { markAllAsTouched(); return; }` em `guest-dialog.component.ts:254-258` e `profile-edit-dialog.component.ts:431-435`. Erros de API em signal com `role="alert"` (`guest-dialog.component.ts:157-165,284-287`). Textos centralizados em `translations.ts` (ex. `create.errors.required` em `:435`, `create.errors.email` em `:436`); erros comuns `text-coral` + ícone `warning`. `novalidate` explícito nos formulários de auth (`auth.page.ts:58,175,283,339`).

---

## 6. Equipas, gestores, membros e tarefas

### 6.1 Fluxo atual

1. **Listar equipas:** `/equipas` (`app.routes.ts:123-127`) lê filtros da URL e chama `TeamsStore.load()` (`team.page.ts:200-222,342-354`), que usa `TeamsRepository.list()` → `GET /host/teams` (`apupu_front/src/app/core/data/teams.repository.ts:94-105`). Filtros: pesquisa com debounce 300 ms, evento, papel, estado, categoria, «Só as minhas», chips e paginação de 12 (`team.page.ts:27-28,68-70,107-131`; `team.page.html:29-204,330-358`).
2. **Criar/editar equipa (estado atual):** botão «Nova equipa» (`team.page.html:24`) chama `openCreate()` (`team.page.ts:434-437`) e abre `app-team-form-dialog`; `saveTeam()` chama `TeamsRepository.create()` ou `.update()` (`team.page.ts:446-465`). O modal pede evento, nome, categoria e descrição (`team-form-dialog.component.ts:25-80`). A criação navega para `/equipas/:teamId` (`team.page.ts:463`), que passou a existir durante a auditoria (`app.routes.ts:124-128`).
3. **Detalhe da equipa (novo):** `/equipas/:teamId` carrega `TeamDetailPage` (`app.routes.ts:124-128`; `team-detail.page.ts:48-61`) com separadores «Tarefas» e «Membros» (`team-detail.page.html:72-86`), botão de voltar (`team-detail.page.html:7`), menu de ações da equipa (`team-detail.page.html:53`; `team-detail.page.ts:128-143,191-201`) e permissões de escrita derivadas de `myRole` (`team-detail.page.ts:112-115`).
4. **Adicionar gestor de evento:** no detalhe do evento, formulário só com `email` (`event-detail.page.html:1484-1531`; `event-detail.page.ts:235-237,489-506`) → `WorkspaceStore.addManager()` (`workspace.store.ts:351-352`) → `POST /host/events/{id}/managers` com `{ email }` (`apupu_front/src/app/core/data/events.repository.ts:141-150`). Listagem/remoção/reenvio em `events.repository.ts:134-139,152-166`.
5. **Adicionar membro de equipa / convidar por e-mail:** no detalhe da equipa, o drawer aceita um email ou uma lista (até 50) e chama `TeamsRepository.addMembers()` (`team-detail.page.ts:86-90,144-175,297-345`; `teams.repository.ts:162-178`). O backend cria membros ou convites com token de 32 bytes, HMAC, expiração, revogação do anterior, cooldown e limites (`apupu_back/src/services/teamMember.service.ts:86-147,180-183,232-262`; `apupu_back/src/services/teamInvite.service.ts:25-40,115-153,162-218,237-245,311-370`). Promover/despromover/remover/reenviar em `team-detail.page.ts:350-435`.
6. **Aceitar convite de equipa:** backend em `apupu_back/src/routes/v1/teamInvitePublic.routes.ts:64-70,198-206`; frontend **NÃO ENCONTRADO**.
7. **Tarefas:** `/tarefas` usa o modelo legado `WorkspaceTask` (`tasks.page.ts:12`; `models.ts:145-158`), com `GET/POST /host/tasks`, `PATCH /host/tasks/{id}` (`{ done }`) e `DELETE` (`apupu_front/src/app/core/data/tasks.repository.ts:31-84`). O detalhe de equipa usa `TeamTasksStore` para listar, alternar estado e reatribuir (`team-detail.page.ts:66,77,230-296`; `team-tasks.store.ts:19-123`).

### 6.2 Modelos no front

- `Team`: `id`, `eventId`, `eventTitle`, `eventStatus`, `myRole`, `name`, `category`, `description`, `memberCount`, `taskCount`, `completedTaskCount`, `membersPreview`, `openTaskCount`, `createdAt`, `updatedAt` (`apupu_front/src/app/core/models/models.ts:279-295`).
- `TeamMember`: `id`, `teamId`, `email`, `displayName`, `role`, `status`, `origin`, `isHost`, `openTaskCount`, `hasEventAccess`, `joinedAt`, `createdAt` (`models.ts:297-311`); `TeamMemberPreview` em `:272-277`; resultados de add/update/remove/resend em `:313-347`.
- `TeamTask`: `id`, `eventId`, `eventTitle`, `teamId`, `teamName`, `assigneeMemberId`, `assigneeEmail`, `assigneeDisplayName`, `assigneeHasAccess`, `title`, `description`, `dueDate`, `priority`, `status`, `createdByHostId`, `completedByMemberId`, `completedAt`, `archivedAt`, `createdAt`, `updatedAt` (`models.ts:349-372`). Enums em `:246-270`.
- `EventManager`: `id`, `eventId`, `email`, `hasAccount`, `lastUsedAt`, `createdAt` (`models.ts:55-63`); `TeamManager extends EventManager` com `event` (`:78-81`). `Invitation`/`GuestInvitation` em `:103-123`; `WorkspaceTask` em `:145-158`.
- Contratos snake_case correspondentes: `apupu_front/src/app/core/api/api.models.ts:204-237,246-251,270-304`; mapeamento em `apupu_front/src/app/core/api/mappers.ts:220-266,268-324`.

### 6.3 Endpoints: front vs back

Base: `/api/v1` (`apupu_back/src/app.ts:111-121`; `apupu_back/src/routes/v1/index.ts:17-25`).

| Grupo | Front chama | Back tem mas front não usa |
|---|---|---|
| Equipas | `GET /host/teams` (`teams.repository.ts:94-105`) | `GET/PATCH/DELETE /host/teams/{id}` (`teams.repository.ts:108-146`; rotas em `apupu_back/src/routes/v1/hostWorkspace.routes.ts:1844-1868`) |
| Membros | `GET/POST /host/teams/{id}/members`, `PATCH/DELETE …/{memberId}`, `POST …/invite/resend` via `TeamDetailPage` (`teams.repository.ts:148-216`; `team-detail.page.ts:319-435`) | — |
| Gestores | `GET/POST /host/events/{id}/managers`, `DELETE`, `POST …/resend`, `GET /host/managers` (`events.repository.ts:134-166`; `team.repository.ts:20-23`) | — |
| Tarefas | `GET/POST /host/tasks`, `PATCH …/{id}` com `done`, `DELETE` (`tasks.repository.ts:31-84`); `PATCH …/{id}/status` e `…/assignee` via detalhe da equipa (`team-detail.page.ts:258-296`; `team-tasks.store.ts`) | `POST …/move` (`teams.repository.ts:316-329`; `hostWorkspace.routes.ts:1613-1621`) |
| Convites de equipa | **Nenhum** | `GET/POST/REPORT /public/team-invites/{token}` (`apupu_back/src/routes/v1/teamInvitePublic.routes.ts:64-206`) |

**NÃO ENCONTRADO** chamada do front a endpoint inexistente no back. Restam operações prontas no backend sem ecrã: aceitação/denúncia de convite de equipa e `POST …/move` de tarefas. `TeamTasksStore` passou a ser usado por `TeamDetailPage` (`team-detail.page.ts:66,77`); `addTeamManager`/`removeTeamManager`/`resendTeamManagerInvite` continuam só nas definições (`workspace.store.ts:377-397`).

### 6.4 Gestor sem equipa — confirmado

É possível criar gestor de evento sem equipa: `event_managers` não tem `team_id` (`apupu_back/migrations/1739900000006_event-managers.js:21-32`), a rota exige só `eventId` e `{ email }` (`apupu_back/src/routes/v1/hostWorkspace.routes.ts:609-618`; schema `host.schemas.ts:318-322`), o serviço cria/reativa sem referência a equipa (`apupu_back/src/services/eventManager.service.ts:173-186,192-258`) e o front envia só `email` (`events.repository.ts:141-150`). O wizard não cria equipas nem gestores (`create-event.page.html:862-873`; `events.repository.ts:61-88`). Por contraste, gestor de **equipa** sem equipa é impossível: `team_members.team_id` é `NOT NULL` (`apupu_back/migrations/1739900000011_teams.js:65-84`). Promover membro a gestor cria `event_managers`, mas despromover não revoga acesso ao evento (`apupu_back/src/services/teamMember.service.ts:270-273,306-351`).

### 6.5 Telefone, WhatsApp e regras de tarefas

- Telefone existe para convidados (`Guest.phone` em `models.ts:83-97`; `ApiInvitation.guest_phone` em `api.models.ts:103-122`) e perfil do anfitrião (`HostProfile.phone`, `models.ts:229-240`). Partilha por WhatsApp manual via `wa.me` em `apupu_front/src/app/core/services/share.service.ts:6-28,43-54`, usada em `guests.page.ts:195-212` e botões em `guests.page.html:251-259,386-395` e `event-detail.page.html:1136-1145`.
- **NÃO ENCONTRADO** telefone em gestores/membros (`models.ts:55-81,297-372`; `apupu_back/src/schemas/host.schemas.ts:318-322`; migrations `1739900000006_event-managers.js:21-32`, `1739900000011_teams.js:65-84`), convite de equipa por telefone ou partilha WhatsApp de equipa (pesquisa por `whatsapp|phone|telefone` em `apupu_back/src` só devolve convidados/perfil/exportação).
- Regras do backend (mais ricas que a UI): só o responsável conclui/reabre/passa a `em_curso` (`apupu_back/src/services/task.service.ts:97-128`), conclusão atómica e `completed_by_member_id` (`:130-196`), anfitrião/gestor editam qualquer tarefa do evento e membro só as que criou (`:443-499`), reatribuição só de anfitrião/gestor (`:525-581`), movimentação entre equipas (`:583-662`), `assignee_has_access = false` se o responsável perdeu acesso (`apupu_back/src/repositories/task.repository.ts:74-87`). Filtros suportados: `team_id`, `event_id`, `status`, `assignee`, `priority`, `personal`, `q` (`:164-177,258-310`).
- Na UI `/tarefas` só existem `all|pending|done`, `all|host|manager`, evento, gestor, pesquisa e página (`tasks.page.ts:41-60,132-145`), criação com `label` (`tasks.page.ts:179-201`) e toggle por `done` (`:203-216`). No detalhe da equipa, as tarefas aparecem com estado e prioridade traduzidos (`team-detail.page.ts:511-517`), apenas o responsável pode alternar/ser reatribuído (`team-detail.page.ts:230-296`). **NÃO ENCONTRADO** filtro «só as minhas tarefas»: o «Só as minhas» que existe é de equipas (`team.page.html:159-176`).

---

## 7. Autenticação e acesso por link

### 7.1 Estado atual

- Login/registo em `AuthPage` com modos por `data` da rota (`app.routes.ts:7-18`; `auth.page.ts`). Sessão em cookie HttpOnly, `csrf_token` memória, `withCredentials` e `X-CSRF-Token` (`auth.service.ts:7-18,62-90`; `api.interceptor.ts:85-113`). `restoreSession()` usa promessa partilhada para `GET /auth/session` (`auth.service.ts:81-90`). Guard: `authenticatedGuard` na raiz do shell (`app.routes.ts:44`). Logout no shell (`shell.component.html`/`.ts`).
- OTP: 6 dígitos, HMAC ligado ao email, TTL/max tentativas/resend configuráveis (`apupu_back/src/utils/token.util.ts:23-41`; `apupu_back/src/config/env.ts:138-148`; limites em `apupu_back/src/services/auth.service.ts:232-326`). O front lê `email` e `codigo` da query e abre diretamente o passo de verificação (`auth.page.ts:527-552`).
- **NÃO ENCONTRADO** refresh de sessão: nem `refresh_token` em `apupu_back/src/routes/v1/auth.routes.ts`, nem equivalente no front (só `GET /auth/session` em `auth.routes.ts:359`). `touch()` atualiza apenas `last_used_at` (`apupu_back/src/repositories/hostAuthSession.repository.ts:82-87`); TTL por `AUTH_SESSION_TTL_MINUTES` (`env.ts:111-114`). «Lembrar-me» está no UI (`auth.page.ts:100-108,499,585`) mas é ignorado (`auth.service.ts:96-100`). Login social é placeholder 501/TODO (`auth.service.ts:177-187`); Termos/Privacidade são links TODO sem rota (`auth.page.ts:410-419`; `app.routes.ts`).
- **NÃO ENCONTRADO** `localStorage`/`sessionStorage` para autenticação: só tema, tamanho de letra e locale (`theme.service.ts:40,75`; `core/theme/font-size.service.ts:28,43`; `i18n.service.ts:23,167`).

### 7.2 Links com token

| Link | Formato/validade | Proteção | Evidência |
|---|---|---|---|
| Gestão de evento | Token opaco de 32 bytes, HMAC-SHA256 com `TOKEN_PEPPER`; TTL `MANAGE_TOKEN_TTL_DAYS` (30 dias) | Token do anfitrião roda ao usar; token de gestor não roda até remoção/expiração; sessão curta `HOST_SESSION_TTL_MINUTES` (120) | `apupu_back/src/utils/token.util.ts:4-21`; `apupu_back/src/config/env.ts:95-103`; `apupu_back/src/services/manageLink.service.ts:30-43`; `apupu_back/src/services/hostSession.service.ts:65-178` |
| Convite de evento | Token opaco; **sem expiração explícita**, ligado ao navegador por `claim_hash` + cookie `apupu_guest` (180 dias), revogável | Claim atómico, RSVP idempotente, `publicTokenLimiter`, `guestAuth`, `requireGuestCsrf`, `rsvpLimiter`, cabeçalhos `no-store`/anti-referrer | `apupu_back/src/config/env.ts:108-109`; `apupu_back/src/services/invitation.service.ts:263-284,299-389`; `apupu_back/src/repositories/invitation.repository.ts:590-613,667-694`; `apupu_back/src/routes/v1/public.routes.ts:47-143`; `apupu_back/src/middlewares/publicInviteHeaders.ts:14-22` |
| Convite de equipa | Token de 32 bytes, só HMAC na BD, expiração configurável, rotação no reenvio | Limite por email/24 h, 30/h e 100/dia por anfitrião, cooldown, bloqueio do par ao denunciar | `apupu_back/src/services/teamInvite.service.ts:25-40,115-153,162-218,237-245,311-370,471-503` |

Os schemas de entrada validam só comprimento 20–200, sem formato base64url estrito (`apupu_back/src/schemas/event.schemas.ts:265-267`; `invitation.schemas.ts:3-5`); a validação definitiva é por hash/localização no repositório. Rotas frontend: `app.routes.ts:165-205`.

### 7.3 Lacunas para as decisões de produto

- **Gestor sem conta com link protegido:** já existe no backend (`apupu_back/docs/API-CONTRACT.md:563-585`) e na entry page (`management-entry.page.html:10-100`; `management-entry.page.ts:125-168`). Falta a aceitação/denúncia pública do convite de equipa no front (`teamInvitePublic.routes.ts:64-206`); o destino `/equipas/:teamId` já foi ligado ao detalhe (`app.routes.ts:124-128`).
- **Criar conta sem OTP quando contacto validado:** existe, mas a condição é demasiado larga — `WHERE lower(guest_email) = lower($1) AND claim_revoked_at IS NULL ORDER BY created_at DESC LIMIT 1` (`apupu_back/src/repositories/invitation.repository.ts:255-273`). Não exige `claimed_at`, não filtra `rsvp_status`, não verifica validade do evento nem prova de posse do email. O serviço cria `guest_verified` com `skipped_otp: true, reason: 'known_guest'` (`apupu_back/src/services/auth.service.ts:138-184`) e o controller devolve `verification_token` na resposta (`apupu_back/src/controllers/auth.controller.ts:33-47`); o front salta para `details` (`auth.page.ts:610-619`). **Falta:** restringir a convites efetivamente reclamados/aceites e com validade recente, ou exigir confirmação pelo email nesse caminho.
- **Outras lacunas:** sem refresh; «Lembrar-me» inerte; login social TODO; Termos/Privacidade sem rota; protótipo estático legado em `apupu_front/public/conta-comigo-auth.html:211-223,239-247` (login simulado, servido na raiz se publicado).

---

## 8. Painéis e navegação

- Shell: `ShellComponent` é o contentor das rotas autenticadas (`app.routes.ts:41-44`). Sidebar com **9 links** — painel, eventos, convites, convidados, equipas, tarefas, notificações, relatórios, definições (`apupu_front/src/app/core/layout/shell.component.ts:67-82`); perfil é rota irmã (`app.routes.ts:151-155`). Bottom-nav com **4 links** (`shell.component.ts:84-93`); «Mais» abre drawer com o resto (`shell.component.html:479-491`). Título em `<h1>` (`shell.component.html:210-216`).
- Header: pesquisa sobreposta (`shell.component.html:11-60` desktop `:241-250`), sino e dropdown de notificações (`:273-299`), botão de tema/idioma (`:153`), cartão do utilizador (`:156-173`). Backdrop do menu mobile em `:2-9`.
- **Breadcrumbs: NÃO ENCONTRADO** em `shell.component.html:1-500` (pesquisa por `breadcrumb`/navegação em `<ol>`); só `<h1>` e links laterais. Contexto vem do título da rota (`app.routes.ts`).
- Painel do anfitrião: `/painel` agrega domínios e `openManagement()` navega para `/eventos/:eventId` (`dashboard.page.ts:47-56,171-173`). O detalhe `/eventos/:eventId` carrega convites, equipas, tarefas, gestores, atividade e relatórios (`event-detail.page.ts`), e tem «Voltar aos eventos» no topo e no fim (`event-detail.page.html:1-10,1648-1664`).
- Painel por link: `/gestao/evento/:eventId` é standalone, fora do shell (`app.routes.ts:177-182`), com cabeçalho próprio e erro que só oferece `/gestao` (`management-event.page.html:1-8,27-42`). Há duplicação funcional entre `event-detail.page.html` e `management-event.page.html` (convidados, detalhes, atividade e ações); permissões do gestor são mais limitadas por contrato (`apupu_back/docs/API-CONTRACT.md:571-585`).
- Nota de contexto: `/gestao/:token` e `/gerir/:token` apontam para a mesma entry page (`app.routes.ts:171-193`); a rota `gestao/:token` é ampla e pode capturar segmentos inesperados.

---

## 9. Notificações e comunicações

- **In-app:** página com filtros, marcar como lida, remover e paginação (`apupu_front/src/app/features/notifications/notifications.page.ts:27-234`; `.html:1-259`); cache das 8 recentes para o sino (`apupu_front/src/app/core/data/notifications.repository.ts:31-119`); store em `workspace.store.ts:104-105,465-550`; apresentador de ícone/tom/destino em `apupu_front/src/app/shared/services/notification.presenter.ts:6-66`. O backend define 12 `kind`s (`apupu_back/src/types/host.types.ts:99-114`), incluindo `task_reassigned`, `team_added` e `role_changed`, que caem no `default` do apresentador (`notification.presenter.ts:9-54`). O sino não faz polling: só atualiza ao carregar/mutar (`shell.component.ts:95-96`).
- **E-mail:** catálogo de templates e variantes em `apupu_back/src/emails/catalog.ts` (ex. `:81-83,127-129`); transportes `brevo`, `resend`, `smtp`, `json`, com `json` forçado fora de produção (`apupu_back/src/services/email.service.ts:15-39,41-64,80-114`). Nomes de variáveis (sem valores): `EMAIL_TRANSPORT`, `EMAIL_FROM`, `RESEND_API_KEY`, `BREVO_SMTP_*`, `BREVO_API_KEY`, `RESEND_API_KEY`, `SMTP_*` (`apupu_back/src/config/env.ts:184,202-211,301-317`). Outbox assíncrono com `FOR UPDATE SKIP LOCKED`, chave idempotente e reavaliação antes do envio (`apupu_back/src/services/outbox.service.ts:16-25,226-297`); worker em `apupu_back/src/worker.ts:6-28`.
- **Eventos que geram notificação:** convites de evento e de equipa, convite aceite/recusado, lembretes `14d/7d/3d/1d`, tarefas atribuídas/reatribuídas/concluídas, alterações de papel e cancelamento de evento — catálogo em `apupu_back/src/emails/catalog.ts`, regras de aplicabilidade em `apupu_back/src/services/outbox.service.ts:83-224`, lembretes em `email.service.ts:296-316`. Destinatários são sempre contas com email; quem só tem telefone não recebe notificações — **NÃO ENCONTRADO** provider de SMS.
- **Push/Firebase: NÃO ENCONTRADO** — sem `firebase`, `@angular/fire`, `web-push` ou `onesignal` em `apupu_front/package.json:15-45` e `apupu_back/package.json:43-61`, sem `Notification.requestPermission` ou service worker em `apupu_front/src`. Existe só copy (`PushMessage`/`push()` em `apupu_back/src/emails/catalog.ts:81-83,127-129`) e documentação de marca (`apupu_front/brand-kit/prompts/02-prompt-mensagens-e-emails.md:11,26-27,55`). O único «Firebase» no código é comentário boilerplate do SSR em `apupu_front/src/server.ts:66`.

---

## 10. Convite, mapas, QR e PDF

- **Evento:** `HostEvent` em `apupu_front/src/app/core/models/models.ts:24-49` tem `id`, `title`, `type`, `hostName`, `hostEmail`, `startsAt`, `timezone`, `venue`, `city`, `onlineLink`, `message`, `rules`, `dressCode`, `rsvpDeadline`, `templateId`, `coverUrl`, `status`, `contributionEnabled`, `bankDetails`, `accessRole`, `createdAt`, `stats?`. **Não tem `endsAt`/duração.** O contrato API tem `ends_at` (`apupu_front/src/app/core/api/api.models.ts:83`), o backend envia (`apupu_back/src/dto/event.dto.ts:138-164`), mas `mapEvent` descarta (`apupu_front/src/app/core/api/mappers.ts:92-143`); `CreateEventInput` também não o tem (`models.ts:202-222`).
- **Convite:** `GuestInvitation` em `models.ts:103-123` (inclui `coverUrl` em `:115-116`); `PublicInvitation` com `rsvp_deadline_passed` em `api.models.ts:345`. A vista pública `InvitationView` (`invitation.page.ts:21-46`) tem só `deadlinePassed` e `countdownDays`, sem data/hora do prazo; `mapInvitation` ignora `ends_at` e `rsvp_deadline` (`invitation.page.ts:241-287`). No convite só aparece aviso genérico de prazo expirado (`invitation.page.html:472-485`), embora o anfitrião preencha o prazo no wizard (`create-event.page.ts:100,147-154,518-520`; `create-event.page.html:629-640,1002-1011`).
- **Página pública:** rotas `/convite/:token` e `/i/:token` (`app.routes.ts:187-198`); GET com fallback para `POST /claim` (`invitation.page.ts:202-238`), RSVP por `PUT …/rsvp` (`:177-200`). Estrutura: capa com botão ampliar (`invitation.page.html:33-65`), conteúdo (`:33-349`), sidebar (`:352-577`), loading/erro (`:10-27,595-636`), modais de recusa/aceite (`:640-660`) e lightbox (`:662-667`). O que abre em modal: confirmação de resposta e ampliação da capa; o convite em si é uma tela.
- **QR/PDF:** **NÃO ENCONTRADO no frontend** (sem `qrcode`, `jspdf`, `html2canvas`; pesquisa em `apupu_front/package.json` e `src`). Existe só no backend: `pdfkit`, `qrcode`, `svg-to-pdfkit` em `apupu_back/package.json`; bilhete com QR em `apupu_back/src/services/pdf/eventDocuments.ts:262-324`; dimensões em `pdfLayout.ts:637-660`; validação em `reportExport.service.ts:137-174`. O front apenas descarrega o blob (`apupu_front/src/app/core/api/api-client.ts:135-157`; `download.service.ts:17-31`; `reports.repository.ts:24-25,39-40,57-58`). Comentário enganador «QR do convite» em `event-detail.page.ts:599`, quando a ação descarrega PDF do backend (`:600-611`).
- **Mapas/geolocalização: NÃO ENCONTRADO** — pesquisa por `maps|geolocation|latitude|longitude|província|provincia|município|coordenad|leaflet|openstreetmap|geocode` em `apupu_front/src`, `frontend/`, `docs/`, `README.md`, `agents.md`. Localização é só texto: `venue`/`city`/`onlineLink` (`models.ts:32-34`) e `EventLocation` com `type`, `name`, `address`, `online_url` (`api.models.ts:55-60`), achatada em `mappers.ts:103-105,353-376`. Não há lista de províncias/municípios.
- **Templates estilo Canva: NÃO ENCONTRADO** — sem `<canvas>`, `contenteditable`, `fabric`, `konva`, `wysiwyg` em `src` (só `draggable="false"` em `logo.component.ts:49`). Existe catálogo (`api.models.ts:324-333`; `models.ts:125-133`; `templates.repository.ts:8-16`) e arte estática (`template-artwork.component.ts:10-23,69-88`); a própria tradução fala em «development previews» (`translations.ts:411-413,477-495`). Agrava-se o `templateId: null` fixo na vista pública (`invitation.page.ts:34`).

---

## 11. Dívida técnica e riscos

- **Ficheiros >400 linhas:** `translations.ts` 2561; `events/event-detail.page.html` 1667; `team/team-detail.page.ts` 656 (novo); `team/team-detail.page.html` 605 (novo); `event-setup/create-event.page.html` 1266; `auth/auth.page.ts` 818; `events/event-detail.page.ts` 726; `host-management/management-event.page.html` 679; `invitation/invitation.page.html` 668; `event-setup/create-event.page.ts` 590; `core/services/workspace.store.ts` 560; `dashboard/dashboard.page.html` 551; `profile-edit-dialog.component.ts` 490; `management-event.page.ts` 457; `guests.page.html` 451; `mappers.ts` 427; `api.models.ts` 416; `profile.page.html` 412 (medição por `wc -l`). Caminhos completos sob `apupu_front/src/app/`.
- **Tipos fracos/`any`:** `TemplateId = string` (`models.ts:10`), `kind: string` com cast `as NotificationKind` (`models.ts:140`; `mappers.ts:199-210`), `$any($event.target)` em `profile-edit-dialog.component.ts:125,261`. **`tsc` com `--noUnusedLocals --noUnusedParameters` reporta 3 erros TS6133** em `create-event.page.ts:7` (`ValidationErrors`), `team-form-dialog.component.ts:1` (`signal`) e `phone-mask.directive.ts:14` (`input`); `ng build` passa porque essas flags não estão ativas no build (§13).
- **Duplicação:** mapeamento de localização (`mappers.ts:103-105,170-172,353-376`; `invitation.page.ts:256-258`) e de RSVP (`mappers.ts:152,176`; `invitation.page.ts:289-291`); nomes de templates (`templates.page.ts:40-64` vs `create-event.page.ts:250-255`); exportação de relatório (`reports.page.ts:131-147` vs `profile.page.ts:114-126`); painéis `event-detail` vs `management-event`; cartões de convidado inline em várias páginas.
- **Código morto/legado:** wrappers de gestor de equipa sem chamadores (`workspace.store.ts:377-397`), protótipo `public/conta-comigo-auth.html:211-223,239-247`, rotas `gestao/:token` duplicadas (`app.routes.ts:171-193`). `TeamTasksStore` deixou de ser código morto: é usado por `team-detail.page.ts:66,77`.
- **TODO/FIXME:** `share.service.ts:12`; `core/services/auth.service.ts:179`; `auth-layout.component.ts:44,49`; `auth.page.ts:412,415,812`; `auth/password.page.ts:72,217`.
- **Drift documental:** `frontend/design-system.md:5-24` dá hex diferentes dos reais (`brand-tokens.css:51-116`); `agents.md:12-16` aponta para diretório `doc/` inexistente (real: `docs/` e `frontend/`); `agents.md:5,7,59` diz que não há autenticação (contrariado por `auth.page.ts`), `agents.md:50,61-62` diz que não há WhatsApp (contrariado por `guests.page.ts:208`); `docs/prompt-backend-links-convite-whatsapp.md:9,19,25,107` pede campo que o front já consome; `frontend/api-integration.md:3` aponta para `../backend/api-contract.md` inexistente.
- **Acessibilidade/responsividade:** sem focus trap nos modais (`confirm-dialog.component.ts:18-22,82-87`; `image-lightbox.component.ts:18-23,84-89`; `guest-dialog.component.ts`; `team-form-dialog.component.ts`); texto 9–11 px em `invitation.page.html` (ex. `:52,79,107,221,340,468,482`), com correção global reativa em `styles.css:122-153`; contraste baixo (`invitation.page.html:543,583,628`); alvos `h-8`/`h-9`/`size-7`/`size-8` (`invitation.page.html:326,373-395`; `create-event.page.html:809-816`; `guests.page.html:356-402`); erros sem `aria-invalid`/`aria-describedby` (`create-event.page.html:204-220,251-283`); `<th>` sem `scope` nas 4 tabelas. Pontos fortes: foco visível, `aria-live`, `prefers-reduced-motion`, `role="status"` no skeleton.
- **Risco de estado:** durante esta auditoria, outro processo modificou `app.routes.ts`, `api.models.ts`, `mappers.ts`, `team-errors.ts`, `translations.ts`, `models.ts`, `teams.store.spec.ts`, `tasks.page.ts`, `team.page.html`, `team.page.ts`, `action-menu.component.ts`, `avatar-stack.component.ts` e criou `team-form-dialog.component.ts`, `team-detail.page.ts`, `team-detail.page.html` e specs de `team/` (a lista exata deve ser lida do `git status` no momento da leitura). Por isso, as descrições de `team/*`, `tasks/*` e do mapa de rotas refletem o estado verificado em 2026-11-19 e devem ser reconfirmadas antes de implementar. Nenhuma dessas alterações foi feita por esta auditoria.

---

## 12. Perguntas em aberto para o autor

1. As alterações concorrentes em `feat/equipas` (`team-form-dialog.component.ts`, `team.page.*`, `tasks.page.ts`, `app.routes.ts`) devem ser consideradas a base oficial para os próximos blocos, ou são trabalho temporário a descartar? Evidência: `git status` em §11.
2. O detalhe da equipa deve manter o drawer lateral de membros (`team-detail.page.html:309-330`) ou passar a modal/bottom sheet, como decidido para adicionar/editar/convidar? E a criação de tarefa dentro do detalhe deve ser modal?
3. «Não deve existir gestor sem equipa»: bloquear no backend (`event_managers`, `hostWorkspace.routes.ts:609-618`) ou só obrigar equipa no formulário (`event-detail.page.html:1484-1531`)? E o que acontece aos gestores já existentes sem equipa?
4. Para gestores e membros com apenas telefone, quer convite por WhatsApp/telefone? Hoje só existe email (`host.schemas.ts:318-322`; migrations de `team_members`), e as decisões dizem que quem só tem telefone não recebe notificações.
5. Qual deve ser a validade e a política de revogação do link de convite de evento? Hoje não expira explicitamente, só fica preso ao navegador por cookie de 180 dias (`invitation.repository.ts:590-613`; `env.ts:108-109`).
6. Quer que a data/hora do prazo de resposta e a duração do evento passem a ser visíveis? O anfitrião preenche o prazo, mas o convidado vê só um aviso genérico (`invitation.page.html:472-485`; `invitation.page.ts:21-46`).
7. O atalho «criar conta sem OTP» deve exigir que o convite tenha sido efetivamente reclamado/aceite, ou basta o email constar num convite não revogado como hoje (`invitation.repository.ts:255-273`)?
8. O protótipo estático `public/conta-comigo-auth.html:211-223` deve ser removido do build público ou mantido como referência?
9. Mapas/Google Maps, editor de templates e QR com ícone da plataforma estão confirmados para os blocos seguintes? Não existe base implementada no front (§10).
10. As traduções `pt-AO` devem passar a `pt-PT` comolocale principal? Hoje o serviço usa `defaultValue 'pt-AO'` (`i18n.service.ts:6-18`).

---

## 13. Resultado de `build` e `lint`

**`build` — executado duas vezes, sem alterações de código por esta auditoria:**

| Execução | Comando | Resultado | Evidência |
|---|---|---|---|
| 1 (antes das alterações concorrentes) | `npm run build` | **SUCESSO**, exit 0, 88,803 s; initial total 746,79 kB; sem erros | `apupu_front/package.json:7`; saída registada em `/tmp/opencode/audit-build.log` |
| 2 (após criação do `team-form-dialog`) | `npm run build` | **SUCESSO**, exit 0, 11,052 s; `team-page` lazy chunk subiu de 30,21 kB para 49,05 kB | saída da consola; `apupu_front/dist/conta_comigo_front` |
| 3 (estado final verificado, com `team-detail.page.*`) | `npm run build` | **SUCESSO**, exit 0, 10,689 s | saída da consola; `apupu_front/dist/conta_comigo_front` |

**`lint` — NÃO ENCONTRADO:**

- `npm run lint` → `npm error Missing script: "lint"` (exit 1). Causa: não há script `lint` em `apupu_front/package.json:4-12`.
- `npx ng lint` → `Cannot find "lint" target for the specified project. You can add a package that implements these capabilities. For example: ESLint: ng add angular-eslint` (exit 1). Causa: não há target `lint` em `apupu_front/angular.json:16-107` e não há ficheiro `eslint*`/`*lint*` no projeto (pesquisa na raiz, excluindo `node_modules`).
- **Não foi instalado nem configurado nada** para suprir esta lacuna.

**Verificação(TypeScript adicional, não substitui o build):** `npx tsc -p tsconfig.app.json --noEmit --incremental false --noUnusedLocals --noUnusedParameters` → exit 2 com 3 erros TS6133 (`create-event.page.ts:7`, `team-form-dialog.component.ts:1`, `phone-mask.directive.ts:14`). O build oficial não usa essas flags e passa.
