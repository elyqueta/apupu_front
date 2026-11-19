# Bloco 3 — Detalhe do evento (painel só do evento, unificado)

> Lê primeiro `REGRAS-GERAIS.md` e `docs/AUDIT.md` (secções 5, 6, 8 e 11). Depende dos Blocos 1 e 2. Branch: `feat/bloco-3-detalhe-evento`.

## Objetivo

1. Quando o anfitrião (ou o gestor) entra num evento, vê **só o que diz respeito a esse evento**, tudo num sítio, sem misturar com o painel geral.
2. Botão de **voltar** sempre visível e claro.
3. Acabar com a duplicação entre `event-detail` (anfitrião) e `management-event` (gestor por link): os dois usam os mesmos componentes, com permissões diferentes.
4. Tudo o que adiciona, edita ou convida abre em modal.
5. Gestão dos gestores do evento (link, código, validade) num separador próprio, simples para utilizadores leigos.

Este bloco é sobretudo **refatoração**. Não alteres regras de negócio além das listadas. O comportamento visível tem de manter-se igual, exceto onde o bloco diz o contrário.

## Passo 1 — Mapear antes de mexer

1. Lê `features/events/event-detail.page.{ts,html}` (≈ 1667 linhas de template) e `features/host-management/management-event.page.{ts,html}` (≈ 679 linhas).
2. Escreve `docs/DECISIONS.md` (secção Bloco 3) com uma tabela: secção do painel → existe em `event-detail`? existe em `management-event`? permissões do gestor (usa `apupu_back/docs/API-CONTRACT.md:563–585` e os endpoints de gestão). Esta tabela é a base da refatoração.
3. Não alteres código neste passo.

## Passo 2 — Extrair secções em componentes partilhados

Cria `apupu_front/src/app/features/events/detail/` com componentes standalone, cada um com menos de 300 linhas, que recebem os dados por `input()` e emitem por `output()`:

| Componente | Conteúdo |
|---|---|
| `event-summary` | Capa, título, data/hora, local, prazo de resposta, estado, ações principais |
| `event-guests-section` | Estatísticas (`app-stat-grid`) + lista de convidados com `app-person-card` |
| `event-teams-section` | Equipas do evento (cards com gestor, membros, tarefas abertas) e atalho para `/equipas/:teamId` |
| `event-tasks-section` | Tarefas do evento (lista, filtro "só as minhas") |
| `event-managers-section` | Gestores: ver Passo 4 |
| `event-activity-section` | Atividade recente, paginada |

Regras:
- Os dois ecrãs (`EventDetailPage` e `ManagementEventPage`) passam a **compor estes componentes**. Cada componente recebe um input `permissions` (objeto com booleanos: `canEditEvent`, `canManageGuests`, `canManageTeams`, `canManageManagers`, `canExport`, `canCancelEvent`) e esconde ou desativa o que não é permitido (com `disabledHint` explicando porquê).
- Cria o modelo `EventPermissions` num único sítio (`core/models`) e duas funções de fábrica: `hostPermissions()` e `managerPermissions(apiContractData)`. As permissões do gestor seguem o contrato do backend; **não inventes permissões**.
- Remove o código duplicado das duas páginas. Os ficheiros `event-detail.page.html` e `management-event.page.html` devem ficar abaixo de **300 linhas** cada.
- Mantém exatamente os mesmos endpoints e stores.
- **`event-guests-section` mantém o que o Bloco 1 definiu para a lista de convidados**: o mesmo `app-person-card` e a mesma grelha da página `/convidados`, **10 por página, paginação e pesquisa (`q`) feitas na API**, filtro por estado no servidor. Ao extrair o componente, não passes esta lógica para o cliente nem aumentes o tamanho da página. O gestor por link vê a mesma lista (com as ações que as suas permissões permitirem).

**Aceitação:** nenhuma funcionalidade existente desaparece (verifica a tabela do Passo 1 linha a linha no relatório); `build` e `test` verdes.

## Passo 3 — Layout e navegação do painel do evento

1. **Cabeçalho do evento fixo** (sticky no topo do conteúdo, por baixo do header do shell em `/eventos/:eventId`; no topo da página em `/gestao/evento/:eventId`): botão **Voltar** à esquerda, nome do evento, estado, e o botão de ação principal (ex. "Convidar"). Mobile: voltar com ícone + texto curto.
   - Anfitrião: "Voltar aos eventos" → `/eventos`.
   - Gestor por link: "Voltar" → `/gestao`.
   O botão tem de estar **sempre visível** (sem o utilizador ter de rolar até ao fim; remove os "Voltar" duplicados no fim da página).
2. **Separadores** (barra horizontal com scroll em mobile, estado na query `?separador=`): Resumo, Convidados, Equipas e tarefas, Gestores, Atividade. O separador por defeito é Resumo. Cada separador carrega só os seus dados (lazy), com `app-skeleton`.
3. Indicação de contexto: mostra por cima do título "Evento" ou o tipo do evento (`HostEvent.type`) numa linha pequena. **Sem breadcrumbs completos** (não existem no produto).
4. O gestor sem conta vê a faixa de CTA "Crie a sua conta" (já criada no Bloco 2) fixa abaixo do cabeçalho.
5. Em desktop (≥ `lg`), o Resumo mostra duas colunas (conteúdo principal + lateral com estatísticas e ações). Em mobile, uma coluna.

**Aceitação:** em 360 px o botão voltar está visível sem scroll; os separadores funcionam por URL (`?separador=convidados`); recarregar mantém o separador.

## Passo 4 — Separador Gestores (link, código, validade)

Usa `app-person-card` para cada gestor (nome ou contacto, equipa, estado do link: "Ativo até {data}", "Expirado", "Revogado", "Bloqueado temporariamente"). Menu de 3 pontinhos (só se `canManageManagers`):
- **Copiar mensagem de convite** (só disponível logo após gerar; depois, "Gerar novo código" primeiro).
- **Gerar novo código** (abre modal de confirmação com aviso de que o link e o código antigos deixam de funcionar; depois mostra o modal de "link e código" do Bloco 2, com copiar e WhatsApp).
- **Alterar validade** (modal com seletor limitado ao máximo; mostra o máximo permitido: "até {data}, 1 dia depois do fim do evento").
- **Revogar acesso** (confirmação).
- **Remover gestor** (confirmação; mostra que a equipa se mantém).

Botão principal da secção: **"Novo gestor"** abre o modal do Bloco 2 (evento pré-preenchido). Substitui o formulário inline que ainda exista.

Estado vazio: "Ainda não tem gestores neste evento." + botão "Novo gestor".

Aviso útil no topo da secção se algum gestor tiver só telefone: "Gestores só com telefone não recebem notificações."

## Passo 5 — Tudo o que adiciona/edita/convida em modal

Percorre os dois ecrãs e confirma, ação a ação, que está em modal (`app-modal`):
- Adicionar/editar convidado (já em `app-guest-dialog`).
- Criar tarefa (modal; usa o mesmo formulário do Bloco 2, passo 6, extraído para `app-task-form-dialog` partilhado).
- Criar/editar equipa (já em modal).
- Novo gestor (Passo 4).
- Editar dados do evento: se hoje é edição inline na página, passa a modal com os campos atuais (título, data/hora, local, mensagem, regras, dress code, prazo). Se **não existir** edição de evento nem endpoint `PATCH` no backend, **não a cries**: regista em `docs/BLOCKERS.md`.
- Cancelar evento: mantém `app-confirm-dialog`.

A página `/tarefas` (`tasks.page`): o painel inline de criação (`tasks.page.html:20–75`) passa para o mesmo `app-task-form-dialog`. O modelo legado (`WorkspaceTask`) mantém-se; se a criação de tarefa exigir equipa (regra do Bloco 2), o modal pede a equipa dentro dos eventos do utilizador.

## Passo 6 — Navegação consistente entre equipas e evento

1. No card de uma equipa dentro do evento, "Abrir equipa" navega para `/equipas/:teamId?evento={eventId}`. O detalhe da equipa mostra "Voltar ao evento" se veio do evento (`evento` na query), senão "Voltar às equipas".
2. O alias existente `/eventos/:eventId/equipas?equipa=` continua a funcionar (redirect já existente).
3. `TeamDetailPage` usa `app-page-header` do Bloco 1 com o botão voltar.

## Critérios de aceitação finais do Bloco 3

- [ ] Tabela de paridade do Passo 1 preenchida; nada se perdeu.
- [ ] `event-detail.page.html` e `management-event.page.html` com menos de 300 linhas, compostas pelos componentes de `features/events/detail/`.
- [ ] Lista de convidados do evento: cards iguais aos da página `/convidados`, 10 por página, pesquisa e paginação na API, nos dois ecrãs (anfitrião e gestor).
- [ ] Permissões centralizadas em `EventPermissions`; o gestor nunca vê ações que o contrato do backend não lhe permite.
- [ ] Botão Voltar sempre visível nos dois ecrãs; sem botões "Voltar" duplicados no fim.
- [ ] Separadores por URL; dados carregados por separador.
- [ ] Separador Gestores com validade, código novo, revogar, remover, tudo em modal.
- [ ] Nenhuma ação de adicionar/editar/convidar inline no painel do evento nem em `/tarefas`.
- [ ] `build`, `lint`, `test` verdes. `docs/REPORT-BLOCO-3.md` escrito.

## Fora de âmbito

Redesenho visual do shell e do menu lateral (agrupamento em dropdowns não está decidido), breadcrumbs, relatórios, templates, mapas.
