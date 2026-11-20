# Decisões tomadas

## Bloco 1 — Fundações (2026-11-20)

| Data | Dúvida / ponto ambíguo | Escolha | Motivo |
|---|---|---|---|
| 2026-11-19 | Regras de estilo legadas do ESLint geravam centenas de avisos. | Configurar as regras legadas como `warn` e exigir **0 erros**; não fazer reformatação em massa. | O critério do bloco é `lint` com 0 erros. Evita ruído e risco fora do âmbito. |
| 2026-11-19 | `app-modal` não defini explicitamente qual controlo receber o foco. | Focar o primeiro controlo (o botão de fechar no markup atual). | Comportamento previsível e testável; os testes usam `aria-label="Fechar"`. |
| 2026-11-19 | O lightbox de imagens também é um diálogo, mas não estava na lista migrada. | Não o migrar para `app-modal`; reforçar apenas o *focus trap* e a restauração do foco. | A especificação lista os diálogos a migrar; mudar o lightbox ficaria fora do âmbito. Registado em `BLOCKERS.md` como observação. |
| 2026-11-19 | O pedido de conta em `management-entry.page.html` precisava de Escape/backdrop. | Usar `app-modal`; ambos os caminhos chamam `continueWithoutAccount()`. | Mantém o fluxo sem conta e usa o padrão partilhado. |
| 2026-11-19 | A pesquisa `q` de convidados no backend podia interpretar `%`, `_` e `\` como wildcards. | Escapar os carateres num utilitário partilhado (`src/utils/like.util.ts`) e passar sempre parâmetros ligados; incluir `guest_phone`. | Segurança e consistência com o resto da API. |
| 2026-11-19 | A UI usa `confirmed`, mas a API usa `rsvp_status=accepted`. | Converter no repositório com `toApiRsvpStatus()`. | Evita fugas de vocabulário da API para os componentes. |
| 2026-11-19 | Listas de convidados podiam filtrar localmente apenas a página carregada. | Toda a pesquisa, filtro e paginação passou a ser feita no servidor (`GET /host/guests`, 10 por página). | Obligatório na especificação; evita resultados incompletos. |
| 2026-11-19 | Convidados apareciam em tabelas diferentes em várias páginas. | `app-person-card` é o único cartão em `/convidados`, detalhe de evento e dashboard (variante `compact`). | Consistência visual e toque confortável em 320 px. |
| 2026-11-19 | `app-action-menu` não tinha navegação por teclado nem folha mobile. | Setas ↑/↓, Home/End, Escape, fecho por fora e `app-modal size="sm"` quando `matchMedia('(max-width: 767px)')` corresponde. | Aceitação do Passo 6; o popover desktop foi mantido. |
| 2026-11-19 | `crypto.util.test.ts` era intermitente. | Corromper o primeiro caráter da *auth tag* (`parts[1]`) em vez do ciphertext/base64. | O teste passou a detetar alterações sem depender do preenchimento base64. |
| 2026-11-19 | Cabeçalhos repetidos usavam `h2` e marcadores diferentes. | Criar `app-page-header` com `h1`, aplicá-lo nas quatro listas e manter o mesmo visually hidden em mobile. | Hierarquia correta sem alteração notória do aspeto. |
| 2026-11-20 | No iOS/Safari o teclado só abre se `focus()` ocorrer dentro do gesto de toque. | O input mobile existe sempre no DOM; a camada usa a classe `hidden`, e o handler remove a classe e chama `focus()` de forma síncrona via `viewChild`. | Evita `@if`, `setTimeout`/`effect` como única forma de focar. |
| 2026-11-20 | Não existe `AbortSignal` na API HTTP atual. | Cancelar pedidos de pesquisa remota por número de sequência (respostas antigas são ignoradas). | Cumpre "cancelamento do pedido anterior" sem nova dependência nem alteração transversal. |
| 2026-11-20 | Chave das pesquisas recentes por anfitrião. | `apupu.search.recents.<hostId>`, com fallback para email do perfil e depois `anonymous` enquanto a sessão não carrega. | Nunca guarda dados sensíveis, apenas o texto pesquisado. |
| 2026-11-20 | Resultados remotos e locais podiam ter o mesmo `id`. | Agrupar remotos em `remote-guests`/`remote-events` e manter tarefas/páginas locais; os prefixes `desktop-`/`mobile-` evitam colisões de IDs no DOM. | `aria-activedescendant` e `aria-controls` ficam inequívocos com os dois painéis no DOM. |
