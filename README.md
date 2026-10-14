# Projecionista

Programa de computador para projeção ao vivo: uma grade de clipes por camada, tudo misturado
numa imagem só, e uma janela de saída para o projetor. O jeito de trabalhar segue o do Resolume
(camadas, colunas, clipes), com menos botões.

Este é um projeto novo, começado em 2026-10-13. O Projecionista de celular e navegador vive em
outra pasta (`PROJECIONISTAapp`) e continua sendo a versão simples.

## Rodar

```sh
npm install
npm start
```

## Como usar

- Arraste vídeos ou imagens de uma pasta do Windows para uma casa da grade. O clipe fica guardado.
- Clique na miniatura: o clipe vai para o ar. Clique no nome: só mostra a prévia.
- Clique numa casa vazia: a camada fica preta.
- Clique em "Coluna N": dispara a coluna inteira; camada sem clipe nela fica preta.
- Arrastar um clipe para outra casa move; com Ctrl, copia. Botão direito esvazia a casa.
- X tira a camada do ar. B desliga e liga a camada sem perder o clipe.
- "Abrir saída" abre uma janela por tela. Com um projetor ligado, a tela "Automático" já abre
  nele em tela cheia. Numa janela comum, F ou duplo clique alterna a tela cheia.
- Abrir o programa começa sempre do zero.

### Saída avançada

O botão "Saída avançada", no monitor da composição, abre o editor de telas, no formato do
Advanced Output do Resolume:

- **Tela** é um projetor (ou uma janela). Cada tela tem destino, tamanho, opacidade e cor.
- **Slice** recorta um pedaço da composição (aba Entrada: posição, tamanho, giro, fonte) e o
  encaixa na superfície (aba Saída: posição, tamanho, giro, espelhar).
- **Deformação**: quatro cantos (perspectiva) ou malha de curvas. Na malha, "Pontos" deixa
  arrastar cada âncora; com "Curva" aparecem as alças da âncora escolhida. Duplo clique numa
  âncora zera a malha. T alterna Transformar e Pontos.
- **Soft edge**: liga a emenda entre dois projetores. A largura vem da sobreposição dos
  recortes na composição; potência, luminância, gama (geral e por cor) e nível de preto
  ajustam a rampa.
- **Máscaras**: de saída (retângulo, círculo ou desenhada clicando na tela; invertida preserva
  só o que está dentro) e de entrada, por slice.
- **Ímã** gruda nas bordas dos outros slices; **Grade** mostra a borda do slice e o cursor no
  projetor; **Identificar** escreve o nome de cada tela e slice nos projetores.
- **Presets** ficam gravados em disco: escolha um na lista, ou dê um nome e Salvar.
- "Salvar e fechar" aplica; "Cancelar" (ou Esc) devolve tudo como estava.

## Como é feito

- `main.js`: processo principal do Electron. Serve `app/` por `app://projecionista/`, lista
  os monitores e guarda os presets de saída (`app/preload.js` é a ponte).
- `app/engine.js`: motor em WebGL2. Desenha as camadas de baixo para cima numa imagem de
  1920×1080 (a composição) e, para cada tela, recorta e deforma os slices com soft edge e
  máscaras.
- `app/screens.js`: o modelo de telas, slices e máscaras; `app/warp.js`: a geometria dos
  quatro cantos e da malha bezier.
- `app/ao.js`: o editor da Saída avançada (maquete: `advanced-output-mockup.html`).
- `app/app.js`: grade, painéis, janelas de saída e regras de uso.
- `app/output.html`: a saída. Não mistura nada: mostra a imagem que o controle já desenhou
  para aquela tela.

## Testar

```sh
# dois vídeos de teste, um deitado e um em pé
ffmpeg -f lavfi -i testsrc=size=320x180:rate=25:duration=3 -pix_fmt yuv420p va.mp4
ffmpeg -f lavfi -i testsrc2=size=180x320:rate=25:duration=3 -pix_fmt yuv420p vb.mp4
PROJ_TEST=<pasta com os dois> npx electron .
```

O teste roda dentro do próprio programa, lê pixels da composição e confere a janela de saída.

## Ainda não tem

Efeitos, transição entre clipes, decks, MIDI, texto e câmera como clipe, salvar e abrir
composição, slices em polígono.

## Origem das ideias

O modelo de composição, camada, coluna e clipe foi estudado a partir do que o Resolume publica
com o programa: a descrição da API REST e a composição de exemplo. Nenhum código do Resolume
foi copiado nem descompilado.
