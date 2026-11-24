# Relatório — Bloco 11 (comunidades e equipas)

Branch `feat/bloco-11-comunidades` (front e back), criada a partir da branch do Bloco 10. Sem push/merge/rebase. 24/11/2026.

## Critérios de aceitação

| Critério | Estado | Evidência |
|---|---|---|
| Migração sobe e desce; nenhuma equipa perde o evento; testes de migração. | ✔ | `1739900000029_communities.js`: `migrate up → down → up` OK. Verificação na base local depois do backfill: 4 equipas, 4 ligações em `team_events`, 0 equipas sem o evento principal, 0 sem criador. Não há teste automático de migração contra BD (os testes de BD existentes estão desligados sem base de testes); a verificação foi manual e está aqui registada. |
| Evento sem comunidade, comunidade sem instituição e equipa sem comunidade funcionam. | ✔ | `events.community_id` e `teams.community_id` são opcionais; eventos e equipas existentes continuam iguais (testes do Bloco 10 e anteriores passam). |
| Pedido de adesão aprovado por gestor/responsável; membro novo pode partilhar com `?ref=`. | ✔ | `POST …/join-requests` + `…/decision` (só staff, `communityPermissions.canDecideJoinRequests`). Teste real (curl, base local): evento da comunidade criado, `ref` do membro enviado na confirmação pelo link aberto → `GET …/referrals` devolveu 1 resposta e 1 confirmado. Front: "Copiar link de partilha" acrescenta `?ref=`; `/e/:slug?ref=` envia o código. |
| Transferência exige OTP e aceitação; só para gestor/membro com conta; auditada. | ✔ | `transfer/start` (só o responsável) → OTP por email (`purpose = community_transfer`) → `verify-otp` → `accept` pelo destinatário → troca atómica (anterior passa a gestor). Auditoria `community_transfer_started/completed/cancelled`. Testes em `tests/bloco11.test.ts` (OTP inválido não avança, destinatário sem conta recusado, gestor não inicia). |
| Só o criador associa equipas a eventos; membros saem; só gestores/criador convidam/removem. | ✔ | `PUT /host/teams/:id/events` e `DELETE …/events/:eventId` com `team_creator_only`; "todos" = eventos da comunidade (corrigido após teste real, que mostrou eventos pessoais incluídos). `POST /host/teams/:id/leave`. Convites/remoções de equipa mantêm as regras do Bloco 2. |
| Só o responsável apaga evento com confirmados. | ✔ | `hostEventService.remove` com `communityPermissions.canDeleteEvent`; teste: gestor (mesmo sendo o criador) recebe 403 com confirmados; o responsável apaga. |
| Testes de permissões por papel (back) e dos modais (front); build, lint, test, typecheck verdes; relatório. | ✔ | Back: `tests/bloco11.test.ts` (16 testes, incluindo negativos por papel). Front: `community-detail.page.spec.ts` (visitante, gestor, privada 404, link com `ref`). Ver tabela de verificação. |

## Passo 3 (frontend)

1. Menu "Comunidades"; rotas `/comunidades` (as minhas / descobrir, pesquisa, criar) e `/comunidades/:slug`.
2. Perfil da comunidade com capa e avatar, visibilidade, nº de membros e o meu papel; "Pedir para entrar", "Cancelar pedido", "Sair", aceitar ou recusar convite.
3. Separadores: Resumo, Eventos, Equipas, Membros, Partilhas, Pedidos (staff) e Definições (staff), com contagens e scroll horizontal sem barra visível.
4. Modais: criar/editar comunidade, convidar membro (email/telefone com máscara, papel), decidir pedido, transferir (escolher → código → espera de aceitação), apagar comunidade (escrever o nome). Todas as ações ficam no fim do formulário.
5. Equipas: comunidade e nº de eventos no cartão; no detalhe, "Eventos da equipa" (só o criador escolhe, com "Todos os eventos") e "Sair da equipa".
6. Wizard: "Evento pessoal" ou "Evento da comunidade" (só comunidades onde se é gestor ou responsável; `?comunidade=` pré-seleciona).
7. Partilha: "Copiar link de partilha" nos eventos públicos da comunidade e separador "Partilhas" (o membro vê as suas; staff vê todas).

## Pedidos do autor tratados durante o bloco

- Cartões de equipa, convidado e membro com tamanho uniforme (`auto-rows-fr`, 1/2/3 colunas): no browser, todos os cartões de convidado ficaram com 272 px e as 4 equipas com 385 × 354 px.
- Detalhe da tarefa com autor e responsável persistentes (migração `0030`, `app-task-detail-dialog`).
- Sessão de quem entra com link + código guardada no navegador até o gestor revogar; gerar outro código já não obriga quem entrou a entrar de novo.

## Verificação

| Comando | Resultado |
|---|---|
| back `npm run build` / `typecheck` | OK |
| back `npm run lint` | OK — 0 erros |
| back `npm test` | OK — 355 passados, 89 ignorados |
| back `migrate up → down → up` (0029 e 0030) | OK |
| front `npm run build` | OK |
| front `npx tsc --noEmit` | OK |
| front `npm run lint` | OK — 0 erros, 24 avisos preexistentes |
| front `npm test` | OK — 53 ficheiros, 229 testes (o único teste a falhar, por causa dos campos novos da equipa, foi corrigido e re-executado) |
| Browser (localhost:4200) | Lista e perfil da comunidade a 360 px e desktop, sem scroll horizontal; um único pedido por carregamento. Encontrei e corrigi um ciclo de pedidos (efeito Angular) que chegou a provocar 429. |

Não verificado: o fluxo de transferência completo com duas contas no browser (só uma conta de teste disponível; coberto por testes unitários) e o email real do OTP (outbox).

## Dados de teste deixados na base local

Comunidade "Comunidade Teste Bloco 11" (`/comunidades/comunidade-teste-bloco-11`), com um evento público "Evento comunidade teste", uma equipa "Equipa Comunidade" e uma confirmação "Amigo Partilha". Pode apagá-los em Definições → Apagar comunidade (e depois o evento).

## Commits

Back: `3664194`, `fb1a19f`, `6248c1d`, `dc8257a`.
Front: `a278d6c`, `345cdaa`, `d40830a`, `fa76445`, `7ddec6f`.

## Decisões e bloqueios

`docs/DECISIONS.md` (secções "Bloco 11" e "Pedidos do autor durante o Bloco 11"). `docs/BLOCKERS.md`: observação sobre ações de auditoria fora do `CHECK` (pré-existente).
