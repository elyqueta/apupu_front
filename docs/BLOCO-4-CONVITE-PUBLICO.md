# Bloco 4 — Convite público (informação essencial, modais, prazos)

> Lê primeiro `REGRAS-GERAIS.md` e `docs/AUDIT.md` (secções 5, 9 e 10). Depende do Bloco 1 (`app-modal`). Branch: `feat/bloco-4-convite-publico`.

## Objetivo

Tornar a página pública do convite (`/convite/:token` e `/i/:token`) clara e familiar para quem a abre no telemóvel, **sem** ainda mexer nos templates editáveis, no QR nem no Google Maps (blocos futuros).

O convite é uma **tela** (única exceção à regra de modais). O que é primordial fica visível ao carregar; o secundário abre em modal, que em mobile sobe de baixo (bottom sheet).

## Regras de produto (já decididas)

- Sempre visíveis ao carregar: **título do evento**, **quem convidou**, **data e hora**, **prazo de resposta** e os botões de responder.
- Tudo o resto abre em modal ao tocar num ícone: localização, informações do anfitrião, detalhes extra (regras, dress code, mensagem).
- O que o utilizador faz nunca o obriga a aprender nada novo: padrões de apps que já conhece (WhatsApp, Google Maps, Canva).
- Ao confirmar presença, o convidado pode deixar uma **mensagem opcional** ao anfitrião.
- Os dados do anfitrião no modal: foto de perfil (se existir), nome, link de WhatsApp (só se o telefone existir) e link de e-mail (o anfitrião tem sempre e-mail).

## Passo 1 — Dados em falta (backend e modelo no front)

1. **Fim/duração do evento**: o backend já envia `ends_at` (`apupu_back/src/dto/event.dto.ts`); o front descarta-o (`mappers.ts`, `models.ts`). Acrescenta `endsAt` a `HostEvent`, `CreateEventInput`, `mapEvent` e à vista pública (`InvitationView` em `invitation.page.ts`). No wizard `create-event`, acrescenta o campo opcional **"Hora de fim"** (validação: depois de `startsAt`). Se o endpoint de criação/edição já aceita `ends_at`, usa-o; se não, acrescenta-o ao schema do backend (opcional).
2. **Prazo de resposta**: o front já tem `rsvpDeadline` no modelo do anfitrião mas a vista pública só mostra `deadlinePassed`. Garante que a API pública devolve `rsvp_deadline` (data e hora) e mapeia-o para a vista.
3. **Anfitrião na API pública**: confirma que `PublicInvitation` devolve nome do anfitrião, e que existem (ou acrescenta, opcionais) `host_avatar_url`, `host_phone` e `host_email`. **Só expõe o que o anfitrião aceitou mostrar**: se não existir ainda essa opção nas Definições, expõe e-mail e nome por defeito e telefone só se o anfitrião o tiver preenchido no perfil; regista a decisão em `docs/DECISIONS.md`.
4. **Mensagem do convidado**: confirma se `PUT /public/invitations/{token}/rsvp` aceita uma mensagem (campo `message` ou similar). Se não aceitar, acrescenta `message` opcional (máx. 500 caracteres, texto simples, sanitizado), guarda-o no convite e mostra-o ao anfitrião na lista de convidados (campo nos detalhes do `app-person-card` ou no menu "Ver detalhes") e numa notificação existente de "convite aceite/recusado".
5. **Validade do link do convite**: hoje não expira (`invitation.repository.ts`). Acrescenta `link_expires_at` com valor por defeito = **fim do evento + 1 dia** (mesma regra de máximo do Bloco 2); para convites já existentes, preenche com esse valor numa migração reversível. Quando expirado, a página mostra "Este convite já não está ativo." (mensagem genérica, sem detalhes). O anfitrião **não** configura esta validade neste bloco (regista em `docs/DECISIONS.md` como decisão deste bloco).

**Aceitação:** testes do backend para a mensagem e para a expiração; `build` verde.

## Passo 2 — Estrutura da página (mobile primeiro)

Reorganiza `features/invitation/invitation.page.html` (≈ 668 linhas) em componentes menores em `features/invitation/parts/`, mantendo o comportamento e os endpoints:

1. `invitation-hero`: capa (com lightbox já existente), título do evento sempre visível, tipo do evento.
2. `invitation-key-info`: linha de cards com **Quem convidou** (avatar + nome, toca para abrir o modal do anfitrião), **Quando** (data, hora de início e duração ou hora de fim se existir), **Onde** (ícone de localização + nome curto do local; toca para abrir o modal), **Responder até** (data e hora do prazo; se faltar pouco, destaque em tom de aviso; se passou, estado "Prazo terminado").
3. `invitation-rsvp`: botões **Vou** e **Não vou** bem visíveis, fixos na parte inferior em mobile (barra inferior com `env(safe-area-inset-bottom)`), e dentro do fluxo em desktop. Ao responder, abre `app-modal` de confirmação com o campo opcional **"Deixar uma mensagem ao anfitrião"** (textarea, contador de caracteres) e botão confirmar. Se o prazo terminou, os botões ficam desativados com a explicação.
4. `invitation-details-menu`: botão discreto "Mais detalhes" que abre modal com mensagem do anfitrião, regras, dress code e contribuição (dados bancários, se ativos), cada um numa secção com título.

Layout:
- Mobile: coluna única; hero, key-info (grelha de 2 colunas de cards pequenos, mesmo estilo do `app-stat-card` simplificado: reutiliza o aspeto, não o componente), depois "Mais detalhes". Barra de RSVP fixa no fundo.
- Desktop: hero largo, key-info numa linha de 4, RSVP no card lateral (como hoje).

## Passo 3 — Modais do convite

Todos com `app-modal` (bottom sheet em mobile):

1. **Modal Localização** (`size="md"`): nome do local, endereço completo, cidade; botão **"Copiar endereço"**; botão **"Abrir no Google Maps"** que abre `https://www.google.com/maps/search/?api=1&query={endereço codificado}` num novo separador (sem API key, sem SDK; é só um link). Se o evento é online (`onlineLink`), mostra "Evento online" com botão "Abrir link". Se não existir endereço, o ícone não aparece.
2. **Modal Anfitrião**: avatar (iniciais como alternativa, `app-avatar`), nome, linhas de contacto: botão **WhatsApp** (`https://wa.me/{telefone sem +}`) só se houver telefone; botão **E-mail** (`mailto:`); sem expor mais nada. Mostra uma nota "Pessoa que o convidou".
3. **Modal Responder** (Passo 2.3).
4. **Modal Mais detalhes** (Passo 2.4).

Cada modal é fechável com Escape, toque fora e botão. Foco devolvido ao ícone que o abriu.

## Passo 4 — Acessibilidade e leitura em telemóvel

Corrige os problemas apontados na auditoria (secção 11) **só nesta página**:
- Texto nunca abaixo de 12 px (hoje há 9–11 px em `invitation.page.html`). Usa os tokens de tamanho do Tailwind; não uses `text-[9px]`/`text-[10px]`/`text-[11px]`.
- Contraste: usa `text-ink`/`text-muted` dos tokens; elimina combinações de contraste baixo identificadas (linhas ~543, 583, 628 da versão auditada).
- Alvos de toque ≥ 44 px em todos os botões e ícones.
- `aria-label` em botões só com ícone; `aria-live="polite"` para o resultado do RSVP.
- Funciona sem JavaScript de terceiros e com tema claro e escuro.

## Passo 5 — Mensagens e estados

- A carregar: `app-skeleton variant="invitation"` (já existe).
- Link inválido, expirado ou revogado: **a mesma** mensagem genérica "Este convite já não está ativo." com ação "Falar com o anfitrião" só se existir contacto público; senão sem ação. Nunca diferenciar o motivo.
- Já respondeu: mostra o estado atual ("Já confirmou presença") com opção de alterar enquanto o prazo estiver aberto.
- Prazo terminado: aviso claro e botões desativados.
- Erro de rede: mensagem amigável com "Tentar de novo".

## Critérios de aceitação finais do Bloco 4

- [ ] `endsAt` e `rsvpDeadline` mapeados de ponta a ponta e visíveis no convite.
- [ ] Título, anfitrião, data/hora e prazo visíveis sem abrir nada; localização, anfitrião e detalhes em modais.
- [ ] Modal de localização com "Copiar endereço" e "Abrir no Google Maps" por link (sem SDK nem chaves).
- [ ] Modal do anfitrião com WhatsApp (se houver telefone) e e-mail.
- [ ] Mensagem opcional ao confirmar, guardada e visível ao anfitrião.
- [ ] Convites expiram (por defeito 1 dia após o fim do evento) com mensagem genérica.
- [ ] Nenhum texto abaixo de 12 px nesta página; alvos ≥ 44 px.
- [ ] `invitation.page.html` com menos de 250 linhas, composto por `parts/`.
- [ ] `build`, `lint`, `test` verdes. `docs/REPORT-BLOCO-4.md` escrito.

## Fora de âmbito

Templates editáveis, QR com o ícone da plataforma no convite e no PDF, integração com a API do Google Maps ou geolocalização, listas de províncias/municípios, convite por telefone automático. Ficam para os blocos 5 em diante.
