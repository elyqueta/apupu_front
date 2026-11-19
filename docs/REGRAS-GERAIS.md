# Regras gerais de execução (ler antes de qualquer bloco)

Estes blocos foram desenhados para serem executados **sem supervisão**. O autor está a dormir: não há ninguém para responder a perguntas. Por isso, cada decisão já está tomada nos ficheiros. Se algo faltar, segue as regras de "Quando tens dúvidas" mais abaixo.

## 1. Ordem e dependências

| Ordem | Ficheiro | Depende de |
|---|---|---|
| 1 | `BLOCO-1-FUNDACOES.md` | — |
| 2 | `BLOCO-2-EQUIPAS-E-GESTORES.md` | Bloco 1 |
| 3 | `BLOCO-3-DETALHE-DO-EVENTO.md` | Blocos 1 e 2 |
| 4 | `BLOCO-4-CONVITE-PUBLICO.md` | Bloco 1 |

- Faz **um bloco de cada vez, pela ordem**. Só começas o seguinte se o anterior estiver terminado e verde (secção 5).
- Se um bloco ficar bloqueado, regista em `docs/BLOCKERS.md` e **passa ao bloco seguinte apenas se ele não depender do bloqueado** (ver tabela). Caso contrário, pára e escreve o relatório final.
- Antes de começares, lê `docs/AUDIT.md`. É a fonte de verdade sobre o estado atual do código. Os caminhos e números de linha das especificações vêm dessa auditoria e **podem estar desatualizados**: confirma sempre no código real antes de editar.

## 2. Git

1. Corre `git status`. Se a árvore de trabalho tiver alterações por commitar, faz um único commit `chore: snapshot antes do bloco N` (nunca incluas `.env`, chaves, tokens, `dist/`, `node_modules/`; confirma o `.gitignore`).
2. Cria uma branch por bloco a partir da branch atual: `feat/bloco-1-fundacoes`, `feat/bloco-2-equipas-gestores`, etc. O bloco seguinte parte da branch do anterior.
3. **Commits pequenos**, um por passo numerado, com mensagem em inglês no formato `feat(scope): descrição` / `refactor` / `fix` / `chore`.
4. **Nunca** faças push, merge, rebase, `git reset --hard`, nem apagues branches. O autor faz o merge de manhã.

## 3. Convenções do projeto

- Código, nomes de ficheiros, variáveis, endpoints e colunas da BD: **inglês**. Textos para o utilizador: **português de Angola (`pt-AO`)** com tradução em inglês (`en`) em `apupu_front/src/app/core/i18n/translations.ts`. Nenhum texto visível fica hardcoded em templates.
- Frontend: Angular 22 standalone, signals, `@if`/`@for`, formulários reativos com `NonNullableFormBuilder`, Tailwind v4 com os tokens existentes (`apupu_front/src/styles.css`, `src/styles/brand-tokens.css`). **Não cries cores nem espaçamentos novos**: usa os tokens (`bg-surface`, `border-line`, `text-ink`, `text-muted`, `text-brand`, `shadow-card`, `rounded-2xl/4xl`).
- Tem de funcionar em claro e escuro (classe `dark` no `<html>`) e em mobile (320 px) até desktop.
- Alvos de toque com pelo menos 44 px. Texto nunca abaixo de 12 px. Todo o controlo com `aria-label` quando só tem ícone.
- Backend: segue os padrões existentes em `apupu_back/src` (rotas em `routes/v1`, serviços em `services`, repositórios em `repositories`, schemas em `schemas`, migrações em `migrations`). Toda a entrada validada por schema. Nenhuma query com concatenação de strings.
- **Nunca** copies segredos para código, logs, commits ou documentos. Só nomes de variáveis.
- Não instales dependências novas, exceto as que o bloco pedir explicitamente.
- Não alteres o que o bloco não pede. Se vires dívida técnica fora do âmbito, regista em `docs/BLOCKERS.md` na secção "Observações" e continua.

## 4. Quando tens dúvidas (ninguém responde)

1. Procura a resposta em `docs/AUDIT.md`, nos outros blocos e no código.
2. Se continuar ambíguo, escolhe a opção **mais simples e mais segura**, que não destrua dados, e anota a decisão em `docs/DECISIONS.md` (data, bloco, dúvida, escolha, motivo).
3. Se a decisão for **irreversível ou destrutiva** (apagar dados, alterar dados de produção, remover endpoint em uso), **não a tomes**: regista em `docs/BLOCKERS.md` e salta esse passo.
4. Nunca inventes dados, endpoints ou campos. Se não existir, regista.

Formato de `docs/BLOCKERS.md`: título do bloco, passo, o que bloqueou, o que tentaste, o que falta decidir.

## 5. Definição de "verde" (obrigatória no fim de cada passo que toque código, e no fim do bloco)

Dentro de `apupu_front/`:
- `npm run build` termina com exit 0.
- `npm test` não regride (compara com o estado antes do bloco; se já havia falhas, regista-as e não as piores).
- Depois do Bloco 1: `npm run lint` com 0 **erros**.

Dentro de `apupu_back/`: corre os scripts de `build`, `typecheck` e `test` que existirem em `package.json` (descobre-os; não inventes). Migrações novas têm de ser **reversíveis** (`down`) e idempotentes.

Se um passo deixar o build vermelho e não conseguires corrigir em 3 tentativas, faz `git stash`/`git checkout` desse passo, regista em `docs/BLOCKERS.md` e continua com o próximo passo independente.

## 6. Qualidade mínima de UI (vale para todos os blocos)

- Estados obrigatórios em cada ecrã novo ou alterado: a carregar (`app-skeleton`), vazio (mensagem + ação), erro (mensagem + tentar de novo), sucesso (toast).
- Mensagens de erro de rede ou servidor **nunca** mostram detalhes técnicos.
- Ações destrutivas pedem sempre confirmação com `app-confirm-dialog` (nunca `window.confirm`).
- Tudo o que adiciona, edita ou convida abre em **modal** (`app-modal`, que é bottom sheet em mobile). A única exceção de produto é o convite público, que é uma tela.
- Padrões de referência (UX familiar para utilizadores leigos): lista de cards com menu de três pontinhos (como Notion/Google Drive), botão principal sempre visível, botão "Voltar" claro em ecrãs de detalhe.

## 7. Entregáveis finais de cada bloco

1. Todos os critérios de aceitação do bloco marcados em `docs/REPORT-BLOCO-N.md` (com ✔ ou ✘ e evidência: ficheiro ou comando).
2. Lista dos commits do bloco.
3. Resultado de `build`/`test`/`lint`/`typecheck`.
4. Lista de decisões tomadas (`docs/DECISIONS.md`) e bloqueios (`docs/BLOCKERS.md`).
5. No fim de **todos** os blocos: `docs/REPORT-FINAL.md` com um resumo de 20 linhas, para o autor ler de manhã, e a lista exata do que testar manualmente.
