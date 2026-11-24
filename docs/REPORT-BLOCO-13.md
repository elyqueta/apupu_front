# Relatório — Bloco 13 (instituições)

Branch `feat/bloco-13-instituicoes` (front e back). Sem push/merge/rebase. 24/11/2026.

## Critérios de aceitação

| Critério | Estado | Evidência |
|---|---|---|
| Instituição agrupa comunidades; uma comunidade só pertence a uma. | ✔ | Migração `032_institutions` (`institutions`, `communities.institution_id`, `institution_community_requests`). Erro `community_has_institution`. |
| Nenhuma comunidade é ligada ou removida sem OTP do criador. | ✔ | `approve` envia o código e passa a `awaiting_otp`; `confirm` liga/desliga numa transação. `tests/bloco13.test.ts` (10 testes: permissões, OTP inválido não liga, remover também exige OTP). |
| Convidar comunidade e pedir associação. | ✔ | Criador convida (a comunidade aceita em `/instituicoes`, "Convites de instituições"); responsável pede a partir do detalhe ("Associar uma comunidade minha"). |
| Página `/instituicoes/:slug` com capa + avatar, comunidades, eventos agregados. | ✔ | `institution-detail.page` com pedidos (criador), comunidades (remover com OTP / sair sem OTP), próximos eventos públicos, apagar com confirmação do nome. Spec com 3 testes (visitante, criador → modal OTP, 404). |
| "Instituições" no menu; criar/editar em modal. | ✔ | Item com ícone `bank` no menu lateral; `institution-form-dialog` (ações no fim do formulário). |
| Instituição no perfil da comunidade. | ✔ | Chip "Faz parte de …" no detalhe autenticado da comunidade. Página pública `/comunidade/:slug` ainda não (ver DECISIONS). |
| Feed: instituições públicas no separador "Comunidades". | ✔ | Back devolve até 6 cartões `type: 'institution'` na primeira página; front `app-feed-institution-card`. Smoke curl: `['institution','community']`. |

## Verificação

| Comando | Resultado |
|---|---|
| back `npm run build` | OK |
| back `npm run lint` | 0 erros (37 avisos, sobretudo "missing return type") |
| back `npm test` | 378 passaram, 89 ignorados (integração sem BD de teste) |
| front `ng build` | OK (com `--max-old-space-size=1200`: a máquina tem pouca RAM livre) |
| front `ng lint` | 0 erros, 24 avisos |
| front `ng test` | 56 ficheiros, 237 testes passaram |
| front `tsc --noEmit` | OK |

Não verificado no browser nesta sessão (o painel não tinha sessão iniciada). Ver testes manuais abaixo.

## Testes manuais

1. `/instituicoes` → "Nova instituição" → criar pública; abre o detalhe.
2. No detalhe: "Convidar comunidade" → escolher uma comunidade pública de outra conta; essa conta vê o convite em `/instituicoes` e aceita.
3. O criador vê o pedido → "Aprovar com código" → recebe o email → introduz o código → a comunidade aparece na lista.
4. Código errado mostra "Código inválido ou expirado." e nada muda.
5. "Remover da instituição" pede código; "Sair da instituição" (responsável) não pede.
6. O feed (`/`, separador Comunidades) mostra o cartão da instituição.
7. 320 px, claro e escuro: cartões com o mesmo tamanho; modais com ações no fim.

## Dados de teste deixados na BD local

"Instituição Teste Bloco 13" (`instituicao-teste-bloco-13`) com um pedido pendente da "Comunidade Teste Bloco 11".
