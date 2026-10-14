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
- "Abrir saída" abre a janela do projetor. Com um segundo monitor ligado, ela já abre nele em
  tela cheia. Numa janela comum, F ou duplo clique alterna a tela cheia.
- Abrir o programa começa sempre do zero.

## Como é feito

- `main.js`: processo principal do Electron. Serve `app/` por `app://projecionista/`.
- `app/engine.js`: motor de mistura em WebGL2. Desenha as camadas de baixo para cima numa
  imagem de 1920×1080.
- `app/app.js`: grade, painéis e regras de uso.
- `app/output.html`: a saída. Não mistura nada: mostra a imagem que o controle já misturou.

## Testar

```sh
# dois vídeos de teste, um deitado e um em pé
ffmpeg -f lavfi -i testsrc=size=320x180:rate=25:duration=3 -pix_fmt yuv420p va.mp4
ffmpeg -f lavfi -i testsrc2=size=180x320:rate=25:duration=3 -pix_fmt yuv420p vb.mp4
PROJ_TEST=<pasta com os dois> npx electron .
```

O teste roda dentro do próprio programa, lê pixels da composição e confere a janela de saída.

## Ainda não tem

Efeitos, mapeamento (cantos e malha), vários projetores com recorte, transição entre clipes,
decks, MIDI, texto e câmera como clipe, salvar e abrir composição.

## Origem das ideias

O modelo de composição, camada, coluna e clipe foi estudado a partir do que o Resolume publica
com o programa: a descrição da API REST e a composição de exemplo. Nenhum código do Resolume
foi copiado nem descompilado.
