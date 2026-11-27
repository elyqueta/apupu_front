# Bloco 11 — Comunidades e equipas (grupos)

> Depende dos Blocos 9 e 10. Branch: `feat/bloco-11-comunidades`. Backend e frontend. **Lê primeiro as migrações de equipas e `team_members` (Bloco 2) antes de desenhar.**

## Objetivo

Uma **comunidade** reúne pessoas em torno de um propósito (ex.: Ministério dos Adolescentes). Tem equipas, membros e eventos. As **equipas** passam a ser grupos reutilizáveis, que podem gerir vários eventos.

## Regras de produto (decididas)

**Entidades e independência**
- Evento pode existir **sem** comunidade (só com anfitrião). Comunidade pode existir sem instituição. Equipa pode existir sem comunidade, mas tem **sempre um criador**.
- Só contas de **anfitrião** criam comunidades, eventos e equipas.

**Comunidade**
- Papéis: `owner` (responsável, **um só**), `manager` (gestores), `member`.
- Visibilidade `public | private`. Pública: visível no feed, qualquer pessoa **com conta** pode **pedir adesão**; gestores ou responsável aprovam/recusam. Privada: só por convite de gestor/responsável.
- Membros podem sair quando quiserem (o responsável não pode sair sem transferir antes). Gestores/responsável podem remover membros.
- Quem é membro pode **partilhar os eventos públicos** da comunidade e convidar pessoas.
- **Eventos da comunidade**: configurações alteradas por gestores e responsável. **Só o responsável** apaga evento com confirmados, com confirmação escrita do nome (Bloco 10).
- **Transferência de responsabilidade**: iniciada pelo responsável; o destinatário tem de ser **gestor ou membro com conta de anfitrião**; passos: (1) OTP por e-mail ao responsável atual, (2) o destinatário aceita, (3) troca atómica de papéis (o anterior passa a gestor). Telefone entra mais tarde. Auditar.

**Equipas (como grupos de WhatsApp)**
- Uma equipa tem criador, gestor(es) e membros. Um utilizador pode estar em **várias equipas**.
- **Só o criador** associa a equipa a outros eventos (um, vários ou todos os da comunidade).
- Só gestores ou criador **convidam** e **removem** membros. Membros **saem quando quiserem**.
- Preparar o modelo para chat futuro (não implementar chat).
- A regra do Bloco 2 mantém-se: uma equipa tem um gestor ativo com link + código de acesso; membros sem conta continuam suportados.

**Partilha rastreada**
- Link público de evento aceita `?ref=<código do membro>`; guarda-se `invitations.referrer_member_id`. Estatísticas por membro (convites aceites por cada um) visíveis a gestores/responsável; o membro vê só as suas.

## Passo 1 — Backend: modelo e migração de equipas

Migração reversível, não destrutiva:
- `communities (id, name, slug unique, description, visibility, owner_id → hosts, avatar_url, avatar_public_id, cover_url, cover_public_id, created_at, deleted_at)`.
- `community_members (community_id, host_id null, email null, phone null, role, status active|invited|left|removed, joined_at)`; um `owner` ativo por comunidade (índice parcial único).
- `community_join_requests (id, community_id, host_id, message, status pending|approved|rejected|cancelled, decided_by, decided_at)`; um pedido pendente por par.
- `community_ownership_transfers (id, community_id, from_host_id, to_host_id, otp_hash, otp_expires_at, attempts, status pending_otp|pending_accept|completed|cancelled|expired)`; reutilizar a tabela/serviço de OTP existente (purpose `community_transfer`), TTL, tentativas e cooldown.
- `events.community_id uuid null references communities`.
- Equipas: `teams.creator_id uuid` (backfill = anfitrião do evento atual), `teams.community_id uuid null`. **Nova tabela `team_events (team_id, event_id, created_at)`**: backfill com o `event_id` atual de cada equipa; **manter `teams.event_id`** como legado deprecado (leitura) até um bloco futuro; novas equipas escrevem em `team_events`. Todas as queries de tarefas/membros passam a resolver o evento por `team_events`. Regista a estratégia em `DECISIONS.md`.
- `invitations.referrer_member_id uuid null`.

## Passo 2 — Backend: serviços e rotas

Segue os padrões existentes (rotas em `routes/v1`, schemas Zod, serviços, repositórios).
- Comunidades: CRUD (`POST/GET/PATCH/DELETE /host/communities…`), membros (listar, convidar, remover, sair, mudar papel), pedidos (`POST /host/communities/:id/join-requests`, aprovar/rejeitar), transferência (`POST …/transfer/start`, `…/transfer/verify-otp`, `…/transfer/accept`, `…/transfer/cancel`).
- Imagem e capa: `POST /host/communities/:id/{avatar,cover}/upload` (multipart, campos `avatar`/`cover`), `DELETE …/{avatar,cover}` e variantes por URL (`POST …/{avatar,cover}`); o `public_id` anterior é limpo no Cloudinary.
- Equipas: criar sem comunidade ou dentro de uma; `POST /host/teams/:id/events` (só criador), `DELETE …/events/:eventId`; sair (`POST …/leave`); convidar/remover só criador/gestor.
- Criar evento dentro de uma comunidade: `community_id` no corpo; só gestores/responsável.
- Permissões num único módulo (`communityPermissions`), com testes negativos para cada papel.
- Notificações (e-mail, outbox existente): pedido de adesão recebido, aprovado/recusado, transferência iniciada/concluída.
- Estatísticas: `GET /host/communities/:id/referrals`.

## Passo 3 — Frontend

Tudo o que cria/edita/convida em `app-modal` (`dialog`, Bloco 9).
1. Menu: "Comunidades" (lista dos meus), `/comunidades`, `/comunidades/:slug`.
2. **Perfil da comunidade** (estilo da página de perfil: capa + avatar): nome, descrição, visibilidade, eventos (próximos/passados), equipas, membros (visíveis só a membros), botão "Pedir para entrar" / "Sair".
3. Separadores (rail como no evento): Resumo, Eventos, Equipas, Membros, Pedidos, Definições. Pedidos e Definições só para gestores/responsável.
4. Modais: criar/editar comunidade; convidar membro; decidir pedido; transferir responsabilidade (passo OTP + aceitação); associar equipa a eventos (multisseleção, "todos os eventos").
5. **Equipas**: na página de equipas, mostrar comunidade e nº de eventos; no detalhe, secção "Eventos da equipa" (só o criador edita) e botão "Sair da equipa".
6. **Eventos**: no wizard, escolher "Evento pessoal" ou "Evento da comunidade X". Apagar evento da comunidade só para o responsável.
7. Membro: botão "Copiar link de partilha" nos eventos públicos da comunidade (inclui `?ref=`) + estatísticas "As minhas partilhas".
8. Cards de pessoas com `app-person-card`; estados carregar/vazio/erro/sucesso; textos pt-PT e `en`.

## Critérios de aceitação

- [ ] Migração sobe e desce; nenhuma equipa existente perde o evento; testes de migração.
- [ ] Evento sem comunidade, comunidade sem instituição e equipa sem comunidade funcionam.
- [ ] Pedido de adesão aprovado por gestor/responsável; membro novo pode partilhar com `?ref=`.
- [ ] Transferência exige OTP e aceitação; só para gestor/membro com conta; auditada.
- [ ] Só o criador associa equipas a eventos; membros saem; só gestores/criador convidam/removem.
- [ ] Só o responsável apaga evento com confirmados.
- [ ] Testes de permissões por papel (back) e dos modais (front); `build`, `lint`, `test`, `typecheck` verdes; `docs/REPORT-BLOCO-11.md`.

## Fora de âmbito

Chat de equipa, feed, instituições, SMS/WhatsApp automático, importação em lote.
