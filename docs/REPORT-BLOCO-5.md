# Relatório — Bloco 5: Ajustes pós fase 4 (frontend)

**Data:** 2026-11-20  
**Branch:** `feat/ajustes-fase-4` (sem push, merge, rebase ou eliminação de branches).  
**Documentos de referência:** `docs/PLANO-BLOCO-5.md`, `docs/DECISIONS.md` e `docs/bloco-6-landing-e-super-admin.md`.

## Resumo

O Bloco 5 reorganiza o convite público e as páginas de evento, cria a caixa de entrada de mensagens, bloqueia operações em eventos cancelados e permite remover o avatar do Cloudinary. A Parte E (landing + super admin) foi executada como Bloco 6 e está documentada em `docs/REPORT-BLOCO-6.md`.

## Commits

| Commit | Conteúdo |
|---|---|
| `9f5c610` | Plano do bloco 5 e inventário Cloudinary |
| `f8e966f` | Alinhamento do plano com o bloco 6 e decisões do utilizador |
| `ac3fce1` | Convite: ecrã de boas-vindas com capa, partilha e estado cancelado |
| `6b2580b` | Modais: scroll/footer, safe-area, `dvh` e controlos padronizados |
| `6ee2160` | Chaves i18n dos blocos 5 e 6 em ficheiros próprios |
| `981a9ad` | Rail de evento, caixa de entrada, resposta do anfitrião e estado cancelado |
| `d08a2eb` | Remoção do avatar do perfil |

## O que foi implementado

### Parte A — Convite público
- `invitation-welcome.component.ts`: capa em destaque, sem texto/gradiente por cima, mensagem curta abaixo da imagem e único botão “Ver convite”.
- `invitation-hero.component.ts`: removido o texto sobreposto à capa; a imagem continua ampliável por `aria-label`.
- `invitation-cancelled.component.ts`: evento cancelado mostra apenas “Evento cancelado” e os contactos do anfitrião; nunca mostra boas-vindas nem RSVP.
- `invitation-share.component.ts`: copiar link e partilhar no WhatsApp.
- Testes: capa sem texto, boas-vindas → convite, cancelado sem boas-vindas/RSVP.

### Parte B — Modais e controlos
- `modal.component.ts`: corpo com `min-h-0 flex-1 overflow-y-auto`, `overscroll-contain`, altura com `dvh`, footer `sticky bottom-0` com safe-area e `shrink-0`.
- Botões Guardar/Cancelar migrados para `[modal-footer]` nos diálogos com formulário.
- Utilitários `ui-btn`, `ui-btn-secondary`, `ui-icon-button`, `ui-chip` e `ui-chip-interactive` em `styles.css` (sem novas dependências).
- Filtros de equipa unificados com chips interativos de 44 px.

### Parte C — Layout do evento
- `event-section-shell.component.ts` (novo): conteúdo ao centro + rail direito com secções e ações; em mobile, drawer “Menu do evento” com `aria-expanded`, foco e Escape.
- Integrado em `event-detail.page.html` e `management-event.page.html`: o cabeçalho fica apenas com voltar/contexto/título; separadores e ações passam para o rail; `?separador=` preservado.
- Nova secção `mensagens` em `EVENT_TABS`.
- Testes: cabeçalho sem ações, rail com secções/ações, drawer móvel, ações desativadas ignoradas.

### Parte D — Partilha e acesso do gestor
- Já existia: `manager-credentials-dialog.component.ts` com link + código `XXX-XXX`, mensagem pronta, WhatsApp e cópia; aviso de alternativa menos segura ao e-mail.
- Já existia: formulário de código em `management-entry.page.html` para gestor sem conta (aceita maiúsculas, espaços e hífens).
- `events.repository.ts`: `rotateOwnManagerAccess()` → `POST /host/manager/access-code` (o gestor troca o próprio código numa sessão sem conta) e `updateInvitationLink()` → `PATCH /host/events/:eventId/invitations/:invitationId/link` com `expires_at`.
- `invitation-link-dialog.component.ts` (novo): escolha da validade do link individual do convite, com limite de `fim do evento + 30 dias` e envio como `${data}T23:59:59.000Z`; ligado à ação “Alterar validade” no menu de cada convidado.
- `management-event.page.html`/`.ts`: cartão “Acesso ao evento” no painel do gestor com ação “Alterar código de acesso”; as novas credenciais são mostradas no diálogo existente e há aviso de que o código anterior e as sessões antigas deixam de ser válidos.
- Testes: pedidos PATCH/POST com o corpo esperado e diálogo de validade (emite a data em ISO e bloqueia datas além do limite do backend).

### Parte F — Caixa de entrada
- `messages.repository.ts`: `GET /host/inbox`, `POST /host/inbox/:id/read`, `POST /host/inbox/:id/answer` (contrato final do backend). O filtro por evento é aplicado no cliente porque a API devolve todos os eventos da conta.
- `messages-inbox.component.ts` + `messages.page.ts` + rota `/mensagens` + item “Caixa de entrada” no shell.
- Filtros: texto, lido/não lido, respondido/não respondido, intervalo de datas, paginação; estados de carregar/vazio/erro/sucesso.
- A resposta é guardada no backend e mostrada ao convidado em `invitation-reply.component.ts` (opção b do utilizador); e-mail ao convidado fica a cargo do backend.
- Removido o item “Mensagem: …” dos cards em `guests.page.ts`, `event-detail.page.ts` e `event-guests-section.component.ts`.
- Testes: carga com filtros por defeito, aplicação de filtros, marcar como lida, enviar resposta.

### Parte G — Cloudinary
- `profile.repository.ts`: `removeAvatar()` → `DELETE /host/profile/avatar`, com atualização da cache.
- `workspace.store.ts`: expõe `removeAvatar()`.
- `profile-edit-dialog.component.ts`: botão “Remover foto” quando existe avatar, com erro genérico em pt-PT.

### Parte H — Evento cancelado
- `eventCancelled()` e `effectivePermissions()` em `event-detail.page.ts` e `management-event.page.ts`.
- Banner persistente “Evento cancelado” com `role="status"`.
- Todas as permissões de escrita desativadas; `canExport` mantido para relatórios/leitura.

## Verificação

- `npm run build` — concluído.
- `npx tsc --noEmit` — 0 erros.
- `npm test -- --watch=false` — 36 ficheiros / 161 testes aprovados.
- `npm run lint` — 0 erros; 24 avisos legados (pré-existentes).

## Testes manuais sugeridos

1. Abrir um convite com capa: boas-vindas → “Ver convite” → convite sem texto sobre a imagem; responder com mensagem e confirmar que a resposta do anfitrião aparece no convite.
2. Em 360×640, abrir um diálogo com teclado virtual e confirmar que o footer com “Guardar” continua visível.
3. Em `/eventos/:id` e `/gestao/evento/:id`, percorrer o rail em 390/976/1440 px, confirmar `?separador=mensagens` e que o menu móvel abre/fecha com Escape.
4. Em `/mensagens`, filtrar por não lidas/respondidas e responder a uma mensagem.
5. Num evento cancelado, confirmar banner, ações desativadas e convite público apenas com “Evento cancelado”.
6. Em “Definições → Perfil”, carregar e remover o avatar; confirmar que o asset antigo é apagado no Cloudinary (backend).
7. Num convite, usar “Alterar validade” e confirmar que a data máxima é o fim do evento + 30 dias e que o link volta a funcionar até essa data.
8. No painel do gestor, gerar um novo código e confirmar que o anterior e as sessões antigas deixam de funcionar e que o novo link/código aparecem uma vez.

## Notas

- Nenhuma dependência nova; nenhum segredo acrescentado.
- Texto novo sempre em pt-PT, com variante `en` correspondente.
- Decisões em `docs/DECISIONS.md`; bloqueios e limitações em `docs/BLOCKERS.md`.
