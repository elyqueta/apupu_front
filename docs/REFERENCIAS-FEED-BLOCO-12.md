# Referências visuais do feed (Bloco 12)

Enviadas pelo autor a 23/11/2026, com a indicação "me surpreenda". Não são para copiar: servem de direção visual, sempre com os tokens e componentes existentes do Conto Contigo (claro/escuro, ≥12 px, alvos ≥44 px, 320 px → desktop).

## 1. Desktop em três colunas (estilo rede social limpa)
- Coluna esquerda: cartão de perfil (capa, avatar sobreposto, nome, @handle, contadores Eventos/Seguidores/A seguir, botão "O meu perfil") e "Atalhos" (comunidades/equipas).
- Coluna central: compositor no topo ("Partilhar algo…" com ações Imagem/Vídeo/Sondagem e seletor de visibilidade "Público"), ordenação "Recentes", cartões de publicação com avatar + nome + tempo relativo, menu de três pontinhos, texto com hashtags, imagem grande arredondada, barra de reações (gosto, comentários, guardar, partilhar) e campo "Escreve um comentário".
- Coluna direita: "Atividade" (quem começou a seguir, gostos) com botão Seguir, e "Sugestões para ti".

## 2. Mobile imersivo (cartões de imagem em ecrã quase inteiro)
- Faixa de "stories"/avatares redondos no topo (com selo "Ao vivo" quando aplicável).
- Cartões de publicação com a imagem a ocupar o cartão inteiro, cantos muito arredondados; nome + @handle + verificado numa pílula translúcida (vidro) sobre a imagem; botão de menu circular translúcido; contadores e legenda sobrepostos na parte de baixo com gradiente.
- Navegação inferior flutuante em pílula translúcida, com o item ativo num círculo destacado.

## 3. Mobile de app moderna (cartões de métricas + destaque)
- Faixa de avatares no topo; cartões de estatística coloridos em carrossel ("Os teus números"); cartão de destaque grande com imagem recortada; secção "Últimas novidades" com avatares empilhados de quem publicou.
- Ecrã de detalhe com imagem a toda a altura, botões circulares de voltar/gostar/partilhar sobre a imagem e CTA em pílula.
- Vista "ao vivo" com comentários em sobreposição e campo de comentário fixo em baixo.

## Como aplicar no Conto Contigo
- Feed de eventos públicos e publicações de amigos/comunidades: cartões imersivos no mobile (padrão 2), três colunas no desktop (padrão 1).
- Faixa de avatares = amigos/comunidades com eventos a acontecer ("Hoje").
- Cartões de métricas do padrão 3 reaproveitam `app-stat-grid`.
- Vidro/translúcido com `backdrop-blur` e tokens `bg-surface/…`; nada de cores novas.
