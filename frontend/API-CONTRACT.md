# Conta Comigo — Contrato da API v1 (implementação)

Base: `/api/v1`. Este documento descreve o contrato efectivamente
implementado. A especificação autoritária do produto está em
[`../backend/api-contract.md`](../backend/api-contract.md); em caso de
divergência, essa prevalece.

Desde a migração de contas, coexistem dois modos de gestão:

- **Conta de anfitrião** (`/auth/*` e `/host/*` do workspace): registo e
  login com email e senha, perfil, vários eventos por conta.
- **Link secreto por evento** (`POST /host/session` e
  `GET/PATCH /host/events/{eventId}`): fluxo legado, mantido válido.

O aceite público do convite (`/public/invitations/*`) continua sem conta.

## Convenções

- Respostas de sucesso: envelope `{ "data": ... }`.
- Respostas de erro: envelope estável sem detalhes internos:

```json
{
  "error": {
    "code": "validation_failed",
    "message": "Verifique os campos indicados.",
    "fields": { "starts_at": ["A data deve ser futura."] },
    "request_id": "..."
  }
}
```

- Datas em ISO 8601 UTC; o fuso IANA do evento acompanha sempre o evento.
- Campos em `snake_case`.
- Listas paginadas devolvem `data` como array e um objeto irmão
  `pagination`:

```json
{
  "data": [],
  "pagination": { "page": 1, "page_size": 20, "total": 0, "total_pages": 0 }
}
```

  `page` começa em 1, `page_size` tem máximo 100 e a ordenação é sempre
  estável (campo de ordenação + `id` como desempate).
- `X-Request-Id` é devolvido em todas as respostas e repetido em
  `error.request_id`.
- As respostas da API usam `Cache-Control: private, no-store`.

## Códigos de erro

| HTTP | `code` | Significado |
|---|---|---|
| `400` | `invalid_json` | Corpo não é JSON válido |
| `401` | `host_session_invalid` | Sessão de gestão ou de conta ausente, expirada ou de outro evento |
| `401` | `invalid_credentials` | Email ou senha inválidos no login |
| `403` | `csrf_invalid` | Falta ou não coincide o `X-CSRF-Token` |
| `403` | `forbidden` | Origem não permitida pelo CORS |
| `403` | `email_not_verified` | A conta ainda não confirmou o email; escrita de eventos bloqueada |
| `404` | `invitation_not_found` | Token inválido, convite revogado ou reclamado por outro navegador (resposta sempre igual) |
| `404` | `manage_link_invalid` | Link de gestão inválido, expirado ou já rodado |
| `404` | `event_not_found` / `invitation_not_found` / `task_not_found` | Recurso de gestão inexistente ou não pertencente à conta |
| `404` | `route_not_found` | Rota inexistente |
| `409` | `event_not_scheduled`, `event_cancelled`, `event_completed`, `rsvp_deadline_passed`, `invitation_email_duplicate`, `invitation_limit_reached`, `email_already_registered` | Conflito de estado |
| `409` | `invitation_revoked`, `invitation_not_resendable` | Convite revogado ou sem link reutilizável para reenvio |
| `422` | `validation_failed` | Validação Zod; inclui `fields` |
| `422` | `verification_invalid`, `reset_invalid` | Token de uso único inválido ou expirado |
| `422` | `verification_required` | É necessário verificar o email antes de criar a conta |
| `422` | `otp_invalid` | Código OTP inválido ou expirado |
| `422` | `otp_attempts_exceeded` | Limite de tentativas do código atingido; pedir novo código |
| `423` | `account_locked` | Demasiadas falhas de login; bloqueio temporário |
| `429` | `rate_limited` | Limite de pedidos excedido (activo em todos os ambientes) |
| `429` | `otp_resend_too_soon` | Pedido de novo código antes do intervalo mínimo |
| `500` | `internal_error` | Erro inesperado; sem stack trace |
| `503` | `avatar_upload_unavailable` | Upload de avatar indisponível: credenciais Cloudinary ausentes ou provider inacessível |

## Autenticação e cookies

Há três tipos de capacidade:

1. **Sessão de conta** — emitida por `POST /auth/login`:
   - Cookie `apupu_auth`: `HttpOnly`, `SameSite=Lax`, `Path=/api/v1`.
   - Cookie `apupu_csrf_auth`: legível por JS, `Path=/api/v1`.
   - `csrf_token` é devolvido no login e em `GET /auth/session`.
2. **Sessão de gestão por evento** (legado) — o segredo do link de
   gestão é trocado por uma sessão curta:
   - Cookie `apupu_host_<eventId>`: `HttpOnly`, `SameSite=Lax`, `Path=/api/v1/host`.
   - Cookie `apupu_csrf_host_<eventId>`: legível por JS, `Path=/api/v1`.
   - O segredo nunca é devolvido em JSON nem escrito em logs.
3. **Capacidade do convidado** — emitida no primeiro claim:
   - Cookie `apupu_guest`: `HttpOnly`, `SameSite=Lax`, `Path=/api/v1/public/invitations`.
   - Cookie `apupu_csrf_guest`: legível por JS, `Path=/api/v1`.
   - É reutilizada pelo mesmo navegador para reclamar convites adicionais.

Pedidos mutáveis autenticados por cookie exigem o cabeçalho
`X-CSRF-Token` com o valor derivado (`csrf_token` devolvido em JSON e no
cookie legível). O valor esperado é recalculado no servidor a partir da
capacidade `HttpOnly`; um site cross-site não o consegue ler.

As rotas `GET/PATCH /host/events/{eventId}` e as rotas de convidados por
evento aceitam **qualquer** das duas sessões de anfitrião: primeiro a
sessão legada do evento, depois a sessão de conta com verificação de
`events.host_id`. Uma conta válida sem posse do evento recebe `404`
`event_not_found`; sem sessão válida, `401` genérico. As rotas de
workspace (`/host/events` sem `:eventId`, `/host/profile`,
`/host/dashboard`, `/host/guests`, `/host/activity`, `/host/reports`,
`/host/tasks`) usam apenas a sessão de conta.

## Conta do anfitrião

### Registo e verificação

O registo tem três passos. A conta **só é criada** depois de o email
ser verificado por código OTP.

#### 1. Pedir o código

`POST /api/v1/auth/register/request-code`

```json
{ "email": "ana@exemplo.ao" }
```

- Valida o formato do email e confirma que ainda não existe conta.
- Invalida qualquer código anterior do mesmo email.
- Envia um código numérico de 6 dígitos, válido por
  `REGISTRATION_OTP_TTL_MINUTES` minutos (por omissão 10).
- Um novo pedido antes de `REGISTRATION_OTP_RESEND_SECONDS` segundos
  (por omissão 60) devolve `429 otp_resend_too_soon`.

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
`429 otp_resend_too_soon` ou `429 rate_limited`.

#### 2. Verificar o código

`POST /api/v1/auth/register/verify-code`

```json
{ "email": "ana@exemplo.ao", "code": "004271" }
```

- O código tem exactamente 6 dígitos.
- Após `REGISTRATION_OTP_MAX_ATTEMPTS` falhas (por omissão 5) o código
  é invalidado e é necessário pedir um novo.
- O sucesso devolve um `verification_token` de uso único, válido por
  `REGISTRATION_VERIFICATION_TTL_MINUTES` minutos (por omissão 15).

Resposta `200`:

```json
{
  "data": {
    "email": "ana@exemplo.ao",
    "verification_token": "DKNAPJMDeXHmDxeIQDvxMsD47GYjqtzgGwh3gWlPr2I",
    "expires_at": "2026-11-16T02:35:49.786Z"
  }
}
```

Erros: `422 otp_invalid`, `422 otp_attempts_exceeded`,
`422 validation_failed`, `429 rate_limited`.

#### 3. Criar a conta

`POST /api/v1/auth/register`

```json
{
  "email": "ana@exemplo.ao",
  "password": "…",
  "display_name": "Ana",
  "verification_token": "DKNAPJMDeXHmDxeIQDvxMsD47GYjqtzgGwh3gWlPr2I"
}
```

- Exige o `verification_token` do passo anterior. Sem ele, ou se já
  tiver sido usado/expirado, devolve `422 verification_required`.
- A conta é criada já com `email_verified=true`; não é enviado um link
  de verificação.
- Os eventos legados cujo `host_email` coincide com o email verificado
  são ligados à conta (`events.host_id`) de forma idempotente.
- O email de boas-vindas é enfileirado. **Não** inicia sessão.
- A senha exige 8 a 128 caracteres e não pode estar na lista mínima de
  senhas comuns.

Resposta `201`:

```json
{
  "data": {
    "host": {
      "id": "db5a9bcc-82c0-46c2-80d5-de7ff164f14a",
      "email": "ana@exemplo.ao",
      "email_verified": true,
      "status": "active",
      "profile": {
        "display_name": "Ana",
        "phone": null,
        "birth_date": null,
        "locale": "pt-AO",
        "timezone": "Africa/Luanda",
        "avatar_url": null
      },
      "profile_complete": false,
      "missing_fields": ["birth_date"],
      "created_at": "2026-11-16T02:20:57.546Z"
    }
  }
}
```

Erros: `409 email_already_registered`, `422 verification_required`,
`422 validation_failed`, `429 rate_limited`.

#### Contas antigas por verificar

`POST /api/v1/auth/email/verify` consome `{ "token": "..." }` e devolve
`200` com a conta já verificada. Continua disponível para contas
criadas antes deste fluxo. Token inválido/expirado:
`422 verification_invalid`.

`POST /api/v1/auth/email/verify/resend` recebe `{ "email": "..." }` e
responde sempre `202 { "data": { "status": "accepted" } }`, exista ou
não a conta.

### Login, sessão e logout

`POST /api/v1/auth/login`

```json
{ "email": "ana@exemplo.ao", "password": "…" }
```

Resposta `200` (define `apupu_auth` e `apupu_csrf_auth`):

```json
{
  "data": {
    "host": { "...": "..." },
    "csrf_token": "<valor para X-CSRF-Token>",
    "expires_at": "2026-11-22T03:24:23.287Z"
  }
}
```

- O login é permitido com email por verificar.
- `401 invalid_credentials` para email/senha inválidos (a mesma resposta
  para email inexistente, senha errada ou conta suspensa).
- `423 account_locked` após `AUTH_MAX_FAILED_LOGINS` falhas seguidas,
  durante `AUTH_LOCK_MINUTES`.

`GET /api/v1/auth/session` devolve a conta autenticada e o `csrf_token`
atual. `POST /api/v1/auth/logout` revoga a sessão, limpa os cookies e
responde `204`; exige `X-CSRF-Token`.

### Reposição e alteração de senha

| Método | Rota | Efeito |
|---|---|---|
| `POST` | `/api/v1/auth/password/forgot` | Enfileira o email de reposição; responde sempre `202` |
| `POST` | `/api/v1/auth/password/reset` | Consome o token, define a nova senha e revoga todas as sessões |
| `POST` | `/api/v1/auth/password/change` | Altera a senha autenticada e revoga as outras sessões |

- `forgot` recebe `{ "email": "..." }`; a resposta é sempre a mesma para
  não revelar se a conta existe.
- `reset` recebe `{ "token": "...", "password": "..." }`; token inválido
  ou expirado devolve `422 reset_invalid`.
- `change` exige sessão e `X-CSRF-Token`, recebe
  `{ "current_password": "...", "new_password": "..." }` e responde
  `204`. Senha atual errada devolve `422` com o campo
  `current_password`.

### Perfil

`GET /api/v1/host/profile` devolve `{ "data": { "host": { ... } } }`.

`PATCH /api/v1/host/profile` aceita apenas os campos enviados
(`display_name`, `phone`, `birth_date`, `locale`, `timezone`,
`avatar_url`); a ausência mantém o valor atual e `null` limpa o campo.

- `birth_date` é uma data de calendário `YYYY-MM-DD`, no passado e com a
  idade mínima `MIN_HOST_AGE_YEARS` (por omissão 18). É opcional e não
  bloqueia o uso da conta.
- `profile_complete` é `false` enquanto `birth_date` estiver em falta;
  `missing_fields` lista os campos em falta (atualmente só
  `birth_date`).
- `POST /api/v1/host/profile/avatar` recebe `{ "avatar_url": "https://…" }`
  e define o avatar por URL.
- `POST /api/v1/host/profile/avatar/upload` recebe
  `multipart/form-data` no campo `avatar` (JPEG, PNG ou WebP, até
  `AVATAR_MAX_BYTES`). O backend assina o upload para o Cloudinary e
  devolve o perfil já com o URL seguro; o API secret nunca sai do
  servidor. Sem `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` e
  `CLOUDINARY_API_SECRET` responde `503 avatar_upload_unavailable`, sem
  afectar o avatar por URL.

### Workspace

Todas as rotas abaixo exigem sessão de conta; as mutações exigem também
`X-CSRF-Token`. O `host_id` vem sempre da sessão.

| Método | Rota | Efeito |
|---|---|---|
| `GET` | `/api/v1/host/events` | Lista paginada dos eventos da conta |
| `POST` | `/api/v1/host/events` | Cria evento na conta; exige email verificado |
| `DELETE` | `/api/v1/host/events/{eventId}` | Apaga evento e dados em cascata; exige email verificado |
| `POST` | `/api/v1/host/events/{eventId}/manage-link/resend` | Emite e envia um novo link de gestão; invalida o anterior |
| `GET` | `/api/v1/host/dashboard` | Próximo evento, próximos eventos e totais |
| `GET` | `/api/v1/host/guests` | Lista paginada de convidados de todos os eventos |
| `GET` | `/api/v1/host/activity` | Feed de actividade da conta (paginado) |
| `GET` | `/api/v1/host/events/{eventId}/activity` | Feed de actividade do evento (paginado) |
| `GET` | `/api/v1/host/reports/summary` | Agregados por evento e taxas |
| `GET` | `/api/v1/host/events/{eventId}/reports` | Série diária do evento |
| `GET` | `/api/v1/host/tasks` | Tarefas da conta (filtro opcional `event_id`) |
| `POST` | `/api/v1/host/tasks` | Cria tarefa |
| `PATCH` | `/api/v1/host/tasks/{taskId}` | Atualiza descrição/estado |
| `DELETE` | `/api/v1/host/tasks/{taskId}` | Remove tarefa |

Parâmetros de lista:

- Eventos: `status`, `q`, `sort` (`starts_at` \| `created_at`), `order`
  (`asc` \| `desc`), `page`, `page_size`.
- Convidados: `event_id`, `rsvp_status`, `send_status`, `q`, `page`,
  `page_size`.
- Relatório diário: `days` (1 a 365, por omissão 30); a série usa dias
  UTC, um ponto por dia, incluindo dias sem movimento.

Criar um evento autenticado devolve o mesmo envelope de
`POST /events` (`event`, `manage_email_status`, `deliveries`); o link de
gestão continua a ser enviado para `host_email`. Antes da verificação do
email, a criação/remoção devolve `403 email_not_verified`.

#### Respostas do workspace

`GET /api/v1/host/events` — cada item é um `Event` com `stats`:

```json
{
  "data": [
    {
      "id": "2bbc2ed1-4b27-48f7-80f2-d3b05ca37cec",
      "title": "Casamento da Ana e do Paulo",
      "host_name": "Ana",
      "host_email": "ana@exemplo.ao",
      "category": "wedding",
      "starts_at": "2027-08-15T17:00:00.000Z",
      "ends_at": "2027-08-16T01:00:00.000Z",
      "timezone": "Africa/Luanda",
      "location": {
        "type": "venue",
        "name": "Salão Principal",
        "address": "Luanda",
        "online_url": null
      },
      "message": "Celebramos o nosso casamento.",
      "rules": "Traje formal.",
      "dress_code": "Traje formal",
      "template_id": null,
      "theme": { "mode": "dark", "palette": "default" },
      "contribution": { "enabled": false },
      "rsvp_deadline": "2027-08-01T22:59:59.000Z",
      "status": "scheduled",
      "created_at": "2026-11-16T01:40:07.999Z",
      "updated_at": "2026-11-16T01:40:07.999Z",
      "stats": {
        "total_invitations": 10,
        "accepted": 4,
        "declined": 2,
        "pending": 4
      }
    }
  ],
  "pagination": { "page": 1, "page_size": 20, "total": 1, "total_pages": 1 }
}
```

`POST /api/v1/host/events` — `201`:

```json
{
  "data": {
    "event": { "id": "...", "title": "...", "status": "scheduled", "...": "..." },
    "manage_email_status": "sent",
    "deliveries": [
      { "email": "joao@exemplo.ao", "status": "queued" }
    ]
  }
}
```

`DELETE /api/v1/host/events/{eventId}` — `204`, sem corpo.

`POST /api/v1/host/events/{eventId}/manage-link/resend` — `202`:

```json
{
  "data": {
    "event_id": "87b7165f-90fb-4859-ad63-7aa9cc3b657e",
    "manage_email_status": "sent",
    "manage_token_expires_at": "2026-12-16T01:40:08.075Z"
  }
}
```

- Gera um token novo, envia-o para `host_email` e invalida o anterior.
- `404 event_not_found` se o evento não pertencer à conta.
- `403 email_not_verified` antes da verificação.
- O token nunca aparece na resposta.

`GET /api/v1/host/dashboard` — `200`:

```json
{
  "data": {
    "next_event": { "id": "...", "title": "...", "stats": { "...": 0 } },
    "upcoming": [{ "id": "...", "title": "...", "stats": { "...": 0 } }],
    "totals": {
      "events": 3,
      "drafts": 0,
      "scheduled": 2,
      "cancelled": 1,
      "completed": 0,
      "total_invitations": 30,
      "accepted": 12,
      "declined": 3,
      "pending": 15
    }
  }
}
```

- `next_event` é `null` quando não há eventos futuros agendados.
- `upcoming` devolve no máximo 5 eventos, do mais próximo para o mais
  distante.

`GET /api/v1/host/guests` — `200`; cada item é um `Invitation` com um
resumo do evento:

```json
{
  "data": [
    {
      "id": "1a80b39f-cb8c-49d2-86ff-cf4de1b74803",
      "event_id": "2bbc2ed1-4b27-48f7-80f2-d3b05ca37cec",
      "guest_name": "João",
      "guest_email": "joao@exemplo.ao",
      "guest_phone": "+244900000000",
      "table_name": "Mesa 1",
      "rsvp_status": "accepted",
      "rsvp_responded_at": "2026-11-16T01:00:00.000Z",
      "send_status": "sent",
      "send_count": 1,
      "last_sent_at": "2026-11-15T03:24:52.807Z",
      "created_at": "2026-11-15T03:24:30.000Z",
      "updated_at": "2026-11-16T01:00:00.000Z",
      "event": {
        "id": "2bbc2ed1-4b27-48f7-80f2-d3b05ca37cec",
        "title": "Casamento da Ana e do Paulo",
        "starts_at": "2027-08-15T17:00:00.000Z",
        "status": "scheduled"
      }
    }
  ],
  "pagination": { "page": 1, "page_size": 20, "total": 1, "total_pages": 1 }
}
```

`GET /api/v1/host/activity` — `200`; inclui `event_title`:

```json
{
  "data": [
    {
      "id": "9b1f1d0e-6a0c-4a52-9d4d-2f7e3f3a1b10",
      "event_id": "2bbc2ed1-4b27-48f7-80f2-d3b05ca37cec",
      "kind": "rsvp_accepted",
      "guest_name": "João",
      "at": "2026-11-16T01:00:00.000Z",
      "event_title": "Casamento da Ana e do Paulo"
    }
  ],
  "pagination": { "page": 1, "page_size": 20, "total": 1, "total_pages": 1 }
}
```

`GET /api/v1/host/events/{eventId}/activity` — `200`; mesma forma, sem
`event_title`:

```json
{
  "data": [
    {
      "id": "9b1f1d0e-6a0c-4a52-9d4d-2f7e3f3a1b10",
      "event_id": "2bbc2ed1-4b27-48f7-80f2-d3b05ca37cec",
      "kind": "rsvp_accepted",
      "guest_name": "João",
      "at": "2026-11-16T01:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "page_size": 20, "total": 1, "total_pages": 1 }
}
```

`GET /api/v1/host/reports/summary` — `200`:

```json
{
  "data": {
    "events": [
      {
        "event_id": "2bbc2ed1-4b27-48f7-80f2-d3b05ca37cec",
        "title": "Casamento da Ana e do Paulo",
        "status": "scheduled",
        "total_invitations": 10,
        "accepted": 4,
        "declined": 2,
        "pending": 4
      }
    ],
    "totals": {
      "total_invitations": 10,
      "accepted": 4,
      "declined": 2,
      "pending": 4,
      "response_rate": 0.6,
      "acceptance_rate": 0.4
    }
  }
}
```

- `response_rate` = `(accepted + declined) / total_invitations`.
- `acceptance_rate` = `accepted / total_invitations`.
- Ambos são fracções entre `0` e `1`, arredondadas a 4 casas; `0`
  quando não há convites.

`GET /api/v1/host/events/{eventId}/reports?days=30` — `200`:

```json
{
  "data": {
    "event_id": "2bbc2ed1-4b27-48f7-80f2-d3b05ca37cec",
    "days": 30,
    "series": [
      {
        "date": "2026-11-16",
        "invitations": 3,
        "accepted": 1,
        "declined": 0,
        "reminders": 0
      }
    ]
  }
}
```

- `series` tem exactamente `days` pontos, em dias UTC, incluindo dias
  sem movimento.
- `date` é `YYYY-MM-DD`.

`GET /api/v1/host/tasks` — `200` (sem paginação):

```json
{
  "data": [
    {
      "id": "0f0e5f6a-9b1c-4d3e-8a2b-7c6d5e4f3a21",
      "event_id": "2bbc2ed1-4b27-48f7-80f2-d3b05ca37cec",
      "label": "Confirmar menu",
      "done": false,
      "created_at": "2026-11-16T01:00:00.000Z",
      "updated_at": "2026-11-16T01:00:00.000Z"
    }
  ]
}
```

- `event_id` é `null` para tarefas globais da conta.
- `POST /api/v1/host/tasks` (`{ "label": "...", "event_id": null }`)
  devolve `201 { "data": { ...Task } }`.
- `PATCH /api/v1/host/tasks/{taskId}` aceita `label` e/ou `done` e
  devolve `200 { "data": { ...Task } }`.
- `DELETE /api/v1/host/tasks/{taskId}` devolve `204`.

### Categorias e mesas

- `events.category` é opcional: `wedding`, `birthday`, `corporate`,
  `baby` ou `other`.
- `invitations.table_name` é opcional e acompanha o convite (por
  exemplo, "Mesa 1"); não é enviado ao convidado na página pública.

## Fluxo do anfitrião (link secreto)

### 1. Criar evento

`POST /api/v1/events` (público, sem conta) ou
`POST /api/v1/host/events` (conta autenticada, email verificado).

```json
{
  "event": {
    "title": "Casamento da Ana e do Paulo",
    "host_name": "Ana",
    "host_email": "ana@exemplo.ao",
    "category": "wedding",
    "starts_at": "2027-08-15T18:00:00+01:00",
    "ends_at": "2027-08-16T02:00:00+01:00",
    "timezone": "Africa/Luanda",
    "location": { "type": "venue", "name": "Salão Principal", "address": "Luanda" },
    "message": "Celebramos o nosso casamento.",
    "rules": "Traje formal.",
    "dress_code": "Traje formal",
    "template_id": null,
    "theme": { "mode": "dark", "palette": "default" },
    "contribution": { "enabled": false },
    "rsvp_deadline": "2027-08-01T23:59:59+01:00"
  },
  "guests": [
    { "name": "João", "email": "joao@exemplo.ao", "phone": null, "table_name": "Mesa 1" }
  ]
}
```

Regras de validação relevantes:

- `location.type=venue` exige `name`; `location.type=online` exige
  `online_url`.
- `contribution.enabled=true` exige `bank_name`, `account_holder` e
  `account_reference`.
- `ends_at` tem de ser posterior a `starts_at`; `rsvp_deadline` não pode
  ser posterior a `starts_at`.
- `starts_at` tem de ser futura.
- Emails de convidados duplicados são rejeitados.
- Campos desconhecidos são rejeitados (`.strict()`).

Resposta `201`:

```json
{
  "data": {
    "event": { "id": "...", "title": "...", "status": "scheduled", "...": "..." },
    "manage_email_status": "sent",
    "deliveries": [
      { "email": "joao@exemplo.ao", "status": "queued" }
    ]
  }
}
```

O segredo de gestão **não** é devolvido: é enviado uma única vez para
`host_email` no link de gestão. O envio é síncrono e o resultado é
comunicado em `manage_email_status` (`sent` | `failed`). Os convites são
enfileirados na outbox e reportados como `queued` (a entrega real é
assíncrona; consultar `send_status` no convite para o estado final).

### 2. Trocar o link secreto por sessão

`POST /api/v1/host/session`

```json
{ "token": "<segredo do link de gestão>" }
```

Resposta `200` (define os cookies do evento):

```json
{
  "data": {
    "event": { "...": "..." },
    "csrf_token": "<valor para X-CSRF-Token>",
    "expires_at": "2026-11-16T03:38:46.344Z",
    "manage_email_status": "sent",
    "manage_token_expires_at": "2026-12-16T01:38:46.345Z"
  }
}
```

- A troca **rota** o link: o token usado deixa imediatamente de ser
  válido e um novo link é enviado para `host_email`. Repetir o mesmo
  token devolve `404 manage_link_invalid`.
- O token em claro nunca é devolvido em JSON. `manage_email_status`
  (`sent` | `failed`) descreve apenas a tentativa de entrega.
- `manage_token_expires_at` é o fim da validade do novo link (30 dias
  por omissão, `MANAGE_TOKEN_TTL_DAYS`).
- A rotação é atómica: a sessão é criada e o token é substituído na
  mesma transacção.

`DELETE /api/v1/host/session/{eventId}` revoga a sessão e limpa os
cookies. Exige `X-CSRF-Token`.

### 3. Consultar e actualizar o evento

`GET /api/v1/host/events/{eventId}`

Resposta `200`:

```json
{
  "data": {
    "event": {
      "...": "...",
      "stats": {
        "total_invitations": 10,
        "accepted": 4,
        "declined": 2,
        "pending": 4
      }
    },
    "invitations": [{ "...": "..." }]
  }
}
```

`PATCH /api/v1/host/events/{eventId}` actualiza apenas os campos
enviados (sem defaults implícitos) e aceita `status`
(`draft`, `scheduled`, `cancelled`, `completed`). Exige `X-CSRF-Token`.

- Alterar `starts_at` ou `timezone` cancela e reconstrói os lembretes
  futuros ainda não enviados.
- `status=draft` suspende convites e lembretes pendentes; voltar a
  `scheduled` reagenda os lembretes futuros.
- `status=cancelled` cancela convites/lembretes pendentes e enfileira o
  aviso de cancelamento aos convidados que não recusaram.
- `status=completed` cancela convites/lembretes pendentes.
- `theme` e `contribution` são fundidos com o estado actual.

### 4. Gerir convidados

| Método | Rota | Efeito |
|---|---|---|
| `GET` | `/api/v1/host/events/{eventId}/invitations` | Lista privada |
| `POST` | `/api/v1/host/events/{eventId}/invitations` | Adiciona e enfileira convite |
| `PATCH` | `/api/v1/host/events/{eventId}/invitations/{invitationId}` | Actualiza dados |
| `DELETE` | `/api/v1/host/events/{eventId}/invitations/{invitationId}` | Remove convite e entregas |
| `POST` | `.../{invitationId}/resend` | Reenvia o link individual |
| `POST` | `.../{invitationId}/revoke` | Revoga o acesso do navegador |

Payload de criação/actualização:

```json
{ "name": "João", "email": "joao@exemplo.ao", "phone": "+244900000000", "table_name": "Mesa 1" }
```

Só é possível adicionar convidados a um evento `scheduled`. O limite é
`MAX_INVITATIONS_PER_EVENT`. Todas as rotas mutáveis exigem
`X-CSRF-Token`.

## Fluxo do convidado

### Reclamar o convite

`POST /api/v1/public/invitations/{token}/claim`

- O primeiro claim válido é atómico e emite a capacidade do navegador.
- Token inválido, convite revogado ou já reclamado por outro navegador
  devolvem sempre o mesmo `404` genérico (`invitation_not_found`).
- O mesmo navegador pode reabrir o convite e reclamar convites
  adicionais com a mesma capacidade.

Resposta `200`:

```json
{
  "data": {
    "event": { "id": "...", "title": "...", "starts_at": "...", "timezone": "Africa/Luanda" },
    "guest": { "name": "João", "rsvp_status": "pending", "rsvp_responded_at": null },
    "rsvp_deadline_passed": false,
    "csrf_token": "<valor para X-CSRF-Token>"
  }
}
```

### Consultar o convite

`GET /api/v1/public/invitations/{token}` — exige a capacidade do
navegador. Devolve a mesma apresentação pública, sem email, telefone ou
dados de outros convidados.

### Responder

`PUT /api/v1/public/invitations/{token}/rsvp`

```json
{ "status": "accepted" }
```

- `status`: `accepted` | `declined`.
- Exige a capacidade do navegador e `X-CSRF-Token`.
- Repetir o mesmo estado é idempotente.
- `declined` cancela os lembretes futuros do convite e notifica o
  anfitrião por email.
- Voltar de `declined` para `accepted` reagenda os lembretes futuros.
- `409` se o evento estiver cancelado/terminado ou o prazo tiver
  passado.

## Modelos de resposta

Tipos reutilizados nas respostas. Todos os objectos são JSON e os
campos opcionais só aparecem quando têm valor, salvo indicação em
contrário.

### `Pagination`

```json
{ "page": 1, "page_size": 20, "total": 42, "total_pages": 3 }
```

| Campo | Tipo | Notas |
|---|---|---|
| `page` | inteiro | Começa em 1 |
| `page_size` | inteiro | 1 a 100 |
| `total` | inteiro | Total de registos |
| `total_pages` | inteiro | `ceil(total / page_size)`; `0` sem registos |

### `Host`

```json
{
  "id": "584476e6-c785-4440-9f58-06ccc006efd1",
  "email": "ana@exemplo.ao",
  "email_verified": true,
  "status": "active",
  "profile": {
    "display_name": "Ana",
    "phone": null,
    "birth_date": "1994-05-20",
    "locale": "pt-AO",
    "timezone": "Africa/Luanda",
    "avatar_url": null
  },
  "profile_complete": true,
  "missing_fields": [],
  "created_at": "2026-11-15T03:24:13.372Z"
}
```

| Campo | Tipo | Notas |
|---|---|---|
| `email_verified` | booleano | Deriva de `email_verified_at` |
| `status` | string | `active`, `suspended` ou `deleted` |
| `profile.birth_date` | string \| null | `YYYY-MM-DD`; nunca incluído noutros recursos |
| `profile_complete` | booleano | `false` enquanto faltar `birth_date` |
| `missing_fields` | string[] | Actualmente `["birth_date"]` ou `[]` |

### `Event`

```json
{
  "id": "2bbc2ed1-4b27-48f7-80f2-d3b05ca37cec",
  "title": "Casamento da Ana e do Paulo",
  "host_name": "Ana",
  "host_email": "ana@exemplo.ao",
  "category": "wedding",
  "starts_at": "2027-08-15T17:00:00.000Z",
  "ends_at": "2027-08-16T01:00:00.000Z",
  "timezone": "Africa/Luanda",
  "location": {
    "type": "venue",
    "name": "Salão Principal",
    "address": "Luanda",
    "online_url": null
  },
  "message": "Celebramos o nosso casamento.",
  "rules": "Traje formal.",
  "dress_code": "Traje formal",
  "template_id": null,
  "theme": { "mode": "dark", "palette": "default" },
  "contribution": { "enabled": false },
  "rsvp_deadline": "2027-08-01T22:59:59.000Z",
  "status": "scheduled",
  "created_at": "2026-11-16T01:40:07.999Z",
  "updated_at": "2026-11-16T01:40:07.999Z",
  "stats": {
    "total_invitations": 10,
    "accepted": 4,
    "declined": 2,
    "pending": 4
  }
}
```

| Campo | Tipo | Notas |
|---|---|---|
| `category` | string \| null | `wedding`, `birthday`, `corporate`, `baby`, `other` |
| `starts_at` / `ends_at` | string \| null | ISO 8601 UTC |
| `location.type` | string | `venue` ou `online` |
| `contribution` | object | Com `enabled=false` só este campo é devolvido |
| `status` | string | `draft`, `scheduled`, `cancelled`, `completed` |
| `stats` | object | Só nas listas de gestão, `dashboard` e detalhe por sessão de evento |

A vista pública (`PublicEvent`) omite `host_email`, `template_id`,
`created_at`, `updated_at` e `stats`.

### `Invitation`

```json
{
  "id": "1a80b39f-cb8c-49d2-86ff-cf4de1b74803",
  "event_id": "2bbc2ed1-4b27-48f7-80f2-d3b05ca37cec",
  "guest_name": "João",
  "guest_email": "joao@exemplo.ao",
  "guest_phone": "+244900000000",
  "table_name": "Mesa 1",
  "rsvp_status": "pending",
  "rsvp_responded_at": null,
  "send_status": "queued",
  "send_count": 1,
  "last_sent_at": null,
  "created_at": "2026-11-15T03:24:30.000Z",
  "updated_at": "2026-11-15T03:24:30.000Z"
}
```

| Campo | Tipo | Notas |
|---|---|---|
| `rsvp_status` | string | `pending`, `accepted`, `declined` |
| `send_status` | string | `pending`, `queued`, `sent`, `failed` |
| `send_count` | inteiro | Número de envios |
| `table_name` | string \| null | Visível apenas ao anfitrião |

### `HostGuest`

`Invitation` + `event`:

```json
{
  "...": "campos de Invitation",
  "event": {
    "id": "2bbc2ed1-4b27-48f7-80f2-d3b05ca37cec",
    "title": "Casamento da Ana e do Paulo",
    "starts_at": "2027-08-15T17:00:00.000Z",
    "status": "scheduled"
  }
}
```

### `Activity`

```json
{
  "id": "9b1f1d0e-6a0c-4a52-9d4d-2f7e3f3a1b10",
  "event_id": "2bbc2ed1-4b27-48f7-80f2-d3b05ca37cec",
  "kind": "rsvp_accepted",
  "guest_name": "João",
  "at": "2026-11-16T01:00:00.000Z"
}
```

O feed da conta acrescenta `event_title`. `kind` é um identificador
estável do tipo de actividade (por exemplo `rsvp_accepted`,
`rsvp_declined`, `invitation_sent`).

### `Task`

```json
{
  "id": "0f0e5f6a-9b1c-4d3e-8a2b-7c6d5e4f3a21",
  "event_id": null,
  "label": "Confirmar menu",
  "done": false,
  "created_at": "2026-11-16T01:00:00.000Z",
  "updated_at": "2026-11-16T01:00:00.000Z"
}
```

### `PublicInvitation`

```json
{
  "event": {
    "id": "2bbc2ed1-4b27-48f7-80f2-d3b05ca37cec",
    "title": "Casamento da Ana e do Paulo",
    "host_name": "Ana",
    "category": "wedding",
    "starts_at": "2027-08-15T17:00:00.000Z",
    "ends_at": "2027-08-16T01:00:00.000Z",
    "timezone": "Africa/Luanda",
    "location": {
      "type": "venue",
      "name": "Salão Principal",
      "address": "Luanda",
      "online_url": null
    },
    "message": "Celebramos o nosso casamento.",
    "rules": "Traje formal.",
    "dress_code": "Traje formal",
    "theme": { "mode": "dark", "palette": "default" },
    "contribution": { "enabled": false },
    "rsvp_deadline": "2027-08-01T22:59:59.000Z",
    "status": "scheduled"
  },
  "guest": {
    "name": "João",
    "rsvp_status": "pending",
    "rsvp_responded_at": null
  },
  "rsvp_deadline_passed": false,
  "csrf_token": "<valor para X-CSRF-Token>"
}
```

Nunca inclui `guest_email`, `guest_phone`, `table_name` nem dados de
outros convidados.

### `ReportSummary` e `DailyReport`

```json
{
  "events": [
    {
      "event_id": "...",
      "title": "...",
      "status": "scheduled",
      "total_invitations": 10,
      "accepted": 4,
      "declined": 2,
      "pending": 4
    }
  ],
  "totals": {
    "total_invitations": 10,
    "accepted": 4,
    "declined": 2,
    "pending": 4,
    "response_rate": 0.6,
    "acceptance_rate": 0.4
  }
}
```

```json
{
  "date": "2026-11-16",
  "invitations": 3,
  "accepted": 1,
  "declined": 0,
  "reminders": 0
}
```

### Erros

Todos os erros usam o envelope `error` descrito em
[Convenções](#convenções). `fields` só aparece em `422` de validação e
`request_id` aparece sempre.

## Templates

`GET /api/v1/templates` — lista apenas templates activos, com os campos
e temas suportados. Uma lista vazia é válida. Os templates visuais finais
serão fornecidos pelo responsável do produto.

Resposta `200`:

```json
{
  "data": [
    {
      "id": "3f2c1d0e-8b7a-4c6d-9e5f-1a2b3c4d5e6f",
      "slug": "base",
      "name": "Base",
      "description": "Template neutro.",
      "preview_image_url": null,
      "supported_fields": ["title", "message", "location"],
      "themes": [{ "mode": "light", "palette": "default" }],
      "is_active": true
    }
  ]
}
```

## Rate limit

Todos os ambientes aplicam `/api/v1`:

- Global: `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX`.
- Endpoints públicos com token: `PUBLIC_RATE_LIMIT_WINDOW_MS` /
  `PUBLIC_RATE_LIMIT_MAX`.
- Troca do segredo de gestão: `HOST_SESSION_RATE_LIMIT_WINDOW_MS` /
  `HOST_SESSION_RATE_LIMIT_MAX`.
- Autenticação (`register`, `register/request-code`,
  `register/verify-code`, `login`, `email/verify/resend`,
  `password/forgot`): `AUTH_RATE_LIMIT_WINDOW_MS` /
  `AUTH_RATE_LIMIT_MAX`, aplicado por IP e por IP + email.
- Escritas de gestão (criar/actualizar/apagar eventos, convidados,
  tarefas, perfil, avatar, reenvio de link de gestão e reenvio de
  convite): `WRITE_RATE_LIMIT_WINDOW_MS` /
  `WRITE_RATE_LIMIT_MAX`.
- RSVP público: `RSVP_RATE_LIMIT_WINDOW_MS` /
  `RSVP_RATE_LIMIT_MAX`, aplicado por IP + token do convite.
- Verificação de email, verificação de código OTP e reposição de senha
  consomem também o limite público de tokens.

O limite de escritas escolhe a chave mais específica disponível:
conta autenticada → evento → convite → IP. O limite de RSVP usa sempre
IP + token, para que um convite não possa ser usado para esgotar o
limite de outro.

Os cabeçalhos `RateLimit-Policy`, `RateLimit-Limit`,
`RateLimit-Remaining` e `RateLimit-Reset` acompanham as respostas
limitadas. Ao exceder, a resposta é `429` com `error.code =
"rate_limited"`; nenhum limite interno é revelado no corpo.

`/health` fica fora do limite global para não afectar orquestradores.

## Mapa de respostas por endpoint

Resumo do corpo de sucesso de cada rota. `—` significa `204` sem
corpo. Todas as rotas podem devolver os erros transversais de
[Códigos de erro](#códigos-de-erro).

### Autenticação

| Método | Rota | Sucesso | Corpo |
|---|---|---|---|
| `POST` | `/api/v1/auth/register/request-code` | `202` | `{ "data": { "status": "accepted", "email": string, "expires_at": string, "resend_available_at": string } }` |
| `POST` | `/api/v1/auth/register/verify-code` | `200` | `{ "data": { "email": string, "verification_token": string, "expires_at": string } }` |
| `POST` | `/api/v1/auth/register` | `201` | `{ "data": { "host": Host } }` |
| `POST` | `/api/v1/auth/email/verify` | `200` | `{ "data": { "host": Host } }` |
| `POST` | `/api/v1/auth/email/verify/resend` | `202` | `{ "data": { "status": "accepted" } }` |
| `POST` | `/api/v1/auth/login` | `200` | `{ "data": { "host": Host, "csrf_token": string, "expires_at": string } }` |
| `POST` | `/api/v1/auth/logout` | `204` | — |
| `GET` | `/api/v1/auth/session` | `200` | `{ "data": { "host": Host, "csrf_token": string } }` |
| `POST` | `/api/v1/auth/password/forgot` | `202` | `{ "data": { "status": "accepted" } }` |
| `POST` | `/api/v1/auth/password/reset` | `204` | — |
| `POST` | `/api/v1/auth/password/change` | `204` | — |

### Perfil e workspace

| Método | Rota | Sucesso | Corpo |
|---|---|---|---|
| `GET` | `/api/v1/host/profile` | `200` | `{ "data": { "host": Host } }` |
| `PATCH` | `/api/v1/host/profile` | `200` | `{ "data": { "host": Host } }` |
| `POST` | `/api/v1/host/profile/avatar` | `200` | `{ "data": { "host": Host } }` |
| `POST` | `/api/v1/host/profile/avatar/upload` | `200` | `{ "data": { "host": Host } }` |
| `GET` | `/api/v1/host/events` | `200` | `{ "data": Event[], "pagination": Pagination }` |
| `POST` | `/api/v1/host/events` | `201` | `{ "data": { "event": Event, "manage_email_status": "sent" \| "failed", "deliveries": [{ "email": string, "status": "queued" }] } }` |
| `DELETE` | `/api/v1/host/events/{eventId}` | `204` | — |
| `POST` | `/api/v1/host/events/{eventId}/manage-link/resend` | `202` | `{ "data": { "event_id": uuid, "manage_email_status": "sent" \| "failed", "manage_token_expires_at": string \| null } }` |
| `GET` | `/api/v1/host/dashboard` | `200` | `{ "data": { "next_event": Event \| null, "upcoming": Event[], "totals": Totals } }` |
| `GET` | `/api/v1/host/guests` | `200` | `{ "data": HostGuest[], "pagination": Pagination }` |
| `GET` | `/api/v1/host/activity` | `200` | `{ "data": ActivityWithEvent[], "pagination": Pagination }` |
| `GET` | `/api/v1/host/events/{eventId}/activity` | `200` | `{ "data": Activity[], "pagination": Pagination }` |
| `GET` | `/api/v1/host/reports/summary` | `200` | `{ "data": ReportSummary }` |
| `GET` | `/api/v1/host/events/{eventId}/reports` | `200` | `{ "data": { "event_id": uuid, "days": integer, "series": DailyReport[] } }` |
| `GET` | `/api/v1/host/tasks` | `200` | `{ "data": Task[] }` |
| `POST` | `/api/v1/host/tasks` | `201` | `{ "data": Task }` |
| `PATCH` | `/api/v1/host/tasks/{taskId}` | `200` | `{ "data": Task }` |
| `DELETE` | `/api/v1/host/tasks/{taskId}` | `204` | — |

`Totals` = `{ events, drafts, scheduled, cancelled, completed,
total_invitations, accepted, declined, pending }`, todos inteiros.

### Fluxo legado por link secreto

| Método | Rota | Sucesso | Corpo |
|---|---|---|---|
| `POST` | `/api/v1/events` | `201` | `{ "data": { "event": Event, "manage_email_status": "sent" \| "failed", "deliveries": [{ "email": string, "status": "queued" }] } }` |
| `POST` | `/api/v1/host/session` | `200` | `{ "data": { "event": Event, "csrf_token": string, "expires_at": string, "manage_email_status": "sent" \| "failed", "manage_token_expires_at": string \| null } }` |
| `DELETE` | `/api/v1/host/session/{eventId}` | `204` | — |
| `GET` | `/api/v1/host/events/{eventId}` | `200` | `{ "data": { "event": Event, "invitations": Invitation[] } }` |
| `PATCH` | `/api/v1/host/events/{eventId}` | `200` | `{ "data": Event }` |
| `GET` | `/api/v1/host/events/{eventId}/invitations` | `200` | `{ "data": Invitation[] }` |
| `POST` | `/api/v1/host/events/{eventId}/invitations` | `201` | `{ "data": Invitation }` |
| `PATCH` | `/api/v1/host/events/{eventId}/invitations/{invitationId}` | `200` | `{ "data": Invitation }` |
| `DELETE` | `/api/v1/host/events/{eventId}/invitations/{invitationId}` | `204` | — |
| `POST` | `/api/v1/host/events/{eventId}/invitations/{invitationId}/resend` | `202` | `{ "data": { "status": "queued" } }` |
| `POST` | `/api/v1/host/events/{eventId}/invitations/{invitationId}/revoke` | `200` | `{ "data": Invitation }` |

### Convidado público e templates

| Método | Rota | Sucesso | Corpo |
|---|---|---|---|
| `POST` | `/api/v1/public/invitations/{token}/claim` | `200` | `{ "data": PublicInvitation }` |
| `GET` | `/api/v1/public/invitations/{token}` | `200` | `{ "data": PublicInvitation }` |
| `PUT` | `/api/v1/public/invitations/{token}/rsvp` | `200` | `{ "data": PublicInvitation }` |
| `GET` | `/api/v1/templates` | `200` | `{ "data": Template[] }` |

## Respostas de erro por endpoint

Todas as respostas não-2xx usam o mesmo envelope. Abaixo estão os
corpos reutilizáveis e, depois, o mapa de que erros cada rota devolve.
`request_id` é sempre um UUID diferente por pedido.

### Corpos reutilizáveis

`422 validation_failed` — `fields` lista apenas os campos inválidos:

```json
{
  "error": {
    "code": "validation_failed",
    "message": "Verifique os campos indicados.",
    "fields": { "email": ["Email inválido."] },
    "request_id": "6b1f0a1e-8f6d-4a3e-9c2d-1f2a3b4c5d6e"
  }
}
```

`400 invalid_json`:

```json
{
  "error": {
    "code": "invalid_json",
    "message": "Corpo da requisição não é um JSON válido.",
    "request_id": "6b1f0a1e-8f6d-4a3e-9c2d-1f2a3b4c5d6e"
  }
}
```

`401 host_session_invalid`:

```json
{
  "error": {
    "code": "host_session_invalid",
    "message": "Sessão inválida ou expirada.",
    "request_id": "6b1f0a1e-8f6d-4a3e-9c2d-1f2a3b4c5d6e"
  }
}
```

`401 invalid_credentials`:

```json
{
  "error": {
    "code": "invalid_credentials",
    "message": "Email ou senha inválidos.",
    "request_id": "6b1f0a1e-8f6d-4a3e-9c2d-1f2a3b4c5d6e"
  }
}
```

`403 csrf_invalid`:

```json
{
  "error": {
    "code": "csrf_invalid",
    "message": "Token CSRF inválido ou ausente.",
    "request_id": "6b1f0a1e-8f6d-4a3e-9c2d-1f2a3b4c5d6e"
  }
}
```

`403 email_not_verified`:

```json
{
  "error": {
    "code": "email_not_verified",
    "message": "Confirma o teu email antes de gerir eventos.",
    "request_id": "6b1f0a1e-8f6d-4a3e-9c2d-1f2a3b4c5d6e"
  }
}
```

`404 invitation_not_found`:

```json
{
  "error": {
    "code": "invitation_not_found",
    "message": "Convite não encontrado.",
    "request_id": "6b1f0a1e-8f6d-4a3e-9c2d-1f2a3b4c5d6e"
  }
}
```

`404 event_not_found`:

```json
{
  "error": {
    "code": "event_not_found",
    "message": "Evento não encontrado.",
    "request_id": "6b1f0a1e-8f6d-4a3e-9c2d-1f2a3b4c5d6e"
  }
}
```

`404 manage_link_invalid`:

```json
{
  "error": {
    "code": "manage_link_invalid",
    "message": "Link de gestão inválido ou expirado.",
    "request_id": "6b1f0a1e-8f6d-4a3e-9c2d-1f2a3b4c5d6e"
  }
}
```

`404 task_not_found`:

```json
{
  "error": {
    "code": "task_not_found",
    "message": "Tarefa não encontrada.",
    "request_id": "6b1f0a1e-8f6d-4a3e-9c2d-1f2a3b4c5d6e"
  }
}
```

`409` — o `code` varia com a regra de negócio:

```json
{
  "error": {
    "code": "event_not_scheduled",
    "message": "O evento ainda não está agendado.",
    "request_id": "6b1f0a1e-8f6d-4a3e-9c2d-1f2a3b4c5d6e"
  }
}
```

Valores possíveis: `event_not_scheduled`, `event_cancelled`,
`event_completed`, `rsvp_deadline_passed`, `invitation_email_duplicate`,
`invitation_limit_reached`, `invitation_revoked`,
`invitation_not_resendable`, `email_already_registered`.

`422` de token ou OTP — o `code` identifica o passo:

```json
{
  "error": {
    "code": "otp_invalid",
    "message": "Código inválido ou expirado.",
    "fields": { "code": ["Código inválido ou expirado."] },
    "request_id": "6b1f0a1e-8f6d-4a3e-9c2d-1f2a3b4c5d6e"
  }
}
```

Valores possíveis: `verification_invalid`, `verification_required`,
`otp_invalid`, `otp_attempts_exceeded`, `reset_invalid`.

`423 account_locked`:

```json
{
  "error": {
    "code": "account_locked",
    "message": "Conta temporariamente bloqueada. Tente novamente mais tarde.",
    "request_id": "6b1f0a1e-8f6d-4a3e-9c2d-1f2a3b4c5d6e"
  }
}
```

`429 rate_limited`:

```json
{
  "error": {
    "code": "rate_limited",
    "message": "Demasiados pedidos. Tente novamente mais tarde.",
    "request_id": "6b1f0a1e-8f6d-4a3e-9c2d-1f2a3b4c5d6e"
  }
}
```

`429 otp_resend_too_soon`:

```json
{
  "error": {
    "code": "otp_resend_too_soon",
    "message": "Aguarda antes de pedir um novo código.",
    "request_id": "6b1f0a1e-8f6d-4a3e-9c2d-1f2a3b4c5d6e"
  }
}
```

`500 internal_error` (qualquer rota, em falha inesperada):

```json
{
  "error": {
    "code": "internal_error",
    "message": "Erro interno do servidor.",
    "request_id": "6b1f0a1e-8f6d-4a3e-9c2d-1f2a3b4c5d6e"
  }
}
```

### Mapa de erros por endpoint

| Método | Rota | Erros documentados |
|---|---|---|
| `POST` | `/api/v1/auth/register/request-code` | `409 email_already_registered`; `422 validation_failed`; `429 otp_resend_too_soon`; `429 rate_limited` |
| `POST` | `/api/v1/auth/register/verify-code` | `422 otp_invalid`; `422 otp_attempts_exceeded`; `422 validation_failed`; `429 rate_limited` |
| `POST` | `/api/v1/auth/register` | `409 email_already_registered`; `422 verification_required`; `422 validation_failed`; `429 rate_limited` |
| `POST` | `/api/v1/auth/email/verify` | `422 verification_invalid`; `429 rate_limited` |
| `POST` | `/api/v1/auth/email/verify/resend` | `422 validation_failed`; `429 rate_limited` |
| `POST` | `/api/v1/auth/login` | `401 invalid_credentials`; `422 validation_failed`; `423 account_locked`; `429 rate_limited` |
| `POST` | `/api/v1/auth/logout` | `401 host_session_invalid`; `403 csrf_invalid` |
| `GET` | `/api/v1/auth/session` | `401 host_session_invalid` |
| `POST` | `/api/v1/auth/password/forgot` | `422 validation_failed`; `429 rate_limited` |
| `POST` | `/api/v1/auth/password/reset` | `422 reset_invalid`; `429 rate_limited` |
| `POST` | `/api/v1/auth/password/change` | `401 host_session_invalid`; `403 csrf_invalid`; `422 validation_failed` |
| `POST` | `/api/v1/events` | `422 validation_failed`; `429 rate_limited` |
| `POST` | `/api/v1/host/session` | `404 manage_link_invalid`; `422 validation_failed`; `429 rate_limited` |
| `DELETE` | `/api/v1/host/session/{eventId}` | `401 host_session_invalid`; `403 csrf_invalid`; `429 rate_limited` |
| `GET` | `/api/v1/host/events/{eventId}` | `401 host_session_invalid`; `404 event_not_found` |
| `PATCH` | `/api/v1/host/events/{eventId}` | `401 host_session_invalid`; `403 csrf_invalid`; `404 event_not_found`; `409`; `422 validation_failed`; `429 rate_limited` |
| `DELETE` | `/api/v1/host/events/{eventId}` | `401 host_session_invalid`; `403 csrf_invalid`; `404 event_not_found`; `429 rate_limited` |
| `GET` | `/api/v1/host/events/{eventId}/invitations` | `401 host_session_invalid`; `404 event_not_found` |
| `POST` | `/api/v1/host/events/{eventId}/invitations` | `401 host_session_invalid`; `403 csrf_invalid`; `404 event_not_found`; `409`; `422 validation_failed`; `429 rate_limited` |
| `PATCH` | `/api/v1/host/events/{eventId}/invitations/{invitationId}` | `401 host_session_invalid`; `403 csrf_invalid`; `404 invitation_not_found`; `409 invitation_email_duplicate`; `422 validation_failed`; `429 rate_limited` |
| `DELETE` | `/api/v1/host/events/{eventId}/invitations/{invitationId}` | `401 host_session_invalid`; `403 csrf_invalid`; `404 invitation_not_found`; `429 rate_limited` |
| `POST` | `/api/v1/host/events/{eventId}/invitations/{invitationId}/resend` | `401 host_session_invalid`; `403 csrf_invalid`; `404 invitation_not_found`; `409 invitation_not_resendable`; `429 rate_limited` |
| `POST` | `/api/v1/host/events/{eventId}/invitations/{invitationId}/revoke` | `401 host_session_invalid`; `403 csrf_invalid`; `404 invitation_not_found`; `429 rate_limited` |
| `GET` | `/api/v1/host/profile` | `401 host_session_invalid` |
| `PATCH` | `/api/v1/host/profile` | `401 host_session_invalid`; `403 csrf_invalid`; `422 validation_failed`; `429 rate_limited` |
| `POST` | `/api/v1/host/profile/avatar` | `401 host_session_invalid`; `403 csrf_invalid`; `422 validation_failed`; `429 rate_limited` |
| `POST` | `/api/v1/host/profile/avatar/upload` | `401 host_session_invalid`; `403 csrf_invalid`; `422 validation_failed`; `429 rate_limited`; `503 avatar_upload_unavailable` |
| `GET` | `/api/v1/host/events` | `401 host_session_invalid`; `422 validation_failed`; `429 rate_limited` |
| `POST` | `/api/v1/host/events` | `401 host_session_invalid`; `403 email_not_verified`; `422 validation_failed`; `429 rate_limited` |
| `POST` | `/api/v1/host/events/{eventId}/manage-link/resend` | `401 host_session_invalid`; `403 email_not_verified`; `404 event_not_found`; `429 rate_limited` |
| `GET` | `/api/v1/host/dashboard` | `401 host_session_invalid` |
| `GET` | `/api/v1/host/guests` | `401 host_session_invalid`; `422 validation_failed`; `429 rate_limited` |
| `GET` | `/api/v1/host/activity` | `401 host_session_invalid`; `422 validation_failed`; `429 rate_limited` |
| `GET` | `/api/v1/host/events/{eventId}/activity` | `401 host_session_invalid`; `404 event_not_found`; `422 validation_failed`; `429 rate_limited` |
| `GET` | `/api/v1/host/reports/summary` | `401 host_session_invalid` |
| `GET` | `/api/v1/host/events/{eventId}/reports` | `401 host_session_invalid`; `404 event_not_found`; `422 validation_failed`; `429 rate_limited` |
| `GET` | `/api/v1/host/tasks` | `401 host_session_invalid`; `422 validation_failed`; `429 rate_limited` |
| `POST` | `/api/v1/host/tasks` | `401 host_session_invalid`; `403 csrf_invalid`; `422 validation_failed`; `429 rate_limited` |
| `PATCH` | `/api/v1/host/tasks/{taskId}` | `401 host_session_invalid`; `403 csrf_invalid`; `404 task_not_found`; `422 validation_failed`; `429 rate_limited` |
| `DELETE` | `/api/v1/host/tasks/{taskId}` | `401 host_session_invalid`; `403 csrf_invalid`; `404 task_not_found`; `429 rate_limited` |
| `POST` | `/api/v1/public/invitations/{token}/claim` | `404 invitation_not_found`; `429 rate_limited` |
| `GET` | `/api/v1/public/invitations/{token}` | `404 invitation_not_found`; `429 rate_limited` |
| `PUT` | `/api/v1/public/invitations/{token}/rsvp` | `403 csrf_invalid`; `404 invitation_not_found`; `409`; `422 validation_failed`; `429 rate_limited` |
| `GET` | `/api/v1/templates` | `429 rate_limited` |

Além disso, qualquer rota pode devolver `400 invalid_json` quando o
corpo não é JSON válido e `500 internal_error` em falhas inesperadas.
Uma rota inexistente devolve `404 route_not_found`; um pedido com
origem não permitida pelo CORS devolve `403 forbidden`.

## Auditoria

As acções críticas são registadas numa tabela append-only
(`host_audit_log`) com actor, evento, instante UTC, IP e resultado.
A auditoria é independente do ciclo de vida da conta e do evento:
`host_id` e `event_id` são UUIDs sem chave estrangeira.

Acções registadas nesta fase:

- `login_success`, `login_failure`, `login_locked`;
- `registration_code_requested`, `registration_code_verified`,
  `registration_code_failed`, `registration_completed`;
- `email_verified`;
- `password_changed`, `password_reset`;
- `profile_updated` (inclui avatar);
- `event_created`, `event_deleted`;
- `guest_added`, `guest_updated`, `guest_deleted`,
  `guest_invitation_resent`, `guest_access_revoked`;
- `manage_link_rotated`, `manage_link_resent`.

Regras:

- Nunca são registadas senhas, tokens, `birth_date` ou conteúdo de
  emails; `metadata` contém apenas identificadores e estados.
- Uma falha ao escrever auditoria não bloqueia a operação de negócio;
  é registada no log interno do servidor.
- O IP vem de `req.ip` (respeitando `TRUST_PROXY`); o actor é
  `host_id` quando existe sessão de conta, ou o `host_id` do evento no
  fluxo legado.
- A tabela não é exposta por nenhum endpoint nesta fase.
