# Bloco 10 — Visibilidade: eventos públicos/privados, perfis, idade, copiar links

> Depende do Bloco 9. Branch: `feat/bloco-10-visibilidade`. Backend e frontend.

## Objetivo

1. Cada evento é **público** ou **privado**.
2. Evento público tem um **link aberto**: quem o abrir confirma presença indicando nome + (e-mail ou telefone).
3. Perfis públicos/privados.
4. Restrição de idade opcional por evento.
5. Botão **copiar** ao lado de todos os "Reencaminhar por WhatsApp".
6. Apagar evento com confirmados exige confirmação por escrita do nome.

## Regras de produto (decididas)

- `events.visibility`: `public | private`. **Eventos existentes ficam `private`** (migração sem alterar comportamento).
- **Privado**: só quem tem convite individual (link preso ao navegador, como hoje). Não aparece no feed.
- **Público**: aparece no feed e tem link aberto. Convites individuais **continuam possíveis** e mantêm o comportamento atual (preso ao navegador); quem os abre vê a comunidade/organização e pode pedir para entrar (Bloco 11).
- Sem limite de convidados por defeito.
- Copiar o link público do evento (fora de um card de convidado) abre sempre o formulário "Confirmar presença": nome obrigatório + e-mail **ou** telefone (pelo menos um).
- **Perfil**: `hosts.profile_visibility = public | private`, **privado por defeito** (contas existentes ficam privadas). Perfil privado não aparece em nenhuma pesquisa.

## Passo 1 — Backend: modelo

Migração reversível:
- `events.show_attendee_count boolean not null default false` (o anfitrião decide se o nº de confirmados é público).
- `events.visibility text not null default 'private'`, `events.public_slug text unique null` (aleatório, 10+ caracteres base64url, gerado ao tornar público), `events.min_age smallint null`, `events.max_age smallint null` (`CHECK (min_age IS NULL OR max_age IS NULL OR min_age <= max_age)`, 0–120).
- `hosts.profile_visibility text not null default 'private'`.
- `invitations`: `source text not null default 'personal'` (`personal | public_link`), `guest_age smallint null`, `age_flag boolean not null default false`, `age_flag_reason text null`.
- `host_birth_date_changes (id, host_id, old_value, new_value, changed_at)` para auditoria.
- Índice único parcial para evitar duplicados no link público: `(event_id, lower(guest_email))` e `(event_id, guest_phone_normalized)` onde `source = 'public_link'`.

## Passo 2 — Backend: link público e confirmação

- `GET /public/events/:slug` — dados públicos do evento (mesmo DTO seguro do convite; **sem** lista de convidados, **sem** limites de idade). Devolve apenas `has_age_restriction: boolean` e `attendee_count` **só se** `show_attendee_count = true` (caso contrário o campo não existe na resposta).
- `POST /public/events/:slug/rsvp` — corpo `{ name, email?, phone?, age?, status, message? }`.
  - Valida: nome 2–120; pelo menos um contacto; telefone normalizado (`normalizeAngolanPhone`); `age` obrigatória se o evento tiver restrição.
  - **Duplicados**: mesmo contacto no mesmo evento atualiza a resposta existente (idempotente), não cria outra.
  - **Limites**: rate limit por IP e por evento (reutiliza limiters existentes); campo honeypot invisível; tamanho máximo do corpo.
  - Idade fora dos limites → erro **genérico** `Não foi possível confirmar a sua presença neste evento.` (mesmo código e corpo para qualquer motivo de recusa por idade; **nunca** revelar os limites).
  - Evento cancelado/passado/prazo terminado → mesmas regras atuais.
  - Cria `invitation` com `source = 'public_link'`; notifica o anfitrião como hoje.
- Utilizador **com conta** a abrir o link público: nome/contacto/idade preenchidos da conta (só leitura), um clique para confirmar.

## Passo 3 — Backend: idade

- Utilizador com conta e `birth_date`: idade calculada no servidor (fuso `Africa/Luanda`), nunca confiada ao cliente.
- Utilizador com conta **sem** idade: pode participar em eventos sem restrição; em eventos com restrição, vê "Este evento tem restrição de idade. Indique a sua data de nascimento no perfil." e não confirma.
- Visitante sem conta: vê só "Este evento tem restrição de idade" e preenche a idade junto do nome e contacto.
- **Marcação de alteração suspeita**: se a data de nascimento mudou (registo em `host_birth_date_changes`) e, com o valor antigo, a pessoa **não** cumpria os limites mas com o novo cumpre, a confirmação fica com `age_flag = true` e `age_flag_reason = 'birth_date_changed'`. O anfitrião, gestores e responsável recebem notificação e o card do convidado mostra um selo "Idade alterada". A confirmação **não** é bloqueada; os organizadores decidem.
- **Google**: ao registar/entrar com Google, pedir a data de nascimento só se o scope estiver concedido pela Google; se não vier, deixa vazia (não inventar, não pedir scopes extra sem aprovação). Registar a decisão em `DECISIONS.md`.

## Passo 4 — Backend: apagar evento com confirmados

- `DELETE /host/events/:id` com corpo `{ confirm_name }`: se existirem convidados com `rsvp_status = accepted`, exige `confirm_name` igual ao título (comparação exata, trim). Sem confirmados, não exige. Só o responsável/criador do evento (Bloco 11 estende às comunidades). Soft delete; auditoria.

## Passo 5 — Frontend

1. **Evento**: no wizard e no modal de edição, seletor "Visibilidade" (Privado/Público) com explicação curta e interruptor "Mostrar o número de confirmados" (só visível em eventos públicos, desativado por defeito); campos opcionais "Idade mínima" e "Idade máxima" (`inputmode="numeric"`, validação mín ≤ máx), com nota "Por defeito, qualquer idade pode participar".
2. **Rota pública** `/e/:slug`: página de evento público em ecrã (como o convite) com formulário de confirmação (nome, e-mail ou telefone com máscara +244, idade se `has_age_restriction`, mensagem opcional). Reutiliza `parts/` do convite. Erro genérico idêntico para todas as recusas.
3. **Perfil**: interruptor "Perfil público" em Definições/Perfil (privado por defeito), com aviso do que passa a ser visível.
4. **Cards de convidado**: selo "Idade alterada" quando `age_flag`; origem "Link público" como `meta`.
5. **Copiar link**: ao lado de **cada** botão "Reencaminhar por WhatsApp" (convite individual, link do evento público, link de gestor e link de membro de equipa com o respetivo código) acrescenta "Copiar" (`ShareService.copy`, toast, fallback `execCommand`).
6. **Apagar evento**: modal com campo de texto "Escreva o nome do evento para confirmar", botão destrutivo desativado até coincidir (estilo Vercel/Render).

## Critérios de aceitação

- [ ] Eventos antigos continuam privados; perfis antigos privados.
- [ ] Link público confirma com nome + contacto, sem duplicados, com rate limit.
- [ ] Recusa por idade devolve sempre a mesma resposta; limites nunca expostos.
- [ ] Alteração de data de nascimento que passa a cumprir limites marca a confirmação e notifica organizadores.
- [ ] Perfil privado nunca aparece em pesquisas (testes negativos).
- [ ] Botão copiar presente em todos os pontos com WhatsApp.
- [ ] Apagar evento com confirmados exige o nome; testes de permissão.
- [ ] Migração reversível; `build`, `lint`, `test`, `typecheck` verdes; `docs/REPORT-BLOCO-10.md`.

## Fora de âmbito

Feed, comunidades, capacidade máxima de convidados, SMS.
