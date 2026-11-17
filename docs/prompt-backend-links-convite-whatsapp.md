# Pedido ao backend — links de convite para reencaminhamento por WhatsApp

## Contexto

No frontend do anfitrião já existe a ação **"Reencaminhar por WhatsApp"** na lista de
convidados (`/convidados` e no detalhe do evento). Ela abre o `wa.me` com uma mensagem
pré-preenchida para o telefone do convidado.

Hoje o frontend **não consegue incluir o link individual do convite** nessa mensagem,
porque a API do anfitrião não devolve nenhum token/URL por convite:

- `GET /api/v1/host/events/{eventId}/invitations` devolve `Invitation`
  (`id`, `event_id`, `guest_name`, `guest_email`, `guest_phone`, `table_name`,
  `rsvp_status`, `send_status`, `send_count`, `last_sent_at`, `created_at`, `updated_at`).
- Não há campo de token/URL em `Invitation` nem endpoint que o exponha.
- O token existe apenas do lado público: `GET /api/v1/public/invitations/{token}`
  (convite "com a capacidade do navegador", reclamado por um navegador).

Resultado: a mensagem de WhatsApp sai sem o link do convite, o que torna a partilha
manual pouco útil.

## Objetivo

Expor ao **anfitrião autenticado (sessão de conta) ou à sessão de gestão do evento**
o URL/token individual de cada convite, para o frontend o incluir no texto do `wa.me`.

## Proposta (escolher uma)

### Opção A — recomendada: adicionar o campo ao `Invitation` do host

Adicionar a `Invitation` (apenas no contexto do host, nunca no público):

```jsonc
{
  "invitation_url": "https://<host>/convite/<token>",   // URL absoluto pronto a partilhar
  "invitation_url_expires_at": "2026-12-01T20:00:00Z"    // nullable
}
```

- `invitation_url`: URL absoluto (ou o `token` em bruto, se preferirem — indiquem qual).
- `invitation_url_expires_at`: opcional; ajuda o frontend a avisar que o link expirou.

Vantagens: zero round-trips extra; o frontend usa o que já recebe na listagem.

### Opção B — endpoint dedicado

Se o token tiver de ser gerado/rodado a pedido (por exemplo, para não ser "reclamado"
pelo navegador do próprio anfitrião), expor um endpoint dedicado:

```
GET /api/v1/host/events/{eventId}/invitations/{invitationId}/share-link
→ 200 { "data": { "url": "https://<host>/convite/<token>", "expires_at": "..." } }
```

e, se possível, uma variante em lote para a lista de convidados:

```
GET /api/v1/host/events/{eventId}/share-links
→ 200 { "data": [ { "invitation_id": "...", "url": "...", "expires_at": "..." } ] }
```

## Segurança / requisitos

- Autenticação: `hostSession` **ou** `accountSession` (o mesmo esquema já usado por
  `GET/POST /host/events/{eventId}/invitations`). Um anfitrião só pode obter links de
  convites de eventos que lhe pertencem; caso contrário `404 event_not_found`.
- O URL/token **nunca** deve aparecer em endpoints públicos nem em respostas de
  terceiros.
- Definir claramente a semântica do token partilhado:
  - Se for o mesmo token "reclamado por um navegador", o primeiro a abrir "consome-o".
    Precisamos de saber se o anfitrião o pode reemitir (rodar token) e se o reenvio por
    email (`POST .../invitations/{id}/resend`) mantém ou gera novo link.
  - Se o link puder expirar, devolver `expires_at`.
- Se for um endpoint `POST` a criar o token, exigir `X-CSRF-Token` (como nos restantes
  `POST` do host); um `GET` de leitura não precisa de CSRF.
- Não incluir telefones/emails de convidados em logs.
- Documentar no OpenAPI (`conto-contigo-api.json`) com exemplos e códigos de erro
  (`401 host_session_invalid`, `403 csrf_invalid` quando aplicável,
  `404 invitation_not_found` / `event_not_found`, `409` para convite revogado).

## Casos-limite a cobrir

- Convite revogado (`revoke`) → link deve devolver `404` no público e idealmente não ser
  exposto (ou ser marcado como inválido).
- Convite reenviado → o link mantém-se ou é novo?
- Evento em `draft`/`scheduled` → o link é válido? (o público hoje já trata o estado).
- Convidado sem telefone → irrelevante para o backend (o frontend desativa o botão).
- Evento cancelado → o público mostra o estado cancelado; confirmar comportamento.

## Critérios de aceitação

1. `GET /api/v1/host/events/{eventId}/invitations` (ou o endpoint novo) devolve, para cada
   convite, um URL/token utilizável no `wa.me`.
2. O link abre `GET /api/v1/public/invitations/{token}` e apresenta o convite correto.
3. Sem acesso: um anfitrião não obtém links de eventos de outra conta.
4. Contrato documentado no `conto-contigo-api.json` (schemas + exemplos + erros).

## O que o frontend precisa de saber para fechar a integração

- Nome exato do(s) campo(s) e se é URL absoluto ou token.
- Se o token é de uso único/reclamável e como reemitir.
- Se há expiração e o respetivo campo.
- Se o URL deve apontar para a rota pública da API ou para uma rota do frontend
  (ex.: `/convite/{token}`).

> Enquanto isto não existir, o frontend mantém um `TODO(backend)` e envia o texto do
> WhatsApp sem link.
