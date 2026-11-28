# Relatório final — Blocos 1 a 4

**Data:** 2026-11-20. **Estado:** implementação concluída; branches locais, sem push, merge, rebase ou eliminação.

## Resumo (para leitura da manhã)

1. Bloco 1 — `app-modal` com bottom sheet/foco/Escape, `app-stat-grid`, `app-person-card`, pesquisa global e 113 testes verdes em `feat/bloco-1-fundacoes`.
2. Bloco 2 — equipas, gestores, códigos de acesso, validade de links e atalho de conta; migrações reversíveis testadas em `feat/bloco-2-equipas-gestores`.
3. Bloco 3 — detalhe do anfitrião e do gestor unificado em secções partilhadas, permissões centralizadas, separadores na URL e correções de navegação/layout em `feat/bloco-3-detalhe-evento`.
4. Bloco 4 — convite público reorganizado em 148 linhas + `parts/`, com prazos, contacto seguro, mensagem do convidado, expiração de links e estado inativo genérico em `feat/bloco-4-convite-publico`.
5. O backend acompanha os blocos 1, 2 e 4; não existe Bloco 3 backend, pelo que `feat/bloco-4-convite-publico` parte de `feat/bloco-2-equipas-gestores`.
6. Frontend: `npm run build`, `npm test -- --watch=false` (28 ficheiros / 132 testes), `npm run lint` (0 erros, 24 avisos legados) e `tsc --noEmit` verdes.
7. Backend: `typecheck`, `lint`, `build`, `npm test` (273 passados / 89 skipped) e `test:teams` (108 API + 21 migração + 5 rollback) verdes.
8. Nenhuma dependência ou segredo acrescentado; texto novo sempre em `pt-AO` e `en` em `translations.ts`.
9. Decisões em `docs/DECISIONS.md`; observações e limitações em `docs/BLOCKERS.md`; detalhes por bloco em `docs/REPORT-BLOCO-{1,2,3,4}.md`.
10. A ordem de merge sugerida é a dos blocos, primeiro backend e depois frontend de cada bloco; a execução desses merges fica para o autor.

## O que testar manualmente antes do merge

1. **Bloco 1:** abrir `/convidados` em 320 px; confirmar cards sem overflow, pesquisa com sugestões ao focar, paginação de 10 e nenhum `window.confirm`.
2. **Bloco 1:** abrir um menu de três pontinhos em desktop e em mobile; verificar setas, Enter, Escape, clique fora e folha inferior com foco devolvido.
3. **Bloco 2:** criar equipa + gestor; confirmar o segundo modal com link e código `XXX-XXX`, cópia e WhatsApp com número normalizado.
4. **Bloco 2:** abrir link `/gerir/:token` com código em minúsculas/espaços/hífen; confirmar erro idêntico em código errado, link expirado/revogado/bloqueado e erro 500.
5. **Bloco 2:** como gestor sem conta, confirmar faixa/CTA e que “Criar conta” pré-preenche e bloqueia o email.
6. **Bloco 3:** em `/eventos/:id` e `/gestao/evento/:id`, percorrer os separadores em 390/976/1440 px; confirmar `?separador=` no URL, recarga no separador certo, scroll lateral sem barra feia e botão “Voltar” sempre visível.
7. **Bloco 3:** confirmar que o gestor não vê exportações, equipas/gestores, cancelamento nem ações de escrita em tarefas/atividade.
8. **Bloco 4:** criar/editar um evento com “Hora de fim” posterior ao início e com prazo de resposta; abrir o convite e confirmar título, anfitrião, data/hora, fim e “Responder até” sem abrir nada.
9. **Bloco 4:** em 360 px, tocar “Quem convidou”, “Onde” e “Mais detalhes”; confirmar bottom sheet, Escape, clique fora, foco devolvido, contactos do anfitrião, cópia de endereço e link do Google Maps.
10. **Bloco 4:** responder “Vou” com mensagem de 500 caracteres; confirmar contador, estado “Já confirmou presença”, possibilidade de alterar e mensagem truncada na lista de convidados do anfitrião.
11. **Bloco 4:** limpar a mensagem e voltar a responder; confirmar que a mensagem anterior desaparece no convite e na lista.
12. **Bloco 4:** abrir um link inválido, um expirado e um revogado; confirmar em todos exatamente “Este convite já não está ativo.”, sem motivo, sem contacto e com “Tentar de novo”.
13. **Bloco 4:** verificar tema claro/escuro e que nenhum texto do convite fica abaixo de 12 px nem nenhum alvo de toque abaixo de 44 px.


## Bloco 15 — Templates, Gratitude, feed e eventos passados (em curso)

**Branch:** `feat/bloco-15-templates` (front e back). **Data:** 2026-11-25. **Estado:** Passo 1 implementado e verificação automatizada verde; Passos 2–9 em progresso.

- Passo 1: estado efetivo `completed/Terminado` (derivado + job 15 min), ordenação ativos→passados→cancelados, catálogo local de fontes PDF embutidas, QR estilizado, template sistema Gratitude (`kind=system`), correção UX `/templates` (modal preview, grelha estável, filtros).
- Verificação: front `build/lint(0 erros)/test(57/241)/tsc` verdes; back `build/typecheck/lint(0 erros)/test(43 passed,6 skipped;404/89)` verdes; `bloco14.pdf.test.ts` inclui 3 fontes embutidas.
- Pendências: validação visual manual Gratitude/PDF, migração up/down em DB de teste dedicada, relatório detalhado em `docs/REPORT-BLOCO-15.md`.
- Sem push, merge, rebase ou eliminação de branches.

## Bloco 16 — Convite do template (concluído)

**Branch:** `feat/bloco-16-convite-template` (front e back). **Data:** 2026-11-28. **Estado:** 10 passos implementados; ver `docs/REPORT-BLOCO-16.md`.

- Convite tematizado pelo manifesto (`--inv-*`, contraste ≥ 4,5:1), sem logótipo nem alternador de tema; capa com a arte do template; FAB com folha de informações em `invitation.page` e no link público.
- QR digital e PDF com o símbolo da plataforma (área ≈ 3,2%, ECC H); estrela antiga removida e causa registada.
- Várias localizações por evento (uma principal, máx. 5) com migração reversível, espelho da principal nas colunas legadas, `maps_url`, PDF/e-mails/feed coerentes e seletor MapLibre/OpenFreeMap lazy.
- Subtítulo do Gratitude passou a campo editável e persistido, com fallback da derivação antiga.
- Verificação: front `build` (sem aviso CommonJS), `lint` 0 erros, `tsc`, `e2e:typecheck`, 304/304 testes em lotes; back `build`, `typecheck`, `lint` 0 erros, 485 passed/89 skipped, migrações `up → down → up` verdes.
- Sem push, merge ou rebase. Bloqueios restantes em `docs/BLOCKERS.md`.
