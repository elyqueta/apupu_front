# Bloco 12 — Feed público, pesquisa, amigos e documentação

> Depende dos Blocos 10 e 11. Branch: `feat/bloco-12-feed`. Backend e frontend. SSR ativo: páginas públicas com título/meta corretos.

## Objetivo

A plataforma abre num **feed público**, gratuito e sem login, para descobrir eventos públicos, comunidades e pessoas. Visitantes sem conta veem o essencial e são incentivados a criar conta (como o Facebook).

## Regras de produto (decididas)

- **`/` = feed público**. A landing passa a **`/sobre`**. Isto **substitui** a regra do Bloco 6 (quem tem sessão ia de `/` para `/painel`): remover esse redirect.
- Após login/registo (incluindo Google), o utilizador vai para `/` (feed). O painel do anfitrião fica em `/painel`; cabeçalho do feed mostra "Ir para o painel" quando há sessão e anfitrião.
- Feed mostra **só eventos públicos** (e comunidades/perfis públicos). Eventos privados só a convidados e membros (nunca no feed nem em pesquisas).
- **Sem conta**: vê todos os eventos públicos e cards de comunidades públicas; para ver **detalhes de perfis** (amigos/comunidades em comum, lista de eventos do perfil) aparece o convite a criar conta.
- Perfil privado nunca aparece (feed, pesquisa, sugestões).
- **Eventos já realizados não aparecem no feed principal** (só próximos e a decorrer). Os realizados aparecem nos **detalhes do perfil da comunidade** e do **anfitrião com perfil público** (secção "Eventos anteriores"), cada um com a **imagem de capa e o estilo do template** (pré-visualização gerada pelo mesmo renderer de templates do Bloco 14/15; sem capa, usa a arte do template). Visíveis a quem tem conta; sem conta, só os cartões limitados com CTA.
- **Amigos**: pedido de amizade → aceitar/recusar; só entre contas. Perfis públicos mostram, a quem tem conta, **amigos em comum** e **comunidades em comum**.

## Passo 1 — Backend

- `GET /public/feed?cursor=&type=events|communities|people&q=&category=` — paginação por cursor, 12 por página, só entidades públicas; eventos com `ends_at`/`starts_at` futuro ou a decorrer; `people` só com `profile_visibility = public`, devolve nome e avatar (sem e-mail/telefone/data de nascimento).
- `GET /public/search?q=` — pesquisa agrupada (eventos, comunidades, pessoas); `ILIKE` com escape (`like.util`), parâmetros ligados, limite 5 por grupo, rate limit por IP.
- `GET /host/profiles/:id` — detalhe de perfil público (requer conta): eventos públicos, comunidades públicas, contagem de amigos, **comuns** com o utilizador autenticado.
- Amizades: tabela `friendships (id, requester_id, addressee_id, status pending|accepted|rejected|blocked, created_at, responded_at)` com unicidade do par (independente da ordem); rotas pedir, aceitar, recusar, remover, listar; limite de pedidos por dia; notificação in-app/e-mail.
- Nenhum endpoint público devolve dados de contacto.

## Passo 2 — Frontend: feed

1. Rotas: `''` → `FeedPage` (pública, `RenderMode.Server`), `sobre` → `LandingPage` (manter tudo do Bloco 6/7, ajustar links internos e SEO), `painel` mantém-se. Ajustar `authenticatedGuard`, redirects pós-login e os CTAs da landing.
2. **Design do feed** (mobile first, tokens existentes, claro/escuro):
   - Cabeçalho: logo, pesquisa (abre pronta a escrever, como no shell), "Entrar" e "Criar conta" (ou "Ir para o painel" + avatar).
   - Chips de tipo (Eventos, Comunidades, Pessoas) e de categoria; scroll horizontal sem barra visível.
   - **Cards de evento**: capa (sem texto por cima), título, data/hora, local, comunidade, nº de confirmados **só se** `show_attendee_count` estiver ativo, botão "Ver evento" → `/e/:slug`.
   - **Cards de comunidade**: avatar/capa, nome, nº de membros, "Pública". **Cards de pessoa**: avatar, nome; clique sem conta abre modal "Crie uma conta para ver perfis".
   - Grelha `grid gap-3 sm:grid-cols-2 xl:grid-cols-3`, scroll infinito ou "Carregar mais" (44 px), estados carregar/vazio/erro.
   - Faixa discreta para visitantes: "Crie conta para participar em comunidades e ver perfis".
3. Pesquisa do feed com debounce 250 ms, resultados agrupados, cancelamento por sequência (padrão do Bloco 1).
4. Perfil público (`/pessoas/:id`): com conta → detalhes e "em comum"; sem conta → versão limitada + CTA.
5. Amigos: página "Amigos" (lista, pedidos recebidos/enviados), botão "Adicionar amigo" no perfil público, notificações.
6. Comunidade pública (`/comunidades/:slug`) acessível sem conta em modo limitado (sem lista de membros).

- `GET /host/profiles/:id/events?past=true&cursor=` e `GET /host/communities/:slug/events?past=true&cursor=` — eventos públicos realizados (só se o perfil/comunidade for público), com `cover_url` e `template_snapshot` reduzido (id do template + paleta/fontes, sem dados privados).

## Passo 3 — Documentação da aplicação (`/ajuda`)

- Página pública `/ajuda` (e link no rodapé e no menu do utilizador) com guias curtos em pt-PT: criar conta, criar evento e convite, partilhar (link/WhatsApp/copiar), eventos públicos vs privados, comunidades e equipas, gestor com link + código, perfil público/privado, restrição de idade, perguntas frequentes.
- Conteúdo em ficheiros Markdown versionados em `src/content/docs/*.md`, renderizados no cliente/SSR sem nova dependência pesada (parser mínimo próprio para títulos, listas, negrito e links, ou o que o projeto já tiver). Índice lateral no desktop e acordeões no mobile. Pesquisa simples por título.
- Também `docs/GUIA-UTILIZADOR.md` para o repositório, com o mesmo conteúdo.

## Critérios de aceitação

- [ ] `/` abre o feed público sem login; `/sobre` abre a landing (também com sessão iniciada).
- [ ] Visitante vê eventos públicos; perfis só limitados; CTAs de criar conta presentes.
- [ ] Eventos privados e perfis privados nunca aparecem (testes negativos no back).
- [ ] Amizades funcionam; "em comum" só com conta.
- [ ] Pesquisa do feed segura (escape, rate limit).
- [ ] `/ajuda` publicada com os guias; SSR com título e meta.
- [ ] `build`, `lint`, `test`, `typecheck` verdes; `docs/REPORT-BLOCO-12.md`.

## Fora de âmbito

Recomendações personalizadas, feed por geolocalização, chat, notificações push, login Facebook.
