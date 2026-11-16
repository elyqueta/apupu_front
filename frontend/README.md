# Frontend — Angular 22

## Objectivo

Implementar a aplicação do anfitrião e a experiência pública do convidado. Usar Angular 22, TypeScript em modo estrito e Tailwind CSS. A API Node.js/Express é a autoridade sobre dados, acesso, estado de RSVP, claim de links e lembretes.

## Limites da primeira fase

Incluído:

- Criação e edição inicial de um evento sem conta.
- Selecção de um template disponível e personalização dos campos definidos neste documento.
- Registo de convidados, validação dos emails e emissão de convites individuais por email.
- Link secreto de gestão do evento.
- Consulta do convite, visualização dos dados configurados pelo anfitrião e resposta RSVP.
- Tema claro/escuro, acessibilidade e estados de carregamento/erro.

Não incluído:

- Login, contas, painel de administração, pagamento, subscrição ou funcionalidades pagas.
- Envio automático por SMS, WhatsApp ou redes sociais.
- Uma galeria fictícia apresentada como se contivesse templates finais. Até os templates serem fornecidos, usar apenas uma pré-visualização de desenvolvimento claramente identificada e a infra-estrutura de templates.
- Acesso a listas de convidados a partir de páginas públicas.

## Restrições inegociáveis de estilo

- Usar classes utilitárias Tailwind nos templates Angular.
- Permitir apenas um ficheiro CSS global de entrada, por exemplo `src/styles.css`, para a importação e os tokens Tailwind exigidos pelo projecto.
- Não criar CSS de componente, folhas CSS adicionais, SCSS, `style=""`, `<style>` ou configurações de `styles` específicas de componente para resolver layout.
- Não manipular estilos através de `ElementRef`, `Renderer2` ou strings CSS. A mudança de tema deve ser feita por classes/modo dark e tokens Tailwind.
- Ícones da interface devem ser SVG inline locais e coerentes com os tons neutros e verdes da marca; não usar emojis como ícones de produto nem depender de imagens remotas.

## Ordem de leitura

1. [`../../agents.md`](../../agents.md)
2. [`design-system.md`](design-system.md)
3. [`user-flows-and-acceptance.md`](user-flows-and-acceptance.md)
4. [`architecture.md`](architecture.md)
5. [`api-integration.md`](api-integration.md)

## Pronto para entrega quando

- `ng build` e os testes relevantes passam.
- Os fluxos definidos em `user-flows-and-acceptance.md` estão cobertos por testes automatizados de componente/integração ou por uma lista de verificação de E2E documentada.
- Não existem erros de tipo nem violações da restrição de ficheiros CSS.
- As vistas de convite, criação do evento, RSVP e gestão têm estados responsivos, acessíveis, vazios, de carregamento e erro.
- A resposta de convite indisponível é apresentada de forma genérica, sem revelar se um token válido foi reclamado por outra pessoa.
