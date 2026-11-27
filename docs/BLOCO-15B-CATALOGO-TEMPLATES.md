# Bloco 15B — Catálogo de templates iniciais (descrição visual por template)

> Anexo do `BLOCO-15-TEMPLATES-FEED-CONVIDADOS.md` (Passo 9). Branch: a mesma do Bloco 15.
> **O agente não vê imagens.** Cada template abaixo está descrito em texto: formato, paleta, tipografia, ornamentos, blocos e botões. Constrói cada um como `kind = 'system'` no `TemplateRenderer` (blocos editáveis, fontes do catálogo local, mesmo resultado no convite digital e no PDF).

## Regras para todos os templates

1. **Não copiar marcas nem textos das referências**: nomes de casais, marcas de agências (AreOne, Velure, Diseño Memories, Criativa Digital, Ateliê Digitale, Flextecs, PostermyWall, Prymatech) e fotos **não** entram. Usa dados fictícios neutros ("Ana & João", "Sábado, 14 de junho · 16:00").
2. **Ornamentos em SVG simples** criados por ti (folhas, flores aguareladas estilizadas, laços, selos, molduras, rasgos de papel, losangos). Sem imagens de terceiros. Se um ornamento complexo (flor 3D, papel recortado) for inviável, aproxima com gradientes e sombras e regista em `docs/BLOCKERS.md`.
3. **Fontes**: só do catálogo local (condensada grossa, serifa elegante, script caligráfico, sans moderna). Mapeamento por template abaixo: `script`, `serif`, `serif-caps`, `sans`, `condensed`.
4. **Cores**: as hex são aproximações; usa-as como paleta do template (variáveis no JSON do template), nunca como tokens globais da app. Em cada template os textos têm contraste ≥ 4.5:1.
5. **Botões de ação do convite** (confirmar presença, localização, presentes, site) usam os blocos `button` existentes e abrem os modais do Bloco 4; no PDF aparecem como texto/ícone + QR quando aplicável.
6. Cada template inclui `previewData` (conteúdo de exemplo) para aparecer **já preenchido** ao escolher.
7. Orientações: `strip` (tira vertical longa, scroll no telemóvel), `card45` (4:5), `a5` (cartão vertical), `a4`, `landscape`.
8. Ordem de entrega: T01, T03, T05, T08, T11, T13, T17 primeiro (cobrem os estilos principais); os restantes depois. Gratitude está no Bloco 15, Passo 1.

---

## Grupo A — Tiras digitais (casamento), `strip`, scroll vertical

### T01 · "Papel creme com fio" (casamento, romântico)
- Fundo creme `#F4EFE6` com textura de papel muito suave. Texto castanho escuro `#4A3B32`. Acento vermelho vinho `#8B2E2E`.
- Fontes: nomes em `script` fina; títulos de secção em `script` pequena sublinhada por traço fino; corpo em `serif`.
- Sequência de blocos: nomes em script no topo + "Convite de casamento" em caps espaçadas → foto grande retangular com margem → caixa "Data" (duas linhas verticais finas, dia/mês, hora) → **linha ondulada contínua com coração** que atravessa a tira e liga as secções → texto de boas-vindas ("Queridos familiares e amigos") → **calendário do mês** com o dia assinalado num coração vinho → **linha do tempo ondulada** com horas e etiquetas (chegada, almoço, celebração, jantar, fim) ligadas por um fio que serpenteia → "Onde tudo vai acontecer" + ilustração a traço do local + botão contornado "Abrir mapa" → "Dress code" com paleta e pequenos laços desenhados → "Desejos" (presentes / pedido) → contactos com ícones → **painel final castanho escuro `#3B2A22` com topo ondulado** e formulário: nome, número de convidados com botões −/+, escolha sim/não, botão claro "Enviar" → foto final.
- Particularidade: o formulário RSVP é um bloco de fecho em cor escura que contrasta com o resto.

### T02 · "Envelope terracota" (casamento, boho)
- Paleta: terracota/castanho rosado `#9B7360`, creme `#FAF6F0`, branco. Texto branco sobre castanho, castanho escuro sobre creme.
- Fontes: nomes `script` branca; monograma "C | S" em `serif-caps` com traço vertical entre letras; corpo `serif` pequena.
- Blocos: **cabeçalho em castanho com aba de envelope** (triângulo sombreado) + nomes + data → raminhos de gypsophila brancos nos cantos (SVG) → texto de anúncio → monograma → foto com legenda sobreposta no topo ("Casamo-nos!") → citação → **leitor de música** (barra de progresso e botões anterior/play/seguinte, play num círculo castanho) → painel castanho com bênção + data com linhas → **contagem decrescente** (dias:horas:minutos:segundos em números grandes) → calendário do mês castanho com coração → 2–3 fotos → "Lugar" com ícone de alianças, hora, nome do local e botão pílula "Ver localização" → "Código de vestimenta" com ícone de fato/vestido e regras por género → painel "Sugestão de presente" (envelopes, transferência com IBAN, ícones) → "Confirmação" com botão → "Sem crianças" com coração → agradecimento + foto final.

### T03 · "Hacienda marfim" (casamento, minimalista elegante)
- Paleta: marfim `#F7F3EA`, areia `#E7DDCB`, castanho acinzentado `#8A7761`, texto `#3A322B`; botão escuro `#2F2A26`.
- Fontes: monograma em `serif-caps` dentro de **elipse fina dourada**; nomes em `serif` normal; etiquetas em `sans` caps muito espaçadas e pequenas.
- Formato: tiras com **cantos arredondados** grandes, estilo cartões de telemóvel.
- Blocos: "Nos casamos" + nomes + data → foto grande com **borda inferior ondulada/rasgada** → frase curta → leitor de música em cartão areia → "Cerimónia" com hora e local → "Receção" → **cronograma** com ícones de linha (cerimónia, cocktail, jantar, festa, fim) → "Dress code" com 3–4 círculos de cor → "O nosso melhor presente" + **QR** dentro de cartão branco → botão escuro "Confirmar assistência" → recomendações com ícones (carro, calçado, câmara) → citação em faixa areia → "Obrigado" + foto final + nomes.

### T04 · "Marfim com folhas" (casamento, delicado)
- Variante de T03 com paleta mais clara: marfim `#F5F1EA`, bege `#D9CBB6`, cinza-castanho `#8D7F70`, preto suave nas cores do dress code.
- Diferenças: ornamento de **ramo de folhas** a traço no topo do monograma e no canto; foto com **bordo rasgado branco**; botões retangulares pequenos bege "Ver localização" por cima de cada local; ícones de igreja e taças de brinde por cima de "Cerimónia" e "Receção"; QR do presente sobre faixa bege; recomendações em três linhas com ícones.

### T05 · "Fotografia que desvanece" (casamento, moderno e limpo)
- Paleta: branco `#FFFFFF` / branco-gelo `#F7F7F5`, texto cinza-escuro `#2B2B2B`.
- Fontes: nomes em `script` grande e fina; restantes textos em `serif` pequena em maiúsculas.
- Blocos: foto no topo **a ocupar a largura toda e a dissolver-se em branco** (máscara de gradiente de baixo, sem linha de corte) → citação pequena em itálico → **nomes em script grandes, desalinhados em duas linhas** ("Mariana" / "e Rodrigo") → "Convidam para a cerimónia do seu casamento" → data e hora em caps espaçadas → morada → "Clique nos botões:" + **quatro botões em pílula com contorno fino e ícone à esquerda** (Localização, Lista de presentes, Confirmar presença, O nosso site).
- Particularidade: nenhum bloco de cor; tudo vive no branco. Mostrar também a versão num telemóvel na pré-visualização.

### T06 · "Bordô com envelope" (casamento, clássico)
- Paleta: bordô `#5B2030`, rosa seco `#8A4A57`, creme `#F3EEE8`, branco; florais aguarelados rosa/verde-sálvia nas margens.
- Fontes: nomes `script` branca no cabeçalho; monograma "M | M" `serif-caps`; títulos `serif-caps` pequenas.
- Blocos: cabeçalho bordô com aba de envelope + nomes + data → floral aguarelado → citação bíblica → monograma → "Nos casamos!" → foto retangular → floral → painel bordô com **leitor de música**, nomes dos pais (dois grupos), "Unimos as nossas vidas no sacramento do matrimónio" → painel bordô com **data grande** ("Sábado 06 Dezembro") e **contagem decrescente** → floral → foto → receção com ícone de taças + hora + local + botão "Ver localização" bordô → **itinerário vertical com eixo central**, ícones alternados à esquerda e à direita com horas → "Código de vestimenta" com **silhuetas de fato e vestido** e nota de cores a evitar → painel bordô com "Sugestão de presentes" (chuva de envelopes), "Sugestão de alojamento" (dois hotéis, botões "Mais informação") e "Confirmar assistência" com botão sublinhado → foto final.

### T07 · "Preto e branco, papel rasgado" (casamento ou aniversário, urbano)
- Paleta: preto `#111111`, branco-quente `#FBFAF7`, cinzas. Fotos a preto e branco.
- Fontes: título "Nos casamos" em `sans` caps espaçadas branca sobre foto; nomes em `script` informal; restantes `serif` limpa.
- Blocos: foto de capa com texto branco ao fundo e **borda inferior de papel rasgado** → "Faltam:" com **contagem decrescente** (4 números em serif grande com legenda) → "Esperamos-vos para celebrar" + data com linhas laterais → **ícone de igreja** + "Cerimónia" + hora e local + **botão preto em pílula "Como chegar"** → ícone de taças + "Festa" + botão → foto com bordo rasgado → segunda tira com **linha do tempo vertical**: ícone circular de linha + hora + etiqueta (tomar lugar, cerimónia, brindes, primeiro prato, festa) → foto → "Instagram" com hashtag e botão preto com @ → "Playlist" com texto a pedir a música que não pode faltar.
- Particularidade: bordas rasgadas entre secções em vez de linhas retas; botões pretos.

### T08 · "Sálvia e eucalipto" (casamento, jardim)
- Paleta: sálvia `#8C9A7A`, verde-escuro `#3E4A2F`, creme `#F7F2E8`, aguarela verde-clara `#CFD8C4`.
- Fontes: monograma "R | J" `serif-caps` verde-escuro com traço vertical; nomes `script` grande castanho-escuro; corpo `serif-caps` pequena.
- Blocos: ramos de **eucalipto** nos cantos (SVG repetível) → citação bíblica → monograma + "Our wedding / O nosso casamento" → foto com **bordo inferior rasgado** → texto de convite → "Pais do noivo / Pais da noiva" em duas colunas → **nomes em script grandes** ("Rafaela & Josué") → data com linhas ("Sexta · 14 · 2023") → segunda tira: horas + nome + morada da cerimónia e da receção, cada uma com **botão verde-escuro "Ver localização"** com ícone de mão/cursor → bloco **aguarela verde com bordas rasgadas** com "Itinerário de atividades": eixo vertical com pontos, ícones de linha e horas → "Lugares reservados" com cadeira e número em caixa → "Sugestão de presente" com ícone de presente e "Envelopes" → "Confirmação" com ícone de WhatsApp e botão verde "Enviar mensagem" → "Só adultos" com aviso gentil → ramo decorativo → foto final com **bordo rasgado**.

---

## Grupo B — Cartões `card45`/`a5`, verticais

### T09 · "Arco bordô e dourado" (casamento ou cerimónia familiar)
- Paleta: bordô `#7A1230`, branco-pérola `#F7F3F1`, dourado `#C9A55B`.
- Estrutura: cartão com **arco** branco ao centro (moldura dourada fina dupla) sobre fundo bordô à direita; flores grandes de aspeto 3D (branco com miolo dourado e bordô) nos cantos inferior direito e superior esquerdo; pérolas pequenas.
- Fontes: nomes em `script` dourada grande com apelidos em `sans` caps pequena por baixo; "Cerimónia de casamento" em `script` bordô; restante `sans` limpa.
- Blocos: ornamento no topo do arco → "Juntamente com as suas famílias" → nomes (dois, ligados por um **símbolo de alianças douradas** no meio) → "Pedem a sua presença na" → título em script bordô → **faixa bordô arredondada** com subtítulo branco → linha com ícone de calendário + dia grande + mês/ano + hora → ícone de pin + local → "RSVP" com contactos.

### T10 · "Forma orgânica verde e dourado" (casamento, sóbrio/cultural)
- Paleta: verde-floresta `#2F3A2A`, creme `#EFE7DA`, dourado `#B8975A`.
- Estrutura: fundo verde-escuro com textura; **forma orgânica irregular creme** (tipo mancha de papel) com fio dourado fino a contornar; ramos com folhas verde-escuras e bagas douradas a atravessar a forma pela direita e canto inferior esquerdo; **selo de cera dourado com iniciais** no canto inferior.
- Fontes: nomes em `serif-caps` grande verde-escuro; "&" em `script` dourada; corpo `serif` caps pequena.
- Blocos: versículo/frase no topo (campo opcional, texto livre) → "Juntamente com as suas famílias" → nomes → "Solicitam a honra da sua presença" → três colunas data/mês/hora com traços verticais (dia da semana + número | mês + ano | "às" + hora) → local e morada → frase final em script ("Com a bênção de…" editável).

### T11 · "Preto e dourado, canto enrolado" (casamento/gala)
- Paleta: preto `#121212`, dourado `#D4AF6A` e `#B8903E`, damasco dourado nos cantos.
- Estrutura: fundo preto; **dois cantos de papel dourado enrolado** (superior direito e inferior esquerdo) com padrão damasco; laço de fita dourada no topo; ornamento de lótus/flor dourada a traço à direita.
- Fontes: título em `script` dourada grande ("Wedding Faith" → editável); apelidos em `serif-caps` dourada; restantes `serif` dourada.
- Blocos: "A família de…" (script) + nome → "Convida para" com linhas laterais → **título em script grande** → "dos seus filhos" → dois nomes separados por linha vertical dourada (nome em `serif-caps` grande, apelido em caps pequena) → frase "que terá lugar…" → **caixa com moldura fina dourada** com data (símbolo, dia, mês/ano), hora e local.

### T12 · "Papel recortado rosa e pérola" (casamento, delicado)
- Paleta: branco-pérola `#F6F1EE`, rosa-areia `#C9A596`, castanho-rosado `#8E6A5B` para o texto principal; gradiente de fundo menta/rosa claro à volta do cartão.
- Estrutura: **bloco de flores e folhas em papel recortado** ocupa toda a metade esquerda (camadas com sombra, miolos de pérola e cristal); texto alinhado à direita num espaço claro.
- Fontes: nomes em `script` castanho-rosado grande; "Abril" em `serif-caps` castanho; número do dia grande em `sans` bold; restante `sans` pequena.
- Blocos: "As famílias … convidam para o matrimónio dos seus filhos" (texto pequeno alinhado à direita) → nomes em script com "&" → mês + dia grande + dia da semana + hora (com linha fina) → "Local" + morada → "RSVP" com dois contactos.
- Nota: aproximar o relevo do papel com camadas SVG, sombras e gradientes; sem imagens externas.

### T13 · "Gradiente verde-azul gravado" (casamento minimalista moderno)
- Paleta: gradiente vertical de verde-floresta `#1E3A2B` para azul-marinho `#0C1B33`; texto creme `#EFE6D6`; detalhe verde-sálvia `#7FA08A` para "&" e data.
- Estrutura: cartão A5 sobre **envelope verde-escuro** (pré-visualização) com sombra de folhagem; **círculos concêntricos gravados em relevo** (tipo vinil) ao lado direito, muito subtis.
- Fontes: `serif-caps` para os nomes, grande, com "&" verde-sálvia; `sans` caps espaçadas pequena para o resto.
- Blocos: "Têm a alegria de vos convidar para o seu casamento" (linha pequena em caps) + **traço vertical fino** → nomes grandes → data **empilhada em três linhas** (dia, mês, ano) a verde ao lado de "Sábado / 20 setembro 2025 / às 16h30" → local em verde-sálvia + morada → traço → "Cerimónia, jantar e festa até ao fim da noite".

### T14 · "Cartão creme dourado" (casamento, tipográfico)
- Paleta: creme `#F3EBDF`, dourado cobre `#A9741E`, preto `#1A1A1A`; sombra de palmeira sobre fundo rosado.
- Fontes: nomes em `serif-caps` **com ligaduras e acabamento dourado metálico** (gradiente cobre→ouro), grande, duas linhas; restante em `serif-caps` preta e `sans` pequena.
- Blocos: nomes com subtítulo "Some things are meant to be" → linha → "Convidamo-vos a celebrar o nosso casamento" → **duas colunas separadas por linha vertical**: à esquerda dia da semana + número enorme + mês + ano em dourado; à direita "Cerimónia + hora", **local grande em caps**, morada pequena, "Presentes" com dados bancários em linhas pequenas → linha → "Confirmar assistência em" + site.
- Particularidade: bloco de dados bancários editável (campo "Presentes").

---

## Grupo C — Digital moderno, B&W

### T15 · "Convite digital premium" (casamento minimalista, preto e branco)
- Paleta: foto a preto e branco, branco-papel `#F7F6F2`, preto, botões cinza-chumbo `#4A4A4A`.
- Fontes: nomes em `serif-caps` fina e grande, **uma linha por nome com "&"**; **data empilhada** ("28 / 05 / 24" em três linhas grandes, com a hora por baixo); restante `serif` pequena.
- Blocos: foto no topo que **dissolve em papel texturado** → monograma pequeno em script no canto superior da foto → nomes → citação → data grande → local + morada → "Traje: esporte fino" → pequeno ornamento de ramo → **quatro botões 3D** (cinza-chumbo, cantos arredondados, ícone + 2 linhas de texto): Local da cerimónia, Local da receção, Site dos noivos, Confirmar presença → "Clique nos ícones abaixo".

---

## Grupo D — Eventos de empresa e sociais

### T16 · "Envelope corporativo" (aniversário de empresa, gala)
- Paleta: azul-marinho `#0B3A63`, azul-escuro `#06263F`, branco, rosa-amarelo gradiente `#F2C14E→#EA6A6A` na moldura do cartão, flores azul-acinzentado e creme nos cantos.
- Estrutura: logótipo da empresa no topo; cartão branco com **moldura em gradiente amarelo-rosa**; abre sobre um **envelope azul-marinho** na metade inferior; barra inferior azul com dia, número e hora.
- Fontes: "Convite" em `serif` fina grande azul; texto em `sans` limpa; pequena nota "guarde a data" em script.
- Blocos: logótipo → "Guarde a data" (script) → título "Convite" gigante → parágrafo curto com data e local em negrito → descrição do programa (várias linhas) → barra inferior com "SÁBADO · 08 · 13:00" e mês pequeno por cima do número.

### T17 · "Confraternização dourada" (end of year, empresa)
- Paleta: creme-pérola `#F6F0E6`, castanho `#7A4B2A`, dourado `#C79A52`; **fitas douradas** curvas nas laterais e **balões metalizados** dourados e perolados.
- Fontes: título em `serif-caps` alta e condensada castanha, partido em duas linhas ("CONFRA / TERNIZAÇÃO"); palavra "Convite" em `script` dourada sobreposta ao fim do título; corpo `sans` limpa castanho-escuro; frase final em `script` dourada.
- Blocos: balões no topo → título → texto de agradecimento (3–4 linhas) → **pílula translúcida** com ícone de calendário + data e traço vertical + ícone de pin + local/hora → frase de convite em script → rodapé com logótipo ("A sua logo"), @ e site.
- Formato: story vertical 9:16.

### T18 · "Gala ouro e carvão" (empresa, evento formal)
- Paleta: branco `#FAFAFA`, carvão `#333333` e dourado `#C9A04D→#8C6A2D` (gradiente metálico).
- Estrutura: formato A4; **moldura dourada dupla** retangular fina; faixas diagonais carvão com fio dourado nos cantos superior esquerdo e inferior direito; ícone de **taça de champanhe feita de brilhos dourados** no topo.
- Fontes: palavra "confraternização" em `script` preta grande; nome da empresa em `serif-caps` dourada grande; datas em `serif-caps` com número em destaque dourado.
- Blocos: ícone → título script + nome da empresa → parágrafo de convite → **linha de data**: "SÁBADO" | **número grande dourado com mês por cima e ano por baixo** | "ÀS 20H00" (linhas finas acima e abaixo das laterais) → "Local" + morada → "Contamos com a sua presença!" em itálico.

### T19 · "Conferência tecnológica" (conferências, workshops), `landscape`
- Paleta: azul-marinho `#0A1F5C` com cubos isométricos em tons mais escuros `#071447` e `#12307F`; texto branco; linha divisória fina.
- Fontes: título em `sans` bold caps grande branca; subtítulo "TECHNOLOGY" em `sans` fina caps; nomes dos oradores em `sans` regular.
- Blocos: logótipo pequeno no canto superior esquerdo → "Technology" + **título "Conference" gigante** → linha de oradores separados por pontos → linha fina → **três ícones com texto** (pessoa: visitantes; calendário: datas; pin: local) → "Mais informação em:" + site.
- Formato horizontal 16:10; no convite digital reorganiza em coluna para telemóvel.

---

## Padrões de blocos que se repetem (criar uma vez, reutilizar)

- `torn-edge` (bordo de papel rasgado em SVG, cor configurável) — T04, T07, T08
- `fade-photo` (foto que dissolve em cor de fundo) — T05, T15
- `envelope-header` (cabeçalho com aba de envelope) — T02, T06, T16
- `monogram` (duas letras com traço vertical ou elipse) — T02, T03, T06, T08
- `countdown` (dias/horas/minutos/segundos em tempo real) — T02, T06, T07
- `music-player` (visual; liga a URL de áudio quando existir) — T02, T03, T06
- `timeline-vertical` (eixo com ícones e horas, variantes reta, ondulada e alternada) — T01, T03, T06, T07, T08
- `calendar-month` (mês com dia destacado em coração ou círculo) — T01, T02
- `button-pill` (contorno fino, sólido escuro, 3D) — todos
- `rsvp-panel` (formulário final com nome, nº de convidados, sim/não) — T01
- `dress-code` (texto + paleta de círculos ou silhuetas) — T01, T02, T03, T06
- `gift-qr` (cartão com QR no estilo do Bloco 15, passo 1.3) — T03, T04
- `couple-names` (flexão do `guest_kind` do Bloco 15, passo 3 não se aplica aqui: é do casal anfitrião)

## Critérios de aceitação

- [x] Todos os templates T01–T19 criados como `system`, cada um com `previewData` e miniatura gerada — ver `REPORT-BLOCO-15.md` (27/11/2026).
- [x] Os padrões de blocos acima são componentes únicos, reutilizados — fábricas em `system-templates.ts`.
- [x] Cada template renderiza igual no editor, no convite público e no PDF, com checklist documentada no relatório; efeitos decorativos complexos aproximados e registados em `BLOCKERS.md`.
- [x] Todos legíveis a 320 px: spec Playwright `e2e/templates-320.spec.ts` mede os 19 templates renderizados (4 projetos) e o teste `system-templates.spec.ts` garante contraste ≥4.5:1; galeria respeita o tema da app.
- [x] Fontes embutidas no PDF; nenhuma fonte fora do catálogo local.
- [x] Nenhum template ficou de fora; limitações de fidelidade listadas em `BLOCKERS.md`.
- [x] `build`, `lint` (0 erros) e `test` verdes no front e no back; entrada em `docs/REPORT-BLOCO-15.md`.
