# Bloco 13 — Instituições

> Depende do Bloco 11. Branch: `feat/bloco-13-instituicoes`. Bloco pequeno, só o modelo base.

## Regras de produto (decididas)

- Uma instituição agrupa **uma ou várias comunidades**. Uma comunidade pertence a **no máximo uma** instituição.
- Só contas de anfitrião criam instituições. **Só o criador administra** a instituição (sem administradores adicionais neste bloco).
- Comunidade sem instituição é válida e pode associar-se depois; uma instituição pode receber ou perder comunidades.
- **Decidido**: qualquer lado pede a associação e o **criador da instituição aprova sempre com OTP por e-mail**:
  - comunidade (órfã) pede para entrar → o criador da instituição aprova com OTP;
  - instituição convida uma comunidade → o **responsável da comunidade aceita** e o criador da instituição **confirma com OTP**.
- Uma comunidade pode sair da instituição (responsável da comunidade) ou ser removida (criador da instituição, com OTP).

## Passos

1. **Backend**: migração reversível: `institutions (id, name, slug unique, description, visibility, creator_id, avatar/cover com public_id, created_at, deleted_at)`, `communities.institution_id uuid null`, `institution_community_requests (id, institution_id, community_id, direction community_to_institution|institution_to_community, status, otp…, decided_at)`. Reutilizar o serviço de OTP (purpose `institution_link`). Rotas CRUD, pedidos, aprovar/rejeitar, remover, auditoria; testes de permissões e de OTP.
2. **Frontend**: "Instituições" no menu; `/instituicoes/:slug` (capa + avatar, comunidades, eventos agregados); modais para criar/editar, convidar comunidade, pedir associação, confirmar com OTP; mostrar a instituição no perfil da comunidade.
3. Feed: instituições públicas como cartão no separador "Comunidades" (sem novo tipo de pesquisa neste bloco).

## Critérios de aceitação

- [ ] Comunidade com no máximo uma instituição (restrição na BD).
- [ ] Nenhuma ligação/remoção sem OTP do criador da instituição.
- [ ] Testes negativos de permissão; `build`, `lint`, `test`, `typecheck` verdes; `docs/REPORT-BLOCO-13.md`.

## Fora de âmbito

Administradores da instituição, faturação, relatórios agregados.
