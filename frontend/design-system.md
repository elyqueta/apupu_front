# Design system e linguagem visual

## Paleta e tokens

Os tokens são definidos exclusivamente em `src/styles.css` e usados nos dois temas:

| Token             | Claro     | Escuro                  |
| ----------------- | --------- | ----------------------- |
| `bg`              | `#F3F6F5` | `#0A1211`               |
| `surface`         | `#FAFCFB` | `#0F1A19`               |
| `surface-alt`     | `#EAF0EE` | `#152423`               |
| `border`          | `#D3DEDB` | `#223634`               |
| `text`            | `#10201F` | `#E7EFED`               |
| `text-muted`      | `#50635F` | `#93A7A3`               |
| `secondary`       | `#0F3D3E` | `#1F7A6B`               |
| `secondary-hover` | `#0B2F30` | `#1F7264`               |
| `secondary-soft`  | `#E1EDEA` | `rgba(47,164,138,0.14)` |
| `secondary-text`  | `#0F3D3E` | `#5CC4AE`               |
| `on-secondary`    | `#F3F6F5` | `#FFFFFF`               |
| `on-danger`       | `#F3F6F5` | `#0A1211`               |
| `focus-ring`      | `#0F3D3E` | `#5CC4AE`               |
| `warning`         | `#855800` | `#FFB627`               |
| `danger`          | `#B74335` | `#E5604D`               |
| `danger-hover`    | `#A93A2D` | `#E97562`               |

O aviso e o erro usam uma variante mais escura no tema claro para manter contraste de texto AA. O tema escuro usa superfícies verde-neutras, nunca preto puro.

## Tailwind e ficheiros permitidos

- Usar Tailwind CSS (preferencialmente a integração compatível com Tailwind 4 e Angular 22).
- Manter exactamente um ficheiro CSS global de entrada, normalmente `src/styles.css`, contendo a importação Tailwind e apenas as definições de tokens/configuração global indispensáveis.
- Não criar qualquer outro `.css`, `.scss`, folha por componente, CSS inline, `<style>` ou estilo específico de componente. Validar esta regra ao rever o diff e a árvore do projecto.
- Preferir tokens de tema e utilitários Tailwind aos valores arbitrários. Não espalhar códigos hexadecimais repetidos pelos templates.
- Classes de tema devem ser trocadas no elemento raiz (`html` ou contentor da aplicação), com suporte ao modificador `dark:` e persistência apenas da preferência não sensível do utilizador.
- As definições devem permitir ampliar os tamanhos de texto da interface sem ampliar margens e espaçamentos; verificar a adaptação em ecrãs pequenos no maior nível disponível.

## Cor e superfícies

- Usar a cor secundária sólida nas acções primárias; usar `secondary-hover` ao passar o cursor.
- Usar superfícies sólidas, bordas subtis e sombras neutras suaves, sem glows ou efeitos decorativos.
- Usar a cor secundária para realces; estados semânticos usam os tokens de sucesso, aviso e erro.
- Estados de sucesso, aviso e erro precisam de cor, ícone e texto; nunca comunicar estado apenas pela cor.
- Não mostrar campos bancários como decoração indistinguível de um botão ou de informação já copiada.

## Forma, tipografia e ícones

- Preferir cartões e controlos com cantos arredondados consistentes, espaçamento generoso e hierarquia tipográfica clara.
- Usar uma família sans-serif legível disponível localmente ou carregada pela estratégia aprovada do produto. Não tornar a interface dependente de uma fonte remota não licenciada.
- Desenhar ícones SVG de traço limpo e geométrico, com acentos coerentes com a marca. SVG deve ter `viewBox`, dimensões, `aria-hidden="true"` quando decorativo e não incluir scripts, referências remotas ou conteúdo não fiável.
- Para ícones que transmitam informação, fornecer nome acessível; para controlos só com ícone, usar `aria-label` e foco visível.
- Usar `currentColor` nos SVG sempre que adequado para acompanhar o tema claro/escuro.

## Acessibilidade e responsividade

- Cumprir WCAG 2.2 AA como meta: contraste de texto, foco visível, navegação por teclado, labels, erros associados aos campos e estados anunciados por leitores de ecrã.
- Não depender de hover; todos os controlos têm de funcionar por toque e teclado.
- Respeitar `prefers-reduced-motion` e manter foco visível em todos os elementos interactivos.
- Em dispositivos móveis, permitir edição confortável de formulários, leitura de regras longas, uso dos dados bancários e resposta ao convite sem scroll horizontal.
- A escolha de tema oferece claro, escuro e, se simples no projecto, “seguir sistema”. O padrão deve seguir a preferência do sistema sem bloquear a mudança manual.
