# Bloco 16 — Convite do template, sombras padrão, botão flutuante e várias localizações

> Lê primeiro `REGRAS-GERAIS.md`, `docs/AUDIT.md`, `docs/REPORT-BLOCO-15.md` e `docs/BLOCKERS.md`. Depende do Bloco 15 (manifesto v2, `TemplateRenderer`, catálogo T01–T19, Gratitude). Branch: `feat/bloco-16-convite-template` (front e back), criada a partir de `feat/bloco-15-templates`.
> Os caminhos e nomes de ficheiros vêm dos relatórios anteriores e **podem estar desatualizados**: confirma sempre no código real antes de editar. Commits pequenos, um por passo, em inglês. Sem push, merge ou rebase.
> Textos visíveis em pt-PT, com chaves `pt-AO`/`en` em `block16-keys.ts` registado em `translations.ts`. Sem texto hardcoded em templates. Sem dependências novas (o `maplibre-gl` já existe no projeto: confirma em `package.json`).

## Objetivo

1. Uma **sombra padrão, suave**, em toda a aplicação (cards, botões, painéis, menus). Nada de sombras exageradas.
2. A área do convite passa a ser **100% do cliente e do template**: layout, cores, botões Vou/Não vou, ecrã de boas-vindas e modais seguem a paleta do template. Sem logo nem estilo da plataforma.
3. O ecrã de boas-vindas **sem capa** mostra a arte do próprio template (hoje, no Gratitude, aparece um cartão genérico).
4. **Botão flutuante** no estilo do template que abre todas as informações extras.
5. **Várias localizações** por evento, com uma principal.
6. **Mapa atualizado**, grátis e fácil de usar (MapLibre).
7. O QR passa a ter o logo da plataforma ao centro (hoje aparece uma estrela).

## Regras de produto (decididas pelo autor; não alterar)

- A área do convite é do cliente. O logo da plataforma **só aparece no centro do QR**. Não há alternador claro/escuro no convite (o convite mantém sempre a paleta do template). O idioma pode ficar como um ícone discreto, na cor do template.
- O botão de aceitar, o de recusar, os modais e o botão flutuante usam as cores do template.
- Várias localizações: o anfitrião define **qual é a principal**; só a principal aparece no convite (no bloco de local do template). As outras aparecem ao tocar no ícone de localização, numa lista.
- Cada localização tem o **endereço como título**.
- "Abrir no Google Maps": se houver coordenadas escolhidas no mapa, abre nessas coordenadas; se não houver, pesquisa pelo texto do endereço.
- Sombras: um único estilo suave. O objetivo não é parecer tudo sombreado, é parecer leve.

---

## Passo 1 — Sombras padrão (global, independente do resto)

**Problema:** há sombras demasiado fortes e desiguais entre componentes.

1. **Auditar** (`grep` em `src/**/*.{ts,html,css}`): `shadow-`, `box-shadow`, `drop-shadow`, `--shadow`. Escreve em `docs/DECISIONS.md` uma tabela ficheiro → sombra antes → sombra depois.
2. **Tokens únicos** (em `src/styles/brand-tokens.css` e `src/styles.css`; confirma onde estão hoje `--cc-shadow-card` e `--ap-shadow-card`). Valores de partida, a ajustar a olho mas **nunca acima dos limites**:

| Token | Uso | Claro | Escuro |
|---|---|---|---|
| `--shadow-card` | cards, painéis, listas, stat-card, person-card, inputs elevados | `0 1px 2px rgb(15 61 62 / .05), 0 2px 8px rgb(15 61 62 / .05)` | `0 1px 2px rgb(0 0 0 / .30)` (a borda faz o trabalho) |
| `--shadow-pop` | só o que **flutua** sobre o conteúdo: menu de ações, popover, modal, toast, FAB, barra inferior flutuante | `0 2px 4px rgb(15 61 62 / .06), 0 8px 20px rgb(15 61 62 / .10)` | `0 4px 16px rgb(0 0 0 / .40)` |

   Limites: `--shadow-card` com desfoque ≤ 8 px e opacidade ≤ .06 no claro; `--shadow-pop` com desfoque ≤ 20 px e opacidade ≤ .12 no claro. Nenhum outro nível.
3. **Tailwind v4:** em `@theme`, repõe a escala por omissão (`--shadow-*: initial;`) se a versão o permitir, e define só `--shadow-card` e `--shadow-pop` (utilitários `shadow-card` e `shadow-pop`). Se não for possível repor, proíbe o resto por teste (ponto 5).
4. **Regras de aplicação:**
   - Cards e painéis: `shadow-card`.
   - **Botões e chips: sem sombra** (a cor e a borda bastam), incluindo `ui-btn`, `ui-btn-secondary`, `ui-chip`, `ui-icon-button`.
   - Menu de ações, popover, modal, toast, FAB e barra flutuante: `shadow-pop`.
   - **Hover não aumenta a sombra** (pode mudar a borda ou `-translate-y-0.5`).
   - Sem sombras coloridas (`shadow-brand/30` e semelhantes) nem `shadow-[...]` arbitrários.
5. **Teste anti-regressão** `src/app/shadow-policy.spec.ts` (Vitest): percorre `src/**/*.{ts,html,css}` e falha se encontrar `shadow-(xs|sm|md|lg|xl|2xl|inner)`, `shadow-\[` ou `shadow-<cor>/…`, exceto numa lista de exceções documentada no próprio teste (cada exceção com motivo).
6. Ordem de trabalho: componentes partilhados primeiro (`stat-card`, `person-card`, `modal`, `action-menu`, `event-card`, cartões do feed, toast, FAB, barra inferior), depois páginas.

**Aceitação:** `shadow-policy.spec.ts` verde; tabela em `DECISIONS.md`; verificação visual em 360 px e 1440 px, claro e escuro (regista em `REPORT-BLOCO-16.md`).

---

## Passo 2 — Casca do convite tematizada (sem plataforma)

Aplica-se a `/convite/:token`, `/i/:token` e, pelo mesmo motivo, a `/e/:slug` (evento público: reutiliza as mesmas `parts/`). Em `/e/:slug`, o convite a entrar/criar conta é um link de texto discreto na cor do template, sem logo.

1. **Variáveis do template.** Cria `InvitationShellComponent` (`features/invitation/`) que lê o manifesto e define no elemento raiz:
   `--inv-bg`, `--inv-surface`, `--inv-ink`, `--inv-muted`, `--inv-accent`, `--inv-accent-ink` (texto sobre o destaque: preto ou branco, escolhido por contraste), `--inv-line` (mistura de `ink` a 15% sobre `bg`).
   Valores em falta no manifesto: deriva por omissão segura. **Contraste ≥ 4.5:1** em `ink/bg`, `muted/bg` e `accent-ink/accent`; reutiliza a função de contraste que já existe em `system-templates.spec.ts`.
2. **Remove** do convite: o cabeçalho com `app-brand` e `app-preference-controls` (logo, tema). Mantém o idioma como ícone discreto (`inv-lang`), 44 px, na cor do template.
3. **Fundo e meta:** a página inteira usa `--inv-bg` (incluindo a área de overscroll no mobile) e atualiza `<meta name="theme-color">` para essa cor (só no browser, com `isPlatformBrowser`).
4. **Utilitários locais** (prefixo `inv-`, só para `features/invitation/**`): `inv-btn` (primário, fundo `--inv-accent`, texto `--inv-accent-ink`), `inv-btn-secondary` (contorno `--inv-ink`), `inv-chip`, `inv-fab`. Altura mínima 44 px, sem sombra nos botões, `shadow-pop` só no FAB e na barra flutuante.
5. **Migra** para as variáveis `--inv-*`: `invitation-welcome`, `invitation-hero`, `invitation-key-info`, `invitation-rsvp` (barra fixa em mobile), `invitation-details-*`, `invitation-location-dialog`, `invitation-host-dialog`, `invitation-rsvp-dialog`, `invitation-share`, `invitation-reply`, `invitation-organizers`, `invitation-video`, `invitation-cancelled`.
6. **Modais dentro do convite** herdam as variáveis. Confirma se o `app-modal` monta o painel dentro da árvore do convite; se montar fora (portal), acrescenta um input `cssVars` ao `app-modal` e passa as variáveis.
7. **Estados sem template** (a carregar, link inativo): estilo neutro, sem logo. O link inativo continua com a mensagem genérica "Este convite já não está ativo." e **não pode revelar o motivo**. O estado "Evento cancelado" usa a paleta do template quando existir.
8. **Teste de política** `invitation-theme.spec.ts`: falha se `features/invitation/**` contiver classes de tema da plataforma (`bg-surface`, `bg-surface-raised`, `text-ink`, `text-muted`, `border-line`, `text-brand`, `bg-brand`, `shadow-card`, `ui-btn`).

**Aceitação:** em `/convite/:token` não existe logo da plataforma nem alternador de tema; os botões Vou/Não vou têm a cor de destaque do template (verificado por `getComputedStyle` no Playwright); `invitation-theme.spec.ts` verde.

---

## Passo 3 — Boas-vindas com a arte do template

**Problema:** sem capa, o ecrã de boas-vindas mostra um cartão genérico (creme com cantos dourados) e um cartão branco no estilo da plataforma. O Gratitude não aparece.

1. `TemplateRenderer` ganha um modo `mode: 'full' | 'cover'`. No modo `cover` desenha só: ornamentos/molduras/fitas, bloco de organização, subtítulo, título e linha de destaque (ano). Não desenha linha de informação, QR, dress code nem botões.
2. Cada bloco do documento do template pode ter `showInCover?: boolean`. Por omissão são `true` os blocos de ornamento, organização, subtítulo, título, destaque e anfitrião; `false` os restantes. Se um template não declarar nada, usa estes valores por omissão.
3. `InvitationWelcomeComponent`:
   - **Sem capa:** mostra o `TemplateRenderer` em modo `cover`, com os dados reais do evento. No Gratitude: as duas fitas africanas, o título com o padrão e o ano.
   - **Com capa:** mantém a regra "capa sem texto por cima", agora sobre `--inv-bg` e com o botão no estilo `inv-btn`.
   - Por baixo da arte: a saudação "Olá, {nome}!" (via `guestAddress`) em `--inv-ink`, e o botão **"Ver convite"** em `inv-btn`.
   - O `open_style` do manifesto continua a definir a animação (≤ 1,5 s, `prefers-reduced-motion` respeitado; o botão está sempre disponível).
4. Remove o cartão branco e o cartão genérico do ecrã de boas-vindas.
5. **Verifica a origem de "ALGO" e "CELEBRAÇÃO DE CASAMENTO"** no Gratitude do exemplo: se o subtítulo estiver a vir do tipo do evento em vez do campo editável "Subtítulo", corrige o mapeamento e regista em `DECISIONS.md`.

**Aceitação:** teste de componente: o ecrã de boas-vindas do Gratitude sem capa contém os ornamentos SVG das fitas e o título com padrão, e nenhuma classe da plataforma. Captura Playwright em 360 e 1440 px.

---

## Passo 4 — Convite principal e botão flutuante "Mais informações"

1. **Vista principal** = o convite do template + a barra Vou/Não vou.
   - Mobile: o cartaz (4:5) limita-se a `max-height: calc(100dvh − altura da barra RSVP − margens)` mantendo a proporção e fica centrado, para caber num só ecrã quando a altura o permitir. Templates em tira (`strip`) fazem scroll normal.
   - Desktop: cartaz centrado, barra RSVP por baixo, dentro do fluxo.
2. **Botão flutuante** (`inv-fab`): pílula com ícone de informação e o texto "Mais informações" (só ícone abaixo de 360 px), canto inferior direito, acima da barra RSVP (`bottom: calc(env(safe-area-inset-bottom) + altura da barra + 12px)`), `--inv-accent` / `--inv-accent-ink`, `shadow-pop`, `aria-haspopup="dialog"`, alvo ≥ 48 px. Aparece sempre (há sempre "Partilhar").
3. Toca → **folha de leitura** (`app-modal presentation="sheet"`, tematizada) com as secções que tiverem conteúdo, por esta ordem:
   1. **Locais** (lista completa; Passo 7)
   2. **Vídeo de convite** (miniatura + play; o iframe `youtube-nocookie.com` só carrega ao clicar)
   3. **Organização** (responsável e gestores, regras do Bloco 14)
   4. **Mensagem do anfitrião**
   5. **Regras e dress code**
   6. **Contribuição / presentes**
   7. **Partilhar** (copiar link do convite, WhatsApp)
   8. **Lembretes e privacidade** (o que existe hoje em "Mais detalhes")

   No topo da folha, chips de atalho (scroll horizontal, sem barra visível) que saltam para cada secção.
4. **Substitui** `invitation-details-menu` + `invitation-details-dialog` e remove o cartão "Partilhar convite" do ecrã principal (passa para a secção 7). Os ícones do template (anfitrião, local) continuam a abrir os respetivos modais.
5. Tudo o que o evento tem e **não** está num bloco visível do template aparece nesta folha. Nada se perde.

**Aceitação:** em 360×640 o Gratitude (cartaz + barra) cabe num só ecrã; o FAB abre a folha com as secções certas; Escape, toque fora e botão fecham; foco devolvido ao FAB.

---

## Passo 5 — QR com o logo da plataforma

1. **Encontra de onde vem a estrela** no centro do QR (candidatos: `gratitude-invitation.component.ts`, `shared/utils/qr-svg.util.ts`, o bloco QR do `TemplateRenderer`, e `drawQrWithLogo` em `invitationDocument.ts` no back). Regista a causa em `DECISIONS.md`.
2. O centro do QR passa a ser o **símbolo do pin com sorriso** (asset de marca existente, em SVG), sobre fundo branco com margem, ocupando **≤ 20% da área do QR**, com correção de erros H. Digital e PDF iguais.
3. `manifest.pdf.qr_icon` existente: valor por omissão `platform`; mantém as opções `none` e imagem própria.
4. O QR é o **único** sítio da área do convite onde aparece a marca.

**Aceitação:** teste unitário: o SVG do QR contém o logo (`data-qr-logo`) com razão de área ≤ 0,2 e correção H; recomenda-se confirmar à mão com `zbarimg` num PDF e no ecrã. Regista o resultado.

---

## Passo 6 — Backend: várias localizações

### 6.1 Modelo (migração reversível, número seguinte livre)

Tabela `event_locations`:

| Coluna | Tipo / regra |
|---|---|
| `id` | `uuid` PK |
| `event_id` | `uuid` NOT NULL, FK `events` `ON DELETE CASCADE` |
| `position` | `smallint` NOT NULL (ordem na lista) |
| `is_primary` | `boolean` NOT NULL DEFAULT false |
| `kind` | `text` NOT NULL DEFAULT `'venue'`, `CHECK IN ('venue','online')` |
| `address` | `text` null: **é o título da localização** (3–240 caracteres quando `kind='venue'`) |
| `venue_name` | `text` null (nome do local, opcional, ≤ 120) |
| `label` | `text` null (etiqueta curta opcional, ex.: "Cerimónia civil", ≤ 40) |
| `starts_at` | `timestamptz` null (hora desta localização, opcional; mostrada no fuso do evento) |
| `city` | `text` null |
| `latitude`, `longitude` | `numeric(9,6)` null |
| `online_url` | `text` null (obrigatório se `kind='online'`, só `https`) |
| `created_at` | `timestamptz` NOT NULL DEFAULT now() |

Restrições: `CHECK ((latitude IS NULL) = (longitude IS NULL))`, latitude −90..90, longitude −180..180; índice único parcial `ON event_locations(event_id) WHERE is_primary`. **Máximo de 5 por evento** (validado no serviço, dentro da transação).

### 6.2 Compatibilidade (não partir nada)

- **Mantém** as colunas atuais de localização em `events` (venue, city, endereço, `latitude`, `longitude`, `place_label`, `online_url`; confirma os nomes reais). Passam a ser **espelho da localização principal**, atualizado na mesma transação sempre que a principal muda. Feed, pesquisa, e-mails, relatórios e PDF antigo continuam a funcionar.
- **Backfill:** um registo `is_primary = true` por evento que tenha dados de localização. `down`: apaga a tabela (o espelho em `events` guarda a principal, por isso nada se perde).
- **Mudar de principal:** na mesma transação, primeiro limpa `is_primary`, depois define a nova (por causa do índice único).

### 6.3 API

- Criar/editar evento e `event_drafts`: novo campo `locations: LocationInput[]` (0–5). O campo antigo `location` continua aceite: se `locations` não vier, é tratado como `[principal]`.
- Regras: se houver localizações, **exatamente uma principal**. Se nenhuma vier marcada, a primeira passa a principal; se vier mais de uma, `422` com campo `locations`. Remover a principal promove a primeira restante. `PATCH` com `locations` **substitui a lista** numa transação (mantém `id` quando enviado).
- DTO público e do anfitrião: `locations[]` com a **principal primeiro**; cada item traz `id`, `is_primary`, `kind`, `address`, `venue_name`, `label`, `starts_at`, `city`, `latitude`, `longitude`, `online_url`, `maps_url`. O campo `location` antigo mantém-se (= principal).
- `maps_url` calculado no back por `utils/maps.util.ts` (e igual função no front, com os **mesmos casos de teste**):
  - com coordenadas: `https://www.google.com/maps/search/?api=1&query=<lat>,<lng>` (6 casas decimais, ponto decimal, independente do locale);
  - sem coordenadas, com endereço: `…&query=<encodeURIComponent([address, city].filter(Boolean).join(', '))>`;
  - nada disto: `null` (o botão não aparece);
  - `kind='online'`: sem `maps_url`; o botão é "Abrir link" para `online_url`.
- **Privacidade:** coordenadas e lista completa só a quem pode ver o convite/evento. O feed e as pesquisas continuam a mostrar só a principal e **nunca** coordenadas de eventos privados.
- O PDF e os e-mails usam a principal (Passo 9).

### 6.4 Testes (back)

Migração `up → down → up` com o `runner` real do `node-pg-migrate` (padrão de `tests/bloco15b.migration.test.ts`); uma só principal; máximo de 5; promoção ao remover a principal; entrada legada `location`; espelho sincronizado; DTO com principal primeiro; privacidade; `maps.util` (com e sem coordenadas, caracteres especiais, vazio).

---

## Passo 7 — Frontend: localizações

### 7.1 No convite

1. `EventLocation` e os mapeadores passam a ter `locations[]`; `location` fica como vista da principal.
2. **Bloco de local do template** (no Gratitude, a coluna `LOCAL:`): mostra a principal (nome do local ou endereço, com a quebra em 2–3 linhas que já existe). Se houver mais de uma, acrescenta uma linha pequena "+N locais" na cor de destaque.
3. **Tocar no ícone/coluna de local** abre `invitation-locations-dialog` (folha de leitura, tematizada): lista com a **principal primeiro** e o selo "Principal". Cada cartão:
   - **título = endereço** (negrito);
   - por cima, a etiqueta como chip (se existir) e a hora (se existir);
   - por baixo, o nome do local e a cidade (se existirem);
   - botões **"Abrir no Google Maps"** (`maps_url`, `target="_blank"`, `rel="noopener noreferrer"`) e **"Copiar endereço"**; para `online`, "Abrir link".
   Com uma só localização abre diretamente esse cartão. Sem mapa embebido na vista do convidado (mantém a página leve).

### 7.2 Para o anfitrião (UI mínima; o Bloco 17 redesenha a edição)

Na criação e no modal de edição do evento, a secção "Local" passa a **"Locais"**:
- Lista de cartões, cada um com o endereço como título, etiqueta/hora se existirem, selo "Principal", e um aviso discreto: "Localização exata" (se tem coordenadas) ou "Sem ponto no mapa: o Google Maps vai pesquisar pelo endereço".
- "Adicionar local" (até 5), subir/descer por botões de 44 px (sem arrastar), "Definir como principal", "Remover" (confirmação; se for a principal e houver outras, avisa que a primeira restante passa a principal).
- Editar/adicionar abre `location-edit-dialog` (`dialog`, ações no fim do formulário): tipo (Presencial/Online); **endereço** (campo de texto com pesquisa); botões "Usar a minha localização" e "Escolher no mapa" (Passo 8); nome do local, etiqueta e hora opcionais.
- Um evento sem localização continua a ser possível, como hoje.

**Aceitação:** adicionar 3 locais, mudar a principal, e ver no convite só a principal no template e os 3 na lista; o link do Google Maps usa coordenadas quando existem e o texto quando não existem.

---

## Passo 8 — Mapa atualizado (MapLibre + OpenFreeMap)

O mapa atual está desatualizado. O código já importa `maplibre-gl` (aviso de CommonJS no build) em `shared/components/location-map.component.ts`, e a spec do Bloco 14 falava em Leaflet/Google Maps: **primeiro descobre o que está realmente em uso** (`map-picker-dialog.component.ts`, `location-map.component.ts`, `environment*.ts`) e regista em `DECISIONS.md`. Depois unifica.

1. **Biblioteca:** `maplibre-gl` (já instalada). Não subas de versão principal sem necessidade.
2. **Estilo/tiles:** estilo vetorial público do **OpenFreeMap**, sem chave e sem registo: `https://tiles.openfreemap.org/styles/liberty` (alternativas `bright` e `positron`; usa `liberty` por omissão, mais legível em telemóvel). Dados do OpenStreetMap.
   - O serviço público é gratuito mas "as-is" e pode mudar: guarda o URL em `environment` (`mapStyleUrl`) para trocar de fornecedor sem tocar no código.
   - **Atribuição visível** (controlo compacto do MapLibre); não a cubras nem a removas.
   - Não uses `tile.openstreetmap.org` (política de uso).
3. **Carregamento:** `await import('maplibre-gl')` e o CSS só quando o mapa abre; nunca no bundle inicial; só no browser (`isPlatformBrowser`). Acrescenta `maplibre-gl` a `allowedCommonJsDependencies` em `angular.json` para silenciar o aviso. `map.remove()` ao fechar.
4. **Seletor de ponto** (`MapPickerDialogComponent`, `dialog`):
   - abre centrado no ponto existente; senão na posição do utilizador (se permitida); senão em Luanda (−8.8383, 13.2344);
   - **tocar no mapa move o marcador**; o marcador também é arrastável;
   - botões próprios de zoom (+/−, 44 px) e "Usar a minha localização" (Geolocation API; erro simpático se negada);
   - caixa de pesquisa por texto usando o serviço de geocodificação que o back **já tem** (`geocode.service.ts`). **Não mudes de fornecedor nem acrescentes chaves.** Se o geocoding falhar, o seletor continua a funcionar por toque/arrastar;
   - "Confirmar" devolve `latitude`/`longitude` com 6 casas e, se o endereço estiver vazio, sugere o endereço obtido por geocodificação inversa (preenche só o que estiver vazio, nunca sobrescreve o que o utilizador escreveu); "Remover ponto" limpa as coordenadas.
5. Estados: a carregar o mapa (skeleton), erro de rede ("Não foi possível carregar o mapa. Pode escrever o endereço.") e sucesso. Sem detalhes técnicos.
6. Acessibilidade: o mapa nunca é a única forma de indicar o local (o endereço escrito basta); `aria-label` nos controlos.
7. Testes: `maplibre-gl` mockado (o jsdom não tem WebGL): abre/fecha, `remove()` chamado, coordenadas devolvidas com 6 casas, "Remover ponto" limpa.

**Aceitação:** o seletor abre com o estilo OpenFreeMap, escolhe-se um ponto por toque e por arrastar, e o ponto aparece em "Localização exata". Verificação manual em 360 px e desktop.

---

## Passo 9 — Consumidores: PDF, e-mails, feed

- **PDF** (`invitationDocument.ts`): a coluna de local usa a principal (nome ou endereço); com mais de uma, acrescenta "+N locais — ver no convite". Nos formatos com espaço (tira/A4), lista todas com etiqueta e hora, em fluxo, sem sobreposição. Acrescenta ao teste de endereços longos o caso "3 locais, um com 200+ caracteres". No Gratitude: principal + "+N locais" na coluna `LOCAL:`.
- **E-mails de convite:** a principal, com "(+N locais)" quando existirem.
- **Feed, cards de evento, relatórios/CSV:** a principal.

---

## Passo 10 — Verificação e documentação

- Front: `npm run build`, `npm run lint` (0 erros), `npm test -- --watch=false`, `npx tsc --noEmit`, `npm run e2e:typecheck`.
- Back: `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`; migração `up → down → up`.
- Playwright (reutiliza a rota auto-contida `__test/templates` para não depender de credenciais; acrescenta uma variante de convite com dados do Gratitude): 360×640 e 1440×900; sem logo nem alternador de tema; botões na cor do template; FAB visível e a abrir a folha; lista de 3 locais com "Principal" primeiro; `maps_url` com coordenadas.
- Atualiza o guia "Criar um evento e o convite" em `src/content/docs/` (várias localizações, principal) e `docs/GUIA-UTILIZADOR.md`.
- Escreve `docs/REPORT-BLOCO-16.md` (critérios com ✔/✘ e evidência, commits, comandos), atualiza `DECISIONS.md` e `BLOCKERS.md`, e acrescenta uma linha ao `REPORT-FINAL.md`.

## Critérios de aceitação finais

- [ ] Sombras: só `--shadow-card` e `--shadow-pop`; botões sem sombra; `shadow-policy.spec.ts` verde; tabela em `DECISIONS.md`.
- [ ] Convite sem logo nem alternador de tema; todo o layout, botões e modais com as variáveis `--inv-*` (contraste ≥ 4.5:1); `invitation-theme.spec.ts` verde.
- [ ] Boas-vindas sem capa com a arte do template (Gratitude com fitas e título com padrão).
- [ ] Botão flutuante "Mais informações" com folha de secções; o convite principal do Gratitude cabe num ecrã em 360×640.
- [ ] QR com o logo da plataforma (≤ 20%); causa da estrela registada.
- [ ] Várias localizações: uma principal; título = endereço; só a principal no template; lista completa ao tocar no ícone; máximo 5.
- [ ] "Abrir no Google Maps" com coordenadas quando existem, com o texto do endereço quando não.
- [ ] Mapa MapLibre + OpenFreeMap, carregado de forma lazy, com atribuição visível e `mapStyleUrl` configurável.
- [ ] Migração reversível; compatibilidade com o campo `location` antigo; privacidade das coordenadas.
- [ ] PDF e e-mails coerentes com a principal; teste de endereços longos com 3 locais.
- [ ] `build`, `lint`, `test`, `typecheck` (front e back) verdes; `docs/REPORT-BLOCO-16.md` escrito.

## Fora de âmbito

Editor "desenhar o convite" (Bloco 17), mapa interativo na vista do convidado, rotas e direções, locais em dias diferentes (eventos de vários dias), reordenar por arrastar, upload de ornamentos próprios, trocar o fornecedor de geocodificação.
