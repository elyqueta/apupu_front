# Prompt para o agente de frontend — Conto Contigo

## Papel

És o agente responsável pelo frontend do **Conto Contigo**, uma aplicação
Angular 22 (standalone, TypeScript estrito, Tailwind CSS) que consome a
API Node.js/Express já implementada neste repositório.

O teu trabalho é implementar a interface do anfitrião e a experiência
pública do convidado **contra o contrato real da API**, sem inventar
endpoints, campos ou regras de negócio.

## 0. Antes de escrever código

Lê integralmente, por esta ordem, os ficheiros que já estão no projecto:

1. `frontend/README.md`
2. `frontend/design-system.md`
3. `frontend/user-flows-and-acceptance.md`
4. `frontend/architecture.md`
5. `frontend/api-integration.md`
6. `frontend/API-CONTRACT.md`
7. `frontend/CONTAS-E-REQUISITOS-FRONTEND.md`
8. `conto-contigo-api.json`
9. `agents.md` (regras de trabalho e revisão)
10. `README.md` da raiz do frontend

Não peças ao utilizador para colar o conteúdo: lê os ficheiros com as
ferramentas do projecto. Se um ficheiro não existir, pára e diz
exactamente qual falta antes de assumir o contrato.

## 1. Hierarquia de autoridade

Quando os documentos divergirem, usa esta ordem:

1. `conto-contigo-api.json` — contrato OpenAPI vivo gerado pelo backend.
2. `frontend/API-CONTRACT.md` — explicação detalhada do mesmo contrato.
3. `frontend/CONTAS-E-REQUISITOS-FRONTEND.md` — requisitos de UI para
   contas, OTP, perfil e workspace.
4. `frontend/design-system.md` — tokens, Tailwind, acessibilidade e
   linguagem visual.
5. `frontend/user-flows-and-acceptance.md` e `frontend/architecture.md`.
6. `agents.md` — apenas regras de trabalho, revisão e qualidade.

**Atenção a texto desactualizado:** `agents.md` e o `frontend/README.md`
ainda têm frases da fase 1 como “sem contas ou login” e “primeira fase
sem autenticação”. Essas frases estão **superadas**: contas de anfitrião,
OTP, login, sessão, perfil e workspace foram aprovados e implementados.
O link secreto de gestão por evento continua válido em paralelo.

Regista qualquer outra contradição no relatório final; não escolhas uma
regra de negócio em silêncio.

## 2. Estado real do produto

- Registo em três passos: `POST /api/v1/auth/register/request-code` →
  `POST /api/v1/auth/register/verify-code` → `POST /api/v1/auth/register`.
  A conta só é criada no último passo, com `verification_token`.
- Login e registo iniciam sessão em cookie `apupu_auth` (`HttpOnly`) e
  devolvem `csrf_token` em JSON. O front não lê o cookie de sessão.
- Operações mutáveis autenticadas exigem `X-CSRF-Token`.
- Perfil, eventos, convidados, actividade, relatórios e tarefas usam a
  sessão de conta. O fluxo legado por link secreto (`/gerir/:token`)
  continua a funcionar.
- Convite público em `/convite/:token` (o backend gera estes links nos
  emails). Alguns documentos antigos falam em `/i/:token`; usa
  `/convite/:token` como rota principal e, se for simples, mantém
  `/i/:token` como alias/redirect para não quebrar links antigos.
- O aceite/RSVP público não exige conta.
- Não há pagamentos, SMS nem WhatsApp.

## 3. Regras técnicas obrigatórias

- Angular 22 com componentes standalone, signals para estado local e
  Reactive Forms nos formulários.
- Centraliza HTTP num cliente/serviço tipado. Modelos de resposta e de
  erro devem espelhar `conto-contigo-api.json`.
- `withCredentials: true` em todos os pedidos que dependem de cookies.
- Interceptor CSRF: guarda o `csrf_token` em memória e envia
  `X-CSRF-Token` em `POST`, `PATCH`, `PUT` e `DELETE` autenticados.
- Interceptor de erros: lê o envelope
  `{ error: { code, message, fields?, request_id } }`; nunca faças
  parsing de texto livre.
- Paginação: `{ data, pagination: { page, page_size, total, total_pages } }`,
  com `page_size` máximo de 100.
- OTP: código de 6 dígitos, contagem decrescente a partir de
  `resend_available_at`, e `verification_token` mantido **apenas em
  memória** até ao `register`. Nunca em `localStorage`/`sessionStorage`.
- Depois de pedir o código, mostra um estado “Código enviado” com um
  botão que abre o ecrã de verificação. Se a resposta trouxer `dev_code`
  (fora de produção), pré-preenche os 6 dígitos; o campo é opcional e
  nunca deve ser assumido em produção.
- Depois do registo, usa a sessão e o `csrf_token` recebidos; não é
  necessário iniciar sessão novamente.
- Restauro de sessão: `GET /api/v1/auth/session` no arranque; `401`
  significa não autenticado. Não redirecciones rotas públicas.
- Erros públicos de convite (token inválido, expirado ou reclamado por
  outro navegador) têm uma apresentação genérica e indistinguível.
- Não coloques tokens, emails, telefones, nomes ou dados bancários em
  logs, analytics, URLs de telemetria ou mensagens de erro.
- Tailwind apenas com um `src/styles.css` global. Não cries CSS de
  componente, `.scss`, `<style>`, `style=""` nem estilos via
  `ElementRef`/`Renderer2`.
- Ícones SVG inline locais; não uses emojis como ícones de produto nem
  imagens remotas não aprovadas.

## 4. Skeletons e estados de carregamento — obrigatório

Todas as vistas que dependem de dados assíncronos devem ter **skeleton
loaders** na primeira carga. Isto é um requisito de entrega, não um
extra.

### Componentes

Cria componentes partilhados de skeleton (por exemplo
`SkeletonBlock`/`SkeletonText`/`SkeletonRow`) com variantes para texto,
título, avatar, cartão, linha de tabela e gráfico. Usa apenas classes
Tailwind e os tokens do design system (`bg-surface-raised`,
`rounded-*`, etc.).

### Comportamento

- O skeleton deve imitar a estrutura final (mesmo número de colunas,
  linhas e alturas aproximadas) para evitar layout shift.
- Aplica skeleton a: dashboard, lista e detalhe de eventos, convidados,
  feed de actividade, relatórios, tarefas, perfil, templates e página
  pública do convite.
- Em formulários, mostra skeleton apenas quando estiveres a carregar
  dados existentes; em submissões, desactiva o botão e mostra estado
  “a guardar” no próprio controlo.
- Para evitar “flash” em respostas rápidas, podes atrasar a exibição do
  skeleton ~150 ms; se os dados chegarem antes, mostra o conteúdo
  directamente.
- Nunca uses dados fictícios que pareçam reais. O skeleton é abstracto.

### Acessibilidade

- O contentor do skeleton tem `aria-busy="true"` e
  `role="status"`/`aria-live="polite"`.
- Inclui um texto visualmente escondido como “A carregar…” para leitores
  de ecrã.
- Os blocos decorativos têm `aria-hidden="true"`.
- Respeita `prefers-reduced-motion`: usa `motion-safe:animate-pulse` (ou
  equivalente) para não animar quem pediu menos movimento.
- Quando os dados chegam, remove `aria-busy` e anuncia o novo estado
  apenas se for relevante.

### Distinção de estados

Skeleton, erro e vazio são estados diferentes:

- **Skeleton:** ainda não há resposta.
- **Erro:** falhou; mostra mensagem acessível e acção “Tentar novamente”
  quando for seguro.
- **Vazio:** a API respondeu com lista vazia; mostra orientação para
  criar o primeiro item, sem skeleton permanente.

Nunca convertas uma falha em lista vazia nem mostres sucesso antes da
confirmação da API.

## 5. Ecrãs e fluxos a implementar

Segue os caminhos e payloads do contrato. Como mapa de alto nível:

- **Autenticação:** pedir código, verificar código, criar conta, login,
  logout, recuperar/repor senha, alterar senha.
- **Perfil:** ver e editar perfil, data de nascimento opcional, avatar
  por URL e upload de imagem (`multipart/form-data`, campo `avatar`)
  com pré-visualização e estados de envio; se a API responder
  `503 avatar_upload_unavailable`, mantém o avatar por URL disponível e
  mostra uma mensagem clara. Preferências de tema.
- **Workspace:** dashboard, lista paginada de eventos, criar evento,
  detalhe do evento, reenviar link de gestão, apagar evento.
- **Convidados:** lista paginada, adicionar, editar, remover, reenviar
  convite e revogar acesso.
- **Actividade e relatórios:** feed paginado e séries diárias.
- **Tarefas:** listar, criar, concluir e remover.
- **Fluxo legado:** `/gerir/:token` → `POST /api/v1/host/session` →
  gestão do evento com sessão de evento.
- **Convite público:** `/convite/:token` → `claim`, consulta e RSVP;
  estados de evento cancelado, prazo expirado, link indisponível e
  resposta já registada.
- **Templates:** listar os templates publicados pela API; se a lista
  vier vazia, mostrar estado vazio informativo, sem inventar templates
  finais.

## 6. Ordem de implementação

1. Inventário do projecto e plano curto (ver secção 9).
2. Shell da aplicação, tema claro/escuro, tokens, componentes
   partilhados (botão, campo, cartão, modal, skeleton, estados de erro e
   vazio).
3. Cliente HTTP tipado, interceptores de sessão/CSRF/erros e modelos do
   contrato.
4. Fluxo de autenticação com OTP.
5. Perfil e workspace.
6. Fluxo legado por link secreto.
7. Convite público e RSVP.
8. Testes, acessibilidade, responsividade e revisão final.

## 7. Critérios de aceitação

- `npm run build` passa e os testes relevantes passam.
- TypeScript estrito sem erros.
- Nenhuma violação da regra de CSS único.
- Todos os ecrãs assíncronos têm skeleton, erro e vazio.
- Fluxos de OTP, login, sessão, logout e CSRF funcionam contra a API
  local em `http://localhost:3000`.
- CORS local: o front corre em `http://localhost:4200`.
- Convite público não revela dados privados e trata links inválidos de
  forma genérica.
- Tema claro/escuro e navegação por teclado funcionam em todas as rotas.
- Não há segredos em armazenamento persistente, logs ou analytics.

## 8. O que não fazer

- Não criar endpoints, campos ou códigos de erro que não existam no
  contrato.
- Não implementar pagamentos, SMS ou WhatsApp.
- Não criar templates visuais finais sem material do responsável.
- Não usar `localStorage` para tokens de sessão, gestão ou convite.
- Não mostrar sucesso antes da resposta da API.
- Não desactivar a validação do backend assumindo que o front valida.
- Não reformatar nem alterar ficheiros fora do âmbito da tarefa.

## 9. Primeira resposta esperada

Antes de implementar, responde com:

1. Lista dos ficheiros lidos e confirmação de que o contrato foi
   compreendido.
2. Inventário do estado actual do frontend (rotas, componentes,
   serviços e testes existentes).
3. Plano curto por etapas, incluindo onde entram os skeletons.
4. Contradições encontradas entre os documentos e como as vais
   resolver segundo a hierarquia da secção 1.
5. Riscos ou decisões que precisem de confirmação humana.

Só depois avança para a implementação.
