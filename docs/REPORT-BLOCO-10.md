# Relatório — Bloco 10 (visibilidade, link aberto, idade, copiar links, apagar evento)

Branch `feat/bloco-10-visibilidade` (front e back). Sem push/merge/rebase. Execução de 23 a 24/11/2026.

## Critérios de aceitação

| Critério | Estado | Evidência |
|---|---|---|
| Eventos antigos continuam privados; perfis antigos privados. | ✔ | Migração `1739900000028_event-visibility-age.js`: `events.visibility DEFAULT 'private'`, `hosts.profile_visibility DEFAULT 'private'`. Teste `createEventSchema` → `private` por defeito (`tests/bloco10.test.ts`). Verificado na BD local: evento existente ficou `private`. |
| Link público confirma com nome + contacto, sem duplicados, com rate limit. | ✔ | `POST /public/events/:slug/rsvp` (`publicEvent.service.ts`). Teste manual (curl, base local): sem contacto → 422 `contact`; mesmo telefone com `+244`/espaços atualiza a mesma linha (1 linha no fim); honeypot `website` responde sucesso sem gravar. Limites: `publicTokenLimiter` + `rsvpLimiter` (IP+slug) + `publicEventRsvpEventLimiter` (por evento). Índices únicos parciais por email/telefone. |
| Recusa por idade devolve sempre a mesma resposta; limites nunca expostos. | ✔ | 12 e 99 anos → `403 public_rsvp_refused` com a mesma mensagem (curl e `tests/bloco10.test.ts`). `GET /public/events/:slug` só tem `has_age_restriction`; teste do DTO garante ausência de `min_age`/`max_age`. Front: `public-event.page.spec.ts`. |
| Alteração de data de nascimento que passa a cumprir limites marca a confirmação e notifica organizadores. | ✔ | `host_birth_date_changes` gravado em `profile.service.update`; `age_flag`/`age_flag_reason='birth_date_changed'` na confirmação; atividade `rsvp_accepted` com `metadata.age_flag` → notificação "Confirmação a rever: idade alterada" ao anfitrião e gestores. Teste em `tests/bloco10.test.ts`. Selo "Idade alterada" no `app-person-card`. |
| Perfil privado nunca aparece em pesquisas (testes negativos). | ✔ | `hostRepository.searchPublicProfiles` filtra sempre `profile_visibility = 'public'`; teste negativo no SQL. Interruptor "Perfil público" no perfil (testado no browser: ligar/desligar). Não existia pesquisa de perfis para utilizadores; ver DECISIONS. |
| Botão copiar presente em todos os pontos com WhatsApp. | ✔ | Cartões de convidado (`/convidados` e detalhe do evento): botão "Copiar" 44 px ao lado de "WhatsApp" (`LinkCopyService`, toast, fallback `execCommand` em `ShareService.copy`). Link aberto do evento: `app-public-link-card` com "Copiar link" + "Reencaminhar por WhatsApp". Link/código de gestor: já tinha "Copiar" (`manager-credentials-dialog`). Partilha do convite: já tinha copiar. Os botões de WhatsApp para contactar o anfitrião não reencaminham links e ficam como estão. |
| Apagar evento com confirmados exige o nome; testes de permissão. | ✔ | `DELETE /host/events/:id` com `{ confirm_name }`; soft delete (`deleted_at`) e só o criador (`findByIdForHost`); gestor/outra conta → 404. Testes em `tests/bloco10.test.ts` e `delete-event-dialog.component.spec.ts`. Browser: botão desativado com nome vazio ou com maiúsculas diferentes, ativo com o nome exato; depois de apagar, o link aberto e o evento dão 404. |
| Migração reversível; `build`, `lint`, `test`, `typecheck` verdes; relatório. | ✔ | `migrate up → down → up` OK. Ver tabela abaixo. |

## Passo 5 (frontend)

1. Wizard e modal de edição: `app-event-visibility-fields` (Privado/Público com explicação, "Mostrar o número de confirmados" só em público, idade mínima/máxima `inputmode="numeric"` com validação mín ≤ máx e a nota "Por defeito, qualquer idade pode participar").
2. Rota `/e/:slug` (`PublicEventPage`): reutiliza as `parts/` do convite (capa, info, detalhes, anfitrião, localização); formulário nome + e-mail/telefone (+244, máscara) + idade se houver restrição + mensagem; com conta, dados só de leitura e confirmação num clique; conta sem data de nascimento num evento com restrição vê a mensagem e o atalho para o perfil; o anfitrião vê uma nota em vez do formulário. Ações no fim do formulário, nunca fixas.
3. Perfil: interruptor "Perfil público" com aviso do que passa a ser visível.
4. Cartões de convidado: selo "Idade alterada", origem "Link público" em `meta`, linha de contacto sem "·" a mais quando falta o email.
5. Copiar ao lado de WhatsApp (ver critério).
6. Apagar evento: nova ação "Apagar evento" no menu do evento (só proprietário) com modal "Escreva o nome do evento para confirmar".

Pedido extra do autor durante o bloco: **todos os campos de telefone** aceitam só dígitos, começam por 9, máximo 9, máscara `923 456 789` (`appPhoneMask` reforçada, com validador; `3dd2147`).

## Verificação

| Comando | Resultado |
|---|---|
| back `npm run build` | OK |
| back `npm run typecheck` | OK |
| back `npm run lint` | OK — 0 erros (1 aviso preexistente) |
| back `npm test` | OK — 339 passados, 89 ignorados (428) |
| back `migrate:up → migrate:down → migrate:up` | OK |
| front `npm run build` | OK |
| front `npx tsc --noEmit` | OK |
| front `npm run lint` | OK — 0 erros, 24 avisos preexistentes |
| front `npm test` | OK — 52 ficheiros, 225 testes |
| front `npm run e2e:typecheck` | OK |
| Browser (localhost:4200, conta de teste) | 360×640 e 1440×900 claro: wizard/edição, link aberto, página `/e/:slug` com conta, perfil público, apagar com nome. Os eventos de teste criados foram apagados e o evento existente foi reposto como privado. |

Não verificado: página `/e/:slug` como visitante sem sessão no browser (testada por curl e por testes de componente; não terminei a sessão do utilizador). Playwright e2e continua sem credenciais (`E2E_*`).

## Commits

Front: `9bc0544`, `35ef77a`, `e6c5718` (retificações pedidas antes do bloco), `af5d1e7`, `3dd2147`, `11fbd48`, `039d40b`, `1f32ef9`, `aa43c6e`.
Back: `fb614ca`, `a18693d`, `a39f439`.

## Decisões e bloqueios

Decisões em `docs/DECISIONS.md` (secção "Bloco 10"). Sem bloqueios novos.
