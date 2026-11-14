# Documentação do produto

Esta pasta separa os requisitos que podem ser entregues às equipas de frontend e backend. O ficheiro [`../agents.md`](../agents.md) contém as regras comuns de execução; deve ser lido por qualquer agente antes de começar.

## Frontend

Entregar a pasta [`frontend/`](frontend/README.md) à equipa Angular:

- `README.md`: âmbito, restrições e ordem de leitura.
- `architecture.md`: estrutura Angular, responsabilidades e fronteiras.
- `design-system.md`: linguagem visual, tokens, Tailwind, tema claro/escuro e acessibilidade.
- `user-flows-and-acceptance.md`: fluxos e critérios de aceitação visíveis.
- `api-integration.md`: integração do cliente com a API e tratamento de respostas.

## Backend

Entregar a pasta [`backend/`](backend/README.md) à equipa Node.js/Express:

- `README.md`: âmbito e ordem de leitura.
- `architecture-and-data-model.md`: entidades, relações, consistência e persistência.
- `api-contract.md`: endpoints, payloads e erros partilhados.
- `invitation-security.md`: tokens, claim por navegador, gestão secreta e privacidade.
- `email-and-reminders.md`: emails, cadência, idempotência e filas.

## Regras de coordenação

- O contrato HTTP em `backend/api-contract.md` é a referência compartilhada. Alterá-lo exige actualizar simultaneamente a integração frontend e os testes de contrato.
- Nenhum requisito desta documentação autoriza envio automático por telefone, WhatsApp ou redes sociais.
- As listas de convidados são privadas. Não expor emails ou telefones num endpoint público de convite.
- Uma recusa interrompe todos os lembretes subsequentes daquele convite, mas não altera a resposta de outros convidados.
- A ligação de gestão é um segredo bearer na primeira fase, não um mecanismo de login ou identidade.
- Os detalhes bancários são informativos; a aplicação não processa pagamentos.
