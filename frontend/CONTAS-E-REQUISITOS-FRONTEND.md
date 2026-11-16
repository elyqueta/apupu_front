# Contas de anfitrião e requisitos de backend para o frontend

Este documento especifica **tudo o que o backend tem de acrescentar** para
suportar as funcionalidades do frontend actual do Conto Contigo e para introduzir a
camada de autenticação do anfitrião (registo e login com email e senha). É um
documento de requisitos/planeamento; o contrato efectivamente implementado
está em [`API-CONTRACT.md`](./API-CONTRACT.md) e o esquema real em
[`DATA-MODEL.md`](./DATA-MODEL.md).

Especificação autoritária actual: [`../backend/`](../backend/README.md).

> **Decisão revista e implementada.** A fase 1 estava definida como "sem
> contas ou login; a gestão é acessível por um link secreto"
> (`../agents.md`, secção 6). A introdução de contas de anfitrião foi
> aprovada e implementada; o link secreto de gestão mantém-se válido em
> paralelo (ver [secção 8](#8-migração-e-compatibilidade)).

---

## 1. Contexto

O frontend actual foi desenhado como um **workspace multi-evento** com perfil de
anfitrião, enquanto o backend v0.1.0 é **evento-por-sessão e sem contas**. Isto
deixa vários ecrãs sem qualquer endpoint de suporte:

| Ecrã / funcionalidade do front | Suporte actual do backend |
|---|---|
| `/painel` (dashboard: próximo evento, estatísticas globais, feed) | Nenhum |
| `/eventos` (lista de eventos) | Nenhum (`GET /events` não existe) |
| `/convidados` (convidados de todos os eventos) | Nenhum (só por evento) |
| `/relatorios` (relatórios/analytics) | Nenhum |
| Feed de actividade (`EventActivity`) | Nenhum |
| Tarefas (`WorkspaceTask`) | Nenhum |
| `/definicoes` (perfil do anfitrião) | Nenhum |
| `/criar-evento` | `POST /events` (parcial; ver secção 6) |
| `/eventos/:eventId` | `GET/PATCH /host/events/{eventId}` (por link) |
| `/gestao`, `/gestao/evento` | `POST/DELETE /host/session` (por link) |
| `/i/:token` (convite público) | `claim` + `GET` + `rsvp` |
| `/templates` | `GET /templates` |

Este documento cobre: (2) modelo de identidade, (3) autenticação, (4) perfil,
(5) endpoints em falta por ecrã, (6) ajustes de contrato, (7) segurança,
(8) migração, (9) email, (10) aceitação, (11) decisões pendentes.

---

## 2. Modelo de identidade do anfitrião

Novas tabelas e alterações ao esquema (PostgreSQL 16, `snake_case`).

### 2.1 `hosts` (conta)

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid | PK |
| `email` | citext | único, normalizado em minúsculas |
| `password_hash` | text | Argon2id; nunca em claro, nunca em logs |
| `email_verified_at` | timestamptz | nulo até verificação |
| `status` | text | `active` \| `suspended` \| `deleted` |
| `failed_login_attempts` | integer | contador para bloqueio temporário |
| `locked_until` | timestamptz | nulo quando não bloqueado |
| `last_login_at` | timestamptz | |
| `created_at` / `updated_at` | timestamptz | |

Constraints: `hosts_email_unique`, `hosts_status_check`.

### 2.2 `host_profiles` (perfil)

| Coluna | Tipo | Notas |
|---|---|---|
| `host_id` | uuid | PK, FK → `hosts` (`ON DELETE CASCADE`) |
| `display_name` | text | nome apresentado |
| `phone` | text | opcional |
| `birth_date` | date | **opcional no registo; preenchida depois** |
| `locale` | text | `pt-AO` \| `en` (por omissão `pt-AO`) |
| `timezone` | text | IANA, por omissão `Africa/Luanda` |
| `avatar_url` | text | opcional |
| `created_at` / `updated_at` | timestamptz | |

Constraints: `host_profiles_birth_date_check` (`birth_date < current_date`,
e idade mínima configurável — ver secção 11).

### 2.3 `host_auth_sessions` (sessão de conta)

Distinta da sessão de gestão por evento.

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid | PK |
| `host_id` | uuid | FK → `hosts` (`ON DELETE CASCADE`) |
| `token_hash` | text | único; HMAC-SHA256 do token de sessão |
| `csrf_hash` | text | HMAC do token CSRF derivado |
| `user_agent_hash` | text | opcional; heurística de sessão |
| `expires_at` | timestamptz | `> created_at` |
| `revoked_at` | timestamptz | |
| `last_used_at` | timestamptz | |
| `created_at` | timestamptz | |

Índices: `host_id`, `expires_at`.

### 2.4 `email_verifications` e `password_resets`

| Tabela | Colunas essenciais |
|---|---|
| `email_verifications` | `id`, `host_id` FK, `token_hash` (único), `expires_at`, `consumed_at`, `created_at` |
| `password_resets` | `id`, `host_id` FK, `token_hash` (único), `expires_at`, `consumed_at`, `created_at` |

Tokens de uso único, de vida curta, guardados apenas como HMAC.

### 2.5 Alterações a tabelas existentes

- `events`: acrescentar `host_id uuid NULL` FK → `hosts` (`ON DELETE SET NULL`).
  Nulo para eventos legados criados sem conta. Índice `events_host_id_idx`.
- **Renomear `host_sessions` → `event_host_sessions`** para evitar colisão com
  `host_auth_sessions` (a tabela actual é sempre limitada a um evento). Ajustar
  repositórios e o modelo em `DATA-MODEL.md`.
- `invitations`: acrescentar `table_name text NULL` **apenas se** a atribuição de
  mesas for aprovada (ver secção 6.4).
- `events`: acrescentar `category text NULL` **apenas se** a categoria/ícone de
  evento for aprovada (ver secção 6.2).

---

## 3. Camada de autenticação do anfitrião

### 3.1 Regras de conta

- Registo por **email + senha**. `display_name` opcional no registo.
- Senha: mínimo 8 caracteres, máximo 128; rejeitar as mais comuns; Argon2id
  (parâmetros definidos por ambiente). Nunca devolver a senha nem o hash.
- **O email é verificado por código OTP antes de a conta ser criada.** O
  registo tem três passos: `request-code` → `verify-code` → `register`.
  Só o último cria a conta, já com `email_verified_at` preenchido. O login
  continua a exigir uma conta existente.
- Rate limit dedicado por IP **e** por email em `register`,
  `register/request-code`, `register/verify-code`, `login`,
  `password/forgot` e `password/reset`.
- Bloqueio temporário após N tentativas falhadas (`locked_until`).
- Respostas de `login` e `password/forgot` não revelam se o email existe
  (mensagem genérica; `password/forgot` responde sempre `202`).

### 3.2 Endpoints

Todas as rotas mutáveis autenticadas por cookie exigem `X-CSRF-Token`.
Respostas de sucesso no envelope `{ "data": ... }`.

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `POST` | `/api/v1/auth/register/request-code` | pública | Valida o email e envia um código OTP de 6 dígitos |
| `POST` | `/api/v1/auth/register/verify-code` | pública | Troca o código por um `verification_token` de uso único |
| `POST` | `/api/v1/auth/register` | pública | Cria conta já verificada (exige `verification_token`) |
| `POST` | `/api/v1/auth/email/verify` | pública | Consome token de verificação (contas antigas) |
| `POST` | `/api/v1/auth/email/verify/resend` | pública | Reenvia verificação (rate limit) |
| `POST` | `/api/v1/auth/login` | pública | Cria sessão; devolve `csrf_token` |
| `POST` | `/api/v1/auth/logout` | sessão | Revoga a sessão e limpa cookies |
| `GET` | `/api/v1/auth/session` | sessão | Devolve host + perfil + estado |
| `POST` | `/api/v1/auth/password/forgot` | pública | Enfileira email de reposição; sempre `202` |
| `POST` | `/api/v1/auth/password/reset` | pública | Consome token e define nova senha |
| `POST` | `/api/v1/auth/password/change` | sessão | Altera senha autenticada |

#### `POST /auth/register/request-code`

```json
{ "email": "ana@exemplo.ao" }
```

Resposta `202`:

```json
{
  "data": {
    "status": "accepted",
    "email": "ana@exemplo.ao",
    "expires_at": "2026-11-16T02:30:30.588Z",
    "resend_available_at": "2026-11-16T02:20:30.586Z"
  }
}
```

Erros: `409 email_already_registered`, `422 validation_failed`,
`429 otp_resend_too_soon`, `429 rate_limited`.

#### `POST /auth/register/verify-code`

```json
{ "email": "ana@exemplo.ao", "code": "004271" }
```

Resposta `200`:

```json
{
  "data": {
    "email": "ana@exemplo.ao",
    "verification_token": "…",
    "expires_at": "2026-11-16T02:35:49.786Z"
  }
}
```

Erros: `422 otp_invalid`, `422 otp_attempts_exceeded`,
`422 validation_failed`, `429 rate_limited`.

#### `POST /auth/register`

```json
{
  "email": "ana@exemplo.ao",
  "password": "••••••••",
  "display_name": "Ana",
  "verification_token": "…"
}
```

Resposta `201`:

```json
{
  "data": {
    "host": {
      "id": "…",
      "email": "ana@exemplo.ao",
      "email_verified": true,
      "profile": {
        "display_name": "Ana",
        "phone": null,
        "birth_date": null,
        "locale": "pt-AO",
        "timezone": "Africa/Luanda",
        "avatar_url": null
      },
      "profile_complete": false
    }
  }
}
```

Não devolve sessão: a conta fica criada e verificada, e o front pode
iniciar sessão. Erros: `409 email_already_registered`,
`422 verification_required`, `422 validation_failed`, `429 rate_limited`.

#### `POST /auth/login`

```json
{ "email": "ana@exemplo.ao", "password": "••••••••" }
```

Resposta `200` (define cookies de sessão de conta):

```json
{
  "data": {
    "host": { "id": "…", "email": "ana@exemplo.ao", "email_verified": true,
      "profile": { "…": "…" }, "profile_complete": true },
    "csrf_token": "<valor para X-CSRF-Token>",
    "expires_at": "2026-12-01T20:00:00.000Z"
  }
}
```

Erros: `401` `invalid_credentials` (genérico), `423` `account_locked`, `429`.

#### `GET /auth/session`

Devolve o mesmo objeto `host` de `login`, sem `csrf_token` (ou com o CSRF actual
se o cliente o precisar para renovar). É o endpoint que o front usa para
arrancar, decidir se mostra o login e saber se o perfil está incompleto.
`401 host_session_invalid` quando não há sessão.

#### `POST /auth/logout`

Revoga a sessão actual e limpa os cookies. Exige `X-CSRF-Token`. `204`.

### 3.3 Cookies de autenticação

- `apupu_auth`: `HttpOnly`, `Secure` (fora de local), `SameSite=Lax`,
  `Path=/api/v1`. Token de sessão de conta.
- `apupu_csrf_auth`: legível por JS, `Path=/api/v1`.
- TTL configurável (`AUTH_SESSION_TTL_MINUTES`), renovação deslizante opcional.
- Nunca guardar tokens de sessão em `localStorage`/`sessionStorage` no front.

---

## 4. Perfil do anfitrião e data de nascimento

### 4.1 Endpoints

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `GET` | `/api/v1/host/profile` | sessão | Perfil completo do anfitrião |
| `PATCH` | `/api/v1/host/profile` | sessão + CSRF | Actualiza campos do perfil |
| `POST` | `/api/v1/host/profile/avatar` | sessão + CSRF | Upload/definição de avatar (opcional) |

#### `PATCH /host/profile`

Aceita apenas os campos enviados (`theme`/`contribution` seguem o mesmo padrão de
fusão do evento). Campos: `display_name`, `phone`, `birth_date`, `locale`,
`timezone`.

```json
{ "birth_date": "1990-05-17", "phone": "+244900000000" }
```

Resposta `200`: o objeto `host` completo (igual a `GET /auth/session`).

### 4.2 Data de nascimento

Requisito do produto: **o anfitrião regista a data de nascimento depois, nas
configurações de perfil**. Regras:

- `birth_date` é `null` no registo e permanece opcional para concluir o registo.
- Formato `YYYY-MM-DD` (data, sem hora); validar como data de calendário válida.
- Tem de ser uma data no passado; idade mínima configurável (sugestão: 18 anos,
  ver secção 11).
- O objeto `host` devolve `birth_date` e um indicador de completude:
  `profile_complete: boolean` e, opcionalmente, `missing_fields: string[]`
  (ex.: `["birth_date"]`).
- O front usa `profile_complete`/`missing_fields` para mostrar o pedido nas
  **configurações de perfil** (`/definicoes`). Decidir se o pedido é bloqueante
  para criar eventos (secção 11); por omissão, não bloqueante.
- `birth_date` é dado pessoal: nunca em logs, telemetria, URLs de analytics ou
  mensagens de erro; só visível ao próprio anfitrião.

---

## 5. Endpoints em falta para suportar os ecrãs do frontend

> **Estado: implementado.** Esta secção mantém-se como registo dos
> requisitos que motivaram as rotas. Os corpos de resposta concretos e
> actualizados estão em [`API-CONTRACT.md`](./API-CONTRACT.md#mapa-de-respostas-por-endpoint).

Todas as rotas abaixo são autenticadas pela sessão de conta
(`apupu_auth` + `X-CSRF-Token` nas mutações) e autorizadas por posse
(`events.host_id = sessão.host_id`).

### 5.1 Lista e gestão de eventos (dashboard + `/eventos`)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/v1/host/events` | Lista paginada dos eventos do anfitrião |
| `POST` | `/api/v1/host/events` | Cria evento (autenticado; ver 6.1) |
| `DELETE` | `/api/v1/host/events/{eventId}` | Apaga evento (cascata) |
| `GET` | `/api/v1/host/dashboard` | Resumo para o painel |

`GET /host/events` — parâmetros: `status` (`draft\|scheduled\|cancelled\|completed`),
`q` (título), `sort` (`starts_at\|created_at`), `order`, `page`, `page_size`.
Devolve por evento: campos do evento + `stats`
(`total_invitations/accepted/declined/pending`) para evitar N+1 no front.

`GET /host/dashboard` — devolve, numa só chamada, o que `/painel` precisa:

```json
{
  "data": {
    "next_event": { "…": "…" },
    "upcoming": [ { "…": "…" } ],
    "totals": {
      "events": 4, "drafts": 1, "completed": 2,
      "total_invitations": 120, "accepted": 80, "declined": 10, "pending": 30
    }
  }
}
```

### 5.2 Convidados globais (`/convidados`)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/v1/host/guests` | Convidados de todos os eventos do anfitrião |

Parâmetros: `event_id`, `rsvp_status`, `send_status`, `q`, `page`, `page_size`.
Cada item inclui os campos do convite + o evento a que pertence (`event`:
`{id,title,starts_at,status}`). Reutiliza o esquema `Invitation`.

### 5.3 Actividade (feed)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/v1/host/activity` | Feed do anfitrião (todos os eventos) |
| `GET` | `/api/v1/host/events/{eventId}/activity` | Feed de um evento |

Item: `{ id, event_id, kind, guest_name, at }` com `kind` em
`rsvp_accepted \| rsvp_declined \| guest_added \| reminder_sent \| event_created`.
Requer uma tabela `event_activity` (nova) alimentada nas transacções de
RSVP/criação/reenvio.

### 5.4 Relatórios (`/relatorios`)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/v1/host/reports/summary` | Agregados globais do anfitrião |
| `GET` | `/api/v1/host/events/{eventId}/reports` | Série temporal por evento |

`summary`: taxas de resposta, distribuição por estado de RSVP, por evento.
`reports`: contagens por dia (convites, aceites, recusas, lembretes) para os
gráficos. Definir granularidade e janela temporal.

### 5.5 Tarefas (`WorkspaceTask`)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/v1/host/tasks` | Tarefas (filtro `event_id`, inclui `null` = globais) |
| `POST` | `/api/v1/host/tasks` | Cria tarefa |
| `PATCH` | `/api/v1/host/tasks/{taskId}` | Actualiza `label`/`done` |
| `DELETE` | `/api/v1/host/tasks/{taskId}` | Remove tarefa |

Tabela nova `host_tasks`: `id`, `host_id` FK, `event_id` FK nullable,
`label`, `done`, `created_at`, `updated_at`.

### 5.6 Templates (`/templates`)

`GET /api/v1/templates` já existe. Melhorias para o front:

- Devolver `preview_image_url`, `supported_fields` e `themes[]` (já previstos).
- Aceitar lista vazia (já é válido) e o front mostra estado vazio.
- `template_id` do evento é um UUID (não a união fixa do front — ver 6.3).

---

## 6. Ajustes de contrato necessários

Estes pontos exigem ou uma alteração de backend ou uma alteração de frontend.
Estão marcados para decidir onde se resolve.

### 6.1 `POST /events` (criar) com conta

- O front actual envia um objeto plano; o contrato exige `{ "event": {…},
  "guests": [ … ] }`. O front tem de embrulhar (mudança de frontend).
- `location` é a união `{type:"venue",name,address?}` **ou**
  `{type:"online",online_url}`. O front tem `venue`/`city`/`onlineLink` planos;
  tem de passar a escolher o tipo (mudança de frontend; `city` não existe no
  contrato — fundir em `name`/`address`).
- `contribution`: `bank_name`, `account_holder`, `account_reference` (o front
  usa `bankName`/`accountName`/`iban` — renomear e **remover validação/label de
  IBAN**, mudança de frontend).
- Com conta, a resposta pode deixar de enviar o link de gestão por email e
  passar a devolver o evento directamente gerido pela conta. Decidir (secção 11).
- `manage_email_status`/`deliveries[]` mantêm-se úteis.

### 6.2 Categoria de evento (`EventType`)

O front usa `wedding|birthday|corporate|baby|other` para ícones/etiquetas. **O
contrato não tem campo de tipo.** Opções:

- **A (backend):** acrescentar `events.category text NULL` (enum fixo) e
  expô-lo em `Event`/`CreateEvent`/`UpdateEvent`.
- **B (frontend):** remover a categoria e derivar o ícone de outro campo.

Recomenda-se **A** se a categoria for um requisito de produto; caso contrário B.

### 6.3 Templates

`EventTemplate.id` é UUID e `slug` é estável. O front usa uma união fixa
(`aurora|constellation|waves|silk`) com `tag` e `status:"preview"`. O front tem
de passar a listar templates da API e a guardar `template_id` (UUID) no evento
(mudança de frontend).

### 6.4 Mesas/seating (`Guest.tableName`)

O contrato não tem `table_name`. Se a atribuição de mesas for requisito:
acrescentar `invitations.table_name text NULL`, incluí-lo em `Invitation`,
`InvitationInput` (opcional) e na listagem; senão, remover do front.

### 6.5 Enums e nomes

- **Estados de evento:** backend `draft|scheduled|cancelled|completed`; front
  `draft|published|completed|cancelled`. **Mudança de frontend**: `published` →
  `scheduled`.
- **RSVP:** backend `pending|accepted|declined`; front `pending|confirmed|declined`.
  **Mudança de frontend**: `confirmed` → `accepted`.
- **Convidado vs convite:** backend usa `Invitation` com `guest_name`,
  `guest_email`, `guest_phone`, `rsvp_status`, `rsvp_responded_at`,
  `send_status`, `send_count`, `last_sent_at`, `created_at`. O front usa
  `Guest` com `tableName`, `invitedAt`, `respondedAt`, `status`. Alinhar o front.
- **Estatísticas:** backend devolve `total_invitations/accepted/declined/pending`
  (sem `response_rate`). O front calcula `responseRate` a partir destes valores
  (mudança de frontend).

### 6.6 Tema

O contrato tem `theme: { mode: "light"|"dark", palette: string }` por evento. O
front tem `ThemeMode = "dark"|"light"|"system"`. `system` é uma preferência de
UI do cliente (não persistida) e `palette` é novo. Alinhar o front.

---

## 7. Segurança e autorização

- **Sessão de conta** por cookie HttpOnly + CSRF (secção 3.3). Nunca aceitar o
  `host_id` ou o `event_id` como autorização: verificar sempre
  `events.host_id = sessão.host_id`.
- **Link de gestão legado** continua válido para eventos sem `host_id` (ver
  secção 8). Não converter automaticamente um link em sessão de conta sem
  prova de posse do email.
- **Senhas:** Argon2id, sem plaintext, sem logs; comparação em tempo constante;
  política e bloqueio em 3.1.
- **Tokens de email/reset:** uso único, TTL curto, apenas HMAC guardado,
  invalidação ao consumir e ao alterar senha.
- **Código OTP de registo:** 6 dígitos, HMAC ligado ao email, TTL de
  `REGISTRATION_OTP_TTL_MINUTES`, máximo de
  `REGISTRATION_OTP_MAX_ATTEMPTS` tentativas e
  `REGISTRATION_OTP_RESEND_SECONDS` entre pedidos. O
  `verification_token` emitido após o código é opaco, de uso único e
  válido por `REGISTRATION_VERIFICATION_TTL_MINUTES`.
- **Dados pessoais:** `birth_date`, telefone e email são PII; nunca em logs,
  telemetria, URLs de analytics ou mensagens de erro. Expor `birth_date` apenas
  ao próprio.
- **Rate limit:** novas rotas de `register`/`login`/`forgot`/`reset` com limites
  dedicados por IP e por email; manter os limites actuais.
- **CORS/cookies:** origem exacta (não `*` com credenciais), `SameSite=Lax`,
  `Secure` fora de local.
- **Novos códigos de erro:** `invalid_credentials`, `account_locked`,
  `email_already_registered`, `email_not_verified`, `verification_invalid`,
  `reset_invalid`, `host_session_invalid` (reutilizado para a sessão de conta).

---

## 8. Migração e compatibilidade

1. **Eventos legados** (sem conta) mantêm o fluxo por link secreto. `host_id`
   fica `NULL` e continuam geríveis via `POST /host/session`.
2. **Reivindicação de eventos** ao criar conta/verificar email: ligar a
   `host_id` os eventos cujo `host_email` coincide com o email verificado.
   - Só após verificação de email (posse provada).
   - Idempotente; registar em auditoria.
   - Decidir se também se pode reivindicar por email não verificado (não
     recomendado).
3. **Dois caminhos de gestão coexistem:** conta (novo) e link (legado). O front
   suporta ambos durante a transição.
4. **Renomear `host_sessions` → `event_host_sessions`** numa migração com
   actualização de repositórios, `DATA-MODEL.md` e testes.
5. **Deprecação:** planear a remoção do fluxo por link quando a migração de
   contas estiver concluída (fora do âmbito deste documento).

---

## 9. Email (novos tipos)

Novos `message_type` na outbox, com chaves idempotentes:

| Mensagem | `message_type` | Chave idempotente |
|---|---|---|
| Código OTP de registo | `registration_otp` | `registration_otp:<email>:<uuid>` |
| Verificação de email (contas antigas) | `email_verification` | `email_verification:<hostId>:<uuid>` |
| Boas-vindas | `host_welcome` | `host_welcome:<hostId>` |
| Reposição de senha | `password_reset` | `password_reset:<hostId>:<uuid>` |
| Lembrete de perfil (opcional) | `profile_reminder` | `profile_reminder:<hostId>:<uuid>` |

Regras: tokens nunca em logs; links com TTL; reenvio limitado; o email de
verificação/`password_reset` não é reenviado automaticamente pelo worker.

---

## 10. Critérios de aceitação

- Um anfitrião pede o código OTP, verifica o email, cria a conta e inicia sessão.
- A sessão é HttpOnly + CSRF; `GET /auth/session` permite ao front decidir entre
  login e app; `logout` revoga e limpa cookies.
- O anfitrião completa a **data de nascimento** em `/definicoes`; antes disso
  `profile_complete=false` e `missing_fields=["birth_date"]`.
- `/painel`, `/eventos`, `/convidados`, `/relatorios`, feed, tarefas e
  `/definicoes` obtêm dados reais dos novos endpoints, sempre limitados aos
  eventos do anfitrião autenticado.
- Um anfitrião não consegue ler nem alterar eventos de outro (403/404
  consistente).
- Eventos legados por link continuam geríveis; eventos reivindicados ficam
  associados à conta de forma idempotente e só após verificação de email.
- Nenhuma resposta expõe senha, hash, token de sessão, `birth_date` de terceiros
  ou PII em logs/erros.
- Testes cobrem autorização negativa entre contas, registo/login/reset, bloqueio
  por tentativas, verificação de email e reivindicação de eventos.

---

## 11. Decisões fechadas

As decisões que este documento deixava em aberto foram fechadas pelo
responsável do produto. O registo completo, com o estado de
implementação de cada uma, está em
[`DECISOES-PRODUTO.md`](./DECISOES-PRODUTO.md). Resumo:

- Contas aprovadas; o link secreto por evento mantém-se válido.
- Registo exige verificação do email por OTP antes da criação da conta;
  contas antigas por verificar mantêm o link de verificação.
- `birth_date` opcional e não bloqueante, com idade mínima de 18 anos.
- `events.category` e `invitations.table_name` mantidos.
- Eventos legados são ligados à conta após verificação do email.
- Ao criar evento com conta, o link de gestão continua a ser enviado.
- Retenção de conta: 24 meses sem login.
- Sessão de conta de 7 dias; link de gestão de 30 dias com rotação.
- Rate limiting em autenticação e escritas.
- Auditoria de eventos críticos com actor e IP.
- Webhook assinado do provider de email para delivered/bounced/complained.
- Unsubscribe por preferências no perfil, mantendo transacionais.
