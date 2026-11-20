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
