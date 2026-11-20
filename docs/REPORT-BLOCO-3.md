# Relatório — Bloco 3 (Detalhe do evento)

**Branch:** `feat/bloco-3-detalhe-evento` (criada a partir de `feat/bloco-2-equipas-gestores`).
**Data:** 2026-11-20.
**Repo frontend:** `apupu_front`. Backend inalterado neste bloco.

## Resumo

O painel do anfitrião (`/eventos/:eventId`) e o painel do gestor por link (`/gestao/evento/:eventId`) passaram a ser compostos pelos mesmos componentes de secção em `src/app/features/events/detail/`, com um objeto `EventPermissions` centralizado. Os dois templates ficaram abaixo de 300 linhas, os separadores passaram a viver em `?separador=` (com `resumo` por defeito) e o botão Voltar passou a estar sempre visível no topo. Todos os formulários que adicionam, editam ou convidam estão em modais.

## Passo 1 — Mapeamento

O mapeamento foi realizado antes de qualquer alteração de código e ficou registado em `docs/DECISIONS.md` (secção “Bloco 3 — Detalhe do evento (Passo 1)”), incluindo a tabela secção → presença nos dois painéis → permissões do gestor, com base em `apupu_back/docs/API-CONTRACT.md:573–585` e no middleware real das rotas. Commit `f1d88e9`. As incertezas ficaram em `docs/BLOCKERS.md`.

## Passo 2 — Componentes partilhados

| Componente | Ficheiro | Linhas | Responsabilidade |
|---|---|---:|---|
| `app-event-summary` | `features/events/detail/event-summary.component.ts` | 282 | Capa, título, tipo/contexto, data/hora, local, prazo, estado, estatísticas, progresso, cartão do convite, excerpt de mensagem/regras/vestuário e ações principais. |
| `app-event-guests-section` | `features/events/detail/event-guests-section.component.ts` | 294 | `app-stat-grid`, pesquisa, filtro por estado, paginação de 10 no servidor e grelha de `app-person-card` idêntica a `/convidados`. |
| `app-event-teams-section` | `features/events/detail/event-teams-section.component.ts` | 165 | Cards de equipa com membro/pré-visualizações, contagem de tarefas abertas e atalho para `/equipas/:id?evento=`. |
| `app-event-tasks-section` | `features/events/detail/event-tasks-section.component.ts` | 179 | Lista de tarefas, filtro “só as minhas”, conclusão e remoção (esta última só com permissão). |
| `app-event-managers-section` | `features/events/detail/event-managers-section.component.ts` | 241 | `app-person-card` por gestor, estado do link, menu com novo código/validade/revogação/remoção, aviso de contactos só por telefone e modal de credenciais do Bloco 2. |
| `app-event-activity-section` | `features/events/detail/event-activity-section.component.ts` | 123 | Atividade paginada e remoção confirmada (só anfitrião). |
| `app-task-form-dialog` | `shared/components/task-form-dialog.component.ts` | 196 | Formulário partilhado de tarefa, usado em `/eventos/:id`, `/equipas/:id` e `/tarefas`. |

Todos são standalone, usam `input()`/`output()`, recebem `permissions` e escondem ou desativam ações não permitidas. Nenhum componente novo tem dependências novas.

`EventPermissions`, `hostPermissions()`, `managerPermissions()` e `eventPermissionsFor()` ficaram em `core/models/models.ts`. O gestor recebe apenas leitura de evento/convidados/atividade/tarefas, adição de convidados e edição de dados não reservados; não recebe exportações, gestão de equipas/gestores/tarefas, alteração de estado, cancelamento, reenvio do link de gestão, edição de convites existentes nem remoção de atividade.

## Passo 3 — Layout e navegação

- `event-detail.page.html`: **183 linhas**; cabeçalho `sticky` com “Voltar aos eventos” → `/eventos`, contexto “Evento”, título, papel e ações; barra de separadores com scroll horizontal; conteúdo carregado por separador com `@if`.
- `management-event.page.html`: **221 linhas**; cabeçalho `sticky top-2` com “Voltar” → `/gestao`, contexto, título e badge de gestor; faixa/modal de criação de conta do Bloco 2 mantidos (`sem_conta` e `email` preservados na navegação dos separadores).
- Separadores: `resumo`, `convidados`, `equipas`, `gestores`, `atividade`. `?separador=` é lido por `ActivatedRoute.queryParamMap` e escrito por `Router` com `queryParamsHandling: 'preserve'`; `resumo` não escreve o parâmetro. Recarregar mantém o separador.
- Dados lazy: convidados, equipas, gestores e atividade só carregam quando o separador correspondente é aberto; o resumo usa os dados já carregados pelo store/detalhe.
- Desktop usa grelha de duas colunas no resumo; mobile mantém uma coluna e alvos de toque de pelo menos 44 px.

## Passo 4 — Separador Gestores

`app-event-managers-section` usa `app-person-card`, mostra equipa, contacto e estado do link (`Ativo até {data}`, `Expirado`, `Revogado`, `Bloqueado temporariamente`, `Convite pendente`) e esconde o menu de ações quando `canManageManagers` é falso. O menu abre modais para:

- copiar mensagem de convite (apenas enquanto as credenciais acabaram de ser geradas);
- gerar novo código (confirmação com aviso de invalidação do link/código antigos, depois `app-manager-credentials-dialog`);
- alterar validade com data máxima calculada no frontend e validada no backend;
- revogar acesso e remover gestor (confirmação; a remoção avisa que a equipa se mantém).

O botão principal “Novo gestor” abre o `app-team-manager-dialog` do Bloco 2 com o evento pré-preenchido; o estado vazio e o aviso para gestores só por telefone estão incluídos. As ações chamam `EventsRepository.updateManagerLink`, `regenerateManagerAccess`, `revokeManagerLink` e `removeManager`, sem novos endpoints.

## Passo 5 — Modais

- Convidados: `app-guest-dialog` nos dois painéis; o formulário inline do gestor foi removido.
- Tarefas: `app-task-form-dialog` em `/eventos/:id`, `/equipas/:id` e `/tarefas`; os formulários inline dessas páginas foram removidos.
- Equipa/gestor: `app-team-form-dialog` e `app-team-manager-dialog` mantidos; o novo gestor continua a criar equipa + gestor na mesma transação.
- Edição do evento e capa: `app-modal` nos dois painéis; os formulários inline de edição/capa foram removidos.
- Cancelamento: `app-confirm-dialog` inalterado, visível só para o anfitrião.
- Os campos de data/hora e prazo não foram acrescentados ao modal de edição porque `EventsRepository.update()` não os envia no `PATCH /host/events/:id`; ver `docs/BLOCKERS.md`.

## Passo 6 — Navegação de equipas

Os cards de equipa abrem `/equipas/:teamId?evento={eventId}`. `TeamDetailPage` usa `app-page-header` do Bloco 1 com “Voltar ao evento” (`eventDetail.backToEvent`) quando `?evento=` está presente, e “Voltar às equipas” (`teamDetail.back`) caso contrário. A rota antiga `/eventos/:eventId/equipas?equipa=` não foi alterada.

## Verificação da paridade (Passo 1)

| Secção existente antes | Destino depois | Estado |
|---|---|---|
| Resumo/capa/título/estatísticas/progresso (`event-detail`) e cartão do gestor (`management-event`) | `app-event-summary` nos dois painéis | Mantido; ações reservadas escondidas por permissões. |
| Lista de convidados com pesquisa/filtro/paginação (`event-detail`) e lista simples (`management-event`) | `app-event-guests-section` nos dois painéis | Mantido e alargado ao gestor com os mesmos 10 por página e pesquisa/filtro no servidor. |
| Exportações (`event-detail`) | `app-event-summary`, só com `canExport` | Mantidas para o anfitrião; escondidas do gestor por incompatibilidade das rotas com sessão por link. |
| Tarefas inline (`event-detail`) | `app-event-tasks-section` + `app-task-form-dialog` | Mantidas no anfitrião; gestor vê leitura. |
| Gestores (`event-detail`) e ausência no painel do gestor | `app-event-managers-section` | Mantidas as ações do anfitrião (agora em separador próprio e modais); gestor vê só leitura. |
| Atividade paginada e remoção (`event-detail`, `management-event`) | `app-event-activity-section` | Leitura nos dois painéis; remoção só anfitrião. |
| Definições/capa/cancelar (`event-detail`) e edição/capa (`management-event`) | Modais nos dois painéis | Mantidos os endpoints e a diferença de permissões; cancelar só anfitrião. |
| CTA de conta (`management-event`) | Cabeçalho/faixa/modal inalterados | Mantido. |
| Navegação “Voltar” duplicada no fim (`event-detail`) e ausente no gestor | Cabeçalho sticky único nos dois painéis | Corrigido. |

Nenhuma funcionalidade da tabela do Passo 1 foi removida. As diferenças são apenas as decididas no bloco: gestor com a mesma lista paginada de convidados, separadores por URL, back visível e gestão de gestores em separador próprio.

## Validação

Comandos executados no frontend, todos verdes:

| Comando | Resultado |
|---|---|
| `npm run build` | Sucesso (browser + server bundles; sem erros de template). |
| `npm test -- --watch=false` | 25 ficheiros, **125 testes** passados. |
| `npm run lint` | **0 erros**, 24 avisos legados pré-existentes (`array-type`, `label-has-associated-control`, `no-output-native`). |
| `npx tsc --noEmit -p tsconfig.app.json` | Sem erros. |

Não foram adicionadas dependências, nem segredos, nem alterações ao backend. Todo o texto novo está em `pt-AO` e `en` em `core/i18n/translations.ts`. Nenhum ficheiro de secção ou template de painel ultrapassa 300 linhas.

## Observações finais

- A verificação visual de 360 px/claro-escuro foi feita por revisão das classes Tailwind e dos tokens; não existe captura automatizada no projeto.
- As quatro incertezas de contrato e a limitação do modal de edição estão em `docs/BLOCKERS.md`; as escolhas correspondentes estão em `docs/DECISIONS.md`.
- Backend permanece em `feat/bloco-2-equipas-gestores`, limpo; o Bloco 4 será ramificado a partir daqui conforme as regras gerais.
