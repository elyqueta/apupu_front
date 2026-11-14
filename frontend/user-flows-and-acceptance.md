# Fluxos e critérios de aceitação frontend

## 1. Criar evento sem login

1. O anfitrião abre o formulário de criação sem passar por login.
2. Preenche título, nome e email de contacto do anfitrião, data, hora, fuso horário, local (ou ligação online), mensagem, regras, vestuário e prazo de resposta se configurado.
3. Escolhe tema/estilo e cores dentro das opções suportadas e pré-visualiza o resultado.
4. Pode habilitar uma contribuição. Os dados bancários só são recolhidos e mostrados se essa opção estiver activa; explicar que a plataforma não processa pagamentos.
5. Selecciona um template publicado pela API. Se não houver templates publicados, mostrar estado vazio informativo, sem inventar templates oficiais.
6. Erros de validação são apresentados junto ao campo e não apagam os valores introduzidos.

**Aceitação:** não existe pedido de login; data/hora e fuso não são ambíguos; o evento não é apresentado como criado até a API confirmar.

## 2. Adicionar convidados e enviar

1. O anfitrião pode adicionar vários convidados com nome e email obrigatório; telefone pode ser opcional, com aviso de que não é usado para envio na primeira fase.
2. Validar emails duplicados no mesmo evento com uma mensagem accionável; o backend decide a regra final e protege contra duplicação concorrente.
3. Apresentar resumo antes do envio: evento, contagem, canal email e aviso de que cada pessoa receberá um link próprio.
4. Após sucesso, mostrar confirmação de que o link secreto de gestão foi enviado para o email do anfitrião. Não devolver nem incluir esse segredo em logs, analytics ou respostas do frontend.
5. Se o envio de convite falhar parcialmente, indicar quais destinatários falharam sem afirmar que todos receberam; seguir os resultados tipados da API.

**Aceitação:** não afirmar envio por WhatsApp/SMS. A interface pode oferecer partilha manual de um link com `navigator.share` ou copiar para a área de transferência, deixando claro que o link continua a ser individual e vinculado ao primeiro navegador.

## 3. Gestão do anfitrião

- Acesso através do link secreto recebido por email; não pedir credenciais de conta.
- Mostrar os dados do evento, estado agregado de RSVP e acções autorizadas pela API.
- Não mostrar o token de gestão em ecrãs, telemetria ou logs. Um link de gestão perdido não pode ser recuperado por uma conta inexistente; apresentar apenas os meios de recuperação que o backend realmente suporte.
- Quando um convidado recusa, reflectir a mudança depois de a API confirmar e indicar que não receberá novos lembretes.

## 4. Abrir convite individual

1. Em `/i/:token`, chamar a operação pública de claim/abertura da API.
2. No primeiro acesso, a API vincula o convite ao navegador e define a credencial/cookie segura. A página não armazena essa credencial em JavaScript.
3. Nesse navegador, apresentar os dados públicos autorizados do evento: anfitrião, data/hora/fuso, localização ou link online, mensagem, regras, vestuário, template e dados bancários apenas se habilitados.
4. Se outro navegador tentar abrir o mesmo link, mostrar uma página genérica visualmente equivalente a “convite não encontrado”; não confirmar se o token existia ou foi reclamado.
5. Se o navegador vinculado voltar a abrir o link, permitir consultar e gerir a resposta, sujeito ao estado e validade determinados pelo backend.

**Aceitação:** não revelar email/telefone do convidado, convidados adicionais, estado privado de terceiros, token interno ou dados bancários não habilitados. Explicar ao utilizador, antes de partilhar, que o link só funciona no primeiro navegador que o abrir.

## 5. RSVP

- Mostrar acções claras para confirmar presença, alterar uma confirmação ou recusar.
- Pedir confirmação antes de uma recusa definitiva; explicar que o anfitrião será notificado e que os lembretes cessarão.
- O RSVP é submetido uma vez; bloquear temporariamente a acção repetida no cliente, mas lidar correctamente com concorrência e resposta final do servidor.
- Mostrar sucesso somente após confirmação da API. Se a sessão/cookie de claim estiver ausente ou expirada, seguir a resposta genérica do contrato sem contornar a vinculação.
- Respeitar prazo de RSVP, se configurado pelo anfitrião; não inventar aceitação de respostas fora do prazo.

## 6. Tema e acessibilidade

- Tema claro/escuro funciona em todas as rotas, incluindo a página de convite.
- Tema muda sem recarregar a página e sem alterar cores dos templates de forma inesperada.
- Formulários, modais, navegação e RSVP são usáveis por teclado, leitor de ecrã e ecrã pequeno.
- Estados de carregamento, sem templates, erro de rede, convite indisponível, evento cancelado/expirado e RSVP guardado têm apresentação explícita.
