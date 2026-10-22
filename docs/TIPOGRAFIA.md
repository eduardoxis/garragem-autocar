# Tipografia da interface GAC

O padrão foi extraído dos arquivos `css/main.css`, `css/index.css` e dos componentes do projeto Papelaria Futura enviado como referência. A paleta da Garagem AutoCar continua definida em `css/variables.css`, com laranja como cor principal. O token informativo `--color-info` é `#06B6D4`.

As fontes são locais, com suas licenças em `assets/fonts`. `css/fonts.css` registra **Plus Jakarta Sans** (títulos e destaques) e **Inter** (corpo, tabelas, formulários, botões e navegação). Não há dependência de uma conexão com Google Fonts para a interface.

| Papel | Medida |
|---|---|
| Base do documento | 16 px, entrelinha 1,6 |
| Títulos de página | Plus Jakarta Sans, 24 px, peso 700 |
| Títulos de seção | Plus Jakarta Sans, 18 px, peso 700 |
| Valores de indicadores | Plus Jakarta Sans, 24 px, peso 800 |
| Texto de tabelas, formulários, botões e menu | Inter, 14 px |
| Cabeçalhos de tabela, legendas e badges | Inter, 12 px |
| Menu lateral | 260 px |
| Item do menu | 10 px × 16 px de preenchimento, ícone de 18 px, intervalo de 12 px |
| Barra superior | 64 px |
| Área principal | 24 px de preenchimento no desktop |

A escala completa usa `--text-xs` até `--text-5xl`: 12, 14, 16, 18, 20, 24, 30, 36 e 48 px. Os painéis de televisão usam os tamanhos maiores dessa escala para leitura à distância. Campos no celular mantêm 16 px para facilitar a leitura e evitar ampliação automática durante o preenchimento.

O menu mantém a logo, as rotas, o botão de voltar e a navegação mobile da GAC. A geração dos documentos conserva suas medidas de papel e paginação próprias.
