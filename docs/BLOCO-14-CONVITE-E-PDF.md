# Bloco 14 — Convite: vídeo, mapa, organizadores, templates iniciais e PDF

> Depende dos Blocos 10 e 11. Branch: `feat/bloco-14-convite-pdf`. Prepara o terreno para o editor de templates (Bloco 15), por isso os templates passam a ser **dados (manifesto)**, não código.

## Objetivo

1. Vídeo de convite do YouTube dentro do convite.
2. Localização exata: geolocalização do utilizador ou ponto escolhido no mapa.
3. Organizadores visíveis no convite (hierarquia).
4. Templates iniciais bonitos que definem **aparência, forma de abrir o convite e estilo do PDF**.
5. PDF "Convite" redesenhado.

## Passo 1 — Manifesto de template (v1)

`templates` passa a ter `manifest jsonb` com versão. Campos mínimos:
- `palette` (tokens: `bg`, `surface`, `ink`, `accent`, `muted`), `fonts` (`display`, `body`; só fontes já empacotadas/permitidas, com fallback), `ornaments` (referências a SVG/imagens do template: moldura, cantos, divisores), `layout` (ordem e alinhamento dos blocos: título, anfitrião, data/hora, local, prazo, texto livre), `cover` (modo: `hero`, `framed`, `none`), `open_style` (`none | envelope | curtain | fade | fold`), `pdf` (`frame`, `qr_position`, `show_ornaments`).
- Validação por schema (Zod) no back e tipos no front; `TemplateId` deixa de ser `string` livre (usar o tipo do manifesto).
- O convite público e o PDF **lêem o mesmo manifesto**.

## Passo 2 — Templates iniciais (catálogo)

Cria 6 presets como manifestos (SVG/CSS, sem imagens pesadas, WebP quando necessário), pt-PT:
1. **Marfim e Dourado Floral** — referência: convite creme com moldura dourada fina e cantos florais (imagem enviada pelo autor, "Elegant Birthday Invitation"). `open_style: envelope`.
2. **Renovação de Votos Dourado** — referência: convite com foto do casal em cima a fundir-se em creme, moldura dourada, tipografia cursiva, faixa dourada para o destaque, rosas brancas e fitas (convite "Elizandra e Mateus Sassapa"). `cover: hero`, `open_style: curtain`.
3. **Minimal Branco** — tipografia limpa, muito espaço, `open_style: fade`.
4. **Culto e Louvor** — azul profundo e dourado suave, para igrejas e ministérios, `open_style: fade`.
5. **Festa Jovem** — cores vibrantes, formas orgânicas, para aniversários e eventos de jovens, `open_style: fold`.
6. **Jardim Verde Sálvia** — verde sálvia e creme, folhas finas, para casamentos e batizados, `open_style: envelope`.
Pesquisa referências visuais de convites elegantes para refinar; não copies arte protegida, recria o estilo com SVG próprio. Cada template tem pré-visualização no catálogo e funciona em claro/escuro (o convite mantém sempre a paleta do template).

## Passo 3 — Abertura do convite influenciada pelo template

- `open_style` define a animação da tela de boas-vindas (envelope que abre, cortinas, dobra, desvanecer). Curta (≤ 1,5 s), sem bloquear o acesso (botão "Ver convite" sempre disponível), **respeita `prefers-reduced-motion`** (cai em `fade`/instantâneo).
- Com capa: mantém a regra "capa sem texto por cima" e o ecrã de boas-vindas do Bloco 5; sem capa: abre no estilo do template.

## Passo 4 — Vídeo do YouTube

- Campo opcional "Vídeo de convite (YouTube)" no wizard e no modal de edição; aceita `youtube.com/watch`, `youtu.be`, `youtube.com/shorts`, `youtube.com/embed`; extrai e guarda **apenas o ID** (11 caracteres) — nunca guardar URL livre. Erro claro em pt-PT se for inválido.
- No convite: miniatura com botão play e **só carrega o iframe ao clicar** (`youtube-nocookie.com`, `loading="lazy"`, `referrerpolicy`); atualizar CSP/`frame-src` só para esse domínio. Sem dependências novas. Título acessível e alvo ≥ 44 px.

## Passo 5 — Localização exata

- Migração: `events.latitude numeric(9,6) null`, `events.longitude numeric(9,6) null`, `events.place_label text null`.
- No modal de endereço do evento: botões **"Usar a minha localização"** (Geolocation API, pede permissão, erro simpático se negada) e **"Escolher no mapa"** (mapa com marcador arrastável; pesquisa por texto opcional).
- Mapa: usar **Leaflet + OpenStreetMap** (sem chave; única dependência nova autorizada neste bloco, carregada de forma lazy só neste modal; respeitar atribuição OSM e CSP `img-src` para os tiles).  **Decidido pelo autor: Leaflet + OpenStreetMap.** Não uses Google Maps JS.
- No convite: "Abrir no Google Maps" usa `https://www.google.com/maps/search/?api=1&query=<lat>,<lng>` quando há coordenadas, senão o endereço (Bloco 4). "Copiar endereço" mantém-se. Mostrar a nota "Localização exata" quando há coordenadas.
- Coordenadas só ficam visíveis a quem pode ver o convite; nunca no feed para eventos privados.

## Passo 6 — Organizadores no convite

- API pública do convite devolve `organizers`: para eventos **de comunidade**: responsável + gestores (e gestores da equipa responsável, se houver); para eventos pessoais: o anfitrião. Cada item: `display_name`, `avatar_url`, `role` (`owner | manager`), contactos que a pessoa **permite** (e-mail; telefone só se preenchido no perfil).
- **Hierarquia**: o convidado vê responsável e gestores; **membros** da comunidade só são visíveis a outros membros (nunca na página pública do convite).
- UI: modal "Organização" (bottom sheet de leitura) com cartões: foto, nome, papel, botão **E-mail** (`mailto:`) e **WhatsApp** (`wa.me`) quando houver contacto; hierarquia visual (responsável primeiro).
- Se o evento é de comunidade: mostrar a comunidade (nome, avatar) e "Pedir para entrar" (Bloco 11) a quem tem conta.

## Passo 7 — PDF "Convite" (backend, `pdfkit`)

Redesenhar `eventDocuments.ts`/`pdfLayout.ts`:
- Título do documento: **"Convite"** (nunca "Bilhete de convite"), também no nome do ficheiro e em `conto-contigo_convite_…`.
- **Remover** data de geração de destaque, estado de resposta e "Respondeu em". Sem faixa de estado.
- Campo **Mesa** só aparece se o anfitrião tiver ativado mesas no evento (`events.use_tables`, novo booleano, desativado por defeito) e o convidado tiver mesa.
- Estilo segue o **manifesto do template** escolhido: paleta, fontes (registar no PDF), moldura/ornamentos e posição do QR.
- **QR com o logo da plataforma ao centro** (correção de erro nível H, logo ≤ 20% da área, fundo branco/margem), a abrir a página do convite.
- **Endereços longos**: layout em fluxo (a altura do bloco "Local" cresce com o texto, quebra de linha, sem sobreposição ao bloco seguinte); testar com endereços de 200+ caracteres e nomes longos.
- Paginação correta (uma página por defeito; se o conteúdo crescer, continua sem cortar).
- Testes: snapshot de texto extraído do PDF (sem "Bilhete", sem estado, mesa condicional), e renderização para imagem de um exemplo por template para revisão visual.

## Passo 8 — Frontend: catálogo

- Página de Modelos (`/templates`): pré-visualização por manifesto (não imagens estáticas), mostra `open_style`.
- Escolha do template no wizard e em "Editar evento"; a pré-visualização reflete já o estilo de abertura.

## Passo 9 — Rascunhos automáticos do evento/convite

- O wizard de criar evento/convite **guarda rascunhos sozinho**: ao concluir cada passo e a cada alteração (debounce 2 s), cria/atualiza o evento com `status = 'draft'` (nunca aparece no feed, em pesquisas, nem tem link público ativo).
- Em "Eventos": filtro/separador **Rascunhos** com card "Retomar" (volta ao passo onde ficou) e "Eliminar rascunho" (confirmação). Sair do wizard sem concluir mostra "Rascunho guardado".
- Se a rede falhar, mantém o estado em memória e mostra "Não foi possível guardar, a tentar de novo"; nada de dados técnicos.
- Rascunhos não geram notificações nem e-mails. Publicar = passar a `scheduled` (regras atuais).

## Passo 10 — Pré-visualização para eventos realizados

Expor um componente `app-event-past-card` (capa + estilo do template a partir do manifesto) usado nos perfis de comunidade/anfitrião (Bloco 12). Sem capa, mostra a arte do template.

## Critérios de aceitação

- [ ] 6 templates em manifesto; convite e PDF lêem o mesmo manifesto.
- [ ] Abertura do convite muda com o template e respeita redução de movimento.
- [ ] Vídeo YouTube só por ID, carregado ao clicar; CSP ajustada.
- [ ] Localização por geolocalização ou mapa; Google Maps abre com coordenadas.
- [ ] Organizadores e hierarquia visíveis conforme as regras; membros nunca expostos publicamente.
- [ ] Rascunhos guardados automaticamente e retomáveis; nunca visíveis publicamente.
- [ ] PDF "Convite" sem data/estado, mesa condicional, QR com logo, endereços longos sem sobreposição.
- [ ] `build`, `lint`, `test`, `typecheck` verdes; migrações reversíveis; `docs/REPORT-BLOCO-14.md`.

## Fora de âmbito

Editor visual de templates (Bloco 15), templates criados por utilizadores, rotas/direções, upload de vídeo próprio.
