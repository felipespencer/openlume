# Sondas de medição no Resolume (só o Resolume, pelo Spout)

Scripts usados para descobrir o comportamento de cada efeito antes de escrever o nosso. Todos leem a saída
"Arena - Screen 1" pelo Spout; os que disparam clipe usam a API REST (porta 8080). Uso: `py tools/compare/sondas/<x>.py ...`.

| Script | O que mede |
|---|---|
| `sonda.py N [casa]` | depois de 5 quadros dispara a casa (padrão 3) da camada 1 e imprime, por quadro, 4 pixels (quadrados A/B/C e laranjas); só quando muda |
| `sonda2.py N` | x mínimo do quadrado branco em cada canal R, G, B por quadro (Delay RGB) |
| `lag.py N` | média do atraso em px entre os canais R e G e a taxa de passos do quadrado |
| `pixel.py N x y` | valor RGB de um pixel por quadro (decaimento do Trails) |
| `veloc.py N` | posição do quadrado por quadro com o relógio |
| `cap_rgba.py rotulo` | pixels com o canal alfa (o Spout entrega RGBA premultiplicado) |
| `caixas.py captura.png` | caixa do quadrado branco por canal numa captura |
