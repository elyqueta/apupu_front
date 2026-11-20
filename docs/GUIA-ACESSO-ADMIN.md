# Guia — Acesso ao painel `/admin`

**Data:** 2026-11-20  
**Aplicação:** `apupu_front` (branch `feat/ajustes-fase-4`)  
**Pré-requisito:** uma conta de anfitrião já criada e com e-mail confirmado.

O painel de super admin não tem link visível na navegação: abre-se por URL
direta em `/admin`. O acesso é decidido pelo backend (`is_super_admin` em
`hosts`) e verificado duas vezes: pelo `superAdminGuard` no frontend e pelo
middleware `requireSuperAdmin` nas rotas `/api/v1/admin/*`.

> Não existe rota, botão nem script para promover contas. A promoção é
> feita apenas com SQL direto na base de dados, por uma pessoa com acesso
> administrativo à base. Nenhum e-mail real deve ser escrito em código,
> documentação ou commits — o `<email>` abaixo é apenas um marcador.

## 1. Criar e confirmar a conta

1. Abrir `/criar-conta` na aplicação.
2. Concluir o registo com o e-mail que vai ser promovido (código de 6 dígitos
   e definição de senha).
3. Confirmar que a conta consegue entrar normalmente em `/entrar`.

Só contas já existentes podem ser promovidas: `hosts.is_super_admin` é uma
coluna de uma linha existente, não cria utilizadores.

## 2. Promover a conta por SQL

Ligação à base com as credenciais do ambiente (Neon, em produção). Substituir
`<email>` pelo endereço da conta:

```sql
UPDATE hosts SET is_super_admin = true WHERE email = '<email>';
```

Confirmar o resultado:

```sql
SELECT id, email, is_super_admin FROM hosts WHERE email = '<email>';
```

A coluna existe desde a migração `1739900000020_super-admin-and-cancellation.js`
e tem `default false`. A atualização é permanente; para retirar o papel:

```sql
UPDATE hosts SET is_super_admin = false WHERE email = '<email>';
```

## 3. Atualizar a sessão e abrir o painel

A flag de super admin é lida da sessão (`GET /api/v1/auth/session` →
`data.host.is_super_admin`). Se a sessão já estava aberta antes da promoção,
o guard ainda vê o valor antigo.

1. Terminar sessão na aplicação (botão “Terminar sessão” em Definições).
2. Entrar de novo em `/entrar` com a mesma conta.
3. Abrir `/admin` na barra de endereço.

O shell do painel mostra agora seis abas: **Visão geral**, **Eventos**,
**Utilizadores**, **Auditoria**, **Apoio** e **Novidades**.

## 4. Verificações rápidas

- Sem `is_super_admin`, abrir `/admin` redireciona para `/painel` sem revelar
  detalhes do motivo.
- Com `is_super_admin`, as chamadas `/api/v1/admin/*` devem responder; uma
  conta normal recebe `403 admin_forbidden`.
- Em `/admin/apoio` devem aparecer as mensagens enviadas pelo modal de apoio;
  em `/admin/novidades` os emails subscritos no rodapé da landing.

## Pontos de atenção

- A promoção é uma decisão de acesso privilegiado: registar quem a executou
  no processo habitual da equipa, fora deste repositório.
- Não partilhar cookies de sessão nem tokens CSRF; as escritas administrativas
  exigem `X-CSRF-Token`.
- Não criar uma conta de teste com e-mail real de cliente para efeitos de
  demonstração.
