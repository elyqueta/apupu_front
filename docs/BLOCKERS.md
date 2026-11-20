# Bloqueios e observações

## Bloco 1 — Fundações

**Bloqueios:** nenhum.

### Observações (fora do âmbito, não bloqueiam)

| Passo / área | Observação | Estado |
|---|---|---|
| Passo 2 — diálogos | O lightbox de imagens não foi migrado para `app-modal` porque não faz parte da lista de diálogos do bloco. Passou a ter *focus trap* e restauração de foco próprios. | Registado; sem ação neste bloco. |
| Qualidade — lint | `npm run lint` termina com **0 erros** e **24 avisos** legados (`@typescript-eslint/array-type`, `label-has-associated-control`, `no-output-native`). O `autofocus` da pesquisa foi removido. | Aceite conforme `REGRAS-GERAIS.md` §5. |
| Backend | A suíte mantém **86 testes skipped** pré-existentes; não foram alterados. | Sem regressão. |
| Pesquisa global | A API HTTP não expõe `AbortSignal`; o cancelamento é feito por sequência de pedidos. | Ver `DECISIONS.md`. |
| Verificação visual | Os critérios de 320 px e claro/escuro foram verificados por revisão de classes Tailwind e tokens; não existe captura automatizada no projeto. | Recomenda-se confirmação manual no resumo final. |

## Bloco 2 — Equipas e gestores

**Bloqueios:** nenhum.

### Observações (fora do âmbito, não bloqueiam)

| Passo / área | Observação | Estado |
|---|---|---|
| Passo 1 — migração | Gestores legados mantêm acesso só com o link até o anfitrião gerar um código; `access_code_hash` fica nulo. | Aceite; a UI destaca a ação "Gerar código de acesso". |
| Passo 3 — compatibilidade | O formato legado `{ emails: [...] }` continua aceite na API de membros; a UI nova usa `{ members: [...] }` com um contacto de cada vez. | Mantido para clients antigos. |
| Passo 4 — contas | Não existe conta só com telefone no modelo atual; um gestor com telefone que queira criar conta introduce um email verificado por OTP. | Registado em `DECISIONS.md`. |
| Passo 6 — importação em lote | Importação em lote de membros e envio automático de WhatsApp não foram implementados. | Fora de âmbito explícito do bloco. |
| Backend | A suíte mantém **87 testes skipped** pré-existentes; as suítes de migração/integração (`test:teams`) correm com 107 + 20 + 5 testes verdes. | Sem regressão. |
| Frontend — lint | `npm run lint` termina com **0 erros** e **24 avisos** legados (`array-type`, `label-has-associated-control`, `no-output-native`, `no-output-native` nos diálogos). | Aceite conforme `REGRAS-GERAIS.md` §5. |
| Frontend — testes | `npm test -- --watch=false`: 23 ficheiros / 120 testes, 0 falhas. Inclui entrada por código, erro genérico idêntico, atalho de conta e partilha de credenciais. | Sem regressão. |
| Verificação visual | Critérios de 320 px e claro/escuro dos novos modais e da gestão verificados por revisão de classes Tailwind e tokens; não existe captura automatizada no projeto. | Recomenda-se confirmação manual no resumo final. |

## Bloco 3 — Detalhe do evento

**Bloqueios:** nenhum bloqueio que impeça o bloco; quatro incertezas de contrato/implementação documentadas abaixo e tratadas de forma conservadora na UI.

| Passo / área | O que bloqueou / observação | O que foi tentado | Estado / decisão |
|---|---|---|---|
| Passo 1 — exportações | `API-CONTRACT.md:575` diz que o gestor pode "consultar … relatórios", mas as rotas de exportação (`hostWorkspace.routes.ts:1282–1287, 1343–1348`) exigem `hostAccountAuth` (cookie de conta); uma sessão só por link receberia 401. | Confirmar middleware das rotas e comparar com a tabela de permissões. | Exportações mantidas só no painel do anfitrião; não expor ação quebrada ao gestor. Ver `DECISIONS.md`. |
| Passo 1 — tarefas e atividade | A tabela de permissões não cobre criar/editar/remover tarefas nem remover atividade. Rotas de tarefas usam `hostAccountAuth`; remover atividade usa `requireEventHost`. | Procurar regra equivalente no contrato e no middleware. | Gestor não vê ações de escrita nestas secções; leitura mantida. |
| Passo 1 — capa do evento | A API permite ao gestor alterar a capa (`host.routes.ts:270–297` sem `requireEventHost`), mas o detalhe do anfitrião esconde esses controlos atrás de `isHost()`. | Comparar os dois painéis e o middleware. | Comportamento visível inalterado no painel do anfitrião; painel do gestor mantém as ações que já tinha. |
| Passo 1 — CTA de conta | Os botões "Criar conta" / "Continuar sem conta" do painel do gestor não constam da tabela de permissões do contrato. | Verificar se são ação de API ou apenas navegação. | São fluxo de sessão do Bloco 2; mantidos sem alteração. |
