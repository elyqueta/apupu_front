# PROMPT 2 — Mensagens enviadas e templates de e-mail (colar no OpenCode)

Contexto: a plataforma **Conto Contigo** (eventos e convites) envia mensagens aos utilizadores. Já aplicaste a identidade visual (Prompt 1). Não consegues ler imagens, por isso a UI está descrita em texto e há um e-mail de referência em `brand-kit/email/email-base.html`. **Primeiro inspeciona** como o projeto envia hoje e-mails/notificações (serviço, biblioteca, templates existentes, idioma) e apresenta o plano em poucas linhas. Reutiliza a infraestrutura existente; não adiciones bibliotecas sem justificar.

## 1. Voz e tom (pt-PT)
- Tratamento por **tu**, frases curtas, verbos no presente, sem gíria brasileira ("a ligação", não "o link"; "ecrã", não "tela"; "telemóvel", não "celular").
- Sempre: o quê + quando + onde + o que fazer a seguir. Um único pedido de ação por mensagem.
- No máximo 1 emoji por mensagem curta e nenhum no assunto de e-mails transacionais.
- Assinatura curta: "— Equipa Conto Contigo".

## 2. Catálogo de mensagens (cada uma com versão in-app/push, SMS/WhatsApp e e-mail)
| Código | Quando | Assunto do e-mail (máx. 50 car.) | CTA |
|---|---|---|---|
| `boas_vindas` | registo concluído | Bem-vindo ao Conto Contigo | Criar o meu primeiro evento |
| `verificacao_codigo` | código de 6 dígitos | O teu código: {{codigo}} | (sem botão; código em destaque) |
| `recuperar_senha` | pedido de nova senha | Repõe a tua palavra-passe | Definir nova palavra-passe |
| `convite_recebido` | foi convidado | {{anfitriao}} convidou-te para {{evento}} | Ver convite |
| `presenca_confirmada` | convidado respondeu "vou" | {{convidado}} vai ao teu evento | Ver lista de convidados |
| `lembrete_24h` | 24 h antes | Amanhã: {{evento}} | Ver detalhes |
| `lembrete_2h` | 2 h antes | Daqui a 2 horas: {{evento}} | Ver como chegar |
| `evento_alterado` | data/hora/local mudou | Atualização: {{evento}} mudou | Ver alterações |
| `evento_cancelado` | cancelado | {{evento}} foi cancelado | (informativo) |

Exemplo de texto (convite_recebido): "Olá, {{nome}}. {{anfitriao}} convidou-te para **{{evento}}**, a {{data}} às {{hora}}, em {{local}}. Confirma a tua presença para que possamos contar contigo."

## 3. Mensagens curtas (in-app, push, SMS/WhatsApp)
- Push/in-app: título ≤ 45 caracteres, corpo ≤ 120. Ícone da notificação: `symbol` do pin. Cor de destaque `#E8B230` (Android).
- SMS/WhatsApp: ≤ 160 caracteres, sem acentos problemáticos se o gateway não suportar UCS-2, começando por "Conto Contigo:" e terminando com ligação curta. Exemplo: "Conto Contigo: Ana convidou-te para Aniversário do Pedro, sáb 22 Nov, 15h. Responde aqui: {{url}}".
- Todas as mensagens vêm de **um único catálogo** (ficheiro/estrutura central com chaves e variáveis), nunca texto espalhado pelo código.
- Datas: `sáb, 22 nov 2026 · 15:00` (fuso `Africa/Luanda`). Valores monetários: `12 500,00 Kz`.

## 4. UI do e-mail (descrição exata)
Usa `email-base.html` como base e gera um template por código do catálogo. Estrutura, de cima para baixo:
1. **Pré-cabeçalho** oculto (≤ 90 car.), com resumo da mensagem.
2. **Cabeçalho**: faixa `#0F3D3E`, padding 22/32 px, logótipo branco (`email-logo-white-480.png`, mostrado a 170 px de largura). Por baixo, uma linha de 4 px `#E8B230`.
3. **Cartão** branco, largura máxima 600 px, cantos 16 px, centrado sobre fundo `#F6F5EF` com 32 px de margem.
4. **Título** (h1): 26/32 px, peso 800, cor `#0F3D3E`. Depois "Olá, {{nome}}." e o texto em 16/25 px, cor `#14201F`.
5. **Caixa de detalhes** (para eventos): fundo `#F1F7F6`, barra esquerda de 4 px `#E8B230`, nome do evento a 18 px/700 e, por baixo, data · hora e local a 14 px, cor `#5B6B69`.
6. **Botão principal** (um só): fundo `#E8B230`, texto `#0F3D3E` 16 px/700, padding 14×28, cantos 10 px, alinhado à esquerda; largura total em ecrãs < 620 px. Com versão VML para Outlook.
7. **Ligação alternativa** em texto pequeno (13 px) por baixo do botão.
8. **Rodapé**: fundo `#F1F7F6`, texto 12 px `#5B6B69`: motivo do envio, "Preferências de notificação · Ajuda · Deixar de receber", e "© {{ano}} Conto Contigo · Luanda, Angola".
9. Caso `verificacao_codigo`: sem botão; o código em caixa centrada, 32 px, espaçamento entre letras 8 px, peso 800, fundo `#F1F7F6`, cantos 12 px.
10. Caso `evento_cancelado`/erros: barra esquerda `#B3382C` em vez de amarela.

## 5. Requisitos técnicos
- HTML com **tabelas e estilos inline** (compatível com Gmail, Outlook, Apple Mail, Yahoo). `<style>` só para media queries e dark mode.
- **Modo escuro** com `prefers-color-scheme`: fundo `#0A1E1F`, cartão `#102A2B`, texto `#F1F5F4`.
- Imagens por **URL absoluto** (PNG; nunca SVG em e-mail). Largura máxima 600 px, `alt` sempre preenchido.
- Cada e-mail tem também **versão em texto simples** (`text/plain`) gerada do mesmo catálogo.
- Variáveis escapadas contra injeção de HTML. Ligações com `https`.
- Peso total do HTML < 100 KB (evita corte no Gmail).
- Crie um comando/script de **pré-visualização** que gere os HTML de todos os templates com dados de exemplo numa pasta local, para eu abrir no navegador.

## 6. Critérios de aceitação
- Todos os 9 códigos têm: push, SMS, e-mail HTML e texto simples.
- Nenhum texto em inglês ou pt-BR visível ao utilizador.
- Build e testes existentes continuam a passar. Mostra-me um exemplo renderizado de `convite_recebido` e `verificacao_codigo`.
