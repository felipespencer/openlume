# Fontes de traço único para o laser

Os arquivos `.svg` desta pasta vêm da extensão *Hershey Text* do Inkscape (pasta `svg_fonts` do repositório
`inkscape/extensions`), todos sob a **SIL Open Font License** (o texto da licença e os créditos estão no `<metadata>`
de cada arquivo). As fontes EMS são de Sheldon B. Michaels (conversão SVG de Windell H. Oskay), derivadas de fontes
do Google Fonts (Source Sans Pro, Allura, Share Tech Mono, Elsie…); as Hershey são de A. V. Hershey (domínio público).

`fontes.js` é gerado a partir desses SVGs (`conv-fonts.py`, mantido fora do projeto): cada glifo vira a mesma tabela
do `hershey.js` (altura de maiúscula 21, baseline em y = 9, y para baixo), com as curvas Bézier achatadas em 10 segmentos.
