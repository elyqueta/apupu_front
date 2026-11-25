# Bloco 15 — Editor de templates, Gratitude, convidados por género, feed social e eventos passados

> Lê primeiro `REGRAS-GERAIS.md`, `docs/AUDIT.md` e os relatórios dos blocos anteriores. Depende dos blocos 9–14 (UI mobile, visibilidade, comunidades, feed, instituições, convite/PDF). Branch: `feat/bloco-15-templates`.
> O agente que executa **não vê imagens**: todas as referências visuais vêm descritas em texto abaixo. Textos visíveis em pt-PT, com chaves `pt-AO`/`en` em ficheiro próprio (`block15-keys.ts`). Sem dependências novas, exceto se o bloco as pedir.

## Prioridade e ordem

1. **Passo 1 (urgente, prazo: evento real em 20/12/2026 — o primeiro evento público do protótipo)**: template **Gratitude**, fontes persistentes no PDF, QR no estilo pedido, estados de evento. Estes têm de ficar **verdes e limpos** antes do resto.
2. Passos 2–5: editor Canva, convidados por género, saudação, equipas em filas.
3. Passos 6–8: feed (desktop + mobile), reações e comentários, gráfico semanal.
4. Passo 9: catálogo de templates (mais de 20 a chegar noutro ficheiro).

Se algo bloquear, regista em `docs/BLOCKERS.md` e segue; nunca deixes o Passo 1 por fechar.

---

## Passo 1 — Núcleo obrigatório

### 1.1 Template "Gratitude" (réplica fiel do flyer)

Formato: cartaz vertical 4:5 (1024×1280 como proporção de referência). Fundo creme claro (`#FFF6EA` aproximado) com brilho radial suave ao centro e **padrão geométrico africano** muito subtil (losangos/triângulos em tom creme mais escuro) nos cantos superior direito e inferior esquerdo.

Elementos, de cima para baixo:
- **Moldura de canto**: faixa curva diagonal no canto superior esquerdo e outra no inferior direito, com **fita dourada** (gradiente dourado, bordo brilhante) e preenchimento em padrão africano (triângulos e zigue-zagues em vermelho, verde, amarelo e laranja).
- **Logótipo circular** centrado no topo (imagem enviada pelo anfitrião; coroa dourada dentro de coroa de espinhos). Bloco "imagem de logótipo" opcional.
- Linha de organização em maiúsculas espaçadas: `IGREJA CRISTÃ REINO-CHURCH` (campo editável "Organização").
- Linha de subtítulo em negrito condensado preto: `FESTIVAL DE ADOLESCENTES` (campo "Subtítulo").
- **Título gigante** `GRATITUDE`: letras grossas e condensadas, **preenchidas com o padrão africano multicolor** (vermelho, verde, amarelo, laranja, contorno preto fino). Implementar com `background-clip: text` sobre uma imagem/SVG de padrão incluído nos assets, com fallback de cor sólida. Tem de ocupar quase a largura toda.
- Ano em itálico caligráfico vermelho escuro por baixo, à direita do centro: `2026` (campo "Linha de destaque").
- **Linha de informação** (4 colunas separadas por traços verticais dourados): ícone calendário + `20/12`; ícone relógio + `14:00`; ícone pin + `LOCAL: Igreja Cristã Reino Church`; e, à direita, **QR code** dentro de um cartão branco com borda dourada arredondada e legenda `Informação` por cima. O QR é o do evento (Passo 1.3).
- **Pílula de dress code** centrada em baixo: borda dourada, fundo creme, ícone de t-shirt dourada à esquerda, texto `DRESS-CODE:` pequeno por cima de `TRAJE AFRICANO` em negrito grande.

Regras:
- Todos os textos acima são **campos editáveis**, preenchidos pelos dados do evento (nome, data, hora, local, dress code) com sobreposição manual no editor.
- O padrão africano e as fitas são assets SVG incluídos no projeto (cria-os de forma simples e geométrica; não copies a imagem do flyer).
- Tem de funcionar como **convite digital** (tela vertical em telemóvel) **e** como **PDF** com o mesmo aspeto. Teste visual comparando os dois.
- Criar o template como "oficial da plataforma" (`kind = 'system'`), selecionável como qualquer outro.

### 1.2 Fontes e fotos persistentes (PDF fiel ao editor)

Problema: o PDF não respeita as fontes/foto escolhidas. Regras:
- Cada bloco do template guarda `fontFamily`, `fontWeight`, `fontStyle`, `fontSize`, `color`, `letterSpacing`, `align` no documento do template (JSON), **não** em CSS solto.
- O backend gera o PDF **a partir do mesmo JSON** (mesmo modelo de blocos). Regista as fontes usadas, **embute os ficheiros de fonte** (TTF/WOFF2 locais em `assets/fonts`, nunca CDN no PDF) e falha com erro claro se faltar uma; nunca substituir silenciosamente por outra.
- Catálogo de fontes **fechado e local** (inclui pelo menos: uma condensada grossa para títulos, serifa elegante, script caligráfico, sans moderna). Documenta a lista em `docs/DECISIONS.md`.
- Imagens (capa, fotos, logótipo) usadas no PDF são as mesmas do editor, na resolução original.
- Teste automatizado: gerar PDF de um template com 3 fontes e verificar que as fontes aparecem embutidas (`pdffonts` ou leitura do objeto de fontes).

### 1.3 QR code no estilo das referências

Estilo: QR dentro de **cartão arredondado** (branco, borda fina dourada ou da cor do template), com **ícone da plataforma ao centro**, nível de correção de erros alto, legenda curta por cima (`Informação`, `Confirmar presença`, etc.), cantos dos módulos ligeiramente arredondados. No Gratitude o QR abre o link público do evento (WhatsApp ou convite, à escolha do anfitrião: campo "Destino do QR": link do evento / link do convite / URL personalizada).
- No editor, o QR é um **bloco posicionável** (arrastar, redimensionar, estilo do cartão); posição por defeito conforme o template.
- Presente no convite digital (visível ao rolar) e no PDF.

### 1.4 Estado automático "Passado"

- Quando `ends_at` (ou, sem fim, o fim do dia de `starts_at` no fuso do evento) passa, o evento fica `completed` automaticamente: job periódico no backend (ex. de 15 em 15 min) **e** cálculo derivado na leitura, para nunca depender só do job.
- Ordenação em `/eventos`, "Meus convites", feed e perfis: **ativos/futuros primeiro** (por data ascendente), depois **passados**, depois **cancelados**.
- Evento passado: banner "Evento terminado"; tudo em modo leitura exceto **galeria** (adicionar/remover fotos). Reutiliza o guard de evento cancelado (`requireActiveEvent`) com uma variante `allowGallery`. Não implementes a galeria completa se não existir: cria só o ponto de extensão e o estado, e regista.
- Badges: `Ativo`, `Terminado`, `Cancelado` com `app-status-badge`.

**Aceitação do Passo 1:** Gratitude criado e idêntico em convite e PDF; PDF com as fontes escolhidas; QR estilizado; ordenação correta; testes verdes.

---

## Passo 2 — Editor de templates tipo Canva

Comportamento pretendido (o utilizador não pode aprender nada novo; padrão Canva):
- Ao **escolher um template**, ele aparece logo como **exemplo preenchido** (com dados fictícios realistas) no centro, como uma folha. O utilizador substitui o conteúdo clicando nos blocos.
- **Modelos em feed**: a galeria de modelos usa o padrão do feed do Canva (grelha de cartões grandes com pré-visualização, categorias em chips no topo: Casamento, Aniversário, Igreja/Comunidade, Empresa, Conferência, Outro; pesquisa; "Meus templates").
- **O que o anfitrião vê ao editar é exatamente o que o convidado vê** e o que sai no PDF: um único renderizador de blocos (`TemplateRenderer`) usado nos três sítios. Proibido ter três implementações.
- Painel lateral/bottom sheet de propriedades do bloco selecionado: texto, fonte, tamanho, cor, alinhamento, imagem, ordem (subir/descer). Editável até o evento terminar. Rascunho automático.
- Tipos de bloco: texto, título, data/hora, local (com mapa), contagem decrescente, linha do tempo/programa, dress code, presentes, imagem/galeria, música/vídeo, QR, botões (Confirmar presença, Localização, Lista de presentes), mensagem, separador/ornamento.
- Em telemóvel: edição por toque, painel como bottom sheet; alvos ≥ 44 px.

**Aceitação:** editar texto e fonte no editor reflete-se idêntico no convite público e no PDF.

---

## Passo 3 — Género e tipo de convidado

Novo campo `guest_kind` (enum) no convite/convidado, escolhido no `app-guest-dialog`:

| Valor | Quando | Tratamento no texto |
|---|---|---|
| `male` | Homem | "convidado" |
| `female` | Mulher | "convidada" |
| `couple` | Casal | "convidados especiais" |
| `family` | Família | "convidados" (forma neutra e natural; ex. "Família Silva, estão convidados") |

- **Casal**: o formulário abre um segundo campo "Nome do cônjuge"; alternativas aceites: dois nomes, ou um único campo "Casal + apelido" (ex. "Casal Silva"). O utilizador escolhe; sem validação rígida.
- **Família**: um só campo de nome (ex. "Família Silva") e, opcionalmente, número de pessoas.
- A flexão aplica-se **em todos os sítios**: convite público (saudação, "Tens um convite especial" → "Têm um convite especial" no plural), e-mails, notificações, PDF, WhatsApp, lista de convidados.
- Implementar numa função única `guestAddress(kind, name)` com tabela de textos em `block15-keys.ts` (pt-PT e en), sem condicionais espalhadas.
- Migração reversível; convidados existentes ficam `guest_kind = null` e usam o tratamento neutro "convidado(a)".
- Contagem de lugares: casal conta 2 por defeito; família editável.

---

## Passo 4 — Saudação por hora

- No painel do anfitrião: "Bom dia, {nome}" (05:00–11:59), "Boa tarde, {nome}" (12:00–18:59), "Boa noite, {nome}" (19:00–04:59), calculado no **fuso do utilizador** (`Intl`, com `Africa/Luanda` por defeito).
- **Visível também em mobile** (hoje só aparece em desktop): linha no topo do painel, tamanho ≥ 14 px, sem cortar o nome (truncar com reticências).
- Reutiliza para o feed (cabeçalho do cartão do utilizador).

---

## Passo 5 — Equipas em filas tipo WhatsApp

- `/equipas` passa de grelha de cartões para **lista de filas** (uma linha por equipa): foto da equipa (avatar circular, iniciais por omissão), nome, última atividade/tarefas abertas e contagem de membros, badge de papel. Filas **clicáveis**.
- Ao clicar: **modal** (centrado em desktop; em mobile abre da forma já definida para modais de leitura) com foto grande da equipa, descrição, membros (avatar + papel), tarefas abertas e botão "Abrir equipa".
- **Foto da equipa**: upload/remoção (reutiliza o fluxo do Cloudinary e apaga o asset anterior; mesma regra do avatar). Campo `photo_url`/`photo_public_id` em `teams`.
- Preparar o desenho para o **chat da equipa** futuro: reservar na fila uma linha de pré-visualização "última mensagem" (escondida enquanto não houver chat) e no modal um botão "Conversar" desativado com `disabledHint`. Não implementar o chat.
- Manter filtros e pesquisa já existentes.

---

## Passo 6 — Feed social (desktop e mobile)

### Referências visuais (descrição, o agente não vê as imagens)

**Mobile (referência "Babagang" + loja de moda)**: topo com título/logótipo ao centro, botão de menu à esquerda e sino à direita (círculos brancos de 44 px); **fila de "stories"** (círculos com anel) logo abaixo; **cartões de imagem grande com cantos muito arredondados** que ocupam a largura toda; **cabeçalho em vidro** (pílula translúcida, desfocada) sobre a imagem com avatar, nome, selo de verificado e @utilizador; botão "⋮" em círculo de vidro; **rodapé do cartão também em vidro** sobre a imagem com contagem de gosto, comentários e partilhas e legenda/hashtags; **barra de navegação flutuante** em pílula de vidro escura, com ícones (início, explorar, gosto/atividade, perfil), item ativo em círculo branco. Segunda referência: cartões de estatísticas coloridos no topo (azul/escuro), carrossel de stories, e ecrã de detalhe com título, preço e botão de ação verde-limão.

**Estado atual (desktop)**: três colunas (perfil e atalhos à esquerda, feed no centro, "Próximos eventos" à direita) com muito espaço vazio nas laterais e no cartão de evento, cartões com imagem mal aproveitada (grande área vazia clara em vez de capa), chips Eventos/Comunidades/Pessoas e categorias, bloco "Partilhe um evento…". Problemas: espaço mal usado, sem reações nem comentários, cartão de evento sem capa visível.
**Estado atual (mobile)**: cartão de evento com capa vazia (fundo claro) e texto de data/local/título por baixo de um degradê; barra inferior flutuante a tapar o fim do cartão; chips cortados à direita.

### Requisitos

1. **Cartão de evento no feed = cartão de vidro sobre a capa**: a imagem de capa ocupa o cartão todo (proporção 4:5 em mobile, 16:10 em desktop); **cabeçalho em vidro** (avatar, anfitrião/comunidade, selo, tempo); **rodapé em vidro** com título, data/hora, local, hashtags e ações. Sem capa: usa o **template renderizado** (miniatura do `TemplateRenderer`) como capa; nunca fundo vazio.
2. **Templates apresentados no feed** em cartões de vidro: secção "Modelos" (carrossel horizontal e, em desktop, bloco na coluna direita) com miniaturas dos templates, nome, categoria e botão "Usar este modelo". Leva ao editor com o template já escolhido.
3. **Reações e comentários**: reagir (gosto, com variantes simples: gosto, amei, parabéns), comentar (lista paginada, resposta de um nível, apagar o próprio, o responsável do evento/comunidade pode apagar), contadores no rodapé do cartão. Novas tabelas reversíveis `event_reactions` e `event_comments`; um utilizador tem no máximo uma reação por evento; rate limit; conteúdo texto simples ≤ 500 caracteres, sanitizado; respeitar visibilidade (só quem vê o evento reage/comenta; sem conta, só leitura e CTA para criar conta).
4. **Aproveitamento de espaço (desktop)**: container até 1280 px, três colunas com larguras 300 / fluido / 340; colunas laterais com cartões úteis (atalhos, próximos eventos, modelos, comunidades sugeridas) em vez de vazio; cartão do centro com imagem de capa real. A coluna esquerda e direita ficam *sticky*.
5. **Mobile**: stories no topo, cartões em ecrã quase completo, cabeçalho do feed compacto, chips com scroll horizontal e sombra de fade à direita, **padding inferior suficiente** para a barra flutuante não tapar o último cartão.
6. **Links de regresso ao feed a partir do painel do anfitrião**: item "Feed" no menu lateral do painel, botão "Ver feed" no cabeçalho do painel e logótipo clicável que leva a `/` (feed). No feed já existe "Ir para o painel".
7. **Padrão de informação fixo** em todas as caixas informativas, estados vazios e avisos do feed e painéis: **ícone + título + mensagem curta + botão de ação (quando fizer sentido)**. Cria o componente `app-info-block` e substitui os casos soltos; aplicar primeiro no feed, estados vazios e avisos de eventos passados/cancelados.
8. Estados obrigatórios (skeleton, vazio, erro, sucesso), claro/escuro, 320 px, alvos ≥ 44 px, texto ≥ 12 px, tokens existentes (sem cores novas; o efeito vidro usa `bg-surface/60 backdrop-blur-xl border-line/40`).

---

## Passo 7 — Gráfico semanal do painel

- O gráfico dos dias da semana (interativo) deve ocupar **toda a largura** do cartão principal em desktop (hoje usa ~50%). Container `w-full`, SVG com `viewBox` e `preserveAspectRatio` corretos, altura mínima 220 px, tooltip e foco por teclado mantidos. Verifica ao redimensionar e em mobile.

---

## Passo 8 — Página de perfil

Fora do âmbito deste bloco (scroll e tamanho da página de perfil serão tratados à parte). Regista só observações.

---

## Passo 9 — Catálogo de templates iniciais

O catálogo completo, **com uma descrição visual por template (T01–T19)**, está em `BLOCO-15B-CATALOGO-TEMPLATES.md`. Implementa-o a seguir ao Passo 1, pela ordem de entrega indicada nesse ficheiro. Gratitude (Passo 1.1) é o único template descrito aqui.

---

## Critérios de aceitação finais

- [ ] Template **Gratitude** igual ao flyer (convite e PDF), com QR estilizado e campos editáveis.
- [ ] Fontes, cores e fotos escolhidas aparecem **iguais** no editor, no convite e no PDF (fontes embutidas, teste automatizado).
- [ ] QR em cartão arredondado com ícone da plataforma, posicionável no editor.
- [ ] Eventos terminados marcados automaticamente; ordenação ativos → passados → cancelados em Eventos, Meus convites e feed; em passados só galeria.
- [ ] Editor tipo Canva com exemplo preenchido ao escolher template, galeria em formato de feed e um único renderizador.
- [ ] `guest_kind` (masculino, feminino, casal, família) com tratamento correto em convite, e-mail, PDF e WhatsApp; casal com segundo nome.
- [ ] Saudação por hora, visível também em mobile.
- [ ] Equipas em filas clicáveis com modal e foto da equipa (chat apenas desenhado).
- [ ] Feed com cartões de vidro, templates apresentados, reações e comentários, melhor uso do ecrã, ligações de regresso ao feed e `app-info-block`.
- [ ] Gráfico semanal a toda a largura.
- [ ] `build`, `lint`, `test`, `typecheck` (front e back) verdes; migrações reversíveis; `docs/REPORT-BLOCO-15.md` escrito.

## Fora de âmbito

Chat de equipa e amigos, galeria completa de eventos passados, página de perfil, Facebook login, envio automático por WhatsApp/SMS.