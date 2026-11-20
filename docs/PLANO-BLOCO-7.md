# Plano — Bloco 7: controlos públicos, apoio e novidades (frontend)

**Data:** 2026-11-20  
**Branch:** `feat/ajustes-fase-4` (sem push, merge, rebase ou eliminação de branches).  
**Decisões do utilizador:** ver `docs/DECISIONS.md` (tabela final).

## Objetivo

1. Fazer funcionar os botões de idioma e tema na landing e no fluxo de login.
2. Substituir o `mailto:` de “Falar com a equipa de apoio” por um modal que guarda a mensagem no backend e a mostra no painel super admin (com estado aberto/resolvido).
3. Acrescentar um input de novidades (email) no rodapé da landing, com gestão no painel super admin (listar, pesquisar, remover, exportar CSV).
4. Documentar como entrar no painel `/admin`.

## Parte A — Idioma e tema nas páginas públicas

### Diagnóstico

- O motor i18n está correto (signals + `computed`, zoneless); as 56 chaves da landing existem em PT e EN.
- A landing **não renderiza** `app-preference-controls`; a casca pública também não.
- Em `auth-layout.component.ts:44-53` o botão de idioma é um placeholder (`title="TODO: seletor de idioma"`, sem `(click)`).
- `auth.page.ts` e `password.page.ts` não injetam `I18nService`: todos os textos e toasts são literais PT; não existem chaves `auth.*`.
- `<html lang>` fica `pt-PT` porque `readStoredLocale()` não chama `setLocale()` no bootstrap.
- `LandingPage.applySeo()` corre só no construtor; os `title` das rotas são literais PT.

### Alterações

| Ficheiro | Alteração |
|---|---|
| `core/i18n/i18n.service.ts` | No bootstrap browser, aplicar o locale lido (`documentElement.lang`) sem gravar de novo; envolver `localStorage` em `try/catch`. |
| `shared/components/preference-controls.component.ts` | Garantir rótulo reativo e `aria-label`/`title` corretos; opção de mostrar só o ícone em mobile. |
| `features/landing/landing.page.html` / `.ts` | Controlos de preferência no cabeçalho desktop e no menu móvel. |
| `shared/components/auth-layout.component.ts` | Substituir o botão TODO por `toggleLocale()`; rótulo `PT`/`EN` reativo; traduzir os textos próprios do layout. |
| `features/auth/auth.page.ts`, `features/auth/password.page.ts` | Injetares `I18nService`; substituir **todos** os textos e toasts visíveis por `i18n.t(...)`. Sem texto hardcoded. |
| `core/i18n/block7-keys.ts` (novo) | Chaves PT/EN para auth, apoio, novidades e admin; espalhadas por `translations.ts`. |
| `features/landing/landing.page.ts` | `effect()` para SEO (título/descrição/OG) reagir ao locale. |
| `app.routes.ts` | Títulos das rotas públicas traduzidos via função que lê `I18nService` (sem alterar URLs). |
| `index.html` | Manter o script de tema; `lang` passa a ser atualizado pelo serviço no bootstrap. |

### Testes

- `preference-controls.component.spec.ts` (novo): clique muda `locale`/`tema`.
- `auth-layout.component.spec.ts` (novo): botão de idioma com `(click)` e rótulo reativo.
- `landing.page.spec.ts`: SEO reage a `setLocale('en')`.
- `i18n.service.spec.ts`: bootstrap aplica `documentElement.lang`.

## Parte B — Formulário de apoio

| Camada | Ficheiro | Alteração |
|---|---|---|
| Repositório | `core/data/support.repository.ts` (novo) | `POST /public/support` com `{ name, email, message }`. |
| Modal | `features/landing/support-dialog.component.ts` (novo) | `app-modal`, formulário reativo (`NonNullableFormBuilder`), 44 px, estados erro/sucesso, pt-PT. |
| Landing | `landing-ns2.component.ts`, `landing-footer.component.ts` | Botão abrir modal em vez de `mailto:`; `landing.ns2.supportUrl` deixa de ser usado. |
| Definições | `settings.page.html` | “Falar com a equipa” reutiliza o mesmo modal (consistência). |
| Admin | `features/admin/admin-support.component.ts`, `admin-support-detail-dialog.component.ts` (novos) | Lista paginada + pesquisa + filtro estado; detalhe; “Marcar como resolvida” com confirmação. |
| Admin shell | `admin.page.ts`, `admin.page.html`, `app.routes.ts` | Nova aba `/admin/apoio`. |
| Repositório admin | `admin.repository.ts`, `admin.models.ts` | `supportMessages()`, `supportMessageDetail()`, `resolveSupportMessage()`; mapeadores tolerantes. |
| i18n | `block7-keys.ts` | Chaves do modal, da lista e das ações. |

**Regras:** mensagem de erro genérica em pt-PT; sem dados técnicos; estado `open`/`resolved`; confirmação antes de resolver; toast de sucesso.

## Parte C — Novidades (newsletter)

| Camada | Ficheiro | Alteração |
|---|---|---|
| Repositório | `core/data/newsletter.repository.ts` (novo) | `POST /public/newsletter` com `{ email }`; idempotente. |
| Rodapé | `landing-footer.component.ts` | Input de email + botão “Subscrever”; validação, estados e toast. |
| Admin | `features/admin/admin-newsletter.component.ts` (novo) | Lista paginada, pesquisa, remover (confirmação), exportar CSV. |
| Admin shell | `admin.page.ts`, `admin.page.html`, `app.routes.ts` | Nova aba `/admin/novidades`. |
| Repositório admin | `admin.repository.ts`, `admin.models.ts` | `newsletter()`, `removeNewsletter()`, `exportNewsletterCsv()`; mapeadores. |
| i18n | `block7-keys.ts` | Chaves do formulário, lista, ações e mensagens. |

**Regra:** sem email de confirmação (decisão do utilizador). Remover é destrutivo → `app-confirm-dialog`.

## Parte D — Documentação e acesso ao admin

- `docs/GUIA-ACESSO-ADMIN.md` (novo): passo a passo — criar conta em `/criar-conta`, promover com `UPDATE hosts SET is_super_admin = true WHERE email = '<email>';` (sem valor real), terminar sessão e entrar de novo, abrir `/admin`.
- `docs/REPORT-BLOCO-7.md` (novo): âmbito, commits, verificação, testes manuais.
- `docs/DECISIONS.md`: decisões do utilizador e decisões tomadas durante a implementação.
- Atualizar `docs/REPORT-BLOCO-6.md` apenas onde a informação ficar desatualizada (link de apoio, abas admin).

## Verificação (obrigatória)

- `npx tsc --noEmit` — 0 erros.
- `npm run lint` — 0 erros (avisos pré-existentes permitidos).
- `npm test -- --watch=false` — sem regressões.
- `npm run build` — exit 0.

## Fora de âmbito

- Rota/UI para promover super admin (decisão: continuar só por SQL).
- Resposta por email às mensagens de apoio.
- Confirmação por email das subscrições.
- Alterações de estilo novas: usar apenas os tokens existentes.
