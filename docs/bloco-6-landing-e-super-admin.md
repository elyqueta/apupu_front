# Bloco 6 — Landing page e painel Super Admin (Conto Contigo)

Este bloco detalha a Parte E do Bloco 5. Se houver conflito, vale este documento.

**Regras de trabalho**
- Branch própria (ex.: `feat/landing-super-admin`).
- Antes de código, escreve `docs/PLANO-BLOCO-6.md` com o plano (rotas, componentes, endpoints, tabelas) e só depois executa.
- Ficheiros completos, texto em pt-PT, mobile first, usar os componentes base já existentes (modal/bottom sheet, cards, chips, ações).
- Respeitar a identidade de marca (pin com sorriso) e o tema claro/escuro.

---

## Parte 1 — Landing page (apresentação da plataforma)

**Rota:** `/` (pública). Quem já tem sessão ativa é redirecionado para o dashboard. O login passa para `/entrar` e o registo para `/criar-conta`.

**Aviso de protótipo:** faixa discreta no topo (ou badge no header) a indicar "Protótipo — versão em teste", visível em todas as páginas públicas.

**Header:** logo, links de âncora (Como funciona, Sobre), botão "Entrar" e botão principal "Criar conta". Em mobile, menu hambúrguer.

**Secções, por ordem:**
1. **Hero:** título curto e claro sobre criar e gerir convites de eventos, subtítulo, CTAs "Criar conta" e "Entrar", e uma ilustração/mockup de um convite num telemóvel.
2. **O que é o Conto Contigo:** 3 a 4 cards com os benefícios (convites bonitos e editáveis, gestão de convidados e equipas, confirmações e mensagens, partilha por link/WhatsApp).
3. **Como funciona (passos simples):** 4 passos numerados com ícone — criar conta; criar o evento e o convite; partilhar com os convidados (link/WhatsApp/e-mail); acompanhar confirmações, mensagens e equipa.
4. **Para quem é:** anfitriões, gestores/equipas e convidados (o que cada um faz, em 1 ou 2 frases).
5. **Sobre a app:** missão, estado atual (protótipo) e o que vem a seguir, de forma honesta e curta.
6. **Produto da NS2 Innovation:** bloco com o nome NS2 Innovation e contacto/link de apoio.
7. **CTA final** e **footer** (links, termos/privacidade como placeholders, "Um produto NS2 Innovation", ano).

**Requisitos técnicos:** componentes standalone reutilizáveis por secção; SEO básico (title, meta description, Open Graph com a identidade de marca); imagens otimizadas (WebP) e carregamento diferido abaixo da dobra; acessibilidade (contraste, foco, `alt`); sem dependência do back para renderizar.

---

## Parte 2 — Painel Super Admin

### Papel e acesso
- Novo papel `super_admin` (além dos já existentes). O utilizador é promovido por script SQL direto no Neon, **não há fluxo de promoção na UI**. Fornece no plano um exemplo de script de promoção (`UPDATE ... SET role = 'super_admin' WHERE email = ...`).
- Rotas sob `/admin` protegidas por guard no front **e** por middleware/guard na API (nunca confiar só no front).
- O super admin usa o mesmo login; ao entrar vê o acesso ao painel admin no menu. Respostas de acesso negado são genéricas.

### Layout
Segue o padrão do dashboard: menu lateral da app à esquerda, header com voltar, cards em grelha de 4 para estatísticas, sem tabelas longas (usar cards paginados pela API, pesquisa feita na API, menu de 3 pontinhos para ações).

### Ecrãs
1. **Visão geral:** 4 cards de estatísticas (utilizadores, eventos ativos, eventos cancelados, convites enviados) e lista curta de atividade recente.
2. **Eventos:**
   - lista paginada (10 por página) com pesquisa e filtros (estado: ativo, terminado, cancelado; anfitrião; data);
   - detalhe só de leitura: anfitrião, datas, convidados, equipa, estado;
   - ação **Cancelar evento** (ver fluxo abaixo).
3. **Utilizadores:**
   - lista paginada com pesquisa e filtros (papel, estado, data de registo);
   - detalhe: dados básicos, eventos criados, estado da conta;
   - ações: suspender/reativar conta e revogar sessões. Não permitir que o super admin suspenda a própria conta nem retire o seu próprio papel.
4. **Registo de auditoria:** lista paginada das ações do super admin (quem, o quê, quando, motivo), só de leitura.

### Fluxo de cancelamento de evento (obrigatório)
1. Super admin clica em **Cancelar evento** → abre modal (bottom sheet em mobile).
2. Campo **motivo** obrigatório (mínimo de caracteres definido, texto livre).
3. O sistema envia um **código OTP por e-mail** ao super admin (validade curta, ex.: 10 min; limite de tentativas e de reenvios; erros genéricos).
4. Só com OTP válido o cancelamento é confirmado.
5. O evento passa a estado `cancelado` (guardar quem cancelou, motivo e data). Não apagar dados.
6. O **anfitrião é notificado** (e-mail e notificação na app): "O evento foi cancelado pelo responsável da plataforma", com o motivo.
7. A ação fica registada na auditoria.
8. Após cancelado, aplicam-se as regras do evento cancelado do Bloco 5 (Parte H): tudo bloqueado no front e na API, e o convite público mostra "Evento cancelado".

### Modelo de dados e API (a detalhar no plano)
- Campo de papel no utilizador; estado `cancelado` no evento com `cancelado_por`, `motivo_cancelamento`, `cancelado_em`.
- Tabela de OTP (hash do código, finalidade, expiração, tentativas, consumido) reutilizável também para o cancelamento feito pelo anfitrião.
- Tabela de auditoria (ator, ação, entidade, motivo, metadados, data).
- Endpoints sob `/admin/...`, paginados, com validação de papel em todos.

### Segurança
- Rate limiting nos endpoints de OTP e de ações admin.
- Nunca devolver o OTP nem dados sensíveis nas respostas.
- Mensagens de erro formatadas em pt-PT e sem revelar detalhes internos.

---

## Critérios de aceitação
- [ ] `/` mostra a landing completa (hero, benefícios, passos, para quem, sobre, NS2 Innovation, CTA, footer) com aviso de protótipo
- [ ] Login em `/entrar`, registo em `/criar-conta`, utilizadores com sessão vão direto ao dashboard
- [ ] Landing responsiva, acessível e com SEO básico
- [ ] Rotas `/admin` protegidas no front e na API pelo papel `super_admin`
- [ ] Visão geral, eventos, utilizadores e auditoria funcionais, paginados e com pesquisa na API
- [ ] Cancelar evento exige motivo + OTP por e-mail, notifica o anfitrião e regista auditoria
- [ ] Evento cancelado fica bloqueado em tudo (front e API)
- [ ] Super admin não consegue suspender-se a si próprio
