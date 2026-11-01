# Bancada lado a lado: Resolume × OpenLume

Põe o mesmo clipe, o mesmo efeito e os mesmos valores nos dois programas, captura as duas saídas e mede a
diferença por pixel. É com ela que cada efeito do Resolume é copiado "pelo resultado": a ficha dos controles
vem da API REST (`referencia-resolume/FICHAS.md`) e a aparência vem da comparação. Nenhum código do Resolume
entra aqui nem no `app/`.

## O que precisa

- **Resolume Arena 7.26** com o servidor web ligado (Preferences → Webserver, porta 8080) e, na Saída avançada,
  a Screen 1 com Device = **Spout** (o remetente chama "Arena - Screen 1"). A captura é pelo Spout porque
  nesta máquina a leitura da tela por DXGI clareia tudo (HDR) e a GDI devolve quadro parado.
- **OpenLume** aberto com `npx electron . --remote-debugging-port=9333` (a bancada manda JS pelo CDP e lê o
  canvas do motor, nunca a tela).
- Python 3 com `SpoutGL`, `numpy` e `Pillow`; Node 20+.

## Arquivos

| Arquivo | O que faz |
|---|---|
| `resolume.mjs` | cliente da API REST: `fichas` (gera `extraido/effects-rest.json` e `FICHAS.md`), `abrir <arquivo>` (camada 1, casa 2), `efeito <nome>`, `valor <controle> <v>`, `limpar` |
| `capture.py` | captura a saída do Resolume pelo Spout (`py tools/compare/capture.py saida.png [quadros a esperar]`); recusa captura preta |
| `diff.py` | reduz as duas capturas a 960×540, dá diferença média/máxima por canal e grava Resolume \| OpenLume \| diferença ×4; recusa imagem lisa |
| `compare.mjs` | junta tudo: `node tools/compare/compare.mjs "Threshold" --r "Smoothness=0.4" [--clip arq] [--nome rotulo]` |
| `medir-threshold.mjs` | sondagem só no Resolume de como o Threshold trata cor e suavidade |
| `janelas.py` | lista as janelas do Resolume (útil se a captura por janela voltar a ser necessária) |
| `clips/` | clipes de teste gerados por ffmpeg/Pillow: `rampa.mp4` (rampa de brilho), `alfa.png` (brilho em x, alfa em y), `quadA/B/C.png` (quadrados parados em lugares diferentes), `andando.mp4` (quadrado a 375 px/s, 30 fps), `quadrado.mp4` |
| `saida/` | resultado (fora do git) |

## Armadilhas achadas

- A **marca d'água** do Resolume (modo demo) passa pela saída de vez em quando: o `compare.mjs` captura duas
  vezes e só aceita quando as duas são iguais.
- Clipe H.264 a **60 fps** congela no Resolume desta máquina (MF h264); os clipes de teste são a 30 fps.
- O `drawbox` do ffmpeg não anima com `t`; o quadrado que anda é feito com `overlay=x='100+375*t'`.
- O Resolume rende a ~30 fps aqui; efeitos de tempo (Trails, Delay RGB) foram comparados **por quadro
  renderizado**, não por segundo: cada passo do Resolume é um passo do OpenLume.
- O Spout entrega RGBA **premultiplicado**; o OpenLume também compõe premultiplicado. As capturas comparadas
  são "sobre preto" (só RGB). Para conferir o alfa (modos Alfa do Threshold) foi lido o canal A direto do Spout.

## O que foi medido (lote 1, 2026-10-25)

- **Threshold**: limiar pelo brilho sem premultiplicar (Rec. 709); Suavidade = smoothstep de meia-largura
  0,43 × valor; a cor sai escurecida pelo próprio alfa; Alfa Original = alfa do clipe, Combine = clipe × cor,
  Replace = só o da cor.
- **Trails** (um passo por quadro): Alpha = rastro × Feedback + novo × (1 − Feedback); Luma = o rastro fica
  inteiro onde o brilho dele passa de 1 − Feedback (sem esmaecer) e o novo entra pelo mais claro; Lighten =
  máximo entre o novo e o rastro × Feedback.
- **Delay RGB**: fila de quadros renderizados (com o clipe a 0,5× o atraso em pixels cai pela metade); 0,5 deu
  20 quadros a 30 fps, então 1,0 = 40 quadros; trocar de clipe mostra o clipe novo nos três canais de uma vez.
