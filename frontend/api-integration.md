# Integração frontend/API

O contrato partilhado é [`../backend/api-contract.md`](../backend/api-contract.md). Não criar formatos paralelos no cliente.

## Regras HTTP

- Centralizar a configuração do `HttpClient`, URL base, tipagem de respostas e tratamento de erros num cliente/serviço de API.
- Usar HTTPS em ambientes não locais.
- Enviar cookies de claim/gestão com `withCredentials` quando a implantação e o contrato exigirem; configurar CORS e cookies no backend para origem exacta, não `*` com credenciais.
- Usar `withCredentials` nos pedidos da API que dependem de cookies da sessão de conta. Em mutações autenticadas, enviar `X-CSRF-Token` com o `data.csrf_token` da resposta actual de login/registo; ao restaurar ou actualizar uma sessão, usar o valor devolvido por `GET /auth/session`. Não derivar o token nem usar OTP, `verification_token` ou segredo de gestão como CSRF.
- As rotas de workspace, incluindo `POST /host/events`, usam o token da sessão de conta. Nas rotas legadas de gestão por evento, o token CSRF específico do evento continua a ter prioridade e o fluxo por link secreto permanece independente da sessão de conta.
- Durante SSR, encaminhar o cookie HttpOnly `apupu_auth` para a API apenas quando o pedido de entrada e a API usam o mesmo hostname; nunca encaminhar cookies para outro host.
- No Vercel, usar um rewrite same-origin para encaminhar `/api/v1/*` ao Render antes do fallback SPA. O backend deve emitir cookies host-only (sem `Domain=onrender.com`) para que o browser os associe ao domínio Vercel; confirmar esta configuração no ambiente publicado.
- Não copiar tokens de links para `localStorage`, `sessionStorage`, logs ou query parameters de analytics.
- Se a API usar um token curto no fragmento URL para a primeira troca, removê-lo do histórico do navegador depois do processo, sem apagar a rota necessária à navegação.
- Não repetir automaticamente pedidos mutáveis sem uma chave de idempotência quando o contrato a exigir.
- Não fazer retry automático de recusas de autorização, erros de validação, RSVP ou envio de emails.

## Erros e disponibilidade

Mapear os códigos documentados em `api-contract.md` para mensagens acessíveis e específicas da acção. O frontend pode mostrar um erro genérico em links inválidos, expirados ou já reclamados, sem expor a causa exacta. Erros não classificados devem apresentar falha e opção de tentar novamente quando segura; nunca converter falha em sucesso ou lista vazia.

## Privacidade na interface

- Limpar dados sensíveis de formulários e estado local ao terminar a sessão de gestão ou convite, quando apropriado.
- Não incluir nomes, emails, telefones, mensagens, dados bancários nem URLs secretos em ferramentas de análise.
- Verificar que o modo público só recebe dados públicos do evento e não recebe os dados de contacto do anfitrião além do que foi explicitamente destinado à exibição.
- A configuração do link social usa o URL actual do convite individual, sem construir links a partir de campos fornecidos pelo utilizador.

## Testes de contrato

Cobrir, no mínimo, criação do evento, lista vazia de templates, claim inicial, reabertura no mesmo navegador, tentativa de outro navegador, RSVP aceite/alterado/recusado, evento cancelado e falha de email. Os testes devem afirmar payloads/códigos, não apenas a presença de um toast.

