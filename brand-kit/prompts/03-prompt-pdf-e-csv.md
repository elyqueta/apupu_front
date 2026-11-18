# PROMPT 3 — PDFs descarregáveis e CSVs exportados (colar no OpenCode)

Contexto: a plataforma **Conto Contigo** permite descarregar documentos (PDF) e exportar dados (CSV). Não consegues ler imagens: a aparência está descrita abaixo, e os ficheiros de marca estão em `brand-kit/`. **Primeiro inspeciona** como o projeto gera hoje PDFs/CSVs (biblioteca, front-end ou back-end, endpoints, estrutura do JSON) e propõe o plano em poucas linhas. Usa a biblioteca que já existe; se não houver nenhuma, propõe a mais simples e espera a minha confirmação.

## A. PDFs

### Documentos a cobrir (adapta aos que o projeto já tem)
Lista de convidados e respostas, convite/bilhete com QR, resumo do evento, relatório de presenças, comprovativo/recibo (se existir pagamento). Todos partilham o mesmo layout-base.

### Layout-base (A4 vertical)
- Margens: 20 mm laterais, 18 mm topo, 20 mm fundo. Fonte **Figtree** embebida (usa `brand-kit/fonts/*.ttf`): corpo 10 pt/400 cor `#14201F`, secundário 8,5 pt cor `#5B6B69`, títulos 700–800.
- **Cabeçalho (todas as páginas):** logótipo horizontal (`svg/logo-horizontal.svg`, vetorial, 38 mm de largura) à esquerda; à direita, tipo de documento (ex.: "Lista de convidados") a 11 pt/700 `#0F3D3E` e, por baixo, data de geração a 8,5 pt. Linha fina de 0,8 pt `#E8B230` por baixo.
- **Título do documento** na 1.ª página: 20 pt/800 `#0F3D3E`, com subtítulo (nome do evento, data, local) a 11 pt `#5B6B69`.
- **Marca d'água (obrigatória, em todas as páginas):** o **símbolo do pin** (`pdf/watermark-symbol.svg`, vetorial) centrado na página, com ~110 mm de largura, cor `#0F3D3E` com **opacidade 6 %**, sem rotação, desenhado **atrás** de todo o conteúdo (primeira camada). Não pode reduzir a legibilidade nem bloquear a seleção de texto. Nas páginas com blocos de fundo sólido, o bloco fica por cima da marca d'água.
- **Tabelas:** cabeçalho com fundo `#0F3D3E` e texto branco 9 pt/700; linhas alternadas `#FFFFFF` / `#F1F7F6`; bordas horizontais 0,5 pt `#E4E2D8`; padding 6×8 pt; o cabeçalho repete-se em cada página; linhas nunca partidas entre páginas. Números alinhados à direita, texto à esquerda.
- **Estados (etiquetas):** "Confirmado" texto `#2E7D4F` fundo `#E6F3EB`; "Pendente" `#B7791F` / `#FDF3DD`; "Recusado" `#B3382C` / `#FBEAE8`. Cantos 4 pt, 8 pt/700.
- **Bloco de destaque** (totais, resumo): fundo `#FBF1D6`, barra esquerda 3 pt `#E8B230`, valores a 14 pt/800 `#0F3D3E`.
- **QR code** (se aplicável): 32×32 mm, zona de silêncio de 4 mm, módulos `#0F3D3E` sobre branco.
- **Rodapé (todas as páginas):** linha fina `#E4E2D8`; à esquerda "Conto Contigo · Luanda, Angola" e o URL do site; ao centro "Página X de Y"; à direita o código do documento (ex.: `CC-LST-2026-000123`). 8 pt `#8A9694`.
- Valores: `12 500,00 Kz`. Datas: `22 nov 2026, 15:00` (fuso `Africa/Luanda`). Texto em pt-PT.
- Metadados do PDF: título, autor "Conto Contigo", idioma `pt-PT`.
- Nome do ficheiro: `conto-contigo_{tipo}_{slug-do-evento}_{AAAA-MM-DD}.pdf`.

### Requisitos
- Fontes embebidas, logótipo e marca d'água em **vetor** (não rasterizar).
- Tamanho típico < 300 KB para documentos de 1–3 páginas.
- Listas longas: paginação automática, sem cortar linhas.
- Estados vazios: mensagem "Ainda não há convidados" em vez de tabela vazia.

## B. CSV exportados
Regras comuns a todos os CSV:
- Codificação **UTF-8 com BOM** (o Excel abre os acentos corretamente).
- Separador **ponto e vírgula `;`**, fim de linha `CRLF`, texto entre aspas `"` quando necessário (aspas duplicadas dentro do texto).
- **Primeira linha = cabeçalhos legíveis em pt-PT** e ordem fixa, por exemplo para convidados: `Nome;Telemóvel;E-mail;Estado;Acompanhantes;Mesa;Respondeu em;Observações`.
- Datas e horas: `AAAA-MM-DD HH:mm` no fuso `Africa/Luanda`. Números sem separador de milhares e com **vírgula decimal** (`12500,00`); a moeda vai numa coluna própria (`Moeda` = `AOA`).
- Telemóvel no formato `+244 9XX XXX XXX`, tratado como **texto** (não perder o `+` nem zeros).
- Estados em português ("Confirmado", "Pendente", "Recusado"), nunca códigos internos.
- **Proteção contra injeção de fórmulas:** se uma célula de texto começar por `=`, `+`, `-` ou `@`, prefixa com `'`.
- Sem linhas de metadados nem totais misturados com os dados.
- Nome: `conto-contigo_{tipo}_{slug-do-evento}_{AAAA-MM-DD}.csv`.
- Exportações grandes: gerar em *streaming* no back-end, sem carregar tudo em memória.
- Se existir um botão de exportar, o rótulo é "Exportar CSV" e mostra o estado "A preparar…" enquanto gera.

## Critérios de aceitação
- PDF de teste de cada tipo gerado com dados de exemplo; marca d'água presente em todas as páginas e texto selecionável.
- CSV abre no Excel/LibreOffice com acentos corretos e colunas separadas.
- Testes automáticos para: formatação de datas/valores, escape de fórmulas, BOM e cabeçalhos.
- Não alteres endpoints existentes sem me avisar; se for preciso, propõe a mudança primeiro.
