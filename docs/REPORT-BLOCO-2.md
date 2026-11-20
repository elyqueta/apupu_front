# Relatório — Bloco 2 (Equipas e gestores)

**Data:** 2026-11-20  
**Branches:** `feat/bloco-2-equipas-gestores` em `apupu_front/` e `apupu_back/`.  
**Push / merge / rebase:** nenhum. Cada bloco seguinte parte do branch do bloco anterior; o merge será feito pelo autor.

## Critérios de aceitação

| Critério | Estado | Evidência |
|---|---|---|
| Migrações reversíveis; nenhum gestor sem equipa após migrar | ✔ | `01e8f31` cria `team_id`, backfills equipas e só depois aplica `NOT NULL`; `scripts/test-teams.sh` valida `up` e `down 5`; invariante verificada com `SELECT count(*) FROM event_managers WHERE team_id IS NULL;` → `0` na BD de teste do fixture. |
| Não é possível criar gestor sem equipa por nenhuma rota nem ecrã | ✔ | `POST /host/events/{id}/managers` cria equipa + gestor na mesma transação; os Passos 5 e 8 usam apenas `app-team-manager-dialog`. |
| Todas as falhas de acesso devolvem exatamente a mesma resposta | ✔ | `manageAccess.service.ts` usa `403` + `access_denied` + `Não foi possível aceder.`; testes de migração/integração cobrem código certo/errado, link expirado/revogado/bloqueado/legado, 5 e 15 falhas; `management-entry.page.spec.ts` confirma o mesmo texto no cliente para formato inválido, 403 e 500. |
| O código só aparece na resposta de criação/regeneração | ✔ | HMAC com `TOKEN_PEPPER` + id do gestor; testes e revisão confirmam ausência de texto em claro em logs, notificações e BD. A UI mostra `XXX-XXX` uma vez em `app-manager-credentials-dialog`. |
| Validade: 7 dias por defeito; máximo fim do evento + 1 dia; alterar validade funciona | ✔ | Serviço e schemas validam o máximo no backend; o modal partilhado oferece 7 dias / até ao fim do evento / personalizada, e o detalhe da equipa permite alterar a validade com a data máxima indicada. |
| Criar conta sem OTP só com sessão de gestão válida e o mesmo contacto; atalho antigo apertado | ✔ | `POST /host/manager/register/request-code` exige `managerSessionAuth` + CSRF + mesmo email; `auth.page.ts` usa `?gestor=1` com email só de leitura; atalho de convidado exige `claimed_at`, não revogado e evento com menos de 30 dias. |
| Modal de criação com gestor + modal de código com copiar e WhatsApp | ✔ | `team-manager-dialog.component.ts` e `manager-credentials-dialog.component.ts`; respetivos testes cobrem normalização `ABC123` → `ABC-123`, cópia e `wa.me` com número normalizado. |
| Nenhum formulário de adicionar/editar/convidar fora de modal nas páginas de equipas e detalhe de equipa | ✔ | Revisão de `team.page.html`, `team-detail.page.html` e `event-detail.page.html`; formulário inline de gestor removido do detalhe do evento em favor do modal partilhado. |
| Filtro "Só as minhas tarefas" funcional | ✔ | `team-detail.page.ts` envia `personal` ao repositório de tarefas; alternância no separador Tarefas. |
| `build`, `lint`, `test` (front) e `build`/`typecheck`/`test` (back) verdes | ✔ | Ver tabela de comandos abaixo. |
| `docs/REPORT-BLOCO-2.md` escrito | ✔ | Este ficheiro. |

## Commits do bloco

### `apupu_front/` (branch `feat/bloco-2-equipas-gestores`)

- `126cfc8` `feat(api): add team and manager contracts`
- `0a24b1c` `feat(teams): add shared manager credential dialogs`
- `3c25ff7` `feat(teams): rebuild team pages around managers`
- `3c6fb29` `feat(management): add code access and account shortcut`

### `apupu_back/` (branch `feat/bloco-2-equipas-gestores`)

- `01e8f31` `feat(migrations): link event managers to teams`
- `1485a81` `feat(back): add team manager access codes and account shortcut`
- `0035d73` `feat(back): accept team category and description in manager creation`

## Resultado dos comandos

| Repositório | Comando | Resultado |
|---|---|---|
| `apupu_front` | `npm run build` | exit 0; bundle gerado em `dist/conta_comigo_front` |
| `apupu_front` | `npm test -- --watch=false` | 23 ficheiros / 120 testes, 0 falhas |
| `apupu_front` | `npm run lint` | 0 erros, 24 avisos legados |
| `apupu_back` | `npm run build` | exit 0 |
| `apupu_back` | `npm run typecheck` | exit 0 |
| `apupu_back` | `npm test` | 264 passaram / 87 skipped |
| `apupu_back` | `npm run test:teams` | 107 + 20 + 5 testes, 0 falhas |

## Decisões e bloqueios

- Decisões: `docs/DECISIONS.md` (secção Bloco 2, inclui as escolhas específicas do frontend).
- Bloqueios: nenhum; observações em `docs/BLOCKERS.md`.

## Testes manuais recomendados antes do merge

1. Criar uma equipa com gestor em `/equipas`; confirmar que o segundo modal mostra link e `XXX-XXX`, que copiar funciona e que o WhatsApp abre a conversa com o número normalizado.
2. Abrir o detalhe da equipa e verificar validade, regeneração, revogação, promoção/despromoção e remoção com reatribuição em 320 px e clamp/escuro.
3. Abrir um link `/gerir/:token` antigo e introduzir o código em minúsculas com espaço/hífen; confirmar erro único em falhas e acesso com sucesso quando o código é válido.
4. Como gestor sem conta, confirmar a faixa e o botão "Criar conta" na gestão e que o atalho pré-preenche e bloqueia o email.
5. Como gestor sem conta, confirmar que o modal "Crie a sua conta" abre a partir da faixa e do botão do cabeçalho e que "Continuar sem conta" mantém a gestão limitada.
