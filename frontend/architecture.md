# Arquitectura frontend

## Base técnica

- Angular 22, TypeScript estrito e componentes standalone.
- Usar o router Angular para separar o fluxo do anfitrião, a gestão e a vista pública de convite.
- Preferir signals e serviços tipados para estado local/partilhado; não introduzir uma biblioteca de estado global sem necessidade real.
- Usar Reactive Forms para formulários com validação condicional e grupos repetíveis, como a lista de convidados.
- Manter acesso HTTP em serviços tipados e os componentes focados em apresentação/interacção.
- Segredos de convite e gestão nunca vão para analytics, logs de cliente, armazenamento persistente inseguro ou mensagens de erro.

## Organização proposta

Adaptar esta organização se o repositório já tiver convenções melhores; não mover ficheiros sem necessidade:

```text
src/
  app/
    core/
      api/                 # cliente HTTP e modelos de contrato
      routing/             # guards apenas para o fluxo de gestão por capacidade
      theme/               # preferência claro/escuro
    features/
      event-setup/         # formulário e passos de configuração do evento
      templates/           # catálogo devolvido pela API e pré-visualização
      guests/              # gestão dos convidados no fluxo de criação/gestão
      host-management/     # leitura/edição através do segredo de gestão
      invitation/          # vista pública de convidado e resposta RSVP
    shared/
      components/          # botão, cartão, campo, modal, ícones SVG
      forms/
  styles.css               # único ponto global para Tailwind
```

## Fronteiras e ciclo de vida dos dados

- O frontend pode manter temporariamente rascunhos de formulário durante uma sessão, mas não deve ser a fonte de verdade nem guardar segredos do evento em `localStorage`.
- Receber e guardar o token de gestão apenas enquanto necessário para a sessão. Preferir entregar o segredo por fragmento URL à página e removê-lo do histórico assim que trocado por uma sessão limitada, se o backend suportar essa troca.
- Para o link do convidado, deixar o backend reclamar o convite e emitir o cookie de navegador. Não tentar simular a vinculação ou decidir acesso no frontend.
- Não expor objectos de evento completos quando a API pública só precisa de dados de apresentação.
- Não carregar listas de outros convidados na página pública do convite, mesmo que a resposta esteja escondida na interface.
- Mensagens de erro públicas devem ser genéricas; detalhe técnico fica no servidor, sem dados pessoais.

## Rotas conceptuais

Os caminhos exactos devem ser alinhados com o contrato da API e com o estado real do projecto:

- `/criar-evento`: criação de evento e convidados.
- `/gestao`: troca do segredo por uma sessão de gestão ou entrada por link secreto.
- `/gestao/evento`: edição dos dados do evento e acompanhamento das respostas.
- `/i/:token`: reclamação/visualização do convite individual.

Não colocar emails, telefones, nomes ou dados bancários na rota. O token público deve ser aleatório, opaco e não enumerável.

## Formulários

- Validar no cliente campos obrigatórios, formato e comprimentos para feedback imediato; o backend valida novamente.
- O endereço de email é obrigatório na primeira fase porque o único canal automatizado é email. Telefone é opcional e deve ser claramente marcado como não utilizado para envio.
- O bloco de contribuição bancária é opcional e só aparece no convite quando foi explicitamente habilitado pelo anfitrião.
- Valores de regras, mensagem e vestuário são texto simples. Não renderizar HTML arbitrário fornecido pelo anfitrião.
- Datas e horários devem ser introduzidos e apresentados com o fuso horário do evento; não transformar silenciosamente um horário local em UTC sem preservar o fuso.

## Estados de interface

Todas as operações assíncronas devem apresentar estados de carregamento, sucesso e falha. Impedir submissões duplicadas no cliente, sem depender disso para idempotência no servidor. Oferecer recuperação por nova tentativa quando segura e não mostrar sucesso se a API falhar.

