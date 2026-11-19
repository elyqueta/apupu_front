# Bloco 1 — Fundações de UI (modal, cards, grelha, lint)

> Lê primeiro `REGRAS-GERAIS.md` e `docs/AUDIT.md`. Branch: `feat/bloco-1-fundacoes`.

## Objetivo

Criar as peças base que todos os outros blocos vão usar, para que a plataforma seja consistente e intuitiva:

1. Um único componente de modal que, em mobile, aparece como **bottom sheet**.
2. Uma grelha de cards de estatísticas igual em todos os painéis (o padrão de 4 cards da página de convidados).
3. Um card de pessoa reutilizável (convidado, membro, gestor) com menu de três pontinhos, para eliminar as tabelas longas.
4. ESLint, para o OpenCode se auto-verificar.

Este bloco **não muda regras de negócio**. Só UI, consistência e ferramentas.

## Passo 1 — ESLint e limpeza mínima

1. Acrescenta `angular-eslint` (única dependência nova permitida neste bloco) com `ng add angular-eslint`, ou configuração manual equivalente (flat config). Cria o script `"lint": "ng lint"` em `apupu_front/package.json`.
2. Regras: recomendadas do Angular/TypeScript. Regras que gerariam centenas de erros em código legado ficam em `warn`, não `error`. Objetivo: `npm run lint` com **0 erros**.
3. Corrige os 3 imports não usados (TS6133) apontados na auditoria: `create-event.page.ts` (`ValidationErrors`), `team-form-dialog.component.ts` (`signal`), `phone-mask.directive.ts` (`input`). Confirma no código se ainda existem.
4. Não reformatar ficheiros em massa.

**Aceitação:** `npm run lint` e `npm run build` com exit 0.

## Passo 2 — `app-modal` (modal em desktop, bottom sheet em mobile)

Cria `apupu_front/src/app/shared/components/modal.component.ts` (standalone, template inline, como os restantes componentes partilhados).

API:
- `open = input.required<boolean>()`
- `title = input<string>()` (cabeçalho fixo com título e botão fechar)
- `size = input<'sm' | 'md' | 'lg'>('md')` (larguras máximas desktop: 24rem, 32rem, 44rem)
- `dismissible = input(true)` (se `false`, não fecha por backdrop nem Escape; usar durante gravação)
- `closed = output<void>()`
- Slots por `ng-content`: corpo (por defeito), `[modal-footer]` (rodapé fixo com ações).

Comportamento obrigatório:
- Desktop (≥ `md`): painel centrado, `rounded-4xl`, `shadow-card`, animação `animate-rise`.
- Mobile (< `md`): painel colado ao fundo, cantos superiores arredondados (`rounded-t-4xl`), largura total, altura máxima `92dvh`, corpo com scroll próprio, rodapé sempre visível, pequena barra de arrasto no topo, respeita `env(safe-area-inset-bottom)`. Sobe de baixo para cima (animação curta, respeitando `prefers-reduced-motion`).
- Backdrop com clique para fechar (se `dismissible`).
- Tecla **Escape** fecha (se `dismissible`).
- **Focus trap**: ao abrir, o foco vai para o primeiro controlo (ou para o painel); Tab/Shift+Tab circulam dentro; ao fechar, devolve o foco ao elemento que abriu.
- Bloqueia o scroll do `body` enquanto aberto (e restaura). Suporta modais empilhados (confirmação sobre modal): contador interno de modais abertos.
- Acessibilidade: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` ligado ao título.
- SSR-safe: nenhum acesso direto a `document`/`window` fora de `isPlatformBrowser`.
- `z-index` coerente com o existente (`z-[100]`), e `app-confirm-dialog` aberto por cima deve ficar acima.

Testes (Vitest): abre/fecha, Escape, backdrop, `dismissible=false`, foco devolvido.

**Aceitação:** componente criado, com testes verdes, e demonstrado em pelo menos um modal migrado (passo 3).

## Passo 3 — Migrar os diálogos existentes para `app-modal`

Migra, sem mudar o comportamento nem os textos:
- `app-confirm-dialog` (continua com a mesma API pública; internamente usa `app-modal` com `size="sm"`).
- `app-guest-dialog`.
- `app-profile-edit-dialog` (`features/profile`).
- `app-team-form-dialog` (`features/team`).
- Prompt de conta inline em `features/host-management/management-entry.page.html` (linhas 10–100 segundo a auditoria).
- `app-image-lightbox` **não** migra (é visualizador de imagem em ecrã inteiro), mas acrescenta-lhe focus trap e devolução do foco.

Substitui os 3 `window.confirm` por `app-confirm-dialog`: `notifications.page.ts` (remover todas), `management-event.page.ts` (remover convidado e remover atividade).

**Aceitação:** `grep -R "window.confirm" apupu_front/src` sem resultados; os modais fecham com Escape; `build` e `test` verdes.

## Passo 4 — `app-stat-grid` e uniformização dos cards de estatísticas

O `app-stat-card` já existe e fica como está. O que difere é a grelha (convidados: `grid-cols-2 xl:grid-cols-4`; dashboard: `sm:grid-cols-2 xl:grid-cols-4`).

1. Cria `shared/components/stat-grid.component.ts` (`app-stat-grid`): contentor `grid grid-cols-2 gap-3 lg:grid-cols-4`, com `ng-content`. Duas colunas desde mobile; quatro a partir de `lg`. Quando houver 3 cards, mantém `grid-cols-2 lg:grid-cols-3`: input `columns = input<3 | 4>(4)`.
2. Aplica-o em: `guests.page.html` (linha 18), `dashboard.page.html` (linha 37), `events.page.html`, `reports.page.html`. O padrão visual do card de convidados é a referência: não alteres o `app-stat-card`. **Prioridade: o painel (`/painel`)**. Depois corre `grep -R "app-stat-card" apupu_front/src` e converte **qualquer outra tela** que ainda tenha cards de estatísticas fora de `app-stat-grid` (incluindo o detalhe do evento e o detalhe da equipa). A regra é: onde há cards de estatísticas, há a grelha de 4 (2 em mobile).
3. Páginas **sem** cards de estatísticas passam a ter uma linha de 4 cards (usando só dados já carregados nas stores, sem novos endpoints):
   - `/equipas`: Equipas, Membros, Tarefas abertas, Tarefas concluídas (somar `memberCount`, `taskCount`, `completedTaskCount` das equipas carregadas; ignorar a paginação, usar o total devolvido pela API se existir, senão marca o valor como "da página atual" no `hint`).
   - `/tarefas`: Total, Pendentes, Concluídas, Atrasadas (calcular a partir da lista; se `dueDate` não existir no modelo legado, usa só 3 cards com `columns=3`).
4. Em estado de carregamento, os cards mostram `app-skeleton variant="cards"`.

**Aceitação:** as 6 páginas usam `app-stat-grid`; em 360 px há 2 colunas; em ≥1024 px há 4.

## Passo 5 — `app-person-card` (substitui cards inline e tabelas longas)

Cria `shared/components/person-card.component.ts`.

Inputs:
- `name` (obrigatório), `avatarUrl?`, `subtitle?` (e-mail ou telefone), `status?` (valor para `app-status-badge`), `meta?: { icon: string; label: string }[]` (linhas curtas, ex. evento, aberto em, respondido em), `actions?: ActionMenuItem[]` (alimenta `app-action-menu`), `primaryAction?: { id: string; label: string; icon?: string; disabled?: boolean; hint?: string }` (botão principal visível, ex. WhatsApp), `highlight?: boolean`.
- Outputs: `actionSelected = output<string>()`, `primaryTriggered = output<string>()`, `cardClicked = output<void>()` (só quando `clickable`).

Aspeto: replicar o card mobile de convidados (`guests.page.html:190–286`): `rounded-2xl border border-line bg-surface p-3.5`, avatar à esquerda, nome em `font-semibold truncate`, subtítulo `text-muted`, badge de estado, linhas `meta` com ícone, e na base o botão principal à esquerda e o menu de 3 pontinhos à direita.

Usos neste bloco:
1. **Convidados** (`guests.page`): remove o layout `md:hidden` + a tabela de 7 colunas. Passa a haver **uma só vista**: grelha de `app-person-card` (`grid gap-3 sm:grid-cols-2 xl:grid-cols-3`). Mantém filtros, pesquisa e paginação. Ações (`view`, `edit`, `remove`, reenviar, WhatsApp) passam para o menu/`primaryAction`; remove os botões soltos.
2. **Detalhe do evento** (`event-detail.page.html`, tabela de 7 colunas): mesma conversão, com **exatamente o mesmo card e a mesma grelha** da página de convidados (o utilizador tem de reconhecer o mesmo card nos dois sítios). A coluna "Mesa" passa a `meta`. Como os cards são mais altos que as linhas da tabela, esta lista é **paginada pela API, com 10 convidados por página**, para a página não ficar longa em telemóvel:
   - Paginação no servidor: usa os parâmetros de paginação que a API de convites do evento já suporta (descobre-os em `events.repository.ts`/`guests` e no backend). Rodapé com "Anterior / Seguinte" e indicador "1–10 de N"; ao mudar de página, volta ao topo da lista.
   - **Barra de pesquisa no topo da lista, feita sempre na API** (nunca filtrar no cliente só os 10 carregados): parâmetro `q` com debounce de 300 ms, cancelando o pedido anterior. Se o backend ainda não suportar `q` neste endpoint, acrescenta-o (pesquisa por nome, e-mail e telefone, `ILIKE` com escape dos carateres especiais `%` e `_`, sempre com parâmetros ligados). Pesquisar volta à página 1.
   - Mantém o filtro por estado (confirmado, pendente, recusado) também no servidor, se já existir.
   - Verifica se a página `/convidados` já pagina e pesquisa na API; se não, corrige-a da mesma forma (10 por página, `q` no servidor).
   - Estados: a carregar (`app-skeleton variant="cards"`), vazio com pesquisa ("Nenhum convidado encontrado para «{termo}»") e vazio sem convidados (com botão "Adicionar convidado").
3. `dashboard.page.html:524–545` (lista de convidados recentes): usa `app-person-card` numa versão compacta (`compact = input(false)`: sem `meta`, só nome, estado e menu).

Não converter: tabela de Relatórios (analítica, 4 colunas) nem a do Perfil (já responsiva). **NÃO ENCONTRADO** no âmbito.

**Aceitação:** `grep -R "<table" apupu_front/src/app/features/guests` sem resultados; nenhuma tabela com scroll horizontal nas páginas convertidas; em 320 px os cards não transbordam.

## Passo 6 — Menu de ações e cabeçalhos de página

1. `app-action-menu`: garantir fecho ao escolher item, ao clicar fora e com Escape; `aria-haspopup="menu"` e `aria-expanded`; navegação por setas ↑/↓ entre itens.
2. Em ecrãs móveis, o painel do menu deve abrir como bottom sheet leve (reutiliza `app-modal` com `size="sm"` se `window.matchMedia('(max-width: 767px)')`), para o toque ser confortável. Em desktop mantém o popover atual.
3. Cria `app-page-header` (`shared/components`): título (`h1`), subtítulo opcional, slot de ações à direita e botão "Voltar" opcional (`backLink` input). Aplica-o nas páginas que repetem esse cabeçalho (convidados, equipas, tarefas, eventos), sem mudar o aspeto visual atual de forma notória.

**Aceitação:** teclado funciona no menu; `build` e `test` verdes.

## Passo 7 — Pesquisa da barra de navegação (abre pronta a escrever)

Hoje o shell tem uma pesquisa com sugestões (`app-search-suggestions`, `shell.component.html`, ver `docs/AUDIT.md` secções 4 e 8). Comportamento pretendido, **em mobile e em desktop**:

1. **Ao tocar/clicar na lupa** (ou na caixa de pesquisa), a pesquisa abre e o **cursor fica logo no campo**: o utilizador só tem de escrever. Sem segundo clique.
   - Cuidado em iOS/Safari: o teclado só abre se o `focus()` for chamado **dentro do próprio gesto de toque**. Por isso o `<input>` tem de existir no DOM (esconde-o com classe/atributo `hidden` em vez de `@if`) e o handler do clique chama `input.focus()` de forma síncrona através de `viewChild`. Não uses `setTimeout`/`effect` como única forma de focar; podes mantê-los só como reforço em desktop.
   - Ao fechar (Escape, tocar fora, botão fechar), limpa o termo e devolve o foco à lupa.
2. **Sugestões sem escrever nada.** Com o campo vazio, mostra logo um painel com grupos, usando **apenas dados já carregados nas stores** (sem novos pedidos ao abrir):
   - **Pesquisas recentes** (até 5, guardadas por anfitrião no `localStorage` com chave que inclua o id do anfitrião; botão "Limpar"; nunca guardes dados sensíveis, só o texto pesquisado).
   - **Próximos eventos** (até 3).
   - **Convidados recentes** (até 3).
   - **Atalhos**: Convidados, Equipas, Tarefas, Criar evento.
   Quando houver menos de 3 itens num grupo, mostra só os que existem; grupos vazios não aparecem.
3. **Ao escrever**, as sugestões passam a resultados filtrados, com debounce de 250 ms. Se a pesquisa de convidados/eventos precisar de dados que não estão na store, **pesquisa na API** (com limite de 5 por grupo e cancelamento do pedido anterior), não no cliente.
4. **Teclado**: setas ↑/↓ percorrem os itens (já existe `activeId`), Enter abre o item selecionado, Escape fecha. Em mobile a pesquisa ocupa o ecrã inteiro por baixo do cabeçalho, com o campo no topo e botão fechar bem visível (alvo ≥ 44 px).
5. Ao escolher um resultado, guarda o termo em "Pesquisas recentes" e navega; o painel fecha.
6. Acessibilidade: `role="combobox"` no campo, `aria-expanded`, `aria-controls` e `aria-activedescendant` ligados à lista de sugestões; textos em `pt-AO` e `en`.

**Aceitação:** em 360 px e em desktop, um único toque na lupa abre a pesquisa com cursor e com sugestões visíveis, sem escrever; Enter/setas/Escape funcionam; `build`, `lint` e `test` verdes.

## Critérios de aceitação finais do Bloco 1

- [ ] `npm run lint` (0 erros), `npm run build` e `npm test` verdes.
- [ ] `app-modal` em uso em todos os diálogos listados; zero `window.confirm`.
- [ ] `app-stat-grid` em 6 páginas.
- [ ] `app-person-card` em convidados, detalhe do evento e dashboard; tabelas longas removidas dessas páginas.
- [ ] Nenhum `app-stat-card` fora de `app-stat-grid` (verificado com `grep`), com o painel convertido.
- [ ] Lista de convidados do detalhe do evento com o mesmo card da página de convidados, 10 por página e pesquisa na API (`q`).
- [ ] Pesquisa da barra de navegação abre com cursor e sugestões sem escrever, em mobile e desktop.
- [ ] Textos novos em `pt-AO` e `en` em `translations.ts`.
- [ ] Claro/escuro e 320 px verificados no código (classes responsivas e tokens).
- [ ] `docs/REPORT-BLOCO-1.md` escrito.
