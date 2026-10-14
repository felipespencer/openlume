# Rumo do Projecionista

Decisão do Felipe em 2026-10-13: fazer o máximo possível do que o Resolume faz, do jeito dele,
e o mapeamento **igual ao Advanced Output do Resolume**. Código próprio; do Resolume vem o jeito
de trabalhar.

## Feito

- Grade de camadas, colunas e clipes, com arrastar e soltar
- Mistura das camadas numa imagem só (opacidade; Normal, Somar, Tela)
- Prévia do clipe, ajuste na tela (encaixar, preencher, esticar), velocidade
- Uma janela de saída por tela, cada uma no seu monitor
- **Saída avançada** (2026-10-14), no formato do Advanced Output: telas, slices com recorte de
  entrada e forma de saída, quatro cantos e malha bezier, soft edge, máscaras de saída e de
  entrada, cor por slice e por tela, ímã, grade e identificar no projetor, presets em disco.
  Editor igual à maquete `advanced-output-mockup.html`. Fora: slices em polígono, guia de
  imagem, exportar SVG, atraso por tela, "fundo preto" e "key" (não mudam nada numa
  composição opaca)

- **Laser** (2026-10-14): módulo do LaserCube por Wi-Fi, igual à maquete `laser-mockup.html`:
  quadros de texto (fontes Hershey, horizontal/vertical/pilha, rolagem), desenho à mão, SVG e
  formas; cor, distorção e posição; zona segura; clipe de laser na grade; aba do aparelho com
  busca na rede. Protocolo testado contra um LaserCube falso no teste automático; **falta a
  prova com o aparelho de verdade** (direção dos eixos, brilho, taxa de pontos)

**Regra dada em 2026-10-14: "adiciona tudo que tiver no Resolume, depois eu vou tirando o que
não quero".** Ou seja: na dúvida, o recurso entra; a poda é dele, depois.

**Pedido do mesmo dia: um modo de a projeção interagir com o laser.** Feito em dois sentidos:
(a) *Contorno*: quadro do laser "Contorno da projeção" traça ao vivo as bordas do que está na
composição (marching squares numa versão pequena da imagem, limiar e detalhe ajustáveis);
(b) *Espelho*: fonte "Laser (espelho)" na grade mostra na projeção o que o laser desenha, no
mesmo lugar (quadrado do palco do laser centrado). (c) *Reação* ao som já existe no laser
("Ao som"); a parte da projeção vem com a camada de áudio (item 13).

**Autopilot por clipe** (pedido do mesmo dia: "eu tenho que decidir pra onde cada clipe
envia"): no painel Clipe, destino ao acabar — como a camada, próximo, anterior, ao acaso,
casa específica (camada + coluna) ou parar; no fim do clipe ou depois de N segundos.

- **Rodapé do Resolume** (2026-10-14): Composição | Camada | Clipe com Autopilot, master,
  velocidade, mistura, transição, Transform e cadeia de efeitos; navegador Arquivos (pastas do
  PC, favoritas, prévia), Composições (salvar/abrir, clipes por caminho), Efeitos (28, com
  favoritos), Fontes (13 geradores, Text Block, câmeras), Gravar (WebM). Itens 2, 3 (parcial),
  4 (parcial), 5, 6 (parcial) e 11 da ordem abaixo ficaram feitos de uma vez

- **Preparar vídeo e reprodutor próprio** (2026-10-14). Reclamação: "a linha de transporte
  tá uma merda, não seria o caso de pensar num formato mais adequado de vídeo pra ele voltar
  sem travar?". O Resolume resolve isso com o DXV (cada quadro é chave, descomprimido na
  placa). DXV é proprietário e sem especificação; o ffmpeg lê todos os DXV e só grava DXV1
  (DXT1). Decisão dele ("pode seguir"): 1º H.264 todo intra (`nome.proj.mp4`, ffmpeg) +
  reprodutor próprio por WebCodecs (`app/player.js`, mp4box.js para ler o MP4) — feito e
  testado (frente, ré, pulo, 4x); 2º **ler DXV1 e depois DXV3 do Resolume** (DXT1/DXT5 +
  compressão simples; estudar `dxv.c` do ffmpeg sem copiar; subir para a placa com
  `WEBGL_compressed_texture_s3tc`) e oferecer "Preparar em DXV1" para arquivos que o Resolume
  também vá abrir — **ainda não feito**
- **GIF animado como clipe** (pedido em 2026-10-14: "quero que leia gif também"): feito pelo
  ImageDecoder, com o mesmo transporte do vídeo preparado
- **Mapeamento do laser por âncoras** (pedido em 2026-10-14: "quero poder ter anchor points
  no laser também pra mapear"): `settings.map` com 4 cantos (homografia) ou malha bezier,
  reaproveitando `warp.js`; aplicado em `toU16` antes de ir ao LaserCube; âncoras arrastáveis
  no palco da aba Laser. Falta provar no aparelho real (sentido dos eixos pode exigir o
  espelho da saída junto)

- **Barra de menus e Configurações da composição** (pedido em 2026-10-14: "tem que ter
  configs da composição e todos aqueles menus do Resolume que tem lá em cima"): feito com os
  menus Projecionista · Composição · Camada · Coluna · Clipe · Saída · Atalhos · Ver, cada
  item ligado a uma ação real (`app/menus.js`). Colunas agora são em número livre. **Deck e
  Grupo ficaram de fora** até existirem (itens 7 e 8); em Atalhos só o teclado, MIDI vem
  com a APC40. Sem "Media Manager", "Fixture Editor" (DMX) e "Importar da versão 6"

## Ordem de trabalho

1. **Advanced Output**, como no Resolume — feito, menos slices em polígono
   - **Painel do Resolume na janela principal** (pedido em 2026-10-14): as abas Arquivos,
     Composições, Efeitos, Fontes e Gravar, copiadas do jeito que ele as tem. Arquivos navega
     as pastas do computador; Composições lista as salvas; Efeitos e Fontes se arrastam para a
     grade; Gravar grava a saída. Reforçado logo depois: "copie o autopilot, os efeitos mais
     novos que tiver, as fontes e o gravar" — o Autopilot (próximo clipe sozinho, por camada)
     entra junto, e os efeitos a copiar são os mais recentes do Resolume
   - A Saída avançada tem de ficar **mais parecida com a do Resolume** (2026-10-14). Referência:
     capturas reais do Advanced Output 7.26 feitas nesta máquina
2. **Transição** entre clipes da mesma camada (duração e modo)
3. **Transporte do clipe**: trecho de entrada e saída, vai e volta, tocar uma vez, ré
4. **Efeitos** no clipe, na camada e na composição (os 24 do Projecionista antigo primeiro)
5. **Salvar e abrir a composição**, com os arquivos de mídia por caminho
6. **Fontes além de arquivo**: texto, câmera, cor sólida, shader gerador
   - **LaserCube** (pedido em 2026-10-14: "ligar meu lasercube como fonte assim como a câmera").
     O LaserCube é um projetor a laser da Wicked Lasers (USB ou Wi-Fi) que recebe trajetórias
     de pontos, não pixels. **Esclarecido em 2026-10-14**: ele quer um módulo de laser
     completo — desenhar, escrever texto na horizontal e na vertical, efeitos de cor e de
     distorção, mandar SVG — "baseie-se no LaserOS mas tente fazer melhor, porque aquele app é
     horrível". O aparelho é o **LaserCube 7,5 W da linha antiga, por Wi-Fi**. Protocolo (da
     libLaserdockCore, GPL, base do LaserOS; e do LaserCubeSharp): UDP, portas 45456 (alive),
     45457 (comandos) e 45458 (pontos). Descoberta: `0x27` em broadcast; `0x77` devolve 64
     bytes (firmware, flags de saída/interlock/temperatura, taxa e taxa máxima de pontos,
     buffer livre e total, bateria, temperatura, serial, IP, nome). Comandos: `0x80 0/1` liga a
     saída, `0x82 u32` taxa de pontos, `0x78 1` pede resposta de buffer a cada pacote de dados,
     `0x8a` buffer livre, `0x8d` limpa o buffer. Dados: `[0xa9, 0, nº da mensagem, nº do quadro]`
     + até 140 pontos de `x y r g b` em u16 little-endian, 0..4095, no máximo 20 pacotes por
     rajada; o laser responde `[0x8a, 0, livre u16]`. Maquete `laser-mockup.html` feita em
     2026-10-14, aguardando o olhar do Felipe. Fonte de traço único (Hershey) para o texto
7. **Decks**
8. **Grupos de camadas**, solo, máscara de camada, crossfader A/B
9. **MIDI**: clicar no controle e mexer na controladora para amarrar; teclado também
   - **Akai APC40 mkII com compatibilidade nativa total** (pedido do Felipe em 2026-10-13): ligar
     o cabo e funcionar, sem amarrar nada. Os 40 pads são a grade (8 colunas × 5 camadas) e
     acendem na cor do estado de cada casa (vazia, guardada, no ar); faders, knobs, botões de
     pista, de cena e o crossfader já saem ligados aos controles equivalentes. O programa põe a
     controladora no modo certo por SysEx ao conectar
10. **BPM**: tempo, sincronia de clipe e de efeito com a batida
11. **Autopilot**: próximo clipe sozinho
12. **Tirar o fundo da webcam** e efeitos de profundidade (novidades do Resolume 7.28)
13. **Áudio** do clipe e reação ao som (FFT)
14. **Instalador** para Windows e publicação como projeto aberto

Fora, por enquanto: DMX e luminárias (Lumiverse), NDI e Spout.

## O que o estudo do Resolume mostrou (2026-10-13)

Lido da ajuda (`docs/help/English.xml`), dos shaders que o `Arena.exe` 7.26 traz como texto e de
dois trechos decompilados com o Ghidra. Aqui fica só o comportamento, descrito com nossas
palavras; a implementação é nossa.

- **Tela**: destino (monitor ou janela), tamanho, opacidade, brilho, contraste, RGB e atraso.
- **Slice**: retângulo de entrada na composição (posição, tamanho, giro) e forma de saída na
  tela. A fonte pode ser a composição, uma camada direto ou a prévia. Opções: espelhar em X e Y,
  seguir ou ignorar a opacidade da camada, fundo preto, canal de recorte (key).
- **Ordem das contas num slice**: recorte da entrada → espelhar → ajuste de RGB → brilho e
  contraste → soft edge → opacidade → máscara de entrada.
- **Deformação**: dois modos. Perspectiva por quatro cantos (homografia) e malha bezier.
  A malha bezier é uma rede de retalhos bicúbicos: com N×M divisões, a rede de controle tem
  (3N+1)×(3M+1) pontos; os de índice múltiplo de 3 nas duas direções são âncoras e os demais
  são alças. Cada retalho é fatiado em triângulos numa resolução fixa. O modo linear não
  foi lido no código; a suposição é que as alças ficam nos terços da reta entre as âncoras.
- **Soft edge**: uma rampa de 0 a 1 ao longo da faixa de sobreposição, desenhada numa textura e
  multiplicada sobre o slice. Na primeira metade a rampa é `L·(2x)^p`, na segunda
  `1 − (1−L)·(2(1−x))^p`, e o resultado é elevado a `1/gama`, com gama por cor. Padrão:
  potência 2, luminância 0,5, gama 2,2. É a fórmula clássica de edge blending (Paul Bourke).
  A compensação de preto levanta o preto só fora da faixa de emenda.
- **Máscaras**: de entrada (por slice, multiplica no fim) e de saída (por tela), com inverter.
- **Salvamento**: XML com telas, camadas da tela (slice, polígono, máscara), `InputRect`,
  `OutputRect`, e a malha como `controlWidth`, `controlHeight` e uma lista de vértices x, y.
  Falta conferir contra um preset real (`casinha.xml`, `roosevelt.xml`).

**APC40 mkII**: o Resolume instala o mapa pronto em `default/Shortcuts/MIDI/APC 40 MK II.xml`.
Pads são notas 0–39 no canal 1 (fileira de baixo = camada 1) e a cor do pad vai na velocidade
da nota; os botões de pista usam a mesma nota em canais 1–8 (48 desligar, 49 solo, 50 clipe
anterior, 52 limpar, 66 próximo clipe); faders são CC 7 por canal, master CC 14, knobs de
pista CC 48–55, knobs da direita CC 16–23, crossfader CC 15 (sem função no mapa do Resolume).

## Catálogo do Resolume (2026-10-14)

Pedido do Felipe: "abra o resolume e puxe o máximo de coisas que o resolume tem". Feito:
`referencia-resolume/CATALOGO.md` lista menus, painéis, os 90 efeitos de vídeo, os 23 plugins
Wire (os mais novos, com Background Removal e os de profundidade), fontes, transições, Record
e Autopilot, com as capturas ao lado (fora do git).

## Como estudar o Resolume para o item 1

- O que o próprio programa instala: `rest/docs/swagger.yaml`, `default/Example.avc`,
  `docs/help/English.xml` (em `C:\Program Files\Resolume Arena`)
- Presets reais de Advanced Output do Felipe: `Documentos\Resolume Arena\Presets\Advanced Output`
  (`casinha.xml`, `roosevelt.xml`). Estão só na nuvem do OneDrive: é preciso abrir o OneDrive
  para baixar
- REA com Ghidra 12.1.4, para o que não está documentado (soft edge, deformação por curvas).
  Serve para entender; nenhum código descompilado entra no projeto
