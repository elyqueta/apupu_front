# Relatório — Bloco 4 (Convite público)

**Data:** 2026-11-20

**Branches:** `feat/bloco-4-convite-publico` em `apupu_front/` e `apupu_back/`.

**Origem:** frontend a partir de `feat/bloco-3-detalhe-evento`; backend a partir de `feat/bloco-2-equipas-gestores` (não existe Bloco 3 backend).

**Push / merge / rebase / eliminação de branch:** nenhum. O merge será feito pelo autor.

## Critérios de aceitação

| Critério | Estado | Evidência |
|---|---|---|
| `endsAt` e `rsvpDeadline` mapeados de ponta a ponta e visíveis no convite | ✔ | `CreateEventInput.endsAt`, `HostEvent.endsAt` e campo “Hora de fim” no wizard; `mapPublicInvitation()` expõe `event.endsAt`/`event.rsvpDeadline`; `invitation-key-info.component.ts` mostra início, fim e “Responder até”. |
| Título, anfitrião, data/hora e prazo visíveis sem abrir nada; resto em modais | ✔ | `invitation-hero` + `invitation-key-info` sempre renderizados; localização, anfitrião, detalhes e resposta em `parts/*dialog.component.ts`. |
| Localização com “Copiar endereço” e “Abrir no Google Maps” por link | ✔ | `invitation-location-dialog.component.ts`: URL `google.com/maps/search/?api=1&query=…`, `target="_blank"`, sem SDK/chave; `ShareService.copy` para o endereço. |
| Modal do anfitrião com WhatsApp (quando há telefone) e e-mail | ✔ | `invitation-host-dialog.component.ts` usa `ShareService.whatsappUrl()` e `mailto:`; avatar com iniciais por omissão. |
| Mensagem opcional ao responder, guardada e visível ao anfitrião | ✔ | `PUT …/rsvp` aceita `{ status, message }` (texto simples, máx. 500, `null` limpa); `invitation.guest.message` mapeado e mostrado como primeira linha do `app-person-card` em `/convidados`, detalhe do evento e painel do gestor. |
| Convites expiram por defeito 1 dia após o fim do evento, com mensagem genérica | ✔ | `invitations.link_expires_at` com backfill reversível; `guestAuth` devolve sempre `404 invitation_not_found` / `Convite não encontrado.`; a página usa apenas `invitation.inactiveText`. |
| Nenhum texto abaixo de 12 px; alvos ≥ 44 px | ✔ | Sem `text-[9px]`/`text-[10px]`/`text-[11px]` em `invitation/` nem no `app-modal`; botões com `h-11`, `h-12` ou `size-11`. |
| `invitation.page.html` com menos de 250 linhas e composto por `parts/` | ✔ | **148 linhas**; o maior componente em `parts/` tem 220 linhas. |
| `build`, `lint`, `test` verdes; `REPORT-BLOCO-4.md` escrito | ✔ | Ver “Validação” e este ficheiro. |

## Commits do bloco

### `apupu_front/` (`feat/bloco-4-convite-publico`)

- `9e7cab0` `docs: map bloco 4 public invitation decisions` (mapeamento prévio, na branch de origem)
- `5cf7157` `feat(invitation): mapeia prazos, contacto e mensagem do convidado`
- `99fe812` `feat(invitation): reorganiza convite em secções e modais`
- `d8cf5c1` `test(invitation): cobre mapeamento, RSVP e convite inativo`
- `914ebde` `feat(guests): mostra a mensagem do convidado nas listas`

### `apupu_back/` (`feat/bloco-4-convite-publico`)

- `649720f` `feat(back): allow guests to leave an RSVP message`
- `5bbfda7` `feat(back): expire public invitation links`
- `d2a8a82` `feat(back): expose safe host contact on public invitations`
- `509de04` `docs(back): record Bloco 4 invitation decisions`

## Estrutura da página

| Ficheiro | Linhas | Responsabilidade |
|---|---:|---|
| `invitation.page.html` | 148 | Casca: carregamento, convite, estado inativo e composição dos componentes. |
| `parts/invitation-hero.component.ts` | 110 | Capa/lightbox, título, tipo, anfitrião, contagem de dias e estado. |
| `parts/invitation-key-info.component.ts` | 136 | Quem convidou, quando (início/fim), onde e prazo com tom de aviso. |
| `parts/invitation-rsvp.component.ts` | 220 | Cartão no desktop, barra fixa em mobile, estado da resposta e `aria-live="polite"`. |
| `parts/invitation-details-menu.component.ts` | 32 | Entrada “Mais detalhes”. |
| `parts/invitation-location-dialog.component.ts` | 111 | Endereço, cópia, Google Maps e evento online. |
| `parts/invitation-host-dialog.component.ts` | 78 | Avatar, nome, WhatsApp e e-mail. |
| `parts/invitation-details-dialog.component.ts` | 132 | Mensagem, regras, vestuário, contribuição, lembretes e privacidade. |
| `parts/invitation-rsvp-dialog.component.ts` | 128 | Confirmação com textarea de 500 caracteres e contador. |

## Validação

| Repositório | Comando | Resultado |
|---|---|---|
| `apupu_front` | `npm run build` | Sucesso (browser + server bundles). |
| `apupu_front` | `npm test -- --watch=false` | 28 ficheiros, **132 testes** passados. |
| `apupu_front` | `npm run lint` | **0 erros**, 24 avisos legados pré-existentes. |
| `apupu_front` | `npx tsc --noEmit -p tsconfig.app.json` | Sem erros. |
| `apupu_back` | `npm run typecheck` | Sem erros. |
| `apupu_back` | `npm run lint` | Sem erros. |
| `apupu_back` | `npm run build` | Sucesso. |
| `apupu_back` | `npm test` | 273 passados / 89 skipped (sem regressão). |
| `apupu_back` | `npm run test:teams` | 108 testes de API, 21 de migração `up`, 5 de rollback — todos verdes. |

Os testes novos do frontend cobrem o mapeamento dos prazos/contacto/mensagem, o corpo do RSVP com mensagem truncada e nula, a resposta já dada e a mensagem única para links inválidos/expirados/revogados. Os testes do backend cobrem a mensagem, a expiração e a resposta genérica.

## Notas

- Todo o texto novo está em `pt-AO` e `en` em `core/i18n/translations.ts`; não foram adicionadas dependências nem segredos.
- Nenhuma alteração de esquema foi necessária para `ends_at`: o backend já aceitava e devolvia o campo.
- As decisões finais estão em `docs/DECISIONS.md`; as observações (incluindo a ausência da ação de contacto em link inativo) em `docs/BLOCKERS.md`.
- Recomenda-se confirmar manualmente em 360 px, com tema claro e escuro, os alvos de toque, o bottom sheet dos modais e o estado inativo antes do merge.
