# Bancada lado a lado: Resolume × OpenLume

Põe o mesmo clipe, o mesmo efeito e os mesmos valores nos dois programas, captura as duas saídas e mede a
diferença por pixel. É com ela que cada efeito do Resolume é copiado "pelo resultado": a ficha dos controles
vem da API REST (`referencia-resolume/FICHAS.md`) e a aparência vem da comparação. Nenhum código do Resolume
entra aqui nem no `app/`.

## O que precisa

- **Resolume Arena 7.28** com o servidor web ligado (Preferences → Webserver, porta 8080) e, na Saída avançada,
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

## O que foi medido (lote 2, 2026-11-02, Resolume 7.28.1, 1920×1080)

Limite combinado antes de escrever: Tilt Shift até 1,5/255 de média; CRT e Acuarela, sem meta por pixel: o CRT tem fósforo menor que um pixel e a Acuarela
muda sozinha, então valem a estatística e a conferência lado a lado. Ferramentas: `sondas/varre.mjs` (varredura), `sondas/tilt*.py`, `sondas/crt_*.py`, `sondas/acu.mjs` (estatística), `lote2-check.mjs` (mouse real).

- **Tilt Shift**: a imagem é misturada com uma cópia desfocada, m = limite(4 × Falloff² × r + 4 × Focus − 2), r = distância vertical até Position (cima = 0). Gaussiana de sigma 8,73 px × Blur.
  Saturação em volta do brilho Rec. 601, ganho 1 / (1 − 0,63 × valor). Vinheta 1,75 × (16 u v (1−u)(1−v)) ^ (0,21 × valor), limitada a 1. A suposição antiga de "render em resolução menor" era erro da imagem de prova: linhas de 1 px continuam nítidas no foco.
  Resultado: padrão 0,52; borda 0,01; saturação 0,17; posição/foco/transição 0,18; vinheta 0,03; quadro real 1,1.
- **CRT**: coluna = 3 × Left/Right + 2 × Between Slots + 1 unidades; fileira = 2 × (Height Scale + Top/Bottom); o tubo é encaixado na saída (exato em 8 combinações). Fósforo em triângulo, entalhe entre fileiras, ganho 1,45 em Brightness 50, corte em 1. Bloom = máscara × cor da célula, desfocada, ganho 4,85.
  Resultado: sem bloom 2,42; padrão 10,97; quadro real 7,55; Brightness 25 = 10,75; Brightness 100 = 16,38; Vignette 100 = 8,78.
  **Diferenças abertas**: Bloom Width 150 = 23,7; Fisheye 100 = 34,9; inclinações só aproximadas; Spread é aproximação; Native não foi comparado; **os 9 presets não entraram** (a API não aplica preset e os valores estão no `.wired`, que não abrimos: dá para lê-los escolhendo cada um na interface do Resolume).
- **Acuarela**: feedback, a imagem é levada por um fluxo de ruído e a original volta a 6% por quadro; Strength 0 ou Speed 0 deixam a imagem intacta; Gain é ganho de brilho acumulado. É modelo próprio ajustado pela saída, não conta deduzida.
  Estatística (distância da original D, mudança em 0,5 s T, nitidez N; alvo do Resolume): ver `saida/lote-02` e o SUMMARY do 02-02. Medição final (Resolume → nossa): padrão D 17,9 → 21,4, T 14,1 → 18,3, N 0,39 → 0,60; Gain 0,1 D 29,5 → 33,5, brilho 112 → 115; Strength 1 D 28,4 → 31,9, T 20,7 → 22,3, N 0,36 → 0,73; Density 20 D 18,0 → 17,8, T 13,6 → 13,2, N 0,46 → 0,86. O T do Resolume varia entre rodadas (Strength 1 deu 74 numa e 20,7 noutra). **Diferença aberta**: a nossa fica mais nítida em todos os casos. Reset é um controle 0/1, não botão.
