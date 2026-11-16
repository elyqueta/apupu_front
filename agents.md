# Instruções gerais para agentes de desenvolvimento

## 1. Objetivo do produto

Construir uma plataforma web, sem autenticação de anfitriões na primeira fase, para criar eventos, escolher um template de convite, registar convidados e enviar convites e lembretes por email. Cada convidado recebe um link individual. O convidado pode consultar os detalhes do evento e responder ao convite; uma recusa deve parar os lembretes desse convidado e notificar a anfitriã ou o anfitrião.

O frontend será desenvolvido com Angular 22, TypeScript e Tailwind CSS. O backend será desenvolvido com Node.js, Express, TypeScript em modo estrito e PostgreSQL. A primeira fase não inclui contas, autenticação de utilizadores, painel administrativo, pagamentos, planos pagos nem envio automatizado por SMS ou WhatsApp.

## 2. Fonte de verdade e ordem de leitura

1. Ler este ficheiro antes de alterar código.
2. Ler o índice em [`doc/README.md`](doc/README.md).
3. Trabalhar apenas com os requisitos da área relevante:
   - Frontend: [`doc/frontend/`](doc/frontend/README.md)
   - Backend: [`doc/backend/`](doc/backend/README.md)
4. Se dois documentos parecerem contradizer-se, seguir primeiro os contratos partilhados em `doc/backend/api-contract.md` e os fluxos de aceitação em `doc/frontend/user-flows-and-acceptance.md`. Registar a discrepância e pedir esclarecimento antes de implementar uma alteração de negócio.
5. Não inventar requisitos ausentes. Para decisões que alterem privacidade, segurança, comportamento de convites, persistência, canais de comunicação ou âmbito do produto, parar e perguntar ao responsável.

## 3. Regras de trabalho

- Antes de editar, inspeccionar a estrutura real do projecto, os ficheiros existentes, os comandos de validação e as convenções usadas. Não assumir que um repositório vazio continua vazio.
- Procurar implementações e componentes reutilizáveis antes de criar novos.
- Fazer alterações pequenas, completas e coerentes com o âmbito pedido. Não reformatar nem corrigir problemas não relacionados.
- Preservar alterações pré-existentes; nunca descartar trabalho de outras pessoas.
- Manter TypeScript estrito, validação de entrada explícita e erros visíveis segundo os padrões do projecto. Não ocultar falhas com valores por omissão ou blocos `catch` genéricos.
- Não guardar segredos, tokens de convite, dados bancários ou conteúdo pessoal em logs, telemetria, URLs de analytics ou mensagens de erro.
- Não tratar um link secreto como autenticação robusta. O produto não tem contas na primeira fase; a posse do link de gestão permite gerir o evento.
- Não afirmar que um convite é inviolável ou que a vinculação ao navegador identifica uma pessoa ou um dispositivo físico.
- Actualizar a documentação directamente relacionada com qualquer mudança de contrato ou comportamento.
- Não adicionar dependências, ferramentas, ficheiros ou abstrações sem necessidade demonstrável.
- Não criar, editar ou carregar templates finais sem material fornecido pelo responsável. Os templates principais serão adicionados posteriormente.

## 4. Sequência obrigatória para implementar uma tarefa

1. **Confirmar o âmbito:** converter o pedido em comportamento observável e listar os fluxos afectados.
2. **Inspeccionar:** localizar os pontos de entrada, dependências, modelos, componentes, rotas, migrações e testes relevantes.
3. **Planear:** identificar alterações frontend, backend, contrato, dados, segurança, acessibilidade e documentação; pedir esclarecimento se uma regra essencial não estiver definida.
4. **Implementar:** seguir os documentos da área e reutilizar os padrões existentes. Aplicar validação no cliente para UX e, independentemente, no servidor como autoridade.
5. **Testar:** executar a validação mais pequena que cobre a alteração; acrescentar testes para novos caminhos, erros e regras de negócio.
6. **Rever:** verificar o diff completo, confirmar que não foram introduzidos ficheiros CSS extra no frontend, segredos, alterações fora do âmbito ou divergências nos contratos.
7. **Relatar:** resumir o que mudou, os testes executados e qualquer limitação, risco ou decisão pendente. Nunca declarar um teste aprovado se não foi executado.

## 5. Critérios globais de aceitação

- Um anfitrião consegue preparar um evento sem criar conta e recebe um link secreto de gestão.
- Cada convidado tem uma identidade de convite e um link próprio; não se reutiliza o link de outro convidado.
- O primeiro navegador que reclamar um convite fica vinculado a esse convite. A mesma sessão de navegador pode voltar a consultar e responder; outro navegador recebe uma resposta visual indistinguível de não encontrado.
- A página pública nunca expõe informação privada de outros convidados.
- Convidados podem aceitar, alterar a resposta ou recusar. Uma recusa termina os lembretes futuros e informa o anfitrião por email.
- O sistema não envia SMS nem mensagens por WhatsApp. A partilha manual de um URL não constitui um canal de envio suportado nem remove a vinculação do convite.
- Os lembretes automáticos usam a cadência aprovada de 14, 7, 3 e 1 dia antes do início do evento, sempre no fuso horário do evento. Não há lembretes depois de uma recusa ou cancelamento.
- A interface suporta temas claro e escuro e usa superfícies neutras com acentos verdes da marca. Usar apenas os tokens definidos para o tema e evitar fundos decorativos, glows e sombras coloridas.
- O frontend contém no máximo um ficheiro CSS global de entrada, necessário para importar/configurar Tailwind. Não são permitidos CSS de componente, folhas adicionais, estilos inline ou `<style>` em templates.

## 6. Decisões fechadas para a primeira fase

| Tema                        | Regra                                                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Autenticação                | Sem contas ou login. A gestão é acessível por um link secreto.                                                      |
| Claim do convite            | Vinculado ao primeiro navegador/sessão que o reclamar. Não é uma identificação de hardware.                         |
| Canal automático            | Apenas email. Telefone pode ser guardado como dado opcional, mas não habilita envio nesta fase.                     |
| Partilha                    | Link pode ser copiado ou partilhado pelo menu nativo do sistema; serviços externos não são integrados para envio.   |
| Lembretes                   | Emails aos 14, 7, 3 e 1 dias antes do evento.                                                                       |
| Templates                   | Infraestrutura e ponto de extensão podem ser preparados, mas os templates finais serão fornecidos pelo responsável. |
| Monetização e administração | Fora do âmbito da primeira fase.                                                                                    |

## 7. Questões que exigem confirmação antes de produção

Não bloquear protótipos locais por estes pontos, mas não escolher silenciosamente uma política final:

- Política legal de retenção e eliminação de dados pessoais e bancários.
- Regras locais de consentimento, unsubscribe e privacidade para emails transaccionais.
- Limites de tamanho, formato e acessibilidade dos templates finais.
- Domínio definitivo e configuração de cookies same-site entre aplicação e API.
- Regras para recuperação de acesso se o anfitrião perder o link secreto.
