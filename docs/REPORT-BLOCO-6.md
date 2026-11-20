# Relatório — Bloco 6: Landing page e painel Super Admin (frontend)

**Data:** 2026-11-20  
**Branch:** `feat/ajustes-fase-4` (sem push, merge, rebase ou eliminação de branches).  
**Fontes:** `docs/bloco-6-landing-e-super-admin.md` (especificação), `docs/PLANO-BLOCO-6.md` (plano escrito antes do código) e `docs/DECISIONS.md`.

## Resumo

O bloco 6 executa a Parte E do bloco 5: uma landing pública em `/` e uma área `/admin` protegida por guard, com visão geral, eventos, utilizadores e auditoria. O cancelamento de evento exige motivo e OTP por e-mail. A faixa “Protótipo” do topo das páginas públicas foi removida a pedido do utilizador (ver abaixo).

## Commits

| Commit | Conteúdo |
|---|---|
| `8caae35` | Especificação da landing e do super admin |
| `6ee2160` | Chaves i18n do bloco 6 em ficheiro próprio |
| `1056029` | Landing, área de administração e rotas (inclui a rota `/mensagens`) |

## O que foi implementado

### Landing (`src/app/features/landing/**`)
- `landing.page.ts` + `landing.page.html`: rota `/`, primeira tela pública.
- Secções standalone: hero, benefícios, passos, para quem é, sobre, NS2 Innovation e rodapé.
- `public-shell.component.ts`: casca comum das páginas públicas (fundo e altura mínima), sem faixas no topo.
- Componentes reutilizáveis, mobile-first, tema claro/escuro, sem imagens novas nem dependências.
- SEO básico (título, meta description e Open Graph) aplicado via `Title`/`Meta` no `landing.page.ts`.

### Admin (`src/app/features/admin/**`)
- `admin.page.ts` + `admin.page.html`: layout com abas (visão geral, eventos, utilizadores, auditoria).
- `admin.guard.ts` + `admin.guard.spec.ts`: `superAdminGuard` lê a sessão e redireciona quem não é super admin; respostas de acesso negado genéricas.
- `admin.repository.ts` + `admin.models.ts`: chamadas paginadas a `/admin/*` com pesquisa na API.
- `admin-overview.component.ts`: 4 cards de estatísticas e atividade recente.
- `admin-events.component.ts`: lista paginada, detalhe só de leitura e ação “Cancelar evento”.
- `admin-cancel-dialog.component.ts`: motivo obrigatório + OTP de 6 dígitos por e-mail, reenvio e erros formatados em pt-PT.
- `admin-users.component.ts` + `admin-user-detail-dialog.component.ts`: lista, detalhe, suspender/reativar e revogar sessões; bloqueio de auto-suspensão e de remoção do próprio papel.
- `admin-audit.component.ts`: registo de auditoria só de leitura (quem, o quê, quando, motivo).
- `admin-pagination.component.ts`: paginação partilhada (10 por página).
- Mapeadores tolerantes a `snake_case`/`camel_case` para alinhar com o DTO final do backend.

### Rotas e infraestrutura
- `app.routes.ts`: `/` → landing dentro da casca pública; `/entrar`, `/criar-conta`, recuperação, gestão e convites públicos na mesma casca; `/admin` com `superAdminGuard`; `/mensagens` na casca autenticada.
- `block6-keys.ts`: 216 chaves PT e 216 EN, resolvidas por `translations.ts`.
- Sem aviso de protótipo no topo: a faixa foi removida por pedido do utilizador (registo em `DECISIONS.md`).

## Verificação

- `npx tsc --noEmit` — 0 erros.
- `npm test -- --watch=false` — suíte completa aprovada (landing, guard, admin e restante app).
- `npm run lint` — 0 erros; avisos legados pré-existentes.
- `npx eslint src/app/features/landing src/app/features/admin src/app/core/i18n/block6-keys.ts src/app/app.routes.ts` — 0 erros e 0 avisos.

## Testes manuais sugeridos

1. Abrir `/` em 360 px e 1440 px: hero, benefícios, passos, para quem, sobre, NS2, CTA e rodapé; verificar contraste e foco. Confirmar que não existe faixa “Protótipo” no topo desta nem das páginas públicas.
2. Com sessão ativa, confirmar que `/` encaminha para `/painel` e que `/admin` abre a área de administração.
3. Sem papel de super admin, confirmar redirecionamento genérico para `/painel` em todas as rotas `/admin/*`.
4. Em `/admin/eventos`, cancelar um evento: motivo obrigatório, OTP por e-mail, reenvio, erro genérico em código inválido e auditoria gravada.
5. Em `/admin/utilizadores`, confirmar que não é possível suspender a própria conta nem remover o próprio papel.

## Alinhamento com o backend

- O guard depende de `is_super_admin` (ou `isSuperAdmin`) na resposta de sessão; o backend expõe agora essa flag em `GET /auth/session` → `data.host.is_super_admin` (commit `d974746` no backend).
- Os contratos `/admin/*` seguem o plano e os mapeadores aceitam `snake_case`/`camel_case`, alinhados com a implementação final do backend.
- O botão de apoio da landing usa o modal do Bloco 7 (`POST /api/v1/public/support`); `landing.ns2.supportUrl` deixou de ser usado. O mesmo modal é usado em Definições — ver `docs/REPORT-BLOCO-7.md`.

## Notas

- Nenhuma dependência nova; nenhum segredo acrescentado.
- Promoção a super admin apenas por SQL direto, sem UI: ver `apupu_back/docs/PLANO-BLOCO-5.md`.
- Decisões em `docs/DECISIONS.md`; bloqueios e limitações em `docs/BLOCKERS.md`.
