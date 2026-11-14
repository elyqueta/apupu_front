# Design system e linguagem visual

## Referência visual

A imagem fornecida pelo responsável mostra uma interface futurista nocturna: fundo azul-marinho/cosmos, painel de aplicação escuro, cartões arredondados translúcidos, azul eléctrico luminoso, apontamentos violeta e ciano, linhas finas e brilho localizado. Adaptar esta direcção à plataforma de eventos; não reproduzir o dashboard de gestão da imagem nem copiar marcas, nomes ou conteúdo nela presentes.

## Paleta inicial

Os valores abaixo são tokens de partida aproximados para implementar a direcção visual. Manter o contraste legível e ajustar os tons após comparar com a referência e testar em ecrãs reais:

| Token | Claro | Escuro |
|---|---|---|
| `canvas` | `#F4F6FF` | `#080D20` |
| `surface` | `#FFFFFF` | `#101832` |
| `surface-raised` | `#EEF1FF` | `#172344` |
| `text` | `#141B35` | `#F3F5FF` |
| `text-muted` | `#596482` | `#AAB5D1` |
| `accent` | `#365FFF` | `#6685FF` |
| `accent-strong` | `#294BDD` | `#8BA0FF` |
| `violet` | `#745BFA` | `#A28BFF` |
| `cyan` | `#087FAD` | `#64D9FF` |
| `border` | `#DDE3F5` | `#263456` |

No tema claro, preservar a identidade azul/violeta usando fundos claros e sombras subtis; não inverter simplesmente todos os valores nem usar texto branco em cartões brancos. No tema escuro, evitar grandes superfícies pretas puras.

## Tailwind e ficheiros permitidos

- Usar Tailwind CSS (preferencialmente a integração compatível com Tailwind 4 e Angular 22).
- Manter exactamente um ficheiro CSS global de entrada, normalmente `src/styles.css`, contendo a importação Tailwind e apenas as definições de tokens/configuração global indispensáveis.
- Não criar qualquer outro `.css`, `.scss`, folha por componente, CSS inline, `<style>` ou estilo específico de componente. Validar esta regra ao rever o diff e a árvore do projecto.
- Preferir tokens de tema e utilitários Tailwind aos valores arbitrários. Não espalhar códigos hexadecimais repetidos pelos templates.
- Classes de tema devem ser trocadas no elemento raiz (`html` ou contentor da aplicação), com suporte ao modificador `dark:` e persistência apenas da preferência não sensível do utilizador.

## Cor, luz e superfícies

- Usar gradientes azul-eléctrico/violeta em acções primárias, focos e pequenos destaques; não aplicar brilho intenso em todo o texto.
- Construir cartões com contraste suficiente, borda subtil e sombra/glow discreto. A translucidez é decorativa e não pode reduzir legibilidade.
- Reservar ciano para estados informativos e realces, não para parágrafos longos.
- Estados de sucesso, aviso e erro precisam de cor, ícone e texto; nunca comunicar estado apenas pela cor.
- Não mostrar campos bancários como decoração indistinguível de um botão ou de informação já copiada.

## Forma, tipografia e ícones

- Preferir cartões e controlos com cantos arredondados consistentes, espaçamento generoso e hierarquia tipográfica clara.
- Usar uma família sans-serif legível disponível localmente ou carregada pela estratégia aprovada do produto. Não tornar a interface dependente de uma fonte remota não licenciada.
- Desenhar ícones SVG de traço limpo, geométrico, com cantos suaves e acentos azul/ciano/violeta coerentes. SVG deve ter `viewBox`, dimensões, `aria-hidden="true"` quando decorativo e não incluir scripts, referências remotas ou conteúdo não fiável.
- Para ícones que transmitam informação, fornecer nome acessível; para controlos só com ícone, usar `aria-label` e foco visível.
- Usar `currentColor` nos SVG sempre que adequado para acompanhar o tema claro/escuro.

## Acessibilidade e responsividade

- Cumprir WCAG 2.2 AA como meta: contraste de texto, foco visível, navegação por teclado, labels, erros associados aos campos e estados anunciados por leitores de ecrã.
- Não depender de hover; todos os controlos têm de funcionar por toque e teclado.
- Respeitar `prefers-reduced-motion`; reduzir ou remover animações e efeitos de glow em movimento.
- Em dispositivos móveis, permitir edição confortável de formulários, leitura de regras longas, uso dos dados bancários e resposta ao convite sem scroll horizontal.
- A escolha de tema oferece claro, escuro e, se simples no projecto, “seguir sistema”. O padrão deve seguir a preferência do sistema sem bloquear a mudança manual.

