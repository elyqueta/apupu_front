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
