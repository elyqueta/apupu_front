# Bloco 2 — Equipas e gestores (equipa obrigatória, link + código de acesso)

> Lê primeiro `REGRAS-GERAIS.md` e `docs/AUDIT.md` (secções 6, 7 e 9). Depende do Bloco 1 (`app-modal`, `app-person-card`, `app-stat-grid`). Branch: `feat/bloco-2-equipas-gestores`.

## Objetivo

1. **Não pode existir gestor sem equipa.** Criar um gestor é criar, no mesmo ato, a equipa dele.
2. Gestores e membros podem **não ter conta**. Basta um contacto: telefone ou e-mail (pelo menos um).
3. Quem não tem conta acede por **link + código de acesso**. Sem OTP, sem passwords.
4. O anfitrião controla a **validade** do link.
5. Quem tem só telefone recebe o convite por WhatsApp (link partilhável). Só quem tem e-mail recebe notificações.

## Regras de produto (já decididas; não alterar)

- Uma equipa tem **um gestor ativo**. Uma equipa pode ter muitos membros.
- O gestor pertence a um evento através da equipa. Mantém-se o conceito atual de `event_managers`, agora ligado a `team_id`.
- **Código de acesso**: 6 caracteres, letras maiúsculas e números, sem caracteres ambíguos. Alfabeto: `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (31 símbolos). Mostrado agrupado `XXX-XXX` mas aceite com ou sem hífen/espaços e em minúsculas (normalizar: maiúsculas, remover espaços e hífens). Símbolos especiais **não** entram: dificultam a escrita no telemóvel e no WhatsApp.
- **Link**: token aleatório criptograficamente seguro de 32 bytes em base64url (já existente em `manageLink.service.ts`/`token.util.ts`). Só o HMAC fica na BD. O código também só fica na BD como HMAC (com pepper e o id do gestor), nunca em texto.
- O código é mostrado **uma única vez** ao anfitrião (no momento de criar ou regenerar). Depois só se pode **gerar um novo**.
- **Respostas genéricas**: qualquer falha de acesso (link inexistente, expirado, revogado, bloqueado, código errado) devolve a mesma resposta HTTP, o mesmo corpo e o mesmo código de erro, com mensagem `Não foi possível aceder.` (`pt-AO`) / `Unable to access.` (`en`). Nunca dizer o que falhou. Tempo de resposta equivalente: para link inexistente, faz na mesma uma comparação HMAC fictícia.
- **Tentativas**: 5 falhas seguidas por link bloqueiam esse link durante 15 minutos. 15 falhas acumuladas revogam o link e geram notificação ao anfitrião ("Tentativas de acesso suspeitas ao link de {nome}"). Limite adicional por IP com o rate limiter já existente.
- **Validade**: por defeito **7 dias** a partir da criação. Configurável pelo anfitrião: alargar, encurtar, ou "até ao fim do evento". **Máximo absoluto: 1 dia depois do fim do evento** (`ends_at`; se o evento não tiver `ends_at`, usa o fim do dia de `starts_at` no fuso do evento, mais 1 dia). O backend valida e rejeita valores acima do máximo.
- Quem só tem telefone **não recebe notificações** (só e-mail). A UI avisa isso ao anfitrião.

## Passo 1 — Backend: modelo e migrações

1. Nova migração (reversível) em `apupu_back/migrations/` seguindo o padrão do ficheiro `1739900000006_event-managers.js`:
   - `event_managers`: adicionar `team_id` (FK para `teams`, `ON DELETE CASCADE`), `phone` (texto, normalizado E.164 com indicativo +244 por defeito), `display_name` (texto, opcional), `access_code_hash` (texto), `access_failed_count` (int, default 0), `access_locked_until` (timestamptz, nulo), `link_expires_at` (timestamptz), `link_revoked_at` (timestamptz, nulo).
   - Tornar `email` **nullable**, com `CHECK (email IS NOT NULL OR phone IS NOT NULL)`.
   - Índice parcial único: no máximo um gestor ativo por equipa (`UNIQUE (team_id) WHERE removed_at IS NULL`, usando a coluna de soft delete que existir; confirma o nome real na migração `…006`).
2. Migração de dados (na mesma migração ou numa seguinte), **antes** de aplicar `NOT NULL` a `team_id`:
   - Para cada gestor existente sem equipa: cria uma equipa no mesmo evento com o nome `Equipa de {display_name ou parte local do e-mail}`, categoria por defeito já existente no enum, e liga o gestor. Se o gestor já tinha `team_members` com papel de gestor numa equipa desse evento, liga a essa equipa em vez de criar.
   - Para cada gestor existente: `link_expires_at = LEAST(now() + 7 dias, fim do evento + 1 dia)`; se esse valor já passou, `now()` + 1 dia. `access_code_hash` fica nulo: ver "Compatibilidade".
   - Só depois: `ALTER COLUMN team_id SET NOT NULL`.
3. `team_members`: adicionar `phone` e tornar `email` nullable com o mesmo `CHECK`. Atualizar os índices únicos existentes para não colidirem com e-mail nulo.
4. **Compatibilidade**: gestores antigos (sem `access_code_hash`) continuam a aceder só com o link até o anfitrião gerar um código; no entanto, a primeira vez que o anfitrião abrir o ecrã de gestores, a UI mostra "Gerar código de acesso" em destaque. Documenta isto em `docs/DECISIONS.md`.

**Aceitação:** migração sobe e desce sem erro numa BD de teste; sem gestores órfãos de equipa; teste automatizado da migração de dados, se existir infraestrutura de testes de BD; caso contrário, testes unitários do serviço.

## Passo 2 — Backend: serviço de acesso por link + código

Em `apupu_back/src/services/` (reutiliza `manageLink.service.ts`, `hostSession.service.ts`, `utils/token.util.ts`):

1. `generateAccessCode()`: 6 caracteres do alfabeto acima, com `crypto.randomInt` (nunca `Math.random`).
2. `hashAccessCode(code, managerId)`: HMAC-SHA256 com o pepper existente (`TOKEN_PEPPER`), comparação com `crypto.timingSafeEqual`.
3. `POST /api/v1/public/manage/access` (ou a rota pública de gestão existente; segue o padrão atual): corpo `{ token, code }`. Fluxo:
   - Normaliza o código; valida o formato por schema (token 20–200 caracteres, código 6 símbolos do alfabeto, senão responde igual ao erro genérico).
   - Procura o gestor pelo HMAC do token. Se não existir, faz a comparação fictícia e devolve o erro genérico.
   - Se `link_revoked_at`, `link_expires_at < now()` ou `access_locked_until > now()`: erro genérico.
   - Se o gestor ainda não tem `access_code_hash` (compatibilidade): aceita só com o token e marca `legacy_access = true` na resposta interna (não exposta).
   - Compara o código; se errado, incrementa `access_failed_count`, aplica as regras de bloqueio/revogação e devolve o erro genérico; se certo, zera o contador, atualiza `last_used_at` e cria a sessão de gestão curta já existente (`HOST_SESSION_TTL_MINUTES`) com cookie e CSRF como hoje.
4. Todos os erros desta rota usam o **mesmo** código HTTP (403) e o mesmo corpo. Regista (log interno) o motivo real, **sem** o código nem o token.
5. Rate limiting: usa o `publicTokenLimiter` existente e um novo limitador por IP específico para esta rota.

**Aceitação:** testes unitários cobrindo: código certo, errado, link expirado, revogado, bloqueado, legado, normalização (minúsculas, hífen), resposta idêntica em todos os falhanços (comparar corpo e código), 5 falhas bloqueiam, 15 revogam e notificam.

## Passo 3 — Backend: criar gestor com equipa, validade, regenerar, revogar

1. `POST /host/events/{eventId}/managers` passa a receber:
   `{ team_name, display_name?, email?, phone?, link_expires_at? }`.
   Valida: `team_name` obrigatório (2–80 caracteres); pelo menos um de `email`/`phone`; telefone normalizado; validade dentro do máximo. Cria **equipa + gestor numa transação**. Devolve o gestor, a equipa, o link completo e o **código em texto, apenas nesta resposta**.
2. `PATCH /host/events/{eventId}/managers/{managerId}/link` com `{ link_expires_at }`: altera a validade (valida o máximo).
3. `POST /host/events/{eventId}/managers/{managerId}/access-code`: gera novo código e **rota o token do link** (invalida o link antigo), devolve link novo + código novo (uma vez). Zera o contador de falhas.
4. `POST …/revoke` revoga o link (`link_revoked_at = now()`), mantendo o gestor.
5. Promover um membro a gestor da equipa dele: só se a equipa não tiver gestor ativo; caso contrário, erro claro ("A equipa já tem um gestor."). Despromover um gestor passa-o a membro **e revoga o link e o acesso ao evento**, corrigindo a lacuna apontada na auditoria (`teamMember.service.ts:270-273,306-351`).
6. Adicionar membros (`POST /host/teams/{id}/members`) aceita itens `{ email? , phone?, display_name? }` (mesma regra do pelo-menos-um). Membros com só telefone ficam `status = invited_phone`, sem envio automático. Membros com e-mail continuam a receber o e-mail de convite já existente, **agora com link + código**.
7. Convite por e-mail: acrescenta o código ao e-mail de convite de gestor (catálogo `apupu_back/src/emails/catalog.ts`). O corpo diz que o código também pode ser partilhado em separado.
8. Notificações: continuam só por e-mail (outbox existente). Nenhum envio para quem só tem telefone.

**Aceitação:** testes do serviço para cada rota; permissões (só anfitrião cria, altera validade, regenera, revoga; gestor não pode); nenhuma resposta, exceto a de criação/regeneração, contém o código.

## Passo 4 — Backend: criar conta sem OTP (corrigir o atalho largo)

Hoje o atalho usa `invitation.repository.ts:255-273` (qualquer convite não revogado com o mesmo e-mail) e devolve `verification_token` (`auth.service.ts:138-184`, `auth.controller.ts:33-47`).

1. **Novo atalho legítimo**: um gestor/membro que acedeu com link + código (sessão de gestão válida) pode criar conta **sem OTP** para o **mesmo contacto** (e-mail ou telefone) com que foi cadastrado. A rota exige a sessão de gestão (cookie + CSRF) e compara o contacto da conta nova com o do gestor/membro.
2. Se a conta exigir e-mail e o gestor tem só telefone: a conta pede e-mail e **esse e-mail é verificado por OTP normal** (só o contacto já validado dispensa OTP). Confirma no modelo de contas se existe suporte a conta só com telefone; se não existir, não o cries: segue esta regra e regista em `docs/DECISIONS.md`.
3. Ao criar a conta, o gestor/membro fica associado à conta (`host_id`/equivalente) mantendo equipa e permissões.
4. **Apertar o atalho antigo** de convidados: só vale se o convite tiver `claimed_at IS NOT NULL`, não estiver revogado e o evento não tiver terminado há mais de 30 dias; continua a exigir que o e-mail do pedido seja o do convite; aplica rate limit.

**Aceitação:** testes: criar conta com sessão de gestão válida (sem OTP); sem sessão (exige OTP); contacto diferente (exige OTP); atalho antigo recusado se `claimed_at` nulo.

## Passo 5 — Frontend: criar equipa com gestor (modal)

1. Em `/equipas` (`team.page`), o botão **"Nova equipa"** passa a abrir `app-modal` com um formulário em duas secções:
   - **Equipa**: evento, nome, categoria, descrição.
   - **Gestor da equipa** (opcional ao criar? **não**: obrigatório; uma equipa sem gestor não existe): nome, telefone **ou** e-mail (pelo menos um; telefone com máscara angolana +244 usando `phone-mask.directive.ts`), validade do link (select: "7 dias (recomendado)", "Até ao fim do evento", "Personalizada" com seletor de data limitado ao máximo).
   - Aviso discreto abaixo do e-mail: "Sem e-mail, esta pessoa não recebe notificações."
2. Ao submeter com sucesso, abre um **segundo modal "Gestor criado"** com:
   - o link (botão copiar),
   - o código `XXX-XXX` (botão copiar, texto grande),
   - botões **"Partilhar por WhatsApp"** (`wa.me` com mensagem pronta: nome do evento, link e código; usa `share.service.ts`; se houver telefone, abre a conversa direta com esse número) e **"Copiar mensagem completa"**,
   - aviso: "O código só é mostrado agora. Pode gerar um novo mais tarde.",
   - se o contacto tem e-mail: "Enviámos também um e-mail com o link e o código."
   O modal só fecha por botão "Concluir" (`dismissible=false`).
3. A criação de equipa **sem** gestor deixa de existir na UI. Editar equipa (nome, categoria, descrição) continua em modal simples.

## Passo 6 — Frontend: detalhe da equipa

Em `team-detail.page`:
1. O drawer lateral de membros passa a `app-modal` (bottom sheet em mobile). Formulário: nome (opcional), e-mail **ou** telefone (pelo menos um) — uma pessoa de cada vez; remove a lista de até 50 e-mails do drawer (importação em lote fica fora de âmbito; regista em `docs/DECISIONS.md`).
2. Lista de membros e gestor com `app-person-card`: nome ou contacto, `status` (ativo, convidado por e-mail, convidado por telefone, link expirado), papel, tarefas abertas. Menu de 3 pontinhos: "Reenviar convite", "Copiar mensagem de convite", "Gerar novo código" (só gestor), "Alterar validade" (só gestor), "Revogar acesso", "Promover a gestor" / "Passar a membro", "Remover".
3. Cada ação destrutiva usa `app-confirm-dialog`. "Alterar validade" abre `app-modal` com o seletor limitado ao máximo e mostra a data máxima permitida.
4. A criação de **tarefa** dentro da equipa passa a modal. Mantém as regras já existentes: qualquer membro (gestor e anfitrião incluídos) cria; só o responsável conclui. Acrescenta o filtro **"Só as minhas tarefas"** no separador Tarefas, usando o filtro `personal` já suportado pelo back (`task.repository`/`task.service`).
5. Cartão de resumo no topo (4 cards com `app-stat-grid`): Membros, Tarefas abertas, Concluídas, Atrasadas.

## Passo 7 — Frontend: entrada do gestor por link + código

Em `features/host-management/management-entry.page.*` (rotas `/gerir/:token` e `/gestao/:token`):
1. Remove a rota ampla duplicada `gestao/:token` se for equivalente a `gerir/:token`; mantém ambas **só** se existirem links já enviados (regista decisão). Garante que `/gestao/evento/:eventId` não é capturada por `gestao/:token`.
2. Ecrã de entrada: logótipo, título "Aceder ao evento", campo de **código de acesso** (6 caracteres, maiúsculas automáticas, `inputmode="text"`, `autocapitalize="characters"`, `autocomplete="one-time-code"`), botão "Entrar". Em erro mostra **sempre** a mesma mensagem: "Não foi possível aceder." Nunca distingue motivos. Sem contagem de tentativas visível.
3. Depois de entrar, o gestor vê a UI limitada. Enquanto **não tem conta**, mostra CTAs claros e repetidos: faixa fixa "Crie a sua conta para criar eventos e receber notificações" e botão no cabeçalho. O CTA leva a `/criar-conta` com o contacto já preenchido e bloqueado (só leitura). Ao submeter, usa o atalho do Passo 4 (sem OTP).
4. Qualquer ação que exija conta (criar evento, etc.) abre um modal "Crie a sua conta" em vez de falhar.
5. Os textos usam `pt-AO`/`en`; nada hardcoded.

## Passo 8 — Frontend: gestão no detalhe do evento (mínimo)

O formulário inline de "Adicionar gestor" em `event-detail.page.html:1484–1531` é substituído por um botão que abre **o mesmo modal do Passo 5** (com o evento já preenchido e bloqueado). O resto do painel do evento fica para o Bloco 3.

## Critérios de aceitação finais do Bloco 2

- [ ] Migrações reversíveis; nenhum gestor sem equipa após migrar (query de verificação documentada no relatório).
- [ ] Não é possível criar gestor sem equipa por nenhuma rota nem por nenhum ecrã.
- [ ] Todas as falhas de acesso devolvem exatamente a mesma resposta (teste automatizado).
- [ ] O código só aparece na resposta de criação/regeneração e nunca em logs, notificações ou na BD em texto.
- [ ] Validade: 7 dias por defeito; máximo fim do evento + 1 dia validado no back; alterar validade funciona.
- [ ] Criar conta sem OTP só com sessão de gestão válida e o mesmo contacto; atalho antigo apertado.
- [ ] Modal de criação com gestor + modal de código com copiar e WhatsApp.
- [ ] Nenhum formulário de adicionar/editar/convidar fora de modal nas páginas de equipas e do detalhe de equipa.
- [ ] Filtro "Só as minhas tarefas" funcional.
- [ ] `build`, `lint`, `test` (front) e `build`/`test` (back) verdes.
- [ ] `docs/REPORT-BLOCO-2.md` escrito.

## Fora de âmbito (não fazer)

Importação em lote de membros, SMS/WhatsApp automático (envio por API), push/Firebase, aceitação pública do convite de equipa no front (só os gestores/membros por link+código entram agora), templates, mapas.
