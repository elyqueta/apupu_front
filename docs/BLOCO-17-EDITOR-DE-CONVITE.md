# Bloco 17 — Criar o convite como quem o desenha no ecrã

> Lê primeiro `REGRAS-GERAIS.md`, `docs/AUDIT.md`, `docs/REPORT-BLOCO-15.md`, `docs/REPORT-BLOCO-16.md` e `docs/BLOCKERS.md`. Depende do **Bloco 16** (casca do convite tematizada, várias localizações, `location-edit-dialog`, mapa MapLibre) e do **Bloco 15** (manifesto v2, `TemplateRenderer`, catálogo, rascunhos). Branch: `feat/bloco-17-editor-convite` (front e back), criada a partir de `feat/bloco-16-convite-template`.
> Os caminhos vêm dos relatórios e **podem estar desatualizados**: confirma sempre no código. Commits pequenos, um por passo, em inglês. Sem push, merge ou rebase. Textos em pt-PT com chaves `pt-AO`/`en` em `block17-keys.ts`. Sem dependências novas.

## Objetivo

Hoje criar um convite parece preencher um formulário. Passa a parecer **desenhar o convite no ecrã**, como no Canva: o modelo aparece no centro, já preenchido com exemplo; tocas num elemento e editas só esse elemento; o ícone de localização abre um modal para escolher os locais, e por aí fora. Quem cria sente que está a fazer um convite, não a preencher campos.

## Regras de produto (decididas; não alterar)

- **Nenhuma página de formulário** para criar o convite. Todos os dados vivem no próprio convite ou em modais abertos a partir dele.
- **Um toque num elemento abre o modal desse elemento** (não há "selecionar e depois editar"). Reordenar e esconder elementos faz-se numa lista à parte ("Elementos").
- O que o anfitrião vê no ecrã é **exatamente** o que o convidado vê (um só `TemplateRenderer`, Blocos 15 e 16).
- **Campos por preencher não assustam à partida:** aparecem como espaços tracejados com instrução ("Toque para adicionar o local"). Ficam **vermelhos** quando o utilizador tenta guardar/publicar com eles em falta, ou quando sai de um campo obrigatório deixando-o vazio.
- Rascunho **automático** sempre (sem validar). A validação só acontece ao **Publicar**.
- Tudo o que adiciona/edita abre em `app-modal` (`dialog`, ações no fim do formulário), como no resto da app.
- Mobile primeiro (360×640), alvos ≥ 44 px, texto ≥ 12 px.

---

## Passo 1 — Inspeção e mapa de dados (sem código)

1. Lê o wizard atual (`features/event-setup/create-event.page.*`), o editor de templates (`template-editor.page.ts`), `TemplateRenderer`, `EventDraftsRepository`, `event_drafts` no back e `events`/manifesto/overrides.
2. Escreve em `docs/DECISIONS.md` (secção Bloco 17) uma tabela **campo do evento → bloco do template → modal que o edita → obrigatório/recomendado/opcional**. É a base de tudo o resto.
3. Descobre **onde ficam hoje as personalizações do template** (fontes, cores, textos por bloco, logótipo, QR, `pdfOverrides`): o `BLOCKERS.md` diz que o draft do editor está em `localStorage` e que falta persistência no backend. Se ainda for assim, é um pré-requisito do Passo 5. Não dupliques o que já existir.

**Obrigatórios para publicar:** título, data e hora de início, e pelo menos uma localização (presencial com endereço, ou online com link) **ou** a escolha explícita "Sem local definido" (a regra atual do wizard prevalece se for diferente: confirma e regista).
**Recomendados** (aviso discreto, não bloqueiam): hora de fim, prazo de resposta, dress code, mensagem.
**Opcionais:** vídeo, organização/subtítulo, logótipo, QR personalizado, galeria, etc.

---

## Passo 2 — `TemplateRenderer` em modo `edit`

Acrescenta `mode: 'edit'` (além de `full` e `cover` do Bloco 16).

1. Cada bloco editável é um **`<button>`** posicionado sobre o bloco (ou o próprio bloco com `role="button"`), com `aria-label="Editar {nome do elemento}"`, foco visível e área de toque ≥ 44 px (estende com `::after` invisível quando o bloco for pequeno, como o ícone de local ou o QR).
2. Estados visuais do chrome do editor (usa os tokens da plataforma; o **conteúdo** do convite fica sempre com a paleta do template):
   - **Normal:** sem contorno.
   - **Hover/foco:** contorno de 2 px na cor de marca da plataforma.
   - **Por preencher:** moldura tracejada, ícone e instrução curta; para obrigatórios, mostra o **texto de exemplo esbatido** (opacidade ~.55) dentro da moldura, para se ver o desenho do modelo. Ao preencher, passa ao normal.
   - **Erro:** contorno coral, ícone `warning` e mensagem curta por baixo ("Falta o título"), ligada com `aria-describedby`; `role="alert"` na primeira ocorrência.
3. Em modo `edit` nenhum botão do convite (Vou/Não vou, mapa, link) dispara ações reais: são só "hotspots".
4. Blocos obrigatórios não se removem; blocos opcionais podem ser **escondidos** (os dados ficam guardados).
5. A escala do convite no ecrã de edição ajusta-se à largura disponível (cartaz inteiro visível em mobile; tiras com scroll vertical).

---

## Passo 3 — Modais por elemento

Reutiliza o que já existe sempre que possível (não reescrevas o que funciona).

| Elemento no convite | Modal |
|---|---|
| Título, organização, subtítulo, linha de destaque (ano), mensagem, regras, dress code | `element-text-dialog`: um ou poucos campos de texto com contador; botão "Estilo" que abre o painel de propriedades do Bloco 15 (fonte do catálogo local, tamanho, cor, alinhamento) |
| Data e hora | `element-datetime-dialog`: data, hora de início, hora de fim (opcional), prazo de resposta (opcional). Fuso `Africa/Luanda` por omissão, sem o expor |
| Ícone/coluna de local | `location-edit-dialog` e lista de locais do **Bloco 16** (principal, até 5, mapa MapLibre) |
| Capa, imagens, logótipo | modal de imagem com o fluxo de upload existente (Cloudinary, apaga o anterior), remover e substituir |
| QR | modal: destino (link do evento / link do convite / URL personalizada), legenda, logo ao centro (Bloco 16) |
| Vídeo de convite | modal YouTube: aceita os formatos do Bloco 14, guarda só o ID, mostra a miniatura para confirmar |
| Anfitrião / organização | modal só de leitura com o que vem do perfil, e ligação "Editar o meu perfil" |

- Todos os modais **atualizam o convite em tempo real** (por baixo do fundo do modal) e têm "Concluir" no fim.
- **Definições do evento** (ícone de engrenagem na barra superior; não fazem parte do desenho do convite): visibilidade (privado/público), mostrar o nº de confirmados, idade mínima/máxima, mesas, comunidade. Reutiliza os componentes do Bloco 10/11.
- **Informações extras:** o que o evento tem e **não** tem bloco visível no template aparece na folha "Mais informações" do convidado (Bloco 16). No editor, uma entrada "Informações extras" lista essas informações, cada uma a abrir o seu modal. Nada se perde por o template não ter bloco para isso.

---

## Passo 4 — Validação central e estados vermelhos

1. **Uma só função** `validateInviteDraft(draft): { field; blockId; severity: 'required' | 'recommended'; message }[]` em `core/` (front), com os campos do Passo 1. O backend é a fonte de verdade: o schema de publicação (Zod) falha com `fields` e o front mapeia esses campos para blocos.
2. **Quando fica vermelho:** (a) ao tocar em Publicar com obrigatórios em falta; (b) ao sair (`blur`/fechar modal) de um obrigatório vazio. Nunca antes.
3. **Aviso "N por preencher"** (`aria-live="polite"`): pílula na barra do editor. Tocar nela salta e faz scroll até ao **próximo** elemento em falta e abre o respetivo modal.
4. Recomendados: ícone discreto e texto neutro ("Recomendado: prazo de resposta"), sem vermelho e sem bloquear.
5. Publicar com **texto de exemplo não substituído** num obrigatório conta como em falta.

---

## Passo 5 — Persistência (rascunho e personalizações)

1. Reutiliza `/host/event-drafts` (autosave com debounce de 2 s, ao fechar cada modal e ao sair). O rascunho guarda também as **personalizações do template** (`template_overrides` jsonb, ou o nome que já existir): textos por bloco, estilos, logótipo, QR, blocos escondidos e ordem. Migração reversível se for preciso criar a coluna.
2. Ao publicar, as personalizações passam para o evento (`events.template_overrides` ou equivalente): **o convite público e o PDF leem o modelo + as personalizações do evento**, nunca o `localStorage`. O catálogo (`event_templates`) não é alterado por personalizar um evento.
3. Se já houver rascunhos antigos com a estrutura do wizard, mantém-nos abríveis (compatibilidade): ao abrir, mapeia para o novo formato.
4. Falha de rede: mantém o estado em memória e mostra "Não foi possível guardar, a tentar de novo". Sem detalhes técnicos. Indicador "Guardado" / "A guardar…" na barra.
5. Rascunhos nunca aparecem no feed, em pesquisas nem geram notificações (regra do Bloco 14).

---

## Passo 6 — O novo fluxo e o ecrã do editor

**Fluxo**
1. `/criar-evento`: **escolher modelo** (a galeria em formato de feed já existente, com categorias, pesquisa e "Meus modelos"). Escolher cria o rascunho e navega para `/criar-evento/:draftId`.
2. `/criar-evento/:draftId` (e `/eventos/:id/convite` para editar um evento já publicado, **até ao fim do evento**; terminado/cancelado fica em leitura): o editor.
3. `?draft=` do wizard antigo continua a funcionar (redireciona).

**Ecrã do editor (mobile primeiro)**
- **Barra superior:** voltar (guarda o rascunho), "A editar", indicador Guardado/A guardar, engrenagem (Definições do evento), pílula "N por preencher", **Pré-visualizar** e **Publicar** (primário).
- **Centro:** o convite em modo `edit`.
- **Rodapé flutuante (mobile)**, pílula com `shadow-pop`: **Elementos** (lista com subir/descer, esconder/mostrar, adicionar bloco opcional do catálogo de blocos do modelo), **Informações extras**, **Por preencher**.
- **Desktop (≥ `lg`):** o mesmo conteúdo num painel lateral fixo à direita (sem bottom sheet). Os conteúdos editam-se sempre em modal.
- **Pré-visualizar:** abre o convite real em ecrã inteiro ("Como o convidado vê"), com boas-vindas e botão flutuante (Bloco 16), sem ações reais.
- **Publicar:** se faltam obrigatórios → vermelho, scroll ao primeiro, toast "Faltam N itens". Se está tudo → modal curto de revisão (visibilidade, link do convite, o que acontece a seguir) → estado `scheduled`.
- **Dicas na primeira utilização:** 3 balões ("Toque em qualquer elemento para o editar", "Os campos a tracejado estão por preencher", "Veja como o convidado vai ver"), dispensáveis, guardados em `localStorage` (`apupu.editor.tips.v1`, dentro de `try/catch`).
- Ao editar um evento já publicado, aviso ao alterar data ou local: "Os convidados já têm o link; as alterações aparecem logo no convite." (sem notificar; fica registado como melhoria futura).

---

## Passo 7 — Retirar o formulário antigo

- Retira as etapas do wizard que ficam cobertas pelo editor. Se algum componente ainda tiver outros usos (por exemplo, partilhado com a edição de evento), mantém-no e regista em `BLOCKERS.md` em vez de apagar.
- Remove textos e chaves que deixarem de ser usados.
- Atualiza o guia "Criar um evento e o convite" (`src/content/docs/` e `docs/GUIA-UTILIZADOR.md`) para o fluxo novo.

---

## Passo 8 — Testes e verificação

- **Vitest:** `validateInviteDraft` (obrigatórios, recomendados, exemplo não substituído); `TemplateRenderer` em modo `edit` (hotspots com `aria-label`, estado tracejado, estado de erro); cada modal de elemento (abre, atualiza em tempo real, fecha); salto "N por preencher".
- **Playwright** (360×640 e 1440×900, claro e escuro do chrome; usa a rota de teste auto-contida se não houver credenciais): escolher modelo → tocar no título → editar → tocar no ícone de local e adicionar 2 locais → tentar publicar com a data por preencher → vermelho + salto ao elemento → preencher → publicar. Sem scroll horizontal; ações dos modais alcançáveis com o teclado virtual.
- **Back:** schema de publicação (obrigatórios, mensagens por campo), persistência de `template_overrides`, rascunho antigo compatível, migração `up → down → up` se houver.
- Comandos: front `build`, `lint` (0 erros), `test`, `tsc --noEmit`, `e2e:typecheck`; back `build`, `typecheck`, `lint`, `test`.
- `docs/REPORT-BLOCO-17.md` com critérios ✔/✘, evidência e commits; atualiza `DECISIONS.md`, `BLOCKERS.md` e `REPORT-FINAL.md`.

## Critérios de aceitação finais

- [ ] Criar um evento já não passa por um formulário: escolhe-se o modelo e edita-se o convite no ecrã.
- [ ] Um toque em qualquer elemento abre o modal desse elemento; o ícone de local abre a gestão de locais do Bloco 16.
- [ ] Campos por preencher aparecem tracejados; ficam vermelhos só ao tentar publicar ou ao sair de um obrigatório vazio; "N por preencher" salta para o próximo.
- [ ] O que se vê no editor é o mesmo que se vê no convite público e no PDF (um só renderizador; personalizações persistidas no backend, não no `localStorage`).
- [ ] Rascunho automático com indicador; falhas de rede sem detalhes técnicos.
- [ ] Pré-visualização do convite real; publicar com revisão final.
- [ ] Informações do evento sem bloco no template aparecem em "Informações extras" (editor) e na folha "Mais informações" (convidado).
- [ ] Mobile 360×640 sem scroll horizontal; alvos ≥ 44 px; navegação por teclado nos hotspots.
- [ ] `build`, `lint`, `test`, `typecheck` verdes; `docs/REPORT-BLOCO-17.md` escrito.

## Fora de âmbito

Posicionar blocos livremente (arrastar para qualquer ponto), desfazer/refazer, colaboração em tempo real, publicar modelos de utilizador para a comunidade, edição inline de texto no próprio bloco (esta versão usa modais), notificar convidados quando o convite muda, pré-visualização do PDF no editor.
