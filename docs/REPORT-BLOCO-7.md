# Relatório — Bloco 7: controlos públicos, apoio e novidades (frontend)

**Data:** 2026-11-20  
**Branch:** `feat/ajustes-fase-4` (sem push, merge, rebase, `reset --hard` nem eliminação de branches).  
**Fontes:** `docs/PLANO-BLOCO-7.md` (plano escrito antes do código), `docs/DECISIONS.md`, `docs/GUIA-ACESSO-ADMIN.md`.  
**Backend correspondente:** `apupu_back/docs/REPORT-BLOCO-7.md` (migrações 0023/0024 e rotas `/public/support`, `/public/newsletter`, `/admin/support`, `/admin/newsletter`).

## Resumo

O bloco torna funcionais os botões de idioma e tema na landing e no fluxo de autenticação, substitui os `mailto:` de apoio por um modal que guarda a mensagem no backend e a expõe no painel super admin, acrescenta o formulário de novidades no rodapé da landing com gestão em `/admin`, e documenta o acesso privilegiado ao painel. Os blocos 5 e 6 permanecem integrados na mesma branch.

## Commits

| Commit | Conteúdo |
|---|---|
| `4bc678f` | Plano do bloco 7 |
| `4602956` | Lista de mensagens de apoio no admin e diálogo de detalhe |
| `21d9ff3` | Lista de novidades no admin, remoção e exportação CSV |
| `05f0da2` | Specs das duas abas de admin |
| `7e80e8f` | Teardown resiliente do TestBed nas specs de admin |
| `b3a458f` | Tradução da página de autenticação |
| `6316558` | Tradução das páginas de recuperação de senha |
| `ea728d1` | Chaves i18n do bloco 7, bootstrap do locale e protecção de `documentElement` |
| `4e6fcbe` | Modal de apoio e repositórios públicos de apoio/novidades |
| `05dbd42` | Formulário de novidades no rodapé e pontos de entrada de apoio |
| `3bb76f9` | Controlos de idioma/tema, SEO reactivo e tradução das páginas públicas |
| `729e6ae` | Ligação das abas de apoio/novidades ao painel e rotas `/admin/*` |

## O que foi implementado

### A. Idioma e tema nas páginas públicas

- `app-preference-controls` passou a estar visível na landing; os botões usam `min-h-11`/`min-w-11` (alvos de toque de 44 px) e os rótulos vêm de `i18n.t()`.
- `auth-layout.component.ts`: o botão de idioma deixou de ser placeholder e chama `i18n.toggleLocale()`; o botão de tema usa `ThemeService`.
- `I18nService` aplica o locale guardado a `<html lang>` no bootstrap e em cada troca. O acesso a `documentElement` é protegido para SSR/testes; `localStorage` é envolvido em `try/catch`.
- `auth.page.ts` e `password.page.ts`: todos os textos, placeholders, `aria-label`s e toasts passaram a ler chaves `auth.*`/`password.*`. O gerador OTP usa `auth.otpDigit` com parâmetro `{number}`.
- `landing.page.ts`: `effect()` actualiza `Title`, `meta description`, `og:title` e `og:description` quando o idioma muda; `app.routes.ts` resolve os títulos com `pageTitle(TranslationKey)`.
- `block7-keys.ts` contém 169 entradas por variante (`pt-AO` e `en`), registadas em `translations.ts`. Os textos visíveis são pt-PT.

### B. Apoio

- `SupportDialogComponent` (`features/landing/`) reutiliza `app-modal`: nome, email e mensagem com validação reactiva, estados de envio/erro e confirmação. A saída chama-se `submitted` para não colidir com o sinal `sentFlag()`.
- `POST /api/v1/public/support` enviado por `SupportRepository`; erros são traduzidos para `support.error.generic`, sem detalhes técnicos na interface.
- O modal é aberto a partir da landing (`landing-ns2.component.ts`) e de Definições (`settings.page.html` deixou de usar `mailto:`). `landing.ns2.supportUrl` ficou sem uso.
- `/admin/apoio`: lista paginada com pesquisa, filtro de estado e intervalo de datas, detalhe da mensagem e acção “marcar como resolvida” (com confirmação). Não existe resposta por email.

### C. Novidades

- `LandingFooterComponent` apresenta o formulário de subscrição e envia `POST /api/v1/public/newsletter` por `NewsletterRepository` (idempotente no backend por email normalizado, sem email de confirmação).
- `/admin/novidades`: lista paginada com pesquisa e intervalo de datas, remoção com confirmação e exportação CSV através do endpoint `/admin/newsletter/export`.

### D. Acesso administrativo

- `/admin` continua a abrir apenas por URL directa; `superAdminGuard` lê `is_super_admin`/`isSuperAdmin` da sessão e o backend reforça a verificação em `/api/v1/admin/*`.
- `docs/GUIA-ACESSO-ADMIN.md` descreve: criação/confirmação da conta, promoção exclusiva por `UPDATE hosts SET is_super_admin = true WHERE email = '<email>';`, logout/login para actualizar a sessão e verificações rápidas. Não existe rota, botão nem script de promoção.

### E. Documentação

- `docs/DECISIONS.md` regista as decisões do bloco; `docs/REPORT-BLOCO-6.md` foi alinhado com a substituição do `mailto:` pelo modal do bloco 7.

## Decisões principais

Ver a secção “Bloco 7” em `docs/DECISIONS.md`. Em resumo: URL directa para `/admin`, promoção só por SQL; apoio sem resposta por email; subscrição directa sem confirmação; input no rodapé com gestão completa no admin; textos pt-PT com variante `en`; mesmo modal de apoio na landing e em Definições; datas em `Africa/Luanda`.

## Verificação

Comandos executados na raiz de `apupu_front`:

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` | Passou |
| `npm run lint` | Passou — 0 erros; 24 avisos pré-existentes (`array-type`, `no-output-native`, `label-has-associated-control`) |
| `npm run build` | Passou — bundle browser e SSR gerados em `dist/conta_comigo_front` |
| `npm test -- --watch=false` | Passou — **43 ficheiros, 178 testes** |

Não foram adicionadas dependências nem segredos. Nenhuma operação de git foi enviada para remoto.

## Testes manuais sugeridos

1. Em `/`, alternar PT/EN e claro/escuro; confirmar que o título da página, a descrição e os textos mudam e que `<html lang>` acompanha o idioma.
2. Recarregar a página e confirmar que idioma e tema persistem.
3. Abrir `/entrar`, `/criar-conta`, `/recuperar-senha` e `/redefinir-senha`; trocar o idioma no tipo de letra do cabeçalho e confirmar que textos e toasts traduzem.
4. Na landing e em Definições, abrir “Falar com a equipa de apoio”, submeter uma mensagem e verificá-la em `/admin/apoio`; marcar como resolvida e confirmar o estado.
5. No rodapé da landing, subscrever um email e confirmar a entrada em `/admin/novidades`; pesquisar, remover e exportar CSV.
6. Sem `is_super_admin`, confirmar que `/admin` redireciona para `/painel`; após promoção por SQL e novo login, confirmar o acesso às seis abas.
