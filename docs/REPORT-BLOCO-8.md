# Relatório — Bloco 8 (frontend)

**Branch:** `feat/ajustes-fase-4`  
**Data:** 2026-11-20  
**Âmbito:** fotos nos cards do admin, modal de perfil e relatórios PDF (sem envio de email).

## Objectivo

Mostrar a foto dos utilizadores nos cards de `/admin/utilizadores`, abrir um
detalhe com o aspecto da página de perfil do anfitrião (capa, avatar, eventos e
equipas) e disponibilizar PDFs: um por perfil e o relatório global semanal, com
download no painel.

## Decisões aplicadas

- O modal usa `app-modal size="lg"` e replica a capa (`h-40 sm:h-48`, gradiente
  `from-brand/50 via-aqua/30 to-secondary/50`) e o avatar (`size="2xl"`,
  `-mt-14 ring-4 ring-surface`) da página de perfil.
- O botão “Exportar PDF” fica no rodapé do modal (`[modal-footer]`). Para evitar
  o aviso NG8011 de content projection, o botão está num `@if (user(); as user)`
  próprio, com um único nó raiz, separado do bloco de conteúdo.
- O PDF individual chama `GET /admin/users/:userId/report`; o global,
  `GET /admin/reports/all`; as semanas arquivadas vêm de
  `GET /admin/reports/weekly` e o download de
  `GET /admin/reports/weekly/:reportId/download`. Todos passam por
  `ApiClient.download()` e `DownloadService.save(file, fallback)`.
- O backend devolve os relatórios semanais já no conteúdo de `data` (o envelope
  é aberto por `ApiClient.get()`), pelo que o repositório não volta a desembrulhar
  `response.data`.
- Nenhuma dependência, segredo ou texto hardcoded novo. Todas as novas chaves
  vivem em `block8-keys.ts`, com PT e EN, e são registadas em `translations.ts`.
- Correcção de segurança relacionada: as rotas `/admin/*` passaram a usar o
  escopo CSRF `auth`, o mesmo da sessão de conta (`apupu_auth`). Sem esta
  alteração, o `X-CSRF-Token` não era enviado nas escritas administrativas e o
  backend respondia `403 csrf_invalid`.
- Atividade explícita: “Atividade recente” e “Auditoria” deixaram de mostrar
  chaves cruas (`admin_users_listed`, …) e o ator “Sistema”. Um mapa único em
  `admin.models.ts` (`ADMIN_ACTION_KEYS`, `adminActionLabel()`,
  `adminTargetLabel()`) descreve todas as acções escritas pelo backend, em PT e
  EN, incluindo as legadas. Acções desconhecidas são identificadas pelo código
  em vez de escondidas. O ator vem de `admin_name`/`admin_email`, com fallback
  explícito para “Super admin”.

## Ficheiros alterados

| Área | Ficheiros |
| --- | --- |
| i18n | `src/app/core/i18n/block8-keys.ts`, `src/app/core/i18n/translations.ts` |
| API | `src/app/core/api/api.interceptor.ts` |
| Modelos e repositório | `src/app/features/admin/admin.models.ts`, `src/app/features/admin/admin.repository.ts` |
| Utilizadores | `src/app/features/admin/admin-users.component.ts`, `src/app/features/admin/admin-user-detail-dialog.component.ts` |
| Relatórios | `src/app/features/admin/admin-reports.component.ts` |
| Navegação | `src/app/app.routes.ts`, `src/app/features/admin/admin.page.ts` |
| Testes | `api.interceptor.spec.ts`, `admin-users.component.spec.ts`, `admin-user-detail-dialog.component.spec.ts`, `admin-reports.component.spec.ts`, `admin-overview.component.spec.ts`, `admin-audit.component.spec.ts` |
| Docs | `docs/PLANO-BLOCO-8.md`, `docs/REPORT-BLOCO-8.md`, `docs/GUIA-ACESSO-ADMIN.md` |

## Dados e segurança

- `AdminUser` passa a incluir `avatarUrl`, `coverUrl`, `phone`, `birthDate`,
  `locale`, `timezone`, `emailVerifiedAt` e `profileComplete`. `AdminUserDetail`
  acrescenta `events[]` e `teams[]`.
- O detalhe é só de leitura: não há edição nem acções novas além da exportação.
- Nenhum DTO do admin expõe `password_hash`, hashes de imagem, `public_id` do
  Cloudinary, tokens ou OTPs.
- `withCredentials` continua activo em todos os pedidos; as escritas
  administrativas enviam o CSRF da sessão de conta.

## Verificação

| Comando | Resultado |
| --- | --- |
| `npx tsc --noEmit` | OK |
| `npm run lint` | OK — 0 erros, 24 avisos preexistentes |
| `npm test -- --watch=false` | 47 ficheiros, 191 testes passados |
| `npm run build` | OK |

## Fora de âmbito

- Envio de relatórios por email.
- Alteração da página pública de perfil do anfitrião; apenas se replicou o
  estilo no modal.
- Promoção de utilizadores a super admin pela UI (continua a ser só por SQL).

## Commits locais (sem push)

- `685f1be` — CSRF da conta nas escritas administrativas
- `e64494e` — modal de detalhe do perfil
- `ca7a22e` — lista de relatórios semanais e download
- `8dd8f0d` — plano, relatório e guia de acesso admin
- `bca3b16` — rótulos legíveis centralizados para as acções de auditoria
- `3378c1a` — ator e alvo explícitos na atividade e na auditoria

