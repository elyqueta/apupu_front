# Decisões tomadas

## Bloco 1 — Fundações (2026-11-20)

| Data | Dúvida / ponto ambíguo | Escolha | Motivo |
|---|---|---|---|
| 2026-11-19 | Regras de estilo legadas do ESLint geravam centenas de avisos. | Configurar as regras legadas como `warn` e exigir **0 erros**; não fazer reformatação em massa. | O critério do bloco é `lint` com 0 erros. Evita ruído e risco fora do âmbito. |
| 2026-11-19 | `app-modal` não defini explicitamente qual controlo receber o foco. | Focar o primeiro controlo (o botão de fechar no markup atual). | Comportamento previsível e testável; os testes usam `aria-label="Fechar"`. |
| 2026-11-19 | O lightbox de imagens também é um diálogo, mas não estava na lista migrada. | Não o migrar para `app-modal`; reforçar apenas o *focus trap* e a restauração do foco. | A especificação lista os diálogos a migrar; mudar o lightbox ficaria fora do âmbito. Registado em `BLOCKERS.md` como observação. |
| 2026-11-19 | O pedido de conta em `management-entry.page.html` precisava de Escape/backdrop. | Usar `app-modal`; ambos os caminhos chamam `continueWithoutAccount()`. | Mantém o fluxo sem conta e usa o padrão partilhado. |
| 2026-11-19 | A pesquisa `q` de convidados no backend podia interpretar `%`, `_` e `\` como wildcards. | Escapar os carateres num utilitário partilhado (`src/utils/like.util.ts`) e passar sempre parâmetros ligados; incluir `guest_phone`. | Segurança e consistência com o resto da API. |
| 2026-11-19 | A UI usa `confirmed`, mas a API usa `rsvp_status=accepted`. | Converter no repositório com `toApiRsvpStatus()`. | Evita fugas de vocabulário da API para os componentes. |
| 2026-11-19 | Listas de convidados podiam filtrar localmente apenas a página carregada. | Toda a pesquisa, filtro e paginação passou a ser feita no servidor (`GET /host/guests`, 10 por página). | Obligatório na especificação; evita resultados incompletos. |
| 2026-11-19 | Convidados apareciam em tabelas diferentes em várias páginas. | `app-person-card` é o único cartão em `/convidados`, detalhe de evento e dashboard (variante `compact`). | Consistência visual e toque confortável em 320 px. |
| 2026-11-19 | `app-action-menu` não tinha navegação por teclado nem folha mobile. | Setas ↑/↓, Home/End, Escape, fecho por fora e `app-modal size="sm"` quando `matchMedia('(max-width: 767px)')` corresponde. | Aceitação do Passo 6; o popover desktop foi mantido. |
| 2026-11-19 | `crypto.util.test.ts` era intermitente. | Corromper o primeiro caráter da *auth tag* (`parts[1]`) em vez do ciphertext/base64. | O teste passou a detetar alterações sem depender do preenchimento base64. |
| 2026-11-19 | Cabeçalhos repetidos usavam `h2` e marcadores diferentes. | Criar `app-page-header` com `h1`, aplicá-lo nas quatro listas e manter o mesmo visually hidden em mobile. | Hierarquia correta sem alteração notória do aspeto. |
| 2026-11-20 | No iOS/Safari o teclado só abre se `focus()` ocorrer dentro do gesto de toque. | O input mobile existe sempre no DOM; a camada usa a classe `hidden`, e o handler remove a classe e chama `focus()` de forma síncrona via `viewChild`. | Evita `@if`, `setTimeout`/`effect` como única forma de focar. |
| 2026-11-20 | Não existe `AbortSignal` na API HTTP atual. | Cancelar pedidos de pesquisa remota por número de sequência (respostas antigas são ignoradas). | Cumpre "cancelamento do pedido anterior" sem nova dependência nem alteração transversal. |
| 2026-11-20 | Chave das pesquisas recentes por anfitrião. | `apupu.search.recents.<hostId>`, com fallback para email do perfil e depois `anonymous` enquanto a sessão não carrega. | Nunca guarda dados sensíveis, apenas o texto pesquisado. |
| 2026-11-20 | Resultados remotos e locais podiam ter o mesmo `id`. | Agrupar remotos em `remote-guests`/`remote-events` e manter tarefas/páginas locais; os prefixes `desktop-`/`mobile-` evitam colisões de IDs no DOM. | `aria-activedescendant` e `aria-controls` ficam inequívocos com os dois painéis no DOM. |

## Bloco 2 — Equipas e gestores (2026-11-20)

| Data | Dúvida / ponto ambíguo | Escolha | Motivo |
|---|---|---|---|
| 2026-11-20 | A coluna de revogação dos gestores já existia como `revoked_at`. | A migração usa `revoked_at` e o índice parcial único é `WHERE revoked_at IS NULL`. | Evita uma coluna nova e mantém a semântica de soft delete já usada pelo backend. |
| 2026-11-20 | Gestores legados não tinham equipa. | A migração cria/backfills equipas antes de `team_id SET NOT NULL`; gestores sem código ficam com `access_code_hash = NULL`. | Nenhum gestor fica órfão e o acesso legado continua a funcionar só com o link. |
| 2026-11-20 | `scripts/test-teams.sh` fazia rollback de 4 migrações. | Passou a `down 5` para incluir a nova migração. | O teste de subida/descida cobre toda a cadeia. |
| 2026-11-20 | Equipas fixtures antigas apareceriam nas listagens. | Fixtures de teste usam `deleted_at = now()`. | Preserva as expectativas existentes sem esconder dados de produção. |
| 2026-11-20 | Alfabeto e formato do código de acesso. | `ABCDEFGHJKMNPQRSTUVWXYZ23456789`, 6 caracteres via `crypto.randomInt`; exibição `XXX-XXX`; normalização para maiúsculas sem espaços/hífens. | Reduz ambiguidade em WhatsApp e teclado móvel. |
| 2026-11-20 | Onde guardar o código. | HMAC-SHA256 com `TOKEN_PEPPER` + id do gestor; texto em claro apenas na resposta de criação/regeneração e no email cifrado da outbox. | Nunca fica em texto na BD nem em logs. |
| 2026-11-20 | Como esconder o motivo de uma falha de acesso. | Todas as falhas usam 403, `code: 'access_denied'` e `Não foi possível aceder.`; logs internos registam só o motivo. | Evita enumeração de links e vazamento de estado. |
| 2026-11-20 | Token inexistente podia ser mais rápido de rejeitar. | Comparação HMAC fictícia mesmo para tokens desconhecidos; novo `manageAccessLimiter` por IP usa as variáveis `HOST_SESSION_RATE_LIMIT_*` ao lado de `publicTokenLimiter`. | Tempo de resposta equivalente e defesa em profundidade. |
| 2026-11-20 | Gestores antigos não tinham código. | `code` é opcional em `manageAccessSchema`; `access_code_hash = NULL` permite entrada só com token. A UI destaca "Gerar código de acesso". | Compatibilidade sem enfraquecer gestores novos. |
| 2026-11-20 | Limites de tentativas. | 5 falhas bloqueiam 15 minutos; 15 revogam o link e criam notificação `access_suspicious`. | Cumpre a regra de produto sem bloquear permanentemente por engano. |
| 2026-11-20 | Validade do link. | Defeito de 7 dias; máximo = `ends_at + 1 dia` ou fim do dia de `starts_at` no fuso do evento + 1 dia. Sem `ends_at`, usa `Africa/Luanda` às 06:00. | O limite é calculado no Postgres para respeitar o fuso do evento. |
| 2026-11-20 | Rotação do link. | Usar o link não roda o token; regenerar o código roda o token e zera as falhas. | Evita invalidar links já guardados e mantém a regeneração como revogação efetiva do código anterior. |
| 2026-11-20 | Normalização de telefones. | `normalizeAngolanPhone()` converte para E.164 `+244...`; contactos só por telefone não geram email nem notificação. | O produto opera apenas em Angola e a regra de notificações é só por email. |
| 2026-11-20 | Criação de gestor. | `POST /host/events/{id}/managers` cria equipa + gestor na mesma transação; não existe gestor sem equipa. | Regra central do bloco. |
| 2026-11-20 | Tipos de estado do convite. | `ManageEmailStatus` mantém-se `'queued' \| 'failed'`; o estado local `ManagerInviteStatus` acrescenta `'not_sent'` para contactos só por telefone. | Não altera o contrato de outros serviços. |
| 2026-11-20 | Membros de equipa com telefone. | `email: string \| null`, `phone: string \| null`, estados `convite_telefone` e origem `telefone`. | Permite convites por WhatsApp sem envio automático. |
| 2026-11-20 | Despromoção de gestor. | Passa a membro **e** revoga `event_managers` + sessões; promoção só se a equipa não tiver gestor ativo. | Corrige a lacuna apontada na auditoria. |
| 2026-11-20 | Criação de conta sem OTP. | Sessão de gestão válida + CSRF + mesmo email do gestor dispensa OTP; telefone validado não dispensa OTP de um email novo. | A conta de anfitrião exige email verificado. |
| 2026-11-20 | Atalho antigo de convidados. | Só vale com `claimed_at IS NOT NULL`, não revogado e evento terminado há menos de 30 dias. | Reduz superfície de abuso mantido desde o Bloco 1. |
| 2026-11-20 | Passo 5 e Passo 8 partilham o mesmo formulário. | `app-team-manager-dialog` é o único modal de criação de equipa/gestor; `app-manager-credentials-dialog` mostra link + código uma vez e oferece copiar/WhatsApp. | Evita dois formulários divergentes e centraliza a regra "uma equipa sempre com gestor". |
| 2026-11-20 | Código introduzido na entrada de gestão. | Normalização local para maiúsculas, sem espaços/hífens, no máximo 6 caracteres; envio por `POST /public/manage/access`. | Corresponde ao alfabeto do backend e permite colar `XXX-XXX`. |
| 2026-11-20 | Erros de acesso no Passo 7. | Qualquer falha (formato, link inválido, código errado, bloqueio, rede) mostra apenas `management.accessFailed`; o código é limpo após falhas HTTP. | Não revela estado nem motivo, mesmo no cliente. |
| 2026-11-20 | Rotas de entrada do gestor. | Mantidas `/gerir/:token` e `/gestao/:token`; `/gestao/evento/:eventId` fica declarado antes de `/gestao/:token`. | Links antigos podem já ter sido enviados; a rota de evento não pode ser capturada pelo token. |
| 2026-11-20 | CSRF da rota de registo do gestor. | O interceptor reutiliza a primeira entrada `host:` guardada no `CsrfTokenStore` para `/host/manager/register/request-code`; o cliente guarda também o CSRF de `/public/manage/access`. | A rota não tem `eventId` no caminho, mas usa o cookie da sessão de gestão. |
| 2026-11-20 | Atalho "criar conta" na gestão. | `?sem_conta=1&email=...` ativa aviso + CTA repetido; o atalho `/criar-conta?email=...&gestor=1` deixa o email só de leitura e chama a rota sem OTP. | O manager continua a poder gerir sem conta, mas é lembrado de forma consistente. |
| 2026-11-20 | Validação do modal de membro. | `memberValidation` passou a ler um espelho signal do `valueChanges` do formulário. | Um `computed` que lia `getRawValue()` diretamente ficava preso ao primeiro estado e não reagiu a alterações. |

## Bloco 3 — Detalhe do evento (Passo 1: mapeamento, sem código)

Linhas lidas em 2026-11-20: `event-detail.page.html` (1550), `event-detail.page.ts`, `management-event.page.html` (747), `management-event.page.ts`, `tasks.page.html`, `apupu_back/docs/API-CONTRACT.md:573–585` e o middleware real das rotas. Nenhuma funcionalidade foi alterada neste passo.

### Tabela de paridade: secção do painel → presença → permissões do gestor

| Secção | `event-detail` (anfitrião) | `management-event` (gestor por link) | Permissões do gestor e evidência |
|---|---|---|---|
| Cabeçalho / resumo (capa, título, data, local, prazo, estado, estatísticas, progresso) | Sim — HTML 3–98 (voltar L5–11, avatar/badge L41–48, aviso gestão L59–78, publicar L80–97) e 100–234 (capa L105–122, dados L124–177, `app-stat-grid` L181–200, progresso L202–226). Dados: `store.eventById`/`eventStats`/`templates()` (`.ts` L133–162), `store.load` (L255–262). | Sim — HTML 77–144 (dados L83–95, estado/papel L97–109, 4 estatísticas L112–143). Dados: `api.get('/host/events/:eventId')` (`.ts` L481–511). | **Leitura permitida** (contrato L575; `GET /host/events/:eventId` usa `hostAuth`, `host.routes.ts:152–157`). "Publicar" é **só anfitrião** (L578; `event.controller.ts:69–77` rejeita `status` de gestor). Reenviar link de gestão é **só anfitrião** (L581; `hostWorkspace.routes.ts:538–546`). |
| Convidados (lista + pesquisa/paginação) | Sim — separador HTML 240–268; conteúdo 766–1115: exportar 779–979, adicionar 981–988, filtros 992–1026, lista 10/página 1028–1105. `loadGuests()` `.ts` L326–361 → `store.guestsPage()` → `GuestsRepository.listPage()` (`/host/guests` com `event_id`, `rsvp_status`, `q`, `page`, `page_size=10`). | Sim, mas **sem pesquisa, filtro nem paginação** — formulário inline 423–507 e lista 509–595 a partir de `GET /host/events/:id`. | **Leitura e adicionar: permitido** (contrato L575/L577; `POST /host/events/:id/invitations` em `host.routes.ts:413–421` não tem `requireEventHost`). **Editar/reenviar/remover convite existente: só anfitrião** (L580; `host.routes.ts:487–506, 566–584`). Na refatoração o gestor passa a ter a mesma lista paginada de 10 com `q` e filtro no servidor, mas sem ações de edição/reenvio/remoção. |
| Equipas (cards com gestor, membros, tarefas abertas, atalho `/equipas/:teamId`) | **Não existe como secção.** Só o modal `app-team-manager-dialog` aberto em Definições (HTML 1403–1411, 1544–1550) → `EventsRepository.createManager()` (`POST /host/events/:id/managers`). | **Não existe.** | Gerir equipas/gestores é **só anfitrião** (contrato L582; `hostWorkspace.routes.ts:652–668, 741–759` usa `hostAccountAuth`). A refatoração acrescenta o separador "Equipas e tarefas" com cards de equipa; para o gestor os cards são só leitura e o atalho permanece, mas nenhuma ação de criar/editar equipa é mostrada. |
| Tarefas (lista + "só as minhas") | Sim, no resumo — HTML 550–666: formulário inline 568–604, lista 607–665, concluir 613–617, remover 650–660. `.ts` `createTask` L504–520, `toggleTask` L865–871, `removeTask` L522–535 → `/host/tasks` e `PATCH/DELETE /host/tasks/:id`. | **Não existe.** | **Não coberto pela tabela do contrato.** As rotas de tarefas usam `hostAccountAuth` (`hostWorkspace.routes.ts:1457–1535`), logo uma sessão só por link não tem garantia de acesso. Decisão conservadora: o gestor vê a lista (quando devolvida pelo detalhe do evento) mas **não vê** criar/editar/remover tarefas; registado em `BLOCKERS.md`. |
| Gestores do evento (link, código, validade) | Sim — card só leitura 668–742 e cartão de Definições 1383–1473 (adicionar 1403–1411, reenviar 1443–1452, remover 1453–1462). `store.loadManagers`/`removeManager`/`resendManagerInvite` (`.ts` L756–790; `workspace.store.ts` L345–374). | **Não existe** (só badge de papel L101–108). | **Só anfitrião** (contrato L582; `hostWorkspace.routes.ts:741–759`). O novo separador "Gestores" é construído sobre estes mesmos endpoints e esconde o menu de 3 pontinhos para o gestor. |
| Atividade recente (paginada) | Sim — HTML 405–490 (lista 424–445, paginação 447–488). `loadActivity()` `.ts` L479–494 → `ActivityRepository.listForEvent` (`/host/events/:id/activity?page&page_size=8`). | Sim — HTML 597–700 (lista 623–655, remover 642–652, paginação 657–699). `api.getPage` `.ts` L318–338, `api.delete` L305–307. | **Leitura permitida** (L575; `host.routes.ts:986–991`). **Remover atividade: só anfitrião** por middleware `requireEventHost` (`host.routes.ts:332–340`), apesar de a tabela não mencionar explicitamente a eliminação. |
| Definições / edição do evento e capa | Sim — separador 1117–1500: formulário 1136–1235, pré-visualização 1238–1261, capa 1263–1381 (`coverForm` 1307–1337, upload 1349–1355), gestores 1383–1473, cancelar 1475–1497. `store.updateEvent` → `PATCH /host/events/:id`; capa via `PUT`/`POST`/`DELETE /host/events/:id/cover…` (`workspace.store.ts` L450–464). Sem botão de apagar evento. | Sim, sem separadores — editar 163–304 (`api.patch` L215–218), capa 306–420 (`api.put` L382–385, `postFormWithProgress` L415–419), CTA de conta 6–39, modal de conta 721–745. Sem cancelar/apagar evento. | **Editar dados permitido** (L576), incluindo capa (`host.routes.ts:270–297`, sem `requireEventHost`), **exceto `status` e `host_email`** (L578). A UI do anfitrião é hoje mais restritiva na capa (`@if (isHost())` L1263) do que a API; a refatoração usa as permissões partilhadas sem alargar ações ao gestor. **Cancelar/apagar: só anfitrião** (L579). |
| Exportações (PDF/CSV) e relatórios | Sim — menu 779–979 (PDF/CSV de convidados, resumo, presenças, período 821–849). `ReportsRepository.exportEvent`/`exportEventPeriod`. | **Não existe.** | Contrato L575 diz "consultar … relatórios: gestor sim", mas as rotas de export usam `hostAccountAuth` (`hostWorkspace.routes.ts:1282–1287, 1343–1348`); uma sessão por link receberia 401. Incerteza registada em `BLOCKERS.md`; na refatoração as exportações continuam **só no painel do anfitrião**, sem expor uma ação quebra ao gestor. |
| Navegação / estado na URL | `routerLink="/eventos"` no topo (5–11) e duplicado no fim (1534–1540). Separadores locais `tab = signal('overview')` (`.ts` L102, L319–324); **sem `ActivatedRoute` e sem `?separador=`**. | Sem botão "Voltar" no estado carregado; só no erro (67–72 → `/gestao`). `route.paramMap` L104–109; `queryParamMap` L110–113 lê só `sem_conta`/`email`. **Sem `?separador=`.** | Navegação não é ação de API. O Bloco 3 acrescenta "Voltar aos eventos" → `/eventos` e "Voltar" → `/gestao`, remove o duplicado do fim, e passa a guardar o separador em `?separador=` (resumo por defeito), mantendo `sem_conta`/`email`. |

### Decisões do Passo 1

| Data | Dúvida / ponto ambíguo | Escolha | Motivo |
|---|---|---|---|
| 2026-11-20 | Como representar as permissões partilhadas. | `EventPermissions` em `core/models` com `canEditEvent`, `canManageGuests`, `canManageTeams`, `canManageManagers`, `canExport`, `canCancelEvent` e sinalizadores adicionais para ações explicitamente reservadas (`canChangeEventStatus`, `canEditExistingGuests`, `canDeleteActivity`, `canManageTasks`, `canResendManageLink`). Fábricas `hostPermissions()` e `managerPermissions()` derivadas apenas do contrato e do middleware. | O contrato é a fonte de verdade; os sinalizadores extra evitam expor ações cuja rota usa `hostAccountAuth`. |
| 2026-11-20 | Lista de convidados do gestor. | Passa a usar o mesmo `GuestsRepository.listPage()` do anfitrião (10/página, `q`, `rsvp_status` no servidor) e o mesmo `app-person-card`; só as ações mudam. | Exigência explícita do Passo 2; o endpoint já permite gestor (`hostAuth` sem `requireEventHost`). |
| 2026-11-20 | Exportações visíveis ao gestor por link. | Não mostrar enquanto as rotas exigirem conta de anfitrião, apesar da linha 575 do contrato. | Evita ação que devolveria 401; incerteza registada em `BLOCKERS.md`. |
| 2026-11-20 | Tarefas e remoção de atividade para gestor. | Não mostrar ações de escrita; a leitura permanece. | Contrato silencioso + middleware `hostAccountAuth`/`requireEventHost`. |
| 2026-11-20 | Edição de capa no painel do anfitrião. | Manter o comportamento visível atual (só anfitrião) apesar de a API o permitir ao gestor; o painel do gestor continua com as ações que já tinha. | O bloco é refatoração: "o comportamento visível mantém-se" salvo onde o bloco diz o contrário. Não alargar permissões ao gestor. |

### Decisões de implementação (Passos 2–6)

| Data | Ponto | Escolha | Motivo |
|---|---|---|---|
| 2026-11-20 | Estrutura das secções. | Sete componentes standalone em `features/events/detail/` e `shared/components/task-form-dialog.component.ts`, todos com `input()`/`output()` e `permissions`. Nenhum com mais de 300 linhas. Os dois painéis apenas os compõem. | Evita a duplicação entre `event-detail` e `management-event` sem criar uma página "mestra" acoplada a stores diferentes. |
| 2026-11-20 | Fonte das permissões no painel do gestor. | `managerPermissions({ accessRole: event.accessRole })`, com fallback para `manager`. Nunca `hostPermissions()`. | Mesmo que a API devolva `access_role: host`, a página por link continua a ser tratada como gestor até a sessão o provar; `accessRole === 'host'` apenas devolve as permissões de anfitrião quando explicitamente presente. |
| 2026-11-20 | Separadores na URL. | `?separador=` com valores `convidados`, `equipas`, `gestores`, `atividade`; `resumo` omite o parâmetro. `queryParamsHandling: 'preserve'` mantém `sem_conta` e `email`. | Recarrega o separador correto e preserva o fluxo de conta do Bloco 2. |
| 2026-11-20 | Carregamento por separador. | Convidados, equipas, gestores e atividade só são pedidos quando o separador correspondente abre; resumo usa os dados existentes. | Cumpre "cada separador carrega só os seus dados" sem duplicar pedidos. |
| 2026-11-20 | Lista de convidados do gestor. | Mesmo `GuestsRepository.listPage()` do anfitrião, 10/página, `q` e `rsvp_status` no servidor; ações de editar/reenviar/remover/bilhete escondidas. | Contrato L575/L577 vs L580; mantém a experiência idêntica e não expõe ações reservadas. |
| 2026-11-20 | Ações do separador Gestores. | Confirmações e formulários dentro do componente; credenciais reutilizam `app-manager-credentials-dialog`. Data máxima calculada como data de `starts_at` + 1 dia, validada novamente no backend. | O backend é a fonte da validade real; o limite do input é apenas ajuda ao utilizador. |
| 2026-11-20 | Formulário de tarefa partilhado. | `app-task-form-dialog` com `context` (`event`, `team`, `tasks`). `/tarefas` e `/equipas/:id` usam os mesmos endpoints de antes; o `assigneeMemberId` do modal é mapeado para `managerId` na criação global. | `TasksRepository.create` não tem campos de equipa/membro; não foi inventado endpoint novo. |
| 2026-11-20 | Navegação de equipa a partir do evento. | `/equipas/:teamId?evento={eventId}`; `TeamDetailPage` usa `app-page-header` com “Voltar ao evento” (`eventDetail.backToEvent`) ou “Voltar às equipas” (`teamDetail.back`). | Exigência do Passo 6; o alias antigo `/eventos/:eventId/equipas?equipa=` continua intacto. |
| 2026-11-20 | Modal de edição do evento. | Mantidos apenas os campos já enviados por `EventsRepository.update()`; data/hora e prazo não foram adicionados. | `PATCH /host/events/:id` não aceita esses campos no cliente atual; registado em `BLOCKERS.md` em vez de inventar API. |

## Bloco 4 — Convite público

Mapeamento feito antes de alterar código. O frontend parte de `feat/bloco-3-detalhe-evento`; o backend parte de `feat/bloco-2-equipas-gestores` porque não existe Bloco 3 backend.

| Data | Dúvida / ponto ambíguo | Escolha | Motivo |
|---|---|---|---|
| 2026-11-20 | Donde vem a hora de fim. | `ends_at` já existe no DTO público e no corpo de criação; acrescentar `endsAt` a `HostEvent`, `CreateEventInput`, `mapEvent` e `InvitationView`, com campo opcional “Hora de fim” no wizard e validação posterior a `startsAt`. | Não é necessário inventar endpoint; o cliente é que descartava o valor. |
| 2026-11-20 | Prazo de resposta na vista pública. | Mapear `rsvp_deadline` (data e hora) para `InvitationView`, mantendo `rsvp_deadline_passed` como fonte do estado “prazo terminado”. | O backend já envia ambos; o convite passa a mostrar o valor que o anfitrião preencheu. |
| 2026-11-20 | Contactos do anfitrião na API pública. | Expor nome e e-mail por defeito, avatar quando existir e telefone apenas quando o perfil o tiver preenchido. Não criar opção de privacidade neste bloco. | Regra explícita do Passo 1; não existe hoje preferência de privacidade no perfil e o convite precisa de forma de contacto. |
| 2026-11-20 | Mensagem opcional ao responder. | `message` opcional no `PUT /public/invitations/{token}/rsvp`, texto simples, máx. 500 caracteres, sanitizado no backend; devolvida no convite e na lista de convidados do anfitrião e incluída na notificação de resposta existente. | Evita novo tipo de notificação e mantém a mensagem junto da resposta a que pertence. |
| 2026-11-20 | Validade do link do convite. | Acrescentar `link_expires_at` com valor por defeito igual ao fim do evento + 1 dia (mesma regra de máximo dos links de gestor), com migração reversível para convites antigos. O anfitrião não configura esta validade no Bloco 4. | Exigência do Passo 1; limita links antigos sem criar UI de configuração fora do âmbito. |
| 2026-11-20 | Mensagem de link inativo. | Link inválido, expirado ou revogado usa sempre `invitation.inactiveText`, com “Falar com o anfitrião” apenas quando há contacto público. | Não diferenciar o motivo, conforme Passo 5. |
| 2026-11-20 | Estrutura da página pública. | `invitation.page.html` fica como casca com menos de 250 linhas; secções em `features/invitation/parts/`; todos os diálogos usam `app-modal`, já com bottom sheet, foco e Escape. | A auditoria diz que não existe bottom sheet, mas o código do Bloco 1 já o implementa; reutilizar evita duplicação. |
| 2026-11-20 | Ação de localização. | Abrir `https://www.google.com/maps/search/?api=1&query={endereço codificado}` em novo separador, sem SDK, chave ou geolocalização; “Copiar endereço” usa `ShareService`. | Fora de âmbito: integração com API do Google Maps fica para blocos futuros. |
| 2026-11-20 | Barra de resposta em mobile. | Botões “Vou”/“Não vou” fixos no fundo com `env(safe-area-inset-bottom)`; no desktop permanecem no cartão lateral. | Padrão de app familiar e exigência do Passo 2 sem duplicar ações. |

### Decisões de implementação (Passos 2–5)

| Data | Ponto | Escolha | Motivo |
|---|---|---|---|
| 2026-11-20 | Componentes do convite. | `invitation.page.html` ficou com 148 linhas; capa, cartões de informação, RSVP, menu de detalhes e os quatro modais vivem em `features/invitation/parts/`. | Cumpre o limite de 250 linhas sem criar um componente "mestra" acoplado ao carregamento da página. |
| 2026-11-20 | Modais. | Reutilização integral de `app-modal` para localização, anfitrião, detalhes e confirmação de resposta; nenhum primitivo novo. | O componente do Bloco 1 já tem bottom sheet em mobile, foco, Escape, clique fora e devolução de foco. |
| 2026-11-20 | Corpo do RSVP. | `{ status, message }`; a mensagem é aparada, limitada a 500 caracteres e enviada como `null` quando o campo fica vazio. | O backend mantém a mensagem anterior se o campo estiver ausente e limpa com `null`; enviar `null` explicitamente evita estado ambíguo. |
| 2026-11-20 | Estado inativo. | Link inválido, expirado ou revogado usa apenas `invitation.inactiveText`; não há ação “Falar com o anfitrião” nesse estado. | A resposta genérica do backend não devolve contacto; não há dados para a ação e o motivo nunca é diferenciado. Ver `BLOCKERS.md`. |
| 2026-11-20 | Mensagem na lista do anfitrião. | `guests.guestMessage` com truncamento a 120 caracteres na primeira linha de `app-person-card`; texto integral continua no convite. | Evita cartões longos em `/convidados`, no detalhe do evento e no painel do gestor sem perder a mensagem. |
| 2026-11-20 | Testes do carregamento. | `settle()` nos testes da página espera duas estabilizações antes de verificar o DOM. | O carregamento é disparado por um `effect()`; com deteção zoneless o resultado só reflete no DOM após o ciclo seguinte. |

## Blocos 5 e 6 — Ajustes pós fase 4 e landing/super admin

| Data | Dúvida / ponto ambíguo | Escolha | Motivo |
|---|---|---|---|
| 2026-11-20 | Idioma dos textos. | Textos visíveis em **pt-PT**, mantendo a infraestrutura de chaves `pt-AO`/`en` do projeto. | Decisão explícita do utilizador; evita duplicar sistema de i18n. |
| 2026-11-20 | Resposta da caixa de entrada. | Opção (b): guardar `message_answer`/`message_answered_at`, devolver no convite público e notificar o convidado por e-mail quando tiver e-mail. | O utilizador exigiu que a resposta não ficasse sem destino; mostrar no convite cobre os casos sem e-mail. |
| 2026-11-20 | Validade dos links. | Gestor: 1 semana por omissão, configurável pelo anfitrião, máx. fim do evento + 1 dia. Convite: default atual (fim do evento + 1 dia), configurável, máx. fim do evento + 30 dias. | O utilizador confirmou que a regra antiga do gestor se mantém; +30 dias aplica-se só ao convite. |
| 2026-11-20 | Cancelamento pelo anfitrião. | OTP obrigatório; motivo opcional. Super admin: OTP + motivo obrigatório (mín. 10 caracteres). | Decisão do utilizador; o Bloco 6 detalha o fluxo admin. |
| 2026-11-20 | Limpeza de órfãs no Cloudinary. | `--dry-run` por omissão; ignorar assets com <24 h; apenas pastas configuradas/da nossa conta; nunca URLs externas; `--apply` explícito. | Evitar apagar uploads muito recentes ou alheios; operação destrutiva exige confirmação. |
| 2026-11-20 | Bloqueio de evento cancelado. | Guard na API resolve o evento pelo repositório mesmo quando o `eventId` só existe dentro de outro recurso; `event_cancelled` em todas as rotas de escrita. | O utilizador exigiu cobertura total, sem atalhos registados como bloqueio. |
| 2026-11-20 | Branch do Bloco 6. | Integrar landing/admin na branch `feat/ajustes-fase-4` em vez de criar `feat/landing-super-admin`. | As regras de trabalho proíbem merge; uma branch separada deixaria as duas metades do front desalinhadas. |
| 2026-11-20 | Precedência documental. | `docs/bloco-6-landing-e-super-admin.md` prevalece sobre a Parte E do Bloco 5; plano próprio em `docs/PLANO-BLOCO-6.md`. | Determinação explícita do utilizador. |
| 2026-11-20 | Faixa “Protótipo — versão em teste” no topo das páginas públicas. | Removida da landing e da casca pública; `ProtectedNoticeComponent`, as chaves `prototype.notice` e o respetivo teste foram eliminados. O texto da secção “Sobre” mantém-se. | Pedido explícito do utilizador; a faixa ocupava espaço no topo sem acrescentar informação útil. |

## Bloco 7 — Controlos públicos, apoio e novidades

| Data | Dúvida / ponto ambíguo | Escolha | Motivo |
|---|---|---|---|
| 2026-11-20 | Acesso ao painel `/admin`. | Continuar apenas por URL direta; promoção de `hosts.is_super_admin` exclusivamente por SQL documentado em `docs/GUIA-ACESSO-ADMIN.md`. Não criar rota, botão nem script de promoção. | Decisão do utilizador; evita expor uma operação privilegiada na interface. |
| 2026-11-20 | O que fazer com uma mensagem de apoio. | Ver lista, detalhe e marcar como resolvida no admin; **sem resposta por email**. | Decisão do utilizador; o estado `open`/`resolved` é suficiente para o acompanhamento. |
| 2026-11-20 | Confirmação das subscrições de novidades. | Subscrição direta, sem email de confirmação; idempotente por email normalizado. | Decisão do utilizador; reduz fricção no rodapé da landing. |
| 2026-11-20 | Onde colocar o formulário de novidades e que operações permitir no admin. | Input no rodapé da landing; admin lista, pesquisa, remove (com confirmação) e exporta CSV. | Decisão do utilizador; cobre gestão completa sem sair do painel. |
| 2026-11-20 | Textos visíveis nas novas áreas. | pt-PT em todas as mensagens e erros, com chaves `pt-AO`/`en` em `block7-keys.ts`. | Mantém a convenção dos blocos 5/6 sem duplicar o motor i18n. |
| 2026-11-20 | Mudança de idioma no fluxo de login. | O botão de `auth-layout` usa o mesmo `I18nService` dos controlos da landing; `auth.page.ts` e `password.page.ts` passaram a ler todas as strings e toasts das chaves `auth.*`/`password.*`. | O botão estava sem `(click)` e as páginas tinham literais PT; trocar só o botão não mudaria nada. |
| 2026-11-20 | `<html lang>` e metadados. | `I18nService` aplica o locale lido no bootstrap e a cada troca; `effect()` na landing atualiza título/descrição/OG; títulos das rotas usam `TranslationKey`. | Evita idioma declarado incorreto para leitores de ecrã e SEO desatualizado. |
| 2026-11-20 | Ligações de apoio. | `mailto:` da landing e de Definições substituído pelo mesmo `app-support-dialog`, que envia `POST /public/support`. | Uma única mensagem guardada no backend e visível no admin, sem depender do cliente de email do utilizador. |
| 2026-11-20 | Localização do componente do modal. | `SupportDialogComponent` vive em `features/landing/` e é reutilizado por Definições. | Evita duplicar formulário e validação; mudá-lo para `shared/` acrescentaria alterações sem benefício funcional neste bloco. |
| 2026-11-20 | Formatação de datas nas novas abas. | `i18n.dateTime(iso, 'Africa/Luanda')`, o mesmo helper já usado nas abas do bloco 6. | Consistência de fuso horário e formatação em todo o painel. |

## Bloco 9 — UI mobile (2026-11-21)

| Data | Dúvida / ponto ambíguo | Escolha | Motivo |
|---|---|---|---|
| 2026-11-21 | Classificação pedida no Passo 2 para cada modal. | Tabela abaixo: formulários/ações → `dialog` (por omissão); leitura → `presentation="sheet"`; confirmações → `dialog` `size="sm"`. | Regra explícita do bloco; `dialog` passa a ser a apresentação por defeito. |
| 2026-11-21 | O menu de secções do evento e o prompt de conta são "só informação"? | Não: são navegação/choice com botões, por isso ficam `dialog` `size="sm"`. O popup de três pontinhos deixa de ser modal (Passo 3). | O `sheet` fica reservado para leitura; menus devem aparecer ao lado do botão, não em baixo. |
| 2026-11-21 | Onde montar o popup de três pontinhos. | `app-action-menu` cria um portal no `body` com `position: fixed`, usando `DOCUMENT` mesmo quando `PLATFORM_ID` é `'server'`; o menu só abre por interação do utilizador. | A portal evita cortes por `overflow`/`transform` dos cartões; o `@if (open())` impede qualquer escrita no DOM durante SSR. |
| 2026-11-21 | Estado do menu ativo. | Guardado num `signal` em vez de capturar `this` em closures; a view incorporada recebe um segundo `detectChanges()` após `createEmbeddedView()`. | Evita `@typescript-eslint/no-this-alias` e garante que os itens aparecem no mesmo tick em deteção zoneless. |
| 2026-11-21 | Colapso da sidebar no desktop. | Chave `apupu.sidebar.collapsed` em `localStorage`, lida/escrita dentro de `try/catch`; larguras `lg:w-[18.5rem]` (aberta) e `lg:w-[4.5rem]` (recolhida). | Preserva a preferência entre navegações sem quebrar SSR/ambientes com armazenamento bloqueado; o `main` reflui sem scroll horizontal. |
| 2026-11-21 | Ações no cabeçalho do evento. | Uma única ação primária (`addGuest` → `openGuestCreate()`); as restantes permanecem no rail. O botão “voltar” usa texto curto em mobile e completo no desktop. | Reduz competição por espaço em 360 px sem remover funcionalidade. |
| 2026-11-21 | Painel de convidados pendentes no `/painel`. | Filtro `pending` por omissão; ação principal prefere WhatsApp quando há telefone, senão reenvio por email; linha `meta` com título do evento + `block9.dashboard.invitedDays`; contagens limitadas ao próximo evento quando existe. | O estado inicial mostra quem precisa de resposta; a ação e o contexto ficam visíveis sem abrir o card. |
| 2026-11-21 | Credenciais e execução dos testes Playwright. | Apenas `E2E_EMAIL`, `E2E_PASSWORD` e `E2E_BASE_URL`; se faltarem, os testes são `skipped` antes de iniciar o browser. O teste do convidado deixa nome/email vazios de propósito para a validação impedir criação de dados. | Cumpre a regra de nunca guardar segredos no repositório e evita poluir o ambiente com registros de teste. |

### Classificação dos modais (Passo 2)

| Modal | Ficheiro | Apresentação |
|---|---|---|
| Detalhes/editar evento | `features/events/event-detail.page.html` | `dialog` |
| Capa do evento | `features/events/event-detail.page.html` | `dialog` |
| Convidado (criar/editar) | `shared/components/guest-dialog.component.ts` | `dialog` |
| Confirmação genérica | `shared/components/confirm-dialog.component.ts` | `dialog` `size="sm"` |
| Menu de secções do evento (mobile) | `shared/components/event-section-shell.component.ts` | `dialog` `size="sm"` |
| Detalhes/editar evento (gestor) | `features/host-management/management-event.page.html` | `dialog` |
| Capa do evento (gestor) | `features/host-management/management-event.page.html` | `dialog` |
| Criar conta (gestor) | `features/host-management/management-event.page.html` | `dialog` `size="sm"` |
| Nova tarefa | `shared/components/task-form-dialog.component.ts` | `dialog` |
| Validade do link de convite | `features/events/detail/invitation-link-dialog.component.ts` | `dialog` |
| Prompt de conta na entrada de gestão | `features/host-management/management-entry.page.html` | `dialog` |
| Validade do link de gestor | `features/events/detail/event-managers-section.component.ts` | `dialog` |
| Responder mensagem | `features/messages/messages-inbox.component.ts` | `dialog` |
| Formulário de apoio | `features/landing/support-dialog.component.ts` | `dialog` |
| Confirmação de apoio enviado | `features/landing/support-dialog.component.ts` | `presentation="sheet"` |
| Criar gestor/equipa | `features/team/team-manager-dialog.component.ts` | `dialog` |
| Detalhe de evento no admin | `features/admin/admin-event-detail-dialog.component.ts` | `presentation="sheet"` |
| Criar/editar equipa | `features/team/team-form-dialog.component.ts` | `dialog` |
| Adicionar membro | `features/team/team-detail.page.html` | `dialog` |
| Validade de membro | `features/team/team-detail.page.html` | `dialog` |
| Eliminação bloqueada por tarefas | `features/team/team-detail.page.html` | `dialog` |
| Remover membro com reatribuição | `features/team/team-detail.page.html` | `dialog` |
| Credenciais do gestor | `features/team/manager-credentials-dialog.component.ts` | `presentation="sheet"` |
| Editar perfil | `features/profile/profile-edit-dialog.component.ts` | `dialog` |
| Localização no convite | `features/invitation/parts/invitation-location-dialog.component.ts` | `presentation="sheet"` |
| Anfitrião no convite | `features/invitation/parts/invitation-host-dialog.component.ts` | `presentation="sheet"` |
| Mais detalhes do convite | `features/invitation/parts/invitation-details-dialog.component.ts` | `presentation="sheet"` |
| Resposta RSVP (mensagem opcional) | `features/invitation/parts/invitation-rsvp-dialog.component.ts` | `dialog` |
| Cancelar evento no admin | `features/admin/admin-cancel-dialog.component.ts` | `dialog` |
| Detalhe de utilizador no admin | `features/admin/admin-user-detail-dialog.component.ts` | `presentation="sheet"` |
| Detalhe de mensagem de apoio no admin | `features/admin/admin-support-detail-dialog.component.ts` | `presentation="sheet"` |

## Bloco 9.1 — retificações (2026-11-23)

| Data | Dúvida / ponto ambíguo | Escolha | Motivo |
|---|---|---|---|
| 2026-11-23 | Rodapé dos modais com teclado virtual. | Nenhum rodapé é `sticky`/`fixed`, incluindo sheets. O painel `dialog` usa `visualViewport.height` com margem de segurança e `env(safe-area-inset-*)`; `scrollIntoView({ block: 'center' })` só em `input`/`select`/`textarea`/`[contenteditable="true"]`. | Botões de ação têm de estar no fim do formulário e no fluxo de scroll; o cabeçalho não pode ficar cortado. |
| 2026-11-23 | Apresentação dos pendentes no painel. | Carrossel horizontal com `snap-x snap-mandatory` e `no-scrollbar`; setas de 44 px no desktop, contagem “1 de N” e cards `min-w-[17rem] sm:min-w-[20rem]`. | Nome e badge deixam de se cortar em 360 px; mantém-se a navegação por toque, rato e teclado. |
| 2026-11-23 | Escala do gráfico semanal. | Barras dimensionadas pelo máximo da semana; dias com zero são uma linha fina de base; tooltip por rato, toque e teclado com `{day} · {date} · {count} respostas`. | O dia com mais respostas ocupa sempre a altura toda; zeros deixam de parecer valores cheios. |
| 2026-11-23 | Rail da sidebar colapsada. | `lg:w-[5rem]`; tooltip CSS em `[data-rail='true'] [data-tooltip]` para hover/focus; `.no-scrollbar` no `<nav>`. | Mais respiro para os ícones sem trazer de volta a barra de scroll vertical. |
| 2026-11-23 | Filtros e FAB nas listas. | `app-filter-panel` partilhado por Mensagens, Equipas e Tarefas; `app-mobile-fab` criado com `bottom: calc(env(safe-area-inset-bottom) + 4.5rem)`. | Um único markup para as três páginas e um único botão suspenso acima da navegação inferior. |
| 2026-11-23 | Botões do modal de localização. | Reutilizam `ui-btn`/`ui-btn-secondary`, com a mesma altura dos botões do modal de contacto do anfitrião. | Paridade visual e alvos ≥44 px sem duplicar estilos. |
| 2026-11-23 | O que significa “link reencaminhado por WhatsApp”. | Só se regista a partilha **host-side de um convite com convidado específico**: `whatsapp_shared_at` e `whatsapp_share_count` via `POST /host/events/:eventId/invitations/:invitationId/whatsapp-shared`, com as mesmas permissões do reenvio e auditoria. “Sucesso” é a URL válida e a abertura do `openExternal`, não a confirmação de entrega. Novo envio continua permitido; a convite público sem convidado não se aplica. | A aplicação não consegue confirmar o envio no WhatsApp, pelo que o texto é “Link partilhado por WhatsApp · há N dias”, nunca “entregue”. |
| 2026-11-23 | Cartões de equipa e detalhe de membro. | Grelha `grid-cols-1 md:grid-cols-2 xl:grid-cols-3` em `/equipas` e na secção de equipas do evento; `app-avatar-stack` com `images` (já implementado) e seleção opcional por `ids`/`memberSelected`, alvos de 44 px; o sheet de leitura `team-member-detail-dialog` obtém os dados de `GET /host/teams/:id/members`, que já valida acesso, e usa a foto da pré-visualização com iniciais como fallback. | Não duplicar regras de autorização no front; o DTO completo do membro não traz foto e a preview não traz contacto/papel, por isso se juntam as duas fontes sem criar endpoints novos. |
| 2026-11-23 | Barra superior e navegação do evento. | Em `/eventos/:id` a barra superior do shell mostra chevron de voltar (44 px) em vez do menu principal, e hambúrguer do evento em vez das notificações; em `/gestao/evento/:id` o cabeçalho público recebe os mesmos controlos. O hambúrguer abre `app-event-menu-drawer` à direita com fechar, “Adicionar convidado”, secções do evento e “Mais ações”, com Escape/backdrop/link, foco preso/devolvido e `aria-expanded`; o rail desktop do `EventSectionShell` mantém-se. A “Visão geral” mostra `app-stat-grid` antes do cartão/capa. | Mantém o menu principal acessível pelo sidebar/“Mais” no mobile e evita duplicar a lógica de navegação: o drawer reutiliza as secções partilhadas e encaminha ações por ponte para a página ativa. |

## Bloco 10 — pedido do autor (23/11/2026): campos de telefone

- **Pedido:** todos os inputs de telefone começam por 9, aceitam apenas 9 dígitos, não aceitam letras e mostram máscara a cada 3 dígitos (`9XX XXX XXX`).
- **Escolha:** a diretiva partilhada `appPhoneMask` foi reforçada e está em todos os `input` de telefone (convidado, criação de evento, perfil, gestor, membro de equipa; o link público do Bloco 10 usa a mesma). Só dígitos, descarta o que vier antes do primeiro 9, máximo 9 dígitos, grupos de 3; valores antigos `+244 …`/`00244…` são normalizados ao carregar ou colar. Fornece o validador `phone` (`^9\d{8}$`, vazio permitido) e marca o campo com `aria-invalid` e contorno coral depois de tocado. O valor enviado é o mascarado (`923 456 789`); o backend já normaliza para E.164 onde compara telefones. Sem `maxlength` no input, para não cortar texto colado com indicativo.
- **Motivo:** um único ponto de verdade evita máscaras divergentes entre formulários.

## Bloco 10 — Visibilidade e convite público (23/11/2026)

| Dúvida | Escolha | Motivo |
|---|---|---|
| "Soft delete" de eventos não existia (a remoção era física com cascata). | `events.deleted_at` + filtro `deleted_at IS NULL` em todas as leituras de entrada (`findById*`, token de gestão, listas/totais/próximos, admin) e nas listagens cruzadas (convidados, caixa de entrada, atividade, relatórios, lembretes in-app, gestores, equipas, tarefas). A remoção revoga o link de gestão e cancela emails pendentes. | Mais simples e seguro do que uma vista SQL; não destrói dados. O `down` da migração apaga fisicamente os eventos removidos (era o comportamento anterior). |
| Confirmação pelo link aberto só com telefone, mas `invitations.guest_email` era `NOT NULL`. | `guest_email` passa a anulável, com `CHECK` que o mantém obrigatório em convites `personal`. Emails para destinatários sem email são simplesmente não enfileirados. | Cumpre "e-mail **ou** telefone" sem inventar dados. |
| Contacto do link aberto coincide com um convite individual. | 409 `public_rsvp_personal_invite` ("Use o link que recebeu"); o link aberto nunca altera convites pessoais. | Senão qualquer pessoa que soubesse o email de um convidado podia mudar a resposta dele. |
| Recusar (declined) num evento com restrição de idade. | A idade só é exigida/validada ao **confirmar**; recusar não pede idade. | Recusar não dá acesso ao evento; pedir idade seria recolher PII desnecessária. |
| Recusa por idade. | Sempre 403 `public_rsvp_refused` com "Não foi possível confirmar a sua presença neste evento." para mínimo e máximo. | Critério de aceitação: limites nunca expostos. |
| Notificação "idade alterada". | Reutiliza a atividade `rsvp_accepted` com `metadata.age_flag = true` e texto próprio ("Confirmação a rever: idade alterada"), enviado ao anfitrião e aos gestores com conta (o mesmo fan-out existente). | Evita novo tipo no `CHECK` de notificações. O "responsável" é o anfitrião/criador. |
| Conta autenticada no link aberto. | Só é usada para confirmar se o pedido trouxer o CSRF derivado da sessão; caso contrário é tratado como visitante. | Impede que um site terceiro confirme em nome da conta. |
| Honeypot. | Campo `website`; preenchido → resposta de sucesso sem gravar. | Bots não aprendem que foram detetados. |
| Limites. | `publicTokenLimiter` (IP) + `rsvpLimiter` (IP + slug) + novo `publicEventRsvpEventLimiter` (por evento, 10× o limite público). Corpo limitado pelo parser global (100 kb) e pelo schema `.strict()`. | Reutiliza variáveis existentes; nenhuma variável de ambiente nova. |
| Google e data de nascimento. | O login Google pede apenas `profile` e `email`; a data de nascimento **não** vem nesses scopes, por isso fica vazia. Não foram pedidos scopes extra. | Regra do bloco: não pedir scopes extra sem aprovação. |
| Pesquisa de perfis. | Não existia pesquisa de perfis para utilizadores (só a do admin). Criado `hostRepository.searchPublicProfiles`, que filtra sempre `profile_visibility = 'public'`, para os blocos seguintes; teste negativo em `tests/bloco10.test.ts`. A lista do super admin não é "pesquisa" de utilizadores e mantém todas as contas. | Garante o critério desde já. |
| Slug do link público. | 12 caracteres base64url (72 bits), gerado ao tornar público; mantém-se se o evento voltar a privado (o link deixa de resolver) e é reutilizado se voltar a público. | Link estável para quem já o partilhou. |

## Bloco 11 — Comunidades e equipas (24/11/2026)

| Dúvida | Escolha | Motivo |
|---|---|---|
| `teams.creator_id` pedido, mas já existia `teams.created_by_host_id`. | Reutilizado `created_by_host_id` como criador; backfill com o anfitrião do evento onde estava vazio (nenhuma equipa ficou sem criador). | Evita duas colunas com o mesmo significado. |
| `team_events` e queries. | Tabela criada com backfill do `event_id` actual (4/4 equipas na base local). Novas equipas escrevem em `team_events`. `teams.event_id` mantém-se como **evento principal**: as tarefas continuam ligadas a ele (trigger do Bloco 2). `team_events` é usado na listagem por evento, no acesso (anfitrião de um evento associado vê a equipa como gestor; o criador como anfitrião) e na página da comunidade. | Migrar todas as queries de tarefas/membros para `team_events` era uma reescrita de risco (trigger de tarefas e ~10 queries). Fica para um bloco futuro, já com os dados prontos. |
| Equipa sem evento. | Não suportado: uma equipa continua a precisar de um evento principal. "Equipa sem comunidade" é suportado. | O modelo de tarefas depende do evento. |
| "Associar a todos os eventos". | Numa equipa de comunidade: todos os eventos da comunidade. Sem comunidade: todos os eventos de que o criador é anfitrião. Lista explícita: qualquer evento que o criador gere (comunidade + pessoais). | Leitura literal de "todos os da comunidade". |
| Papel do responsável da comunidade nos eventos. | Responsável = poderes de anfitrião (`access_role = host`); gestores da comunidade = gestor do evento. | "Configurações alteradas por gestores e responsável". |
| Apagar evento da comunidade. | Sem confirmados: gestores, responsável e o criador do evento; com confirmados: só o responsável (mais confirmação do nome, Bloco 10). | Regra do bloco. |
| Convites para comunidades privadas. | O gestor convida por email/telefone (estado `invited`); a pessoa aceita ou recusa na app (o convite liga-se à conta pelo email). | Simples, sem tokens novos. |
| OTP da transferência. | Reutiliza `registration_verifications` com `purpose = 'community_transfer'`, o mesmo TTL, tentativas e intervalo de reenvio; email `comunidade_transferencia_codigo`. | Pedido do bloco. |
| Emails de comunidade. | Um único tipo de outbox `community_notice` (pedido recebido/aprovado/recusado, convite, transferência iniciada/concluída) com template `comunidade_aviso`. | Evita seis tipos novos no `CHECK`. |
| Código de partilha (`?ref=`). | Cada membro tem `community_members.ref_code` (8 caracteres aleatórios). Só conta na confirmação pelo link aberto de um evento da mesma comunidade, na criação da confirmação. | O membro não controla a contagem depois de criada. |
| Contactos de membros. | Membros veem nome, foto e papel; o email só é devolvido a gestores/responsável; o telefone nunca. | Minimização de dados. |

## Pedidos do autor durante o Bloco 11 (24/11/2026)

| Pedido | Escolha |
|---|---|
| Cartões de equipa, convidados e membros sempre com o mesmo tamanho, mais uniformes. | Todas as grelhas usam `grid auto-rows-fr grid-cols-1 md:grid-cols-2 xl:grid-cols-3` (cada linha com a altura da mais alta); o `app-person-card` ocupa a célula (`h-full`, coluna flex, ações em baixo com `mt-auto`); a descrição da equipa reserva duas linhas. Textos de 9–11 px subidos para 12 px; "Abrir equipa" e botões das tarefas com 44 px. |
| Tarefa com detalhes, autoria e dono persistentes. | Migração `0030`: `host_tasks.created_by_name` (trigger em qualquer criação + backfill) e `created_by_host_id ON DELETE SET NULL` (já não apaga tarefas). DTO devolve `created_by_name` e `completed_by_name`. Novo `app-task-detail-dialog` (sheet só de leitura) na página de Tarefas e no detalhe da equipa, com estado, prioridade, prazo, evento, equipa, responsável, autor, datas e quem concluiu. `host_tasks.host_id` continua `CASCADE` (fora do pedido; contas não são apagadas fisicamente pela app). |
| Sessão de quem entra com link + código guardada no navegador, sem conta, até um gestor revogar; gerar outro código não corta quem já entrou. | Gerar código já não revogava sessões; o problema era a duração (120 min). A sessão por link + código passa a durar até ao fim da validade do link (máx. 30 dias sem validade), com cookie persistente. Cada pedido revalida o gestor: revogar o link ou remover o gestor termina a sessão de imediato. O navegador lembra o último evento (`localStorage`) e `/gestao` volta a entrar sozinho. Textos dos diálogos "Gerar novo código" e "Revogar" atualizados. |

## Bloco 12 — Feed, pesquisa, amigos e ajuda (24/11/2026)

| Dúvida | Escolha | Motivo |
|---|---|---|
| Comunidade pública sem conta em `/comunidades/:slug`. | `/comunidades/:slug` fica na área autenticada (Bloco 11); a versão limitada para visitantes vive em **`/comunidade/:slug`** (sem membros, com eventos e "Entrar"/"Abrir comunidade"). O feed e a pesquisa apontam para a versão pública. | Evita mexer no guard da área autenticada e na casca da app. |
| Cursor do feed. | Cursor opaco (base64url do deslocamento, máx. 10 000), 12 por página e "Carregar mais" (44 px). | Simples e suficiente para o volume atual; ordem estável (`starts_at`, `id`). |
| "Próximos ou a decorrer". | `COALESCE(ends_at, starts_at + 6 h) >= now()` e estado `scheduled`. | Eventos sem fim definido continuam visíveis enquanto decorrem. |
| Limites da pesquisa e do feed. | Limitadores próprios por IP (`publicFeedLimiter`, `publicSearchLimiter`) com as variáveis públicas existentes; pesquisa só a partir de 2 caracteres e 5 resultados por grupo, `ILIKE` com escape. | Navegar no feed não esgota a quota dos links de convite. |
| Amizades. | Só com perfis públicos; um pedido em sentido contrário pendente é aceite em vez de duplicado; limite de 30 pedidos por dia; notificações in-app `friend_request`/`friend_accepted` (sem email). | Evita spam e respeita "perfil privado nunca aparece". |
| "Eventos anteriores" com o estilo do template. | Cartões com a capa ou, sem capa, a arte do template (`app-template-artwork`) e `template { id, palette, mode }` no DTO. O renderer dos Blocos 14/15 ainda não existe; quando existir substitui a arte. | Regista a dependência. |
| Ajuda em Markdown. | `src/content/docs/*.md` carregados como texto pelo builder do Angular (`"loader": { ".md": "text" }` em `angular.json`, sem dependências) e um renderer mínimo próprio (títulos, listas, negrito, links internos/https; texto sempre escapado). `docs/GUIA-UTILIZADOR.md` gerado a partir dos mesmos ficheiros. **Exige reiniciar o `ng serve`** depois de mudar de branch. | Pedido do bloco, sem dependência pesada. |
| `app-brand`. | Passa a ligar para `/` (feed) em vez de `/painel`. | `/` é a página inicial; visitantes não eram mandados para o login. |
| Destino pós-login. | `/` (feed) por defeito, também no Google; `returnUrl` continua a mandar. | Regra do bloco. |

## Bloco 13 — Instituições (24/11/2026)

| Dúvida | Escolha | Motivo |
|---|---|---|
| Quem confirma com OTP. | Só o **criador da instituição** confirma com código (6 dígitos, `purpose = 'institution_link'`, email `instituicao_codigo`) ligar **e** remover uma comunidade. O responsável da comunidade pede ou aceita o convite sem código. | "Nenhuma comunidade é ligada sem OTP do criador"; o pedido parte de quem tem menos poder. |
| Sair da instituição. | O responsável da comunidade pode sair **sem OTP** (ação no detalhe, com confirmação). | Sair só reduz o alcance da instituição; não exige o consentimento do criador. |
| Fluxo dos pedidos. | `pending` → (convite: a comunidade aceita) → o criador aprova (`awaiting_otp`, código enviado) → confirma o código (liga/desliga numa transação). Um pedido aberto por comunidade e instituição (`institution_request_open`). Uma comunidade só pertence a uma instituição (`community_has_institution`). | Estados explícitos e auditados em `host_audit_log`. |
| Instituição privada. | 404 para quem não é criador nem responsável de uma comunidade associada; comunidades privadas da instituição só aparecem ao criador e ao próprio responsável. | Mesma regra de não revelar existência dos blocos 11/12. |
| Feed. | No separador "Comunidades", a primeira página começa com até 6 instituições públicas (`type: 'institution'`), com cartão do mesmo tamanho dos de comunidade. O cartão abre `/instituicoes/:slug` (área autenticada; visitantes passam pelo login). | Sem página pública própria neste bloco. |
| Correção do feed (avatar, excerto, data). | Commit `cb53190` ficou na branch do Bloco 13 do back porque já descendia da do 12. | Registo. |
| Perfil da comunidade. | O DTO da comunidade passa a ter `institution { name, slug }`; o detalhe autenticado mostra "Faz parte de …" com ligação. A página pública `/comunidade/:slug` ainda não mostra (fica para depois). | Âmbito do bloco. |

## Bloco 14 — Convite: vídeo, mapa, organizadores, templates iniciais e PDF (24/11/2026)

| Dúvida | Escolha | Motivo |
|---|---|---|
| Rascunhos do assistente. | Usa a API dedicada `/host/event-drafts` (entidade separada, já implementada no back) em vez de criar eventos com `status=draft`. O front faz autosave com debounce de 2 s, guarda ao avançar passo, retoma por `?draft=` e elimina por confirmação. | Back já entregue com `event_drafts`; evita criar eventos reais antes de publicar e mantém "nunca no feed/pesquisa/notificações". |
| Vídeo no formulário. | O utilizador cola URL/ID; o front extrai e envia só o `youtube_video_id` (11 chars) via `extractYoutubeId`, com erro claro em pt-PT. | Spec: nunca guardar URL livre. |
| Localização exata. | Botões "Usar a minha localização" (Geolocation API) e "Escolher no mapa" (Leaflet + OSM, lazy, sem chave) no wizard e no modal de edição; "Remover localização exata" limpa lat/lng/placeLabel. Coordenadas enviadas em `location.latitude/longitude/place_label`. | Spec do bloco; Leaflet autorizado. |
| `useTables`. | Toggle "Ativar mesas (atribuir mesa aos convidados)" no wizard e no modal de edição; enviado como `use_tables` no create/update. | PDF do convite mostra Mesa só quando ativo (back). |
| Eventos: separador Rascunhos. | Adicionado filtro "Rascunhos" na página `/eventos` que lista `/host/event-drafts` com Retomar/Eliminar (confirmação em modal `dialog size="sm"`). | Critério de aceitação do bloco. |
| Mapa: Google Maps (alteração pedida). | A pedido explícito do autor, o seletor Leaflet+OSM foi substituído por **Google Maps JavaScript API + Geocoding**. A chave fica em `environment*.ts` (`googleMapsApiKey`) e em `apupu_back/.env`/`.env.render` (`GOOGLE_MAPS_API_KEY`) como pedido; não hardcodar em componentes. Ao confirmar ponto, faz reverse geocoding e preenche `city`/`venue` quando disponíveis; “Usar a minha localização” também tenta reverse geocoding. O modal abre no `initial`/ponto já selecionado. | Pedido do autor; substitui a decisão anterior de Leaflet+OSM sem chave. |

## Bloco 15 — Templates, Gratitude, feed e eventos passados (Passo 1, 25/11/2026)

| Dúvida | Escolha | Motivo |
|---|---|---|
| Estado efetivo "Passado/Terminado". | Derivado na leitura (`effectiveEventStatus`) e materializado por job periódico de 15 min (`markEndedEventsCompleted` + `eventCompletionScheduler`). Fim = `endsAt` ou início do dia seguinte no timezone do evento. `draft/cancelled` explícitos; `scheduled/published` tornam-se `completed` quando terminam. | Regra do bloco: automático, sem depender de ação manual; leitura garante correção imediata. |
| Escritas em eventos terminados. | `requireActiveEvent` bloqueia escritas em `completed/cancelled` (409 `event_not_active`), com exceção `allowGallery` para caminhos `/events/:id/gallery|media` como ponto de extensão futuro. Front desativa edição/cancelamento/RSVP e mostra banner de leitura. | Bloco 15: terminado = só leitura, exceto galeria (a implementar). |
| Ordenação Bloco 15. | Ativos/futuros primeiro (`starts_at ASC`), depois passados (`starts_at DESC`), depois cancelados (`starts_at DESC`), `id ASC` como desempate. Aplicado em `listForHost`, `listForAccountEmail`, feed, perfis públicos e eventos de comunidade. | Regra explícita do Passo 1.4. |
| Fontes PDF. | Catálogo local fechado embutido em `apupu_back/src/assets/fonts` (Figtree sans, Cormorant Garamond serif, Cinzel cap, Pinyon Script script, Oswald condensed). `resolveCatalogFont` lança erro em fonte desconhecida/em falta; sem CDN e sem fallback silencioso. | Regra do Passo 1.2. |
| QR do convite. | PDF: QR estilizado com cartão arredondado, borda fina na cor do template, logótipo central, correção H, legenda e módulos arredondados (SVG). Destino respeita `manifest.pdf.qr_destination/qr_custom_url/qr_label`. Digital Gratitude: QR por imagem gerada via `api.qrserver.com` (sem nova dependência), respeitando label/destino custom ou URL atual. | Passo 1.3 mínimo; sem dependências novas. |
| Gratitude template. | Template de sistema inserido por migração `1739900000034_bloco15_gratitude.js` com `kind=system`, manifesto próprio e `supported_fields` incluindo `dress_code`. Digital: componente dedicado `GratitudeInvitationComponent`. PDF: ramo dedicado em `invitationDocument.ts`. Passo 2 deve unificar num TemplateRenderer único. | Passo 1.1 urgente; fidelidade razoável ao flyer descrito em texto. |
| `event_templates.kind`. | Coluna `kind` (`system|user`, default `user`) adicionada na migração do Gratitude; DTO/API/front expõem `kind`. | Necessário para distinguir templates oficiais de utilizador no Bloco 15. |

## Gratitude Tarefa A — layout proporcional e validação (26/11/2026)

| Dúvida | Escolha | Motivo |
|---|---|---|
| Layout vertical Gratitude | PDF e digital usam coluna proporcional na zona útil entre fitas (top 10%–89%): [logo?]→org→subtítulo→título→ano→linha de informação→[dress?], com gaps em % da altura e centragem vertical por distribuição do espaço livre. | Corrige sobreposição org/subtítulo, vazio inferior e reequilíbrio sem logo/dress code. |
| Linha de informação | Colunas com gap ≥2%W, gap interno ícone-texto 1.4%W, largura própria para local calculada a partir de `locColW`; local quebra em 2–3 linhas e reduz fonte até mínimo 12px equivalente; separadores dourados mesma altura, centrados, só entre colunas existentes. | Corrige "18:00 toca no pin" e local sobreposto. |
| Validação | PDFs gerados por `renderInvitationPdf` para 4 casos (a sem logo/sem dress, b com logo/sem dress, c sem logo/com dress, d com logo/com dress + local longo). `pdftoppm` gerou `docs/assets/gratitude-a.png..d.png`; `pdftotext -bbox` confirmou ausência de sobreposição nos blocos consecutivos org/subtítulo/título/ano e espaço livre inferior a=17.3%, b=8.6% (sem dress ≤18%); c/d com dress. `pdftotext` sem "LOGO"; `pdffonts` embute Montserrat/Anton. | Evidência automatizada PDF; separadores/ícones vetoriais não aparecem no bbox de texto. |

## Gratitude editor/PDF defects (25/11/2026)

| Dúvida | Escolha | Motivo |
|---|---|---|
| QR overflow em todos os templates | `drawQrWithLogo` força SVG com `width/height` explícitos e `assumePt`; QR padrão usa `resolveQrConfig` com tamanho limitado (`md/lg`, cap por largura). | Corrige QR gigante/transbordo no PDF. |
| QR digital Gratitude | Substituído `api.qrserver.com` por gerador SVG local vendored (`qr-svg.util.ts`, baseado em qrcode-generator MIT) sem nova dependência npm. | Cumpre "QR escalável SVG vector", sem dependência externa em runtime. |
| Logo/QR config | Campos adicionados a `manifest.pdf` (front+back schema): `logo_url/public_id/shape/size`, `qr_mode/whatsapp/custom/image/icon/size/label`. Editor guarda overrides em draft localStorage. | Permite edição no editor e render no digital/PDF. |
| Upload de logo/QR no editor | Validação client-side (tipo/tamanho) e data URL no draft para preview; `public_id` fica `undefined` até endpoint Cloudinary dedicado existir. | Preview funcional; persistência Cloudinary com cleanup de asset fica como lacuna a fechar. |
| LOGO placeholder | Removido do convite público/PDF; Gratitude mostra botão tracejado "Adicionar logótipo" apenas em `editorMode`. | Spec: sem "LOGO" no público/PDF. |
| Artefacto | `docs/assets/gratitude-pdf-render.png` gerado por `renderInvitationPdf` + `pdftoppm`; `pdftotext` sem "LOGO". | Evidência mínima; validação visual completa Playwright/pdffonts ainda pendente. |

## Gratitude Task A — PDF/digital layout final (26/11/2026)

| Dúvida | Escolha | Motivo |
|---|---|---|
| Layout final PDF | `invitationDocument.ts`: zona útil 10%-89%, grupos `[logo?][org+subtitle][title+year][info row][dress?]` com `space-evenly`, gap título/ano 3%H (layout), info center máx 72% sem dress e 71.2% com dress para afastar QR da ribbon bezier. Ícone 5.4%W, gap ícone-texto 1.4%W. QR card + margem 1.5%H validado geometricamente contra `M540 1280 C700 1215 900 1110 1024 1000`. | Cumpre regras finais: pin não sobre texto, QR não intersecta ribbon, título+ano como grupo, info row com margens ~4% e separadores só entre colunas existentes. |
| Validação PDF | `npm run build`, `npx tsx /tmp/opencode/render-gratitude.ts`, `pdftoppm` 144dpi, `pdftotext -bbox` + asserts Python para 4 casos (a-d): PASS sem overlaps bbox, sem fora da canvas, icon-text ok, QR-ribbon geométrico ok, title-year ≤3%H layout (`gapTY` bbox pequeno negativo tratado como artefacto). | Evidência automatizada reproduzível; `pdftotext -bbox` não cobre vetores, logo QR-ribbon verificado por geometria. |
| Digital 1024×1280 | Validação real-component Playwright 1024×1280 (`e2e/gratitude-real.spec.ts`, rota `__test/gratitude/:case`) para 4 casos a-d: **4 passed**. Asserts: canvas bounds, sem overlaps consecutivos, gap título→ano ≤3%H, texto local à direita do ícone, QR acima da bezier da ribbon inferior, presença/ausência logo/dress. | Task A digital validada com evidência real-component; screenshots em `docs/assets/gratitude-a.png..d.png`. |

## Bloco 15B — catálogo e Gratitude título longo (27/11/2026)

| Dúvida / ponto ambíguo | Escolha | Motivo |
|---|---|---|
| Ordem de entrega divergente | Seguir `BLOCO-15B-CATALOGO-TEMPLATES.md` (T01, T03, T05, T08, T11, T13, T17 primeiro); `PLANO-BLOCO-15.md` fica como documento divergente. | O anexo 15B é a descrição visual detalhada e contém os critérios de aceitação dos 19 templates. |
| Fonte canónica do catálogo | Front `system-templates.ts` é a definição canónica; back publica o espelho JSON e a migração faz upsert por slug. | Evita duas fontes divergentes; o repositório do front ignora o remoto quando o slug é de sistema. |
| Miniatura dos templates | Gerada em runtime por `TemplateRendererComponent` em `mode="preview"` a partir de `previewData`; sem ficheiros de imagem estáticos. | Cumpre "miniatura gerada" sem copiar fotos/marcas das referências. |
| Detalhes decorativos complexos | Aproximados com ornamentos SVG/gradientes no convite digital; no PDF o documento v2 é convertido em linhas de texto (incluindo timeline e botões). | O PDFKit não reproduz relevo 3D, papel recortado ou máscaras de gradiente; o contrato comum continua a ser o documento de blocos. Registado em `BLOCKERS.md`. |
| Título extenso do Gratitude | Redução gradual por `STEP` até `MIN`, depois alargamento da viewBox com `xMidYMid meet`; nunca `preserveAspectRatio="none"`. | Evita cortar e evita distorcer glyphs; a viewBox é dimensionada para manter o texto escalado dentro da faixa de 91%. |
| Constantes e medição | Ecrã: `BASE=300`, `MIN=90`, `STEP=10`, banda `910×300`, canvas `1000`; PDF: `BASE=195`, `MIN=54`, `STEP=5`, banda `0.91×1024`, canvas `1024`. O back mede com PDFKit/ Anton em unidades do viewBox. | Números alinhados com a referência HTML e com o SVGtoPDF; não converter para pontos porque o `Tf` é escrito nas unidades do viewBox. |
| Asserção antiga de fontes do PDF Gratitude | Corrigida de `Figtree`/`CormorantGaramond` para `Anton`/`Montserrat`. | O PDF Gratitude sempre usou essas duas famílias; a asserção falhava em `HEAD` limpo. Figtree/Cormorant continuam no template genérico. |
| Lint do backend (resolvido) | Corrigir os 159 erros com tipos reais (`unknown` + estreitamento, `PdfBlockStyle`, remoção de asserts desnecessários), sem `eslint-disable` e sem alterar regras ou comportamento. | `npm run lint` passa com 0 erros; `build`, `typecheck` e `test` continuam verdes. Os 60 avisos restantes são de `explicit-function-return-type` e não afetam o exit code. |
| Paridade PDF de blocos ricos | Desenhar no PDF os elementos que o PDFKit consegue representar por vetor (eixo da timeline, pílulas de botão, divisores, ornamento, placeholders de média, cantos) em vez de os reduzir a texto. | Mantém o documento v2 como contrato comum e melhora a correspondência visual sem novas dependências; relevo 3D, máscaras de gradiente e interactividade continuam aproximados e documentados. |
| Validação da migração 15B | Executar `up/down` com o `runner` real do `node-pg-migrate` numa base PostgreSQL descartável, criando apenas as tabelas/colunas que a migração toca. | Cobre inserts, idempotência do upsert, preservação de templates em uso e round-trip sem afetar bases de desenvolvimento; não cobre o baseline completo nem carga de produção. |
| Contraste das paletas | Ajustar `ink`/`muted` de T02, T06, T09, T10, T12 e T16 para ≥4.5:1 sobre `bg`, em vez de alterar o renderer para painéis de superfície. | A especificação 15B exige esse mínimo e o renderer escreve diretamente sobre `--tpl-bg`; alterar as paletas é local e preserva a estrutura dos templates. Teste puro garante as 19 paletas. |
| Teste a 320 px | Harness auto-contido em `__test/templates` com spec Playwright que mede o componente real, em vez de capturas manuais. | Detetou um corte real no T18; corre em 4 projetos sem backend e verifica overflow, tamanho de fonte e clipping do título. |

## Ajustes de UI e convites (27/11/2026 — segunda rodada)

| Dúvida / ponto ambíguo | Escolha | Motivo |
|---|---|---|
| Anfitrião de evento de comunidade | Consultar o nome da comunidade no PDF e substituir `event.hostName` antes de gerar qualquer linha/bloco. | Quem convida é a comunidade; a substituição centralizada cobre templates genéricos e Gratitude sem duplicar regras no renderer. |
| Barra inferior do painel | Adotar exactamente o formato da barra do feed (cápsula flutuante, vidro, safe-area, 44 px) e remover `/tarefas` da barra, mantendo-o no drawer "Mais". | Padronização visual e menos ruído; o destino continua acessível. |
| Cartões pendentes no painel | Grelha responsiva 1/2/3 colunas dentro de cada painel, mantendo o agrupamento de três convidados por página. | A força de três colunas deixava cartões ilegíveis a 320 px; a paginação existente evita recriar lógica de snap. |
| Detalhe do convidado no modal | Substituir a linha única truncada por blocos de contacto com `break-all`, avatar e estado à parte. | O contacto combinado (`email · telefone`) cortava o número em modais estreitos; separar os campos garante legibilidade sem depender da largura. |
| Largura e acções do modal | Passar o modal de detalhe de `sm` para `lg` e usar três colunas a ocupar toda a largura, colocando “Descarregar convite” antes do WhatsApp. | Era o único botão que quebrava o texto numa coluna de `sm`; com 704 px entra no mesmo grupo das restantes acções e numa só linha, sem espaço vazio à esquerda. |
| Cartão de convidado em mobile | Manter avatar, nome e menu “⋯” na mesma linha, com o nome centrado verticalmente na bola; contacto, metadados e estado só no detalhe. | Em ecrãs estreitos a linha com contacto e metadados era ilegível; o alinhamento vertical do nome com a bola preserva a leitura sem transformar o cartão numa coluna. |
| Nome do convidado no Gratitude PDF | Usar o mesmo `guestLabel` do convite genérico e inserir a linha entre subtítulo e título, com tamanho de fonte adaptativo. | O PDF ignorava `invitation.guestName`; manter o rótulo coerente evita uma terceira variante de “Convidado/Convidada”. |
| Botão "Criar" do feed | Abrir directamente `/criar-evento` em vez do modal "partilhar evento". | Pedido explícito: o botão deve abrir a tela de criar convite; visitantes vão para `/criar-conta`. |
| WhatsApp nos cartões | Passar a acção para o menu "…" em vez do botão principal, em `/convidados` e no detalhe do evento. | Pedido explícito; liberta largura para o nome do convidado em mobile. |
| Gratitude — posição do QR | Três colunas iguais para data/hora/local e QR num grupo próprio entre essa linha e o dress code; local limitado a 3 linhas. | Evita sobreposição quando o endereço é longo e mantém a hierarquia pedida. O PDF usa o mesmo grupo, preservando o contrato comum. |
| Nome do ficheiro descarregado | `conto-contigo-convite-<nome-do-convidado>.pdf` e textos "Descarregar convite". | O documento é um convite, não um bilhete; o nome identifica o convidado. |
