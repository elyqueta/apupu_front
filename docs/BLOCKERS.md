# Bloqueios e observações

## Bloco 1 — Fundações

**Bloqueios:** nenhum.

### Observações (fora do âmbito, não bloqueiam)

| Passo / área | Observação | Estado |
|---|---|---|
| Passo 2 — diálogos | O lightbox de imagens não foi migrado para `app-modal` porque não faz parte da lista de diálogos do bloco. Passou a ter *focus trap* e restauração de foco próprios. | Registado; sem ação neste bloco. |
| Qualidade — lint | `npm run lint` termina com **0 erros** e **24 avisos** legados (`@typescript-eslint/array-type`, `label-has-associated-control`, `no-output-native`). O `autofocus` da pesquisa foi removido. | Aceite conforme `REGRAS-GERAIS.md` §5. |
| Backend | A suíte mantém **86 testes skipped** pré-existentes; não foram alterados. | Sem regressão. |
| Pesquisa global | A API HTTP não expõe `AbortSignal`; o cancelamento é feito por sequência de pedidos. | Ver `DECISIONS.md`. |
| Verificação visual | Os critérios de 320 px e claro/escuro foram verificados por revisão de classes Tailwind e tokens; não existe captura automatizada no projeto. | Recomenda-se confirmação manual no resumo final. |

## Bloco 2 — Equipas e gestores

**Bloqueios:** nenhum.

### Observações (fora do âmbito, não bloqueiam)

| Passo / área | Observação | Estado |
|---|---|---|
| Passo 1 — migração | Gestores legados mantêm acesso só com o link até o anfitrião gerar um código; `access_code_hash` fica nulo. | Aceite; a UI destaca a ação "Gerar código de acesso". |
| Passo 3 — compatibilidade | O formato legado `{ emails: [...] }` continua aceite na API de membros; a UI nova usa `{ members: [...] }` com um contacto de cada vez. | Mantido para clients antigos. |
| Passo 4 — contas | Não existe conta só com telefone no modelo atual; um gestor com telefone que queira criar conta introduce um email verificado por OTP. | Registado em `DECISIONS.md`. |
| Passo 6 — importação em lote | Importação em lote de membros e envio automático de WhatsApp não foram implementados. | Fora de âmbito explícito do bloco. |
| Backend | A suíte mantém **87 testes skipped** pré-existentes; as suítes de migração/integração (`test:teams`) correm com 107 + 20 + 5 testes verdes. | Sem regressão. |
| Frontend — lint | `npm run lint` termina com **0 erros** e **24 avisos** legados (`array-type`, `label-has-associated-control`, `no-output-native`, `no-output-native` nos diálogos). | Aceite conforme `REGRAS-GERAIS.md` §5. |
| Frontend — testes | `npm test -- --watch=false`: 23 ficheiros / 120 testes, 0 falhas. Inclui entrada por código, erro genérico idêntico, atalho de conta e partilha de credenciais. | Sem regressão. |
| Verificação visual | Critérios de 320 px e claro/escuro dos novos modais e da gestão verificados por revisão de classes Tailwind e tokens; não existe captura automatizada no projeto. | Recomenda-se confirmação manual no resumo final. |

## Bloco 3 — Detalhe do evento

**Bloqueios:** nenhum bloqueio que impeça o bloco; quatro incertezas de contrato/implementação documentadas abaixo e tratadas de forma conservadora na UI.

| Passo / área | O que bloqueou / observação | O que foi tentado | Estado / decisão |
|---|---|---|---|
| Passo 1 — exportações | `API-CONTRACT.md:575` diz que o gestor pode "consultar … relatórios", mas as rotas de exportação (`hostWorkspace.routes.ts:1282–1287, 1343–1348`) exigem `hostAccountAuth` (cookie de conta); uma sessão só por link receberia 401. | Confirmar middleware das rotas e comparar com a tabela de permissões. | Exportações mantidas só no painel do anfitrião; não expor ação quebrada ao gestor. Ver `DECISIONS.md`. |
| Passo 1 — tarefas e atividade | A tabela de permissões não cobre criar/editar/remover tarefas nem remover atividade. Rotas de tarefas usam `hostAccountAuth`; remover atividade usa `requireEventHost`. | Procurar regra equivalente no contrato e no middleware. | Gestor não vê ações de escrita nestas secções; leitura mantida. |
| Passo 1 — capa do evento | A API permite ao gestor alterar a capa (`host.routes.ts:270–297` sem `requireEventHost`), mas o detalhe do anfitrião esconde esses controlos atrás de `isHost()`. | Comparar os dois painéis e o middleware. | Comportamento visível inalterado no painel do anfitrião; painel do gestor mantém as ações que já tinha. |
| Passo 1 — CTA de conta | Os botões "Criar conta" / "Continuar sem conta" do painel do gestor não constam da tabela de permissões do contrato. | Verificar se são ação de API ou apenas navegação. | São fluxo de sessão do Bloco 2; mantidos sem alteração. |
| Passo 5 — campos do modal de edição | `EventsRepository.update()` envia apenas `title`, `message`, `rules`, `dress_code` e `location`; o cliente não envia datas. | Confirmar o corpo aceite pelo backend e o formulário existente. | O esquema backend aceita `starts_at`, `ends_at` e `rsvp_deadline` (`event.schemas.ts:154–164`), mas o cliente não os envia; modal mantém os campos já editáveis e a limitação ficou registada. |
| Passo 2 — cards de equipa | `Team` não expõe o gestor como campo próprio, apenas `membersPreview`. | Procurar um campo `manager` no modelo e no mapper. | O card usa o primeiro membro pré-carregado como aproximação visual para a linha "Gestor"; sem alteração de API neste bloco. |

## Bloco 4 — Convite público

**Bloqueios:** nenhum.

| Passo / área | Observação | Estado / decisão |
|---|---|---|
| Passo 1 — contacto do anfitrião | Não existe preferência de privacidade no perfil (`host_profiles` e `host.schemas.ts`). | Expor nome/e-mail por defeito, avatar se existir e telefone só se preenchido, conforme a regra do bloco; sem nova UI de definições. |
| Passo 1 — validade do link | Os links públicos nunca expiravam e o contrato documentava `invitation_url_expires_at: null`. | Novo campo `link_expires_at` com backfill reversível; a API devolve o valor real e a UI usa sempre mensagem genérica para link inativo. |
| Passo 1 — `ends_at` | O backend já aceita e devolve `ends_at`; só o cliente o descartava. | Sem alteração de schema backend para este campo. |
| Passo 3 — mapas | A auditoria aponta ausência de mapas/geolocalização. | Fora de âmbito; o bloco usa apenas link público do Google Maps por URL codificada, sem SDK/chave. |
| Passo 4 — verificação visual | Não existe captura automatizada no projeto. | Textos ≥12 px, alvos ≥44 px, tema claro/escuro e 360 px verificados por revisão das classes Tailwind; recomenda-se confirmação manual no resumo final. |
| Auditoria — bottom sheet | `docs/AUDIT.md:227–229` afirma que não existe bottom sheet. | Drift documental: `app-modal` já implementa bottom sheet, foco e Escape desde o Bloco 1; reutilizado sem novo componente. |
| Passo 5 — ação no link inativo | A regra prevê “Falar com o anfitrião” quando existir contacto público, mas a resposta genérica (`404 invitation_not_found` / `Convite não encontrado.`) não devolve qualquer dado do anfitrião. | Manter a página inativa apenas com o texto genérico e o botão “Tentar de novo”; não inventar contacto nem diferenciar invalidado/expirado/revogado. | Aceite: motivo e contacto nunca são expostos em link inativo. O contacto está disponível no modal do anfitrião de um convite ativo. |
| Passo 4 — verificação automática | Não existe captura automatizada de contraste, tamanho de texto ou alvos de toque no projeto. | Revisão das classes Tailwind em `invitation.page.html` e `parts/`; nenhum `text-[9px]`/`text-[10px]`/`text-[11px]`, botões com `h-11`/`h-12` ou `size-11`. | Recomenda-se confirmação manual em 360 px com tema claro e escuro antes do merge. |

## Bloco 15 — Task A Gratitude

| Passo / área | Observação | Estado / decisão |
|---|---|---|
| Task A — PDF Gratitude (4 casos) | Layout proporcional PDF ajustado (`invitationDocument.ts`): grupos space-evenly na zona útil, ícone 5.4%W + gap 1.4%W, QR com margem sobre ribbon bezier, `infoCenter` ≤72% sem dress e ~71.2% com dress para d. Validação automatizada executada com `npm run build`, `npx tsx /tmp/opencode/render-gratitude.ts`, `pdftoppm -png -singlefile -r 144` e `pdftotext -bbox` + asserts geométricos: a-d PASS (sem overlaps bbox, sem fora da canvas, icon-text ok, QR acima da ribbon, title-year gap dentro de 3%H de layout; `gapTY` negativo pequeno tratado como artefacto de bbox). | PDF casos a-d validados por asserts; artefactos em `docs/assets/gratitude-a.png..d.png` e PDFs, caso d: `/home/elyqueta/Documentos/projectos/apupu/docs/assets/gratitude-d.pdf`. |
| Task A — Digital Gratitude real 1024×1280 | CSS do componente `gratitude-invitation.component.ts` alinhado (content bottom 12.5%, space-evenly, padding 4cqw, gap título/ano 1.9cqw), front build passa. Spec `e2e/gratitude.spec.ts` (fixture HTML estática, não componente Angular real) passou em `desktop-light`, mas **não satisfaz** o critério "Validar com render real ... digital Playwright 1024×1280". Não foi possível executar Playwright contra render real do componente Angular/rota Gratitude com dados dos 4 casos neste ambiente. | **Bloqueia declaração de Task A green no digital.** Não declarar digital validado até executar render real 1024×1280 (rota/token/harness) ou registar evidência equivalente. |

## Bloco 9 — UI mobile

**Bloqueios:** nenhum.

### Observações (fora do âmbito, não bloqueiam)

| Passo / área | Observação | Estado / decisão |
|---|---|---|
| Passo 6 — e2e | `E2E_EMAIL`, `E2E_PASSWORD` e `E2E_BASE_URL` não estão definidos neste ambiente. | Os 24 testes Playwright (4 projetos: 360×640 e 1440×900 × claro/escuro) terminam `skipped` com exit 0; os binários do Chromium também não foram descarregados. Para executar: definir as três variáveis e correr `npx playwright install chromium` antes de `npm run e2e`. |
| Passo 6 — dados | O cenário “Adicionar convidado” preenche apenas o telefone e submete com nome/email vazios. | A validação do formulário impede criar convidados de teste; o modal é fechado com “Cancelar”. |
| Passo 6 — admin | `/admin/utilizadores` exige conta com papel de super admin. | O e2e pressupõe que as credenciais fornecidas têm esse papel; sem ele, a rota não mostra os controlos. |
| Qualidade — lint | `npm run lint` termina com **0 erros** e **24 avisos** preexistentes. | Aceite conforme `REGRAS-GERAIS.md` §5; nenhum aviso novo introduzido. |
| Passo 3 — portal | O menu de ações é montado no `body`; o estilo depende de `position: fixed` e de `getBoundingClientRect()`. | Coberto por Vitest (abertura para cima e limite direito) e por Playwright (dentro do ecrã, ao lado do botão, primeiro/último cartão). |
| Verificação visual | Não existe captura automatizada de contraste, tamanho de texto ou alvos de toque. | Critérios revisados nas classes Tailwind: `text-xs` ou superior, alvos `size-11`/`h-11` ou superior, tokens claros/escuros e 320 px–desktop. Confirmação manual recomendada no resumo final. |

## Observações — Bloco 11 (24/11/2026)

- **Auditoria:** o tipo `AUDIT_ACTIONS` do backend inclui `event_cancelled`, `event_cancel_otp_requested`, `admin_event_cancelled`, `event_cover_updated`, `event_cover_removed` e `activity_deleted`, mas o `CHECK host_audit_log_action_check` (migrações 0023/0027/0029) não as aceita. Essas linhas de auditoria falham ao inserir. Não alterei, porque está fora do âmbito; a correção é acrescentá-las ao `CHECK` numa migração própria.

## Bloco 15 — Passo 1 (25/11/2026)

| Passo / área | Observação | Estado / decisão |
|---|---|---|
| Passo 1.4 — Galeria em eventos terminados | A spec pede "modo leitura, exceto galeria (ainda por implementar)". Não existe galeria completa implementada neste bloco. | `requireActiveEvent` aceita `allowGallery` para caminhos `/events/:id/gallery|media` como ponto de extensão; UI não expõe ações de galeria. Registar como extensão futura, não bloquear Passo 1. |
| Passo 1.1/1.3 — QR digital Gratitude | O QR digital do Gratitude usa imagem gerada por `https://api.qrserver.com/...` para evitar nova dependência no front. | Funciona como mínimo; se houver requisito de offline/privacidade, substituir por gerador local no Passo 2/3 sem mudar contrato. |
| Passo 1.1 — Fidelidade visual Gratitude | O flyer de referência foi descrito em texto (agente não vê imagens). A implementação usa SVG/CSS próprio com os elementos descritos. | Validar visualmente com o autor; ajustar no Passo 2 quando o TemplateRenderer único existir. |
| Verificação — migração up/down em DB de teste | Não executei `migration up/down` numa DB de teste dedicada neste ambiente (requer DB de teste configurada e pode ser destrutivo). | Build/typecheck/testes passaram; migração é reversível por código (`down` remove Gratitude/kind). Confirmar em CI/DB de teste antes de merge. |
| Verificação — lint/testes completos | Lint e suite completa de testes do front/back ainda por executar no fecho do Passo 1. | Executar antes de declarar Passo 1 verde; corrigir falhas reais. |

## Gratitude editor/PDF (25/11/2026)

| Passo / área | Observação | Estado / decisão |
|---|---|---|
| Logo/QR upload Cloudinary | Editor aceita upload e guarda data URL no draft; não existe endpoint dedicado para upload de asset de template com `public_id` e cleanup no replace/remove. | Implementar endpoint host/template asset seguindo padrão `teamPhoto.service`/Cloudinary, guardar `public_id` e destruir asset anterior sem bloquear operação principal. |
| QR configurável em templates não-Gratitude (digital) | PDF padrão usa `resolveQrConfig`; renderer digital genérico ainda mostra placeholder de bloco QR, não QR real configurado. | Estender `TemplateRendererComponent`/blocos digitais no Passo 2. |
| Testes exigidos pela spec | `e2e/gratitude.spec.ts` atualizado como fixture estática; não executados testes Playwright completos contra app, `pdffonts` embed check, nem `zbarimg`. | Executar em ambiente com deps Playwright/browser; registar resultados. |
| Migrações em DB de teste | `1739900000034/0035/0036` up/down em DB de teste dedicada não executadas neste ambiente. | Validar antes de merge. |
| Lint global | `npm run lint` tem erros preexistentes fora dos ficheiros alterados; ficheiros alterados nesta sessão sem erros de lint. | Não ampliar escopo; registar estado real. |
| Validação digital Gratitude 1024×1280 | Resolvida nesta sessão com Playwright real-component 1024×1280 (`e2e/gratitude-real.spec.ts`, rota `__test/gratitude/:case`, 4 casos a-d, 4 passed). | Screenshots reais em `docs/assets/gratitude-a.png..d.png`; manter spec como evidência de regressão. |
| Validação bbox vetorial | `pdftotext -bbox` não cobre separadores/ícones/QR vetoriais. | Conferir visualmente `docs/assets/gratitude-a.png..d.png`; QR dentro do cartão verificado pelo layout calculado. |

## Bloco 15 — Passo 6 (27/11/2026)

| Passo / área | Observação | Estado / decisão |
|---|---|---|
| Perfil público — eventos anteriores | `GET /host/profiles/:id/events` devolve também eventos com `status: 'cancelled'`, pelo que o histórico mostraria eventos cancelados como "Eventos anteriores". | O front filtra `status !== 'cancelled'` antes de renderizar; não alterámos o contrato da API. Se a API passar a excluí-los, o filtro não tem efeito. |
| Capa do feed — flyer vs. fotografia | O contrato `FeedEvent` não tem campo explícito a indicar se `cover_url` é um flyer (imagem com texto/QR) ou uma fotografia. | Modo único "cartaz": a imagem é sempre tratada como flyer, inteira e sem sobreposições. O modo imersivo (vidro sobre a imagem) só faria sentido com esse campo; não implementado. |
| Reações e comentários no feed | A API pública do feed não devolve contadores de reações/comentários. | Botões desativados com `disabledHint`; nenhum endpoint ou lógica de backend alterada. |
| Faixa de stories | O feed público devolve comunidades mas não indica quais têm eventos a decorrer nem amigos. | A faixa aparece quando há pelo menos 2 comunidades; não é possível filtrar por eventos em curso sem alterar a API. |

## Bloco 15B — catálogo e Gratitude título longo (27/11/2026)

**Bloqueios:** nenhum para a funcionalidade. Limitações/observações residuais abaixo.

| Área | Observação | Estado |
|---|---|---|
| Fidelidade decorativa do PDF | O PDF usa o mesmo documento v2 e já desenha eixo da timeline, pílulas dos botões, divisores variados, ornamento e placeholders de média. Continuam sem reprodução exata o relevo 3D de flores, o papel enrolado/recortado e as máscaras de gradiente em fotografias; os botões são vetoriais, não interactivos. | Aproximação vetorial documentada; contrato comum é o documento v2. Ver `REPORT-BLOCO-15.md` e `DECISIONS.md`. |
| Discrepância documental (resolvida) | `PLANO-BLOCO-15.md` tinha ordem de entrega divergente e informação pré-implementação sobre fontes. | Plano alinhado com o anexo 15B e com o estado real do código. |
| Lint backend (resolvido) | 159 erros pré-existentes em 11 ficheiros. | ✔ Corrigidos por tipagem real em `geocode.service.ts` e `invitationDocument.ts`, sem `eslint-disable` e sem mudança de comportamento. `npm run lint`: 0 erros/60 avisos legados. |
| Migração 15B (resolvida) | `up/down` não tinham sido executados em DB real. | ✔ Executados com `node-pg-migrate` num PostgreSQL descartável; upsert idempotente e preservação de templates em uso cobertos por `tests/bloco15b.migration.test.ts`. Não cobertos: esquema completo do baseline, concorrência/carga de produção. |
| Legibilidade a 320 px (resolvida) | Não existia captura automatizada dos 19 templates. | ✔ `e2e/templates-320.spec.ts` mede o render Angular real em 4 projetos Playwright; encontrou e corrigiu corte no T18. As miniaturas em `mode="preview"` e títulos arbitrários do utilizador não são exercitados pela spec. |
| Contraste das paletas (resolvido) | Seis templates tinham `ink`/`muted` abaixo de 4.5:1 sobre o fundo (T10 chegava a 1.00:1). | ✔ Paletas ajustadas no catálogo front e no espelho back; teste puro em `system-templates.spec.ts` valida os 19. |
| `zbarimg` no pipeline | A leitura automática do QR renderizado com `zbarimg` não faz parte dos testes executados. | Cobertura atual: QR gerado e desenhado, PDFs gerados e validados por `pdftotext`/`pdftoppm`; leitura por scanner externo pendente. |
| Artefacto de título longo | `docs/assets/gratitude-long-title.pdf` / `.png` usam um título sintético extenso; não substituem a validação visual com dados reais do anfitrião. | ✔ Complementado pelo caso `e` real-component em `e2e/gratitude-real.spec.ts` e pelos testes puros de `fitGratitudeTitle()`. |

## Bloco 16 — convite do template (28/11/2026)

**Bloqueios:** nenhum bloqueio funcional. As branches locais foram limpas e as branches `feat/bloco-16-convite-template` criadas a partir de `feat/bloco-15-templates` em front e back; **não houve push, merge nem rebase**.

| Área | Observação | Estado |
|---|---|---|
| Branches remotas antigas | `git push origin --delete <branch>` falhou nos dois repositórios com `fatal: could not read Username for 'https://github.com'`. Não há `gh` instalado nem credenciais/token disponíveis neste ambiente. | Pendente de autenticação do autor; a limpeza local está concluída. |
| Playwright | `E2E_BASE_URL`, `E2E_EMAIL` e `E2E_PASSWORD` não estão definidos e os binários do Chromium não estão instalados. | A spec `e2e/bloco16-invitation.spec.ts` compila (`npm run e2e:typecheck`) mas é ignorada até o autor definir o ambiente. |
| Leitura do QR com `zbarimg` | A ferramenta não faz parte do pipeline; a verificação automatizada cobre o SVG (`data-qr-logo`, ECC H, área ≤ 20%). | Confirmação manual recomendada num PDF e no ecrã. |
| Mapa em tempo real | O seletor usa o serviço público OpenFreeMap “as-is”, sem chave; pode mudar ou estar indisponível. O URL está em `environment.mapStyleUrl` e o seletor degrada para endereço escrito se o carregamento falhar. | Registado; sem dependência nova. |
| Teste de migração | A migração `up → down → up` corre com o Postgres de teste local (`localhost:5433`) conforme o padrão dos blocos anteriores. | Ver evidência em `docs/REPORT-BLOCO-16.md`. |
