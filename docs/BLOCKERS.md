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
