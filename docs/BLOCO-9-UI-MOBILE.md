# Bloco 9 — UI mobile: modais, menus de ações, painel do evento

> Lê primeiro `REGRAS-GERAIS.md` e `docs/AUDIT.md`. Branch: `feat/bloco-9-ui-mobile`. Este bloco só mexe em UI.
> Exceção às regras gerais: podes instalar `@playwright/test` como **devDependency** (só para os testes deste bloco).

## Objetivo

No telemóvel, os modais de formulário e o menu de três pontinhos estão desconfortáveis (abrem em baixo, o botão de guardar fica fora de alcance, o menu salta para o rodapé). Passam a comportar-se como no desktop. Aproveita-se para melhorar o painel do evento e o card de convidados pendentes.

## Passo 1 — `app-modal` com duas apresentações

Novo input `presentation = input<'dialog' | 'sheet'>('dialog')`.

- `dialog` (por defeito, **todos os modais de formulário**: criar/editar/convidar/escrever texto): painel **centrado** em qualquer largura de ecrã, `max-height: calc(100dvh - 2rem)`, margem lateral de 1rem em 320 px.
  - O **painel inteiro faz scroll** (cabeçalho, corpo e ações juntos). Guardar/Cancelar ficam **no fim do formulário, dentro do fluxo**, não colados ao ecrã. O utilizador chega lá com scroll normal.
  - Ao focar um campo, `scrollIntoView({ block: 'center' })`; usar `visualViewport` para o teclado virtual não tapar o campo nem as ações.
  - Substitui o `[modal-footer]` sticky do Bloco 5 neste modo (o slot continua a existir, mas renderiza dentro do scroll).
- `sheet`: o bottom sheet atual, **só para modais de leitura** (ver detalhes, mensagem completa, localização, anfitrião no convite público).
- Manter: Escape, backdrop, focus trap, devolução de foco, bloqueio de scroll do `body`, modais empilhados.

## Passo 2 — Classificar todos os modais

Percorre todos os usos de `app-modal` e `app-confirm-dialog`, e escreve em `docs/DECISIONS.md` a tabela modal → `dialog` ou `sheet`. Regra: se tem campo editável ou botão Guardar/Enviar → `dialog`; se só mostra informação → `sheet`. Confirmações curtas (`app-confirm-dialog`) → `dialog` `size="sm"`.

## Passo 3 — `app-action-menu` sempre como popover

- Remove o ramo de bottom sheet e a variante `anchor="card"` centrada do Bloco 5.
- Popover ancorado ao botão de três pontinhos **também em mobile**. Renderizado num portal no `body` (`position: fixed`) para não ser cortado por `overflow` de cards/listas.
- Posicionamento: preferência abaixo e alinhado à direita do botão; se não couber, abre para cima; se não couber na horizontal, alinha à esquerda; sempre dentro do ecrã (margem de 8 px). Largura máx. `min(16rem, 100vw - 16px)`.
- Fecha ao escolher item, Escape, clique fora, **scroll da página** e redimensionamento. Setas ↑/↓, Home/End mantêm-se. Itens com 44 px.
- "Editar" abre o modal de edição (`dialog`).

## Passo 4 — Painel do evento (`/eventos/:id` e `/gestao/evento/:id`)

1. **Cabeçalho** (ver screenshot do autor: "Voltar aos eventos" + contexto + título):
   - Botão voltar com ícone de seta, 44 px, texto "Voltar" em mobile e "Voltar aos eventos" em desktop, alinhado verticalmente com o título.
   - Título com `truncate` e `title` com o nome completo; linha de contexto (tipo do evento · local) por baixo; badge de estado (Publicado/Rascunho/Cancelado) ao lado do título.
   - Ação principal única à direita (ex. "Convidar"); as restantes ficam no rail.
2. **Menu lateral colapsável no desktop (≥ `lg`)**:
   - Botão no cabeçalho do shell para **abrir/fechar o menu lateral esquerdo** (modo largo com texto / modo estreito só com ícones e `title`/tooltip). Estado guardado em `localStorage` (`apupu.sidebar.collapsed`, em `try/catch`).
   - O **rail direito do evento** também colapsa (botão de seta; modo só ícones).
   - O conteúdo central **expande e contrai** com transição curta (`prefers-reduced-motion` respeitado), grelhas (`app-stat-grid`, cards) reajustam-se sem overflow.
   - Mobile: mantém drawers atuais.

## Passo 5 — Card de convidados "à espera de resposta" (painel `/painel`)

Problemas vistos no screenshot: nome cortado ("C.."), badge e menu a competir pelo espaço, card estreito e vazio por baixo.

- Usar `app-person-card` (variante normal, não `compact`) numa grelha `grid gap-3 sm:grid-cols-2`.
- Nome em até 2 linhas (sem `truncate` a 2 letras), subtítulo com e-mail ou telefone, linha `meta` com evento e "convidado há N dias".
- `primaryAction` visível: "Reenviar" (e-mail) ou "WhatsApp" (telefone); menu de três pontinhos à direita na base.
- Os chips "Confirmaram / Recusaram / Sem resposta" passam a **filtros clicáveis** (`ui-chip-interactive`, 44 px) com contagens; "Sem resposta" ativo por defeito.
- Estados: a carregar (`app-skeleton`), vazio ("Todos já responderam" + botão Convidar), erro com "Tentar de novo".

## Passo 6 — Testes (obrigatório, browser real)

- Playwright em 360×640 e 1440×900, tema claro e escuro.
- Credenciais **só por variáveis de ambiente locais** (`E2E_EMAIL`, `E2E_PASSWORD`, `E2E_BASE_URL`). **Nunca** em ficheiros, commits, logs ou relatórios. Se faltarem, os testes e2e fazem skip e o relatório diz-o.
- Cenários: (a) em `/convidados`, `/admin/utilizadores` e `/equipas` abrir o menu de três pontinhos do **primeiro** e do **último** card e confirmar que fica visível, dentro do ecrã e ao lado do botão; (b) abrir "Editar perfil" e "Adicionar convidado" com teclado virtual simulado, fazer scroll e clicar Guardar; (c) alternar o menu lateral no desktop e confirmar que o conteúdo reflui sem scroll horizontal; (d) modal de leitura continua como bottom sheet.
- Testes Vitest para `app-modal` (`dialog`/`sheet`) e posicionamento do `app-action-menu` (abre para cima quando não cabe).

## Critérios de aceitação

- [ ] Nenhum modal de formulário abre em bottom sheet; Guardar/Cancelar alcançáveis com scroll em 360×640.
- [ ] Menu de três pontinhos abre ao lado do botão em mobile, nunca fora do ecrã.
- [ ] Tabela de classificação dos modais em `DECISIONS.md`.
- [ ] Cabeçalho do evento melhorado; sidebar e rail colapsáveis no desktop com estado guardado.
- [ ] Card de pendentes com nome completo, ação principal e chips-filtro.
- [ ] Testes Playwright e Vitest verdes; `build`, `lint`, `test` verdes; `docs/REPORT-BLOCO-9.md`.

## Fora de âmbito

Redesenho do menu em dropdowns por etapas, novas páginas, qualquer regra de negócio.
