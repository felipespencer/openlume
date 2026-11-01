# Projecionista (OpenLume no Windows): como usar

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
- Clique na miniatura ou no nome: o clipe vai para o ar, sempre do começo (clicar de novo recomeça).
- Clique numa casa vazia: a camada fica preta.
- Clique em "Coluna N": dispara a coluna inteira; camada sem clipe nela fica preta.
- Arrastar um clipe para outra casa move; com Ctrl, copia. Botão direito esvazia a casa.
- X tira a camada do ar. B desliga e liga a camada sem perder o clipe.
- "Abrir saída" abre uma janela por tela. Com um projetor ligado, a tela "Automático" já abre
  nele em tela cheia. Numa janela comum, F ou duplo clique alterna a tela cheia.
- Abrir o programa começa sempre do zero.

### Áudio e reação ao som

Cada clipe de vídeo com som passa por fonte → efeitos de áudio → volume → pan → master, e o
master passa por uma FFT. No painel Composição → Áudio e FFT: fonte (a composição ou o
microfone/entrada da placa), ganho, queda e os medidores de graves, médios-graves, médios,
agudos e tudo. Qualquer parâmetro de efeito ou fonte animado com a forma **FFT (som)** segue o
nível de uma dessas faixas (é o External FFT do Resolume). O laser já tinha o "Ao som".

### Tirar o fundo da webcam

O efeito **Background Removal** (painel Efeitos) tira o fundo e deixa só a pessoa, em webcam ou
em qualquer clipe, com limiar, suavidade, inverter e encolher. Usa o modelo público
PP-HumanSeg em ONNX (Apache 2.0, o mesmo que o Resolume traz) rodando no onnxruntime-web por
WebAssembly, até 15 vezes por segundo, em paralelo ao desenho. Os arquivos ficam em
`app/vendor/` com as licenças.

### Instalador

`npm run dist` gera em `dist/` o instalador **MSI** e o **zip portátil** (electron-builder, 64 bits),
os dois com o ffmpeg dentro (`tools/ffmpeg/ffmpeg.exe`, fora do git) para o "Preparar vídeo"
funcionar sem instalar nada. O instalador NSIS (`.exe`) só sai em máquina sem Smart App Control:
o electron-builder precisa rodar um executável temporário sem assinatura para montar o
desinstalador, e o Smart App Control bloqueia. O executável do programa é o do Electron sem
mexer (`asar: false`, `signAndEditExecutable: false`), por isso roda mesmo com o Smart App
Control ligado. Quem instala vê o aviso do SmartScreen ("Mais informações → Executar assim mesmo").

### Akai APC40 mkII (ligar o cabo e funcionar)

O programa acha a controladora sozinho (Web MIDI com SysEx), põe ela no modo "Ableton Live"
e passa a acender os LEDs pelo estado da grade. O mapa é o que o Resolume instala para ela,
estendido (`app/apc40.js`); Atalhos → MIDI: APC40 mkII… mostra o estado e a lista completa:

- **Pads**: as 4 linhas de baixo são as camadas 1 a 4 (de baixo para cima), 8 colunas; a
  linha de cima dispara a coluna. Cores: vazia, guardada, no ar, no ar e selecionada (os
  mesmos números de cor do Resolume); a casa esperando o Beat Snap pisca.
- **Botões de pista** (a coluna física é a camada de baixo): desligar (B), solo (S), clipe
  anterior, limpar (X), próximo clipe. **Faders**: opacidade das camadas; o da direita é o
  master. **Crossfader**: o crossfader. **Knobs da direita**: os 8 primeiros parâmetros do
  clipe selecionado. **Knobs de pista**: o primeiro parâmetro do primeiro efeito da camada.
  **Cue Level**: posição do clipe selecionado.
- **Scene Launch**: seleciona a camada; **Master** seleciona a composição; **Stop All Clips**
  tira tudo do ar. **◀ ▶**: coluna anterior/próxima (com Shift, janela de 8 colunas);
  **▲ ▼**: janela de 4 camadas. **Tap Tempo**, **Nudge −/+**, **Metronome** (RESYNC; com Shift,
  metrônomo), **Play** (toca todos), **Record** (grava), **Device ◀ ▶** (decks).
- Atalhos → "Usar a APC40" desliga a controladora sem tirar o cabo.

### BPM (como no Resolume)

- **Relógio de BPM** (faixa embaixo da grade): ▶ ‖ ■ do transporte geral, o valor do BPM (clique
  e digite), − +, nudge ◁| |▷ (segura e o BPM desvia o percentual das Preferências), /2 ×2, TAP
  (2 cliques no mínimo), RESYNC (este instante vira a batida 1), ‖ pausa o relógio, ♩ metrônomo,
  quatro luzes de batida (a borda amarela marca cada 4 compassos) e o Beat Snap.
- **Beat Snap**: o disparo de clipe ou de coluna espera a próxima batida, meia batida, compasso…
  A casa pisca em amarelo enquanto espera. Vale para a composição (menu Composição → Beat Snap)
  e por coluna (menu Coluna → Beat Snap).
- **BPM Sync** no clipe (painel Clipe → Transporte → Sincronia): a faixa entre a entrada e a saída
  dura N batidas, presa ao relógio; mudar o BPM muda a velocidade e a posição acompanha.
- **Parâmetros animados na batida**: todo parâmetro de efeito ou de fonte tem um botão ♪. Ligado,
  o valor anda a cada ciclo de N batidas por uma forma dos presets do Resolume (4 to the Floor,
  1 to the Floor, On Off, Random, Step 1 2, Step 1 2 3 4, LFO, Saw, Up N Down, Jittery, ADSR,
  EasyEase), entre um mínimo e um máximo. Tudo vai para o arquivo da composição.
- **Autopilot em batidas**: duração "Batidas" além de clipe inteiro e tempo fixo.

### Projetores (assistente)

Ao abrir o programa com mais de um monitor (e no menu Saída → Projetores…), um desenho mostra os
projetores como retângulos: arraste cada um para o lugar dele, ↻ (ou duplo clique) vira em pé ou
deitado, as bordas encaixam umas nas outras e, onde dois se sobrepõem, a emenda aparece com a
largura e ganha soft edge sozinha. A composição é o retângulo que envolve todos; cada projetor vira
uma tela com o seu recorte (girado 90° se o projetor está em pé mas o Windows o vê deitado) e as
saídas abrem neles. Botões "Lado a lado", "Empilhados" e "Mesma imagem" dão as posições prontas.
A lista Telas da janela principal tem um menu para trocar o monitor de cada tela na hora.

### Decks, grupos e crossfader (como no Resolume)

- **Decks** (abas embaixo da grade): cada deck guarda os seus clipes; as camadas são as mesmas.
  Clique troca de deck, duplo clique renomeia, "+" cria. O clipe que estava no ar continua
  tocando depois da troca, até a camada disparar outro ou sair do ar. Menu Deck: novo, inserir,
  duplicar, renomear, cor, fechar (esconde a aba) e abrir de volta, limpar, remover.
- **Grupos**: camadas vizinhas que entram na composição como uma só. A linha do grupo na grade tem
  recolher (▸/▾), X (tira o grupo do ar), B (desliga), S (solo), o fader de opacidade e um disparo
  de coluna só para as camadas do grupo. O painel Grupo (aba ao lado de Camada) tem master,
  velocidade, mistura (os 60 modos), bus do crossfader, Transform e efeitos do grupo. Menu Grupo:
  novo com a camada selecionada, inserir acima/abaixo, duplicar, renomear, cor, copiar/colar
  efeitos, recolher, adicionar camada, ignorar disparo de coluna, disparar a primeira coluna ao
  abrir, travar conteúdo, limpar, remover mantendo ou levando as camadas. A camada entra e sai de
  um grupo pelo menu Camada → Grupo ou pelo painel Camada.
- **Solo** (S) na camada e no grupo: só o que está em solo aparece.
- **Crossfader** (faixa embaixo da grade): cada camada ou grupo pode ir para o bus A ou B (painel
  Camada/Grupo ou menu Camada); o fader passa de A para B. No painel Composição: posição, curva
  (linear, potência igual, corte), comportamento dos botões A e B (corta ou esmaece em N s).
  Ver → Crossfader e Ver → Decks escondem as faixas.

### Barra de menus (como no Resolume)

**Projecionista** (Preferências: pasta das gravações, FPS na barra, divisórias; Sobre; Sair) ·
**Deck** e **Grupo** (ver acima) ·
**Composição** (Nova, Abrir, Abrir recente, Salvar, Salvar como, Copiar/Colar efeitos,
Transporte global, Disparo de clipe padrão, Disparar primeira coluna ao abrir,
**Configurações…**) · **Camada** (nova, inserir acima/abaixo, duplicar, renomear, efeitos,
ignorar disparo de coluna, limpar, remover) · **Coluna** (nova, inserir, duplicar, renomear,
limpar, remover, remover todas antes/depois — o número de colunas é livre) · **Clipe**
(transporte, alvo, estilo de disparo, ignorar coluna, ajuste, miniatura do quadro atual,
recortar/copiar/colar, efeitos, renomear, limpar, mostrar no Explorer, preparar, instantâneo)
· **Saída** (desligada, tela cheia por monitor, janela, automático, Avançada…, identificar,
Test Card, instantâneo) · **Atalhos** (Teclado… lista os atalhos que funcionam) · **Ver**
(Laser, Saída avançada, FPS, painéis e abas). Deck e Grupo entram quando existirem.

**Configurações da composição** (Ctrl+Shift+C): nome, descrição, tamanho (presets de Full HD
a 4K, em pé, dois Full HD lado a lado, ou personalizado — o motor, a prévia e os slices que
recortam a composição inteira acompanham), taxa de quadros (24–60), cor de fundo, disparo
padrão das casas novas, disparar a coluna 1 ao abrir. Tudo vai para o arquivo da composição.

Atalhos: Ctrl+N/O/S/Shift+S, Ctrl+Shift+C, Ctrl+, (preferências), Ctrl+X/C/V (clipe),
Delete (limpar casa), Enter (disparar casa), Esc (tirar a camada do ar), Ctrl+Q.

### Janela

As divisórias entre a grade e os monitores, entre o meio e o rodapé e entre os três painéis
de baixo se arrastam; duplo clique devolve o tamanho padrão. Os tamanhos ficam guardados.
A **Prévia** mostra o clipe selecionado como ele sai: renderizado pelo motor, com efeitos,
transformação e transição, mudando junto com a saída.

### Rodapé no formato do Resolume

- **Composição | Camada** (esquerda): Autopilot (direção ◀◀ OFF ▶▶ ⤮, duração pelo clipe ou
  tempo fixo, loop), master, velocidade, opacidade, mistura, transição entre clipes da camada,
  Transform (posição, escala, giro) e a cadeia de efeitos.
- **Mistura e transição do jeito do Resolume**: a mesma lista de 60 modos (Alpha, Add, 50 Add, Multiply,
  Screen, Luma Key, Cut, Dissolve, to Black, Push Left/Right/Up/Down, Zoom In/Out, Rotate X/Y, Cube,
  Side by Side, Wipe Ellipse, Time Switcher…) serve para a camada entrar sobre o que está embaixo
  e para a **transição entre clipes** da mesma camada (painel Camada → Transição: modo, duração
  de 0 a 10 s, "Ao acaso" sorteia um modo a cada disparo). Como no Resolume, o fader de opacidade
  tem duas metades: até 50 % a camada mistura (Add, Multiply…); de 50 a 100 % vai virando normal por
  cima. Os modos "50" misturam no fader inteiro. Na transição o fader corre sozinho na duração e o
  fim é só o clipe novo. "to Color" tem cor; Luma Key, Dissolve, Wipe Ellipse e Alpha Limiter têm
  suavidade. O clipe pode ter a sua própria mistura (painel Clipe), que vale no lugar da da camada.
- **Clipe** (meio): nome; **Transporte** do vídeo como no Resolume — linha do tempo arrastável
  com entrada e saída (cut in / cut out), tocar para frente e para trás, pausa, ir para a
  entrada/saída, passo de quadro, modo (loop, vai e volta, uma vez, aleatório), velocidade até
  10x, duração; **Áudio** (volume, pan, mudo); **Vídeo** (opacidade e mistura do clipe);
  **Disparo** (normal, piano, alternar; ignorar disparo de coluna); parâmetros da fonte gerada
  ou do texto; **Autopilot do clipe** (para onde manda ao acabar: como a camada, próximo, anterior,
  ao acaso, casa específica ou parar), ajuste, Transform e a cadeia de efeitos do clipe.
- **Preparar vídeo** (o DXV do Projecionista): um vídeo comum só anda bem para a frente; ré,
  pulo e esfregar travam porque cada quadro depende dos anteriores. O botão "Preparar" (no
  painel Clipe ou ao lado do arquivo em *Arquivos*) chama o ffmpeg e grava `nome.proj.mp4` ao
  lado do original — H.264 com todos os quadros chave, som em AAC. Esse arquivo toca no
  **reprodutor próprio** (`app/player.js`: mp4box.js lê o MP4, WebCodecs decodifica na placa
  de vídeo, cache de quadros): frente, ré, pulo, velocidade e esfregar viram "qual quadro
  mostrar agora". O som acompanha quando toca para a frente perto de 1x. Precisa do `ffmpeg`
  no PATH ou em `tools/ffmpeg/ffmpeg.exe`. Os quadros são decodificados **pelo processador** por
  padrão: na placa de vídeo (NVDEC), com três vídeos no ar, abrir as saídas derrubava o processo de
  GPU do Chromium (RTX 2070 SUPER, driver 32.0.16.1088, 3 de 3 vezes; por software, 0 de 3, a 60 fps).
  Preferências → "Placa de vídeo" liga a decodificação na placa para quem quiser tentar.
- **GIF animado** (e WebP/AVIF animados) entram como clipe de vídeo, quadro a quadro pelo
  ImageDecoder: transporte, ré, pulo e velocidade funcionam como num vídeo preparado. GIF
  parado continua imagem.
- **Laser e projeção juntos**: a fonte "Laser (espelho)" (aba Fontes) mostra na projeção o que
  o LaserCube desenha; o quadro "Contorno da projeção" (menu + do Laser) faz o laser traçar as
  bordas do que está sendo projetado.
- **Arquivos · Composições · Efeitos · Fontes · Gravar** (direita), com a caixa de ajuda:
  - *Arquivos* navega as pastas do computador (Vídeos, Imagens, discos, favoritas ♥); arraste um
    arquivo para a casa, duplo clique mostra na prévia. Os arquivos são servidos por
    `app://projecionista/media/…` com Range, então a composição salva os clipes por caminho.
  - *Composições*: Nova, Salvar, Salvar como…, lista das salvas (duplo clique abre). O arquivo
    guarda camadas, clipes por caminho, efeitos, autopilot, telas da saída e quadros do laser.
  - *Efeitos*: os 90 efeitos de vídeo do Resolume 7.26, com os nomes dele (Add Subtract, Auto
    Mask, Bendoscope, Bloom, Blow, Blur, ChromaKey, Circles, Cube Tiles, Delay RGB, Dilate,
    Displace, Dither, Drop Shadow, Fish Eye, Fragment, Freeze, Goo, Grid, Hatched, Heat,
    Infinite Zoom, Iterate, Keystone, Kuwahara, Levels, Linear/Radial Cloner, Mask, Meta Shape,
    Particle System, Pixel Blur, Point Grid, PolarKaleido, Polkadot, Radar, Raster, Recolor,
    Reveal, Ripples, Shaper, Sharpen, Shift Glitch, Slice Transform, Snow, Sparkles, Sphere,
    Stop Motion, Stripper, Suckr, Terrain, Trails, Triangulate, Tunnel, Twisted, UV Map,
    Vibrance, VideoWall…) e mais o **Background Removal**. Os que lembram o quadro anterior
    (Trails, Freeze, Delay RGB, Infinite Zoom, Radar, Stop Motion) têm memória própria no motor.
    ♥ favoritos; arraste para um clipe, camada ou composição, ou duplo clique para o clipe
    selecionado. Embaixo, os 6 **efeitos de áudio** (Bitcrusher, Distortion, EQ-3, Flanger,
    HighPass, LowPass), que vão para o clipe de vídeo.
  - *Fontes*: 13 geradores (Blank, Checkered, Gradient, Lines, Rings, Sine Wave, Spiral, Static,
    Stroboscope, Test Card, Metaballs, Line Scape, Solid Color), Text Block (fontes do Windows)
    e as câmeras ligadas; arraste para uma casa.
  - *Gravar*: grava a composição ou uma tela em WebM (fonte, microfone, preset, início
    imediato/no disparo/depois de N s, parada manual/N s/fim dos clipes); os arquivos ficam em
    Vídeos/Projecionista.

### Saída avançada

O botão "Saída avançada", no monitor da composição, abre o editor de telas, copiado do
Advanced Output do Resolume (Presets e telas à esquerda com a caixa de ajuda embaixo, abas
Seleção de entrada e Transformação de saída, propriedades à direita, Cancelar e Salvar e
fechar embaixo). Ctrl+Z desfaz, Ctrl+Y refaz; a barra de espaço arrasta a vista.

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

### Laser (LaserCube por Wi-Fi)

O botão "Laser", na barra de cima, abre o módulo do laser (maquete: `laser-mockup.html`):

- **Quadros** à esquerda: texto, desenho à mão, SVG importado ou forma pronta. Cada quadro
  tem cor (arco-íris, fixa, ciclo, duas cores, estrobo), distorção (onda, giro, pulso, tremor,
  espelho, reação ao microfone) e posição. A bolinha verde (ou a barra de espaço) manda o quadro
  para o laser. Arraste um quadro para uma casa da grade: disparar a casa manda o quadro.
- **Palco** no meio, com as ferramentas: selecionar/mover, lápis, linha, retângulo, círculo,
  polígono por cliques, texto, borracha. A zona segura (retângulo vermelho) corta o feixe fora
  dela. Importar/Exportar SVG, Salvar/Abrir os quadros em JSON.
- **Texto** com fontes Hershey de traço único (Simples, Script, Gótica), horizontal, vertical ou
  em pilha, com rolagem.
- **Aba Laser**: procurar o LaserCube na rede (ou digitar o IP), conectar, pontos por segundo,
  brilho, pontos de canto, zona segura e espelho da saída. A saída começa sempre desligada e
  desliga ao desconectar e ao fechar o programa.
- **Mapeamento** (na aba Laser): pontos de ancoragem como na Saída avançada — "4 cantos"
  (perspectiva) ou "Malha" (rede de curvas, divisões ajustáveis). As âncoras aparecem no
  palco e se arrastam até o contorno casar com a parede ou o objeto; o palco mostra o desenho
  já mapeado. Vale para tudo que vai ao laser; "Zerar" volta aos cantos. Fica salvo junto com
  os quadros e a composição.

O protocolo (UDP, portas 45456–45458) está descrito em `lasercube.js`; veio da biblioteca
aberta da Wicked Lasers (libLaserdockCore) e do LaserCubeSharp, sem copiar código.

## Como é feito

- `main.js`: processo principal do Electron. Serve `app/` por `app://projecionista/`, lista
  os monitores e guarda os presets de saída (`app/preload.js` é a ponte).
- `app/engine.js`: motor em WebGL2. Desenha as camadas de baixo para cima numa imagem de
  1920×1080 (a composição) e, para cada tela, recorta e deforma os slices com soft edge e
  máscaras.
- `app/screens.js`: o modelo de telas, slices e máscaras; `app/warp.js`: a geometria dos
  quatro cantos e da malha bezier.
- `app/ao.js`: o editor da Saída avançada (maquete: `advanced-output-mockup.html`).
- `app/laser.js`, `app/laser-model.js`, `app/hershey.js`: o módulo do laser (interface, modelo e
  gerador de pontos, fontes de traço único); `lasercube.js`: a conversa UDP com o LaserCube, no
  processo principal. `app/panel.js`: peças de interface no formato do Resolume, compartilhadas.
- `app/player.js`: reprodutor próprio (FramePlayer para MP4 preparado, GifPlayer para
  animações), com `app/vendor/mp4box.all.mjs` (mp4box.js 2.4, BSD-3). `main.js` chama o
  ffmpeg para preparar (`media:prepare`) e entrega o arquivo inteiro (`media:read`).
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
