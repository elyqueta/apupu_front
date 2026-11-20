# Plano — Bloco 8 (frontend): perfis no admin e relatórios PDF

## Objectivo

Mostrar fotos dos utilizadores nos cards do painel `/admin`, abrir um detalhe com
o estilo da página de perfil do anfitrião (capa, avatar, eventos, equipas, etc.) e
disponibilizar relatórios PDF: por perfil e o relatório global semanal para
download no painel.

## Decisões já confirmadas

| Tema | Decisão |
| --- | --- |
| Entrega do relatório global | Download no `/admin` |
| Periodicidade | Semanal (gerada pelo backend à segunda-feira, 09:00 Luanda) |
| Formato | PDF |
| Modal de detalhe | Espelha a página de perfil do anfitrião, incluindo capa |
| Novas dependências | Nenhuma |

## Fases

### 1. Modelos e repositório

- `admin.models.ts`: estender `AdminUser` com `avatarUrl`, `coverUrl`, `phone`,
  `locale`, `timezone`, `birthDate`, `emailVerifiedAt` e `profileComplete`;
  acrescentar `AdminUserDetail extends AdminUser` com `events` (campos já
  existentes em `AdminEvent`) e `teams: AdminProfileTeam[]`.
- `AdminUserDto` e `mapAdminUser`: aceitar os campos `snake_case` novos e
  mapeadores para o detalhe rico (`mapAdminUserDetail`), mantendo os fallbacks
  `camelCase` actuais.
- Novos tipos `AdminWeeklyReport` (`id`, `weekStart`, `generatedAt`, `filename`,
  `sizeBytes`, `hostCount`) e `mapAdminWeeklyReport`.
- `admin.repository.ts`: `userDetail()` passa a usar `mapAdminUserDetail`; novos
  métodos `exportUserReport(userId)`, `exportAllUsersReport()`,
  `weeklyReports()` e `weeklyReportDownload(reportId)`, todos assentes em
  `ApiClient.download()` (o mesmo padrão de `exportNewsletterCsv`). Nomes de
  ficheiro via `DownloadService.save(file, fallback)`.

### 2. Cards de utilizador

`admin-users.component.ts`: no card `<li data-testid="admin-user-card-…">`,
acrescentar `<app-avatar size="md" [name]="user.displayName || user.email"
[imageUrl]="user.avatarUrl" />` ao lado do nome/email. Sem foto, o componente
já desenha as iniciais — não é preciso fallback novo. Manter filtros,
paginação, acções e `requestSeq` intactos.

### 3. Modal de detalhe com estilo de perfil

`admin-user-detail-dialog.component.ts` (evoluir o componente actual):

- `app-modal size="lg"` com o título actual.
- Capa: bloco `relative h-40 sm:h-48` com gradiente
  `from-brand/50 via-aqua/30 to-secondary/50`, `<img [src]="user.coverUrl">` em
  `object-cover` quando existir e overlay igual ao de `profile.page.html`.
- Avatar: `<app-avatar size="2xl" [name] [imageUrl]>` com `ring-4 ring-surface`,
  sobreposto na transição capa/corpo.
- Nome, email, papéis/estado e badges; linha de estatísticas (eventos, equipas,
  convidados) em `<dl>` responsivo, com os tokens existentes.
- Secções “Eventos” e “Equipas associadas” com tabelas/listas compactas e
  estados via `app-status-badge` quando aplicável; mensagem
  `admin.users.detail.noEvents` / nova `…noTeams` quando vazias.
- Botão “Exportar PDF” no rodapé (`app-modal-footer`), usando o novo
  `exportUserReport`; `exporting` signal e `ToastService` para sucesso/erro.
- Inputs mantidos: `open`, `user`; acrescentar `detail` (quando o serviço devolver
  o objecto rico) e `loading`. Outputs: `closed` e `exportPdf`. Alternativamente
  o próprio diálogo pode injectar `AdminRepository` — escolher a opção que
  exigir menos alterações ao componente pai e mantiver os testes actuais.

### 4. Aba “Relatórios” no `/admin`

- Novo componente `admin-reports.component.ts` (standalone, signals):
  - botão “Exportar todos os perfis” (`exportAllUsersReport`);
  - tabela dos relatórios semanais com semana, data de geração, tamanho e
    botão “Descarregar” por linha;
  - `SkeletonComponent` no carregamento, `ToastService` nos erros,
    `app-pagination` não é necessária (máx. 12 linhas).
- Registo em `app.routes.ts`: `/admin/relatorios` com
  `title: pageTitle('route.admin.reports')`, dentro do `canActivate:
  [superAdminGuard]`.
- `admin.page.ts`: nova entrada em `navItems` com `ICONS['download']` (ou
  `ICONS['chartSimple']` se o ícone de download não existir na barra).

### 5. i18n

Novas chaves em **PT e EN** (`block8-keys.ts`, registado no barrel de
traduções), sem texto hardcoded nos templates:

- `admin.nav.reports`, `route.admin.reports`;
- `admin.users.avatar`, `admin.users.detail.cover`, `admin.users.detail.phone`,
  `admin.users.detail.locale`, `admin.users.detail.timezone`,
  `admin.users.detail.verified`, `admin.users.detail.eventsSection`,
  `admin.users.detail.teamsSection`, `admin.users.detail.noTeams`,
  `admin.users.detail.members`, `admin.users.detail.exportPdf`,
  `admin.users.detail.exporting`, `admin.users.exportError`;
- `admin.reports.title`, `subtitle`, `exportAll`, `exporting`, `exported`,
  `exportError`, `week`, `generatedAt`, `size`, `hosts`, `download`,
  `empty`, `error`, `weeklyHint`.

Reutilizar `reports.exportPdf`, `reports.exporting`, `common.notAvailable`,
`common.close`, `admin.pagination.*` e `admin.users.role.*`/`status.*`.

### 6. Testes

- `admin-users.component.spec.ts`: estender o fixture com `avatar_url` e
  acrescentar teste de clique em `admin-user-view` → `GET /admin/users/:id`
  com capa/avatar/eventos/equipas → diálogo mostra os nomes.
- Novo `admin-user-detail-dialog.component.spec.ts`: capa com `src`, avatar,
  secções de eventos/equipas, botão de export PDF com `HttpTestingController` e
  `DownloadService.save` espiado (padrão de `admin-newsletter.component.spec.ts`).
- Novo `admin-reports.component.spec.ts`: listagem semanal, download com nome do
  ficheiro e export global, erro via `ToastService`.
- Actualizar `admin.page`/routes se algum testo de navegação existir.

### 7. Verificação obrigatória

`npx tsc --noEmit` · `npm run lint` · `npm test -- --watch=false` ·
`npm run build`.

### 8. Documentação

- `docs/REPORT-BLOCO-8.md`: resumo, ficheiros, decisões e verificação.
- Actualizar `docs/GUIA-ACESSO-ADMIN.md` com o caminho da nova aba e o local
  dos downloads semanais.

## Melhoria — exposição explícita da atividade administrativa

Substituir as chaves cruas e o ator “Sistema” por descrições legíveis em PT/EN.

- Mapa único e completo `ADMIN_ACTION_KEYS` em `admin.models.ts`, com todas as
  acções escritas pelo backend (`admin_*`, `support_message_resolved`,
  `newsletter_subscription_removed`) e as legadas; usado por “Atividade
  recente” e “Auditoria”.
- `adminActionLabel()` e `adminTargetLabel()` centralizados: acção descrita no
  passado, tipo de alvo traduzido (`Conta`, `Evento`, `Apoio`, …) e acções
  desconhecidas identificadas pelo código em vez de escondidas.
- `AdminActivityDto` aceita `admin_email`/`admin_name` e usa-os como ator;
  fallback explícito para “Super admin” quando o backend não os enviar.
- Testes de mapeamento e de renderização das duas vistas.

## Fora de âmbito

- Reenviar relatórios por email ou colocá-los em serviço de objectos.
- Alterar a página pública de perfil do anfitrião; apenas se replica o estilo
  no modal admin.
- Promover utilizadores a super admin pela UI.
