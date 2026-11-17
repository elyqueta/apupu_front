# Pedido ao backend — eventos em que a conta foi convidada ("Meus convites")

## Contexto

Uma conta no Conto Contigo pode ser **anfitriã** (organiza eventos) e
**convidada** (é convidada para eventos de outras pessoas). Hoje a API só expõe
a perspetiva do anfitrião:

- `/api/v1/host/events`, `/api/v1/host/guests`,
  `/api/v1/host/events/{eventId}/invitations` — tudo do ponto de vista de quem
  organiza.
- O convidado só tem o fluxo público por token:
  `GET /api/v1/public/invitations/{token}` (reclamado por um navegador).

Resultado: quem tem conta **não consegue** ver, dentro da aplicação, os eventos
para os quais foi convidado. Só vê os eventos que organiza.

O frontend já tem a página **"Meus convites"** (`/convites`) e um repositório
provisório a apontar para `GET /api/v1/host/invitations` (ver
`src/app/core/data/guest-invitations.repository.ts`), com um `TODO(backend)`.
Enquanto o endpoint não existir, a página mostra o estado "Área em preparação".

## Objetivo

Expor, para a **conta autenticada** (`accountSession`), a lista de convites
**dirigidos ao seu email** — os eventos em que foi convidada — com o estado da
sua resposta (RSVP), de forma paginada.

## Contrato proposto

```
GET /api/v1/host/invitations?page=1&page_size=20&sort=starts_at&order=asc
Authorization: cookie accountSession
→ 200
{
  "data": [
    {
      "id": "uuid-do-convite",
      "event_id": "uuid-do-evento",
      "rsvp_status": "pending | accepted | declined",
      "rsvp_responded_at": "2026-11-10T18:00:00Z | null",
      "table_name": "Mesa 3 | null",
      "invitation_url": "https://apupu-front.vercel.app/convite/<token> | null",
      "invitation_url_expires_at": null,
      "created_at": "2026-11-01T10:00:00Z",
      "event": {
        "id": "uuid-do-evento",
        "title": "Casamento da Ana e do João",
        "host_name": "Ana Silva",
        "starts_at": "2026-12-01T17:00:00Z",
        "timezone": "Africa/Luanda",
        "status": "scheduled",
        "category": "wedding | null",
        "template_id": "aurora | null",
        "location": {
          "type": "venue | online",
          "name": "Salão X | null",
          "address": "Luanda | null",
          "online_url": "https://... | null"
        }
      }
    }
  ],
  "pagination": { "page": 1, "page_size": 20, "total": 3, "total_pages": 1 }
}
```

Notas de contrato:

- Reutilizar o shape de `location` já usado por `ApiEvent`.
- `rsvp_status` usa o mesmo enum de `Invitation` (`pending|accepted|declined`).
- `invitation_url` segue a semântica já implementada (mesmo token do email,
  não expira nesta fase, `null` quando revogado). O convidado **pode** abri-lo.
- `event.status` deve usar o enum de evento existente
  (`draft|scheduled|cancelled|completed`).

> A rota é uma **proposta**. Se preferirem outro prefixo (por exemplo
> `/api/v1/account/invitations` ou `/api/v1/guest/invitations`), indiquem qual
> para o frontend ajustar. O importante é a forma da resposta.

## Como associar o convite à conta

É a decisão de produto/segurança mais importante e precisa de ser explícita:

- **Opção A (mais simples):** `invitation.guest_email` = `host.email` (o email
  da conta autenticada), comparado de forma case-insensitive e normalizada.
  - Requer email verificado (`email_verified = true`) para evitar que alguém
    reclame convites alheios registando o email antes do dono.
- **Opção B (mais robusta):** ligação explícita convite↔conta
  (`invitation.host_id`/`account_id`), criada quando o convidado abre o link
  público ou quando o email coincide no registo. Implica migração.

Indicar qual foi escolhida e se há impacto em convites já existentes.

## Segurança / requisitos

- Autenticação: **apenas** `accountSession` (é a lista da própria conta).
  Sem `hostSession`.
- Um convite só aparece para a conta cujo email corresponde ao `guest_email`
  (ou à ligação explícita). Nunca expor convites de terceiros.
- Não expor dados de **outros** convidados do mesmo evento (nomes, emails,
  telefones, mesas), nem contagens que revelem a lista.
- Não expor campos internos do evento (contribuições/banca, notas privadas).
- Não incluir telefones/emails de convidados em logs.
- `GET` não exige CSRF.
- Documentar no OpenAPI (`conto-contigo-api.json`) com exemplos e códigos de
  erro: `401 host_session_invalid` (sessão ausente/expirada),
  `404`/`422` quando aplicável.

## Casos-limite a cobrir

- **Email por verificar:** convites só aparecem depois de `email_verified`.
- **Email alterado** na conta depois de receber convites: os convites antigos
  seguem o email antigo ou a ligação por conta? Definir.
- **Convite criado antes de a conta existir:** deve aparecer assim que o
  registo com esse email for concluído.
- **Convite revogado:** não deve aparecer (ou aparecer marcado e sem link).
- **Evento cancelado/concluído:** deve aparecer com o estado do evento, para o
  convidado perceber que já não se realiza / já passou.
- **Sem convites:** devolver `data: []` com paginação a zeros (não `404`).
- **Ordenação:** por `starts_at` ascendente (próximos primeiro); eventos sem
  data no fim.

## Critérios de aceitação

1. `GET /api/v1/host/invitations` devolve apenas os convites da conta
   autenticada, com o resumo do evento e o `rsvp_status`.
2. A conta consegue abrir o convite a partir de `invitation_url`.
3. Uma conta não vê convites de outra (testes negativos incluídos).
4. Paginação e ordenação funcionam como acima.
5. Contrato documentado no `conto-contigo-api.json`.

## O que o frontend precisa de saber para fechar a integração

- Caminho final do endpoint.
- Como é feita a associação convite↔conta (Opção A ou B) e restrições
  (email verificado, email alterado).
- Nome exato dos campos (se diferirem da proposta).
- Se `invitation_url` continua a ser devolvido nesta lista e com que semântica.

> Enquanto isto não existir, o frontend mantém a página `/convites` no estado
> "Área em preparação" e o `TODO(backend)` no repositório.
