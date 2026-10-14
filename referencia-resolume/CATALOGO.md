# O que o Resolume Arena 7.26 tem — catálogo para copiar

Levantado em 2026-10-14 abrindo o Arena 7.26 nesta máquina e fotografando cada menu e painel
(as capturas `.png` ficam nesta pasta, fora do git). Serve de lista de compras para o
Projecionista: o que já está feito, o que falta e o nome de cada coisa como o Felipe conhece.

## Janela principal

Linha de menus: **Arena · Composition · Deck · Group · Layer · Column · Clip · Output · Shortcuts · View**.

| Menu | Itens |
|------|-------|
| Arena | Preferences…, Fixture Editor…, About, Check for updates…, View Manual, Import from Version 6, Quit |
| Composition | New, Open…, Open Recent, Save, Save As…, Media Manager…, Copy/Paste Effects, Global Transport ▸, Beat Snap ▸, Clip Target ▸, Clip Trigger Style ▸, Trigger First Column On Play, Settings… |
| Deck | New, Insert Before/After, Duplicate, Close, Rename, Clear Clips, Remove, cor do deck |
| Group | New, Insert Above/Below, Duplicate, Rename, Copy/Paste Effects, Fold, Clear Clips, Remove Group keep Layers, Remove Group and Layers, Add Layer, Ignore Column Trigger, Trigger First Column On Play, Lock Content, cor |
| Layer | (igual ao Group: novo, inserir, duplicar, renomear, efeitos, limpar, remover, cor) |
| Column | New, Insert Before/After, Duplicate, Rename, Beat Snap ▸, Clear Clips, Remove, Remove All Before/After, cor |
| Clip | Beat Snap ▸, Transport ▸, Target ▸, Trigger Style ▸, Fader Start ▸, Ignore Column Trigger ▸, Resize ▸, Thumbnail ▸, Persistent, Select All (+ Including Empty), Cut/Copy/Paste, Copy/Paste Effects, Rename, Clear, Create Blank, Show in Explorer, Strip Video/Audio, Snapshot, Render To File |
| Output | Disabled; Fullscreen: Display 1/2/3; Windowed: Display 1/2/3; **Advanced…**; Texture sharing (Spout); Network streaming (NDI); Identify Displays; Open System Display Preferences; Show Test Card; Show Display Info; Snapshot |
| Shortcuts | Edit Keyboard, Edit MIDI, Edit OSC, Edit DMX, Stop |
| View | Show: Ableton Link, Audio Controls, Autopilot, Beat Looper, Big Column Triggers, Speed Sliders, Cue Points, Crossfader, Denon DJ StageLinQ, Dashboard, FPS & Stats, FFT Gain, Help, Transition Controls, Layer Transport Controls, Pioneer DJ TCNet, Undo Toolbar; painéis de propriedades: Clip, Clip Time, Column, Composition, Group, Layer, Monitor, Notes, SMPTE; painéis de navegação |

**Grade de clipes**: cabeçalho de colunas com um quadradinho de disparo em cada; cada camada tem
à esquerda **X** (tirar do ar), **B** (bypass), **S** (solo), **M** (mute), **A/V** (áudio/vídeo),
menu de mistura (**Add ▾**), transporte da camada (◀ ‖ ▶, ⏮ ⏭), **T** (transição) e **Alph**,
fader de opacidade, e o A/B do crossfader. Embaixo da grade: faixa do **crossfader** e as abas dos
**decks** ("empty"). Barra de transporte: ▶ ‖ ■, **BPM 120** − +, nudge ◁| |▷, /2 ×2, **TAP**,
**RESYNC**, metrônomo, desfazer/refazer.

**Monitores**: Composition Monitor e Preview Monitor (zoom "Fit", mão, engrenagem).

## Painéis de propriedades (centro)

Formato de toda linha: `rótulo | valor − + barra`, com o botão **P.** (animação/parâmetro) à direita dos grupos.

- **Composition**: Dashboard (8 knobs Link 1–8) · **Autopilot** (Direction ◀◀ OFF ▶▶ ⤮, Duration = Longest Clip, Loop, Master Layer) · Composition (Master, Speed) · Audio (Volume, Pan) · Video (Opacity) · CrossFader (Blend Mode Alpha, Behaviour Cut, Curve Linear) · Transform (Position X/Y, Scale, Rotation, Anchor) · "Drop effect or mask".
- **Layer**: Dashboard · Autopilot · Layer (Master) · Audio · Video (Blend Mode, Opacity, Width, Height, Auto Size) · **Transition** (Blend Mode, Duration) · Transform.
- **Clip**: "Drop audio, video, mask, source or effect. Double click to search."

## Painéis de navegação (direita): Files · Compositions · Effects · Sources · Record

- **Files**: caminho com ▾ de recentes, seta para cima, ♥ favoritos, modo lista/ícones, busca, árvore de pastas. Arrasta para a casa; duplo clique mostra na prévia.
- **Compositions**: composições salvas com os decks dentro, ordenação A–Z; duplo clique abre a composição ou só o deck.
- **Effects**: busca; **Video Effects** e **Audio Effects**; ♥ marca favorito; arrasta para clipe, camada, grupo ou composição.
- **Sources**: busca; **Video Sources**, **Capture Devices** (ex.: Logitech BRIO), NDI, Spout, Video Router.
- **Record**: botão **RECORD**; Settings: Source (Composition…), After Recording (Do Nothing…), Media (Video Only…), Preset (DXV Normal Quality With Alpha ⚙), Start (Immediately / Clip Trigger / Next Bar / After N s), Stop (Manual / All Clips Ended / Second(s) / Beat(s)); lista Files.

### Efeitos de vídeo (lista completa, 7.26)

Add Subtract · Auto Mask · Bendoscope · Bloom · Blow · Blur · Bright.Contrast · ChromaKey · Circles · Colorize · Color Pass · Crop · Cube Tiles · Delay RGB · Dilate · Displace · Distortion · Dither · Dot Screen · Drop Shadow · Edge Detection · Exposure · Fish Eye · Flip · Fragment · Freeze · Goo · Grid · Hatched · Heat · Hue Rotate · Infinite Zoom · Invert RGB · Iterate · Kaleidoscope · Keystone · Keystone Crop · Keystone Mask · Kuwahara · Levels · Linear Cloner · LoRez · Mask · Meta Shape · Mirror · Mirror Quad · Noisy · Particle System · Pixel Blur · Pixel High Pass · Point Grid · PolarKaleido · Polkadot · Posterize · Radar · RadialBlur · Radial Cloner · Raster · Recolor · Reveal · Ripples · Saturation · Shaper · Sharpen · Shift Glitch · Shift RGB · Slice Transform · Slide · Snow · Snowy · Solid Color · Sparkles · Sphere · Static · Stingy Sphere · Stop Motion · Stripper · Strobe · Suckr · Terrain · Text Animator · Text Block · Threshold · Tile · Tint · Trails · Transform · Triangulate · Tunnel · Twisted · Twitch · UV Map · Vibrance · VideoWall · Vignette · Wave Warp.

**Efeitos de áudio**: Bitcrusher · Distortion · EQ-3 · Flanger · HighPass · LowPass.

**Os mais novos (plugins Wire, `plugins/wire/*.wired`)**: Abstract Field · Acuarela · **Background Removal** · Bumper · CRT · Depth Based Mixer · Depth Blur · Depth Displace · **Depth Estimation** · Depth Field · Depth Pixelation · Depth Shift · Grid Cloner · LUT · PiP · SearchLight · Shape Mask · Slice Delay · Slice Outline · Strokes · Tilt Shift · Tunnelines · WarpSpeed.

### Fontes de vídeo

Blank · Checkered · Feedback · Gradient (presets Banding Test Gray/Green) · Lines · Line Scape · Metaballs · Rings · Shaper · Sine Wave · Solid Color · Spiral · Static · Stroboscope · Test Card · Text Animator · Text Block · Video Router · **Capture Devices** (câmeras, ex. Logitech BRIO) · NDI · Spout.

### Transições de camada (no executável)

Alpha · Add · Subtract 50 · Screen · Soft Light · Side by Side · Push Left/Right/Up/Down · Rotate X/Y · Twitch Mixer · Time Switcher · Wipe Ellipse · Zoom In/Out · Alpha Limiter.

## Advanced Output

Ver `advanced-output-*.png` e o editor já copiado no Projecionista (`app/ao.js`). Fora do que
foi copiado: Polygon slice, DMX Lumiverse/Fixture, Output Guide (imagem de guia), Export to SVG.

## Preferências (pela ajuda, não fotografadas)

General · Video · Audio · MIDI (dispositivos, monitor de tráfego) · OSC (entrada/saída, bundles,
monitor) · DMX/Art-Net (entradas, nó, adaptador, monitor) · Defaults (padrões de clipe, tempo
nudge) · Webserver (API REST).

## Segunda rodada com o REA (2026-10-14, à tarde)

Alvo: o que o Resolume Arena 7.26/7.28 instala em `C:\Program Files\Resolume Arena`. O `Arena.exe`
inteiro continua estourando o tempo do REA; o que rendeu foi: ler os pacotes e arquivos com as
ferramentas de artefato do REA (o `.mcpb`, os `.wired`) e puxar do executável só o que está em
texto puro (GLSL e nomes) com um script Python. Cópias do que foi extraído ficam em
`referencia-resolume/extraido/` (fora do git: é texto do Resolume, serve para consulta, não
para copiar). Tudo abaixo está descrito com nossas palavras; a implementação é nossa.

### Como o Resolume mistura e faz transição (dos shaders em texto no executável)

- **Toda mistura de camada tem duas metades no fader de opacidade.** De 0 a 50 % a camada
  entra *misturando* com o que está embaixo (Add, Multiply, Screen…); de 50 a 100 % a mistura
  vai virando "camada normal por cima" (alpha). Quando a camada está em transição de clipe,
  a segunda metade vai virando *só o clipe novo*. Ou seja: **as transições entre clipes da
  mesma camada são os mesmos modos de mistura, rodados no tempo** (0→100 % na "Transition
  Time", de 0 a 10 s), com o clipe antigo no lugar da camada de baixo e o novo por cima.
- As versões **"50"** (50 Add, 50 Multiply, 50 Subtract…) são a mistura pura no fader inteiro:
  em 100 % a camada ainda está misturando, nunca vira "normal por cima".
- A mistura tipo Photoshop ignora onde há transparência: onde o clipe de cima é transparente
  mostra o de baixo, onde o de baixo é transparente mostra o de cima, e só mistura onde os dois
  existem (com as cores "despremultiplicadas" antes da conta).
- Fórmulas (iguais às do Photoshop): Darken = mín; Multiply = A·B; Burn = 1 − (1−A)/B;
  Linear Burn = A+B−1; Lighten = máx; Screen = 1 − (1−A)(1−B); Dodge = A/(1−B); Add = mín(A+B,1);
  Overlay, Hard Light, Soft Light, Vivid, Linear e Pin Light, Difference, Difference I (inverso),
  Exclusion, Subtract.
- **Cut**: troca seca em 50 %. **To Black / To White / To Color**: a primeira metade escurece
  (ou clareia, ou tinge) o clipe antigo até o preto/branco/cor, a segunda metade traz o novo de
  lá. **To Color Exposure**: o mesmo, por exposição. **Black and White**: média dos dois.
  **Displace**: desloca o antigo na horizontal pela luminância, com o pico em 50 %. **Meta
  Mix**: o antigo vira um mosaico (até 100 divisões) tingido pela luminância do novo, depois
  funde para o novo. **Dissolve**: ruído fractal com zoom e suavidade. **Luma Key / Luma Key I
  / Luma Is Alpha**: recorte por luminância com "smoothness".
- Os geométricos (**Push Left/Right/Up/Down, Zoom In/Out, Rotate X/Y, Cube, Side by Side,
  Wipe Ellipse, Time Switcher, Twitch Mixer, JitterBug, Noisy, Static, Parts, Multi Task, Shift
  RGB, Alpha Limiter, Auto Mask**) não estão em GLSL de texto; são feitos no código (geometria).
  O comportamento deles a gente copia do que se vê no programa.
- Lista completa do registro de misturas/transições no executável (nome · id interno):
  Alpha A006 · Add A005 · 50 Add A028 · Subtract A014 · 50 Subtract A057 · Multiply A013 ·
  50 Multiply · Screen A012 · Overlay · 50 Overlay · Soft Light A017 · Hard Light A018 ·
  Lighten A007 · 50 Lighten A029 · Darken A010 · Burn A016 · 50 Burn · Dodge A015 · 50 Dodge ·
  Difference A011 · Difference I A019 · 50 Difference · 50 Distance · Exclusion · Luma Key A008 ·
  Luma Key I A020 · Luma Is Alpha A009 · 50 Mask · RGB A033 · Shift RGB A036 · Meta Mix A045 ·
  Multi Task A047 · Noisy A056 · Static A037 · Parts A042 · JitterBug A055 · Cube A023 ·
  Cut A048 · Displace A046 · Dissolve · to Black A040 · to White A038 · to Color · Push Left
  A001 · Push Right A003 · Push Down A002 · Push Up A004 · Rotate X A024 · Rotate Y A025 ·
  Side by Side A051 · Zoom In A021 · Zoom Out A022 · Wipe Ellipse A026 · Time Switcher A030 ·
  Twitch Mixer A184 · Alpha Limiter · Auto Mask.

### Como a composição é guardada (`default/Example.avc`, XML)

`Composition` (numDecks, numLayers, numColumns) → `CompositionInfo` (nome, tamanho, um
`DeckInfo` por deck) → `Deck` (cada `Clip` com layerIndex e columnIndex; `ColumnAttributes` dá
nome à coluna; miniatura embutida LZF 160×120) · `Layer` (Dashboard, `ClipTransition`,
`VideoTrack` com largura/altura, cadeia de efeitos (Transform fixo + cada efeito como
"DryWet" com seu próprio mixer), **dois mixers: `Blend` (mistura com a camada de baixo) e
`Transition` (entre clipes)**; `AudioTrack`) · `CrossFader` (sua própria cadeia e mistura) ·
`TempoController` (Tempo) · `Clip` → `Transport` (Position com Speed, "Max Distance",
`Beats_d` para BPM Sync, DurationSource) + fonte. Um deck pode estar "closed". Cada parâmetro
(`ParamRange`) carrega sua **fonte de animação**: estática, linha do tempo (Speed, Multiplier,
Interval, Max Distance, PlayDirection, PlayMode, duração em batidas "4b" ou segundos "5s"),
link do Dashboard, transporte do clipe ou **FFT** (FrequencyRange, Gain, Fallback), mais um
**Envelope** (pontos x, y e um código de curva: vimos 1, 3, 10, 12 e 33, significado não
confirmado).

### Presets que o Resolume instala (XML, `default/Presets`)

- **Animation**: BPM 1 to the Floor, 4 to the Floor, On Off, Random, Step 1 2, Step 1 2 3 4,
  Double Trouble, Glitchy, Jittery, Jumpy, Wavey, FFT Bass ON/OFF, Bass/Low-Mid/Mid com limiar.
- **Envelopes**: 4 To The Floor, ADSR, ASR, Digital, EasyEase, Jaws, LFO, Noise, Saw, Up N Down.
- **Render and Record**: DXV 3 Normal/High × com/sem alpha, H264 Low/Medium/High, Motion JPEG…
  (atributos: Codec, Format, AutoSize=Fit, áudio 44100 Hz 16 bits).
- **Interface**: Big Monitor, Dual Display, Many Layers, Many Monitors Left/Top, Minimal,
  Panels Left & Right, Panels On Top. **Color Palettes**: 13 (Inferno, Magma, Plasma…).
- **Video Effects** (32 pastas) e **Sources** (13): os parâmetros de cada efeito com os nomes
  do Resolume estão em `extraido/` (tabela "effect presets param names"). Vários efeitos
  trazem BPM, Beats, Syncmode, PlayDirection, PlayMode: são parâmetros animados na batida.

### Ajuda contextual (412 tópicos, `docs/help/English.xml`; digest em `extraido/ajuda.txt`)

- **Decks**: "os discos; a composição é a bolsa de discos"; clicar troca de deck.
- **Grupos**: solo, bypass, velocidade, tocar para frente/trás, pausa, aleatório, disparo de
  coluna do grupo, "ignorar disparo de coluna", bus A/B do crossfader.
- **BPM**: valor, ajuste ±1, nudge (percentual nas preferências), /2 ×2, TAP (2 cliques no
  mínimo, 4 ou mais para acertar), pausar o relógio, metrônomo, indicador de batida (4 por
  compasso, pisca amarelo a cada 4 compassos), Ableton Link.
- **Crossfader**: amarrar camada/grupo ao bus A ou B, "Fade to bus", curva, comportamento,
  modo de mistura.
- **Transporte**: modo Timeline, BPM Sync ou SMPTE; modos Loop, Bounce, Play Once, Play Once
  and Hold, Random (em BPM Sync pula para uma batida aleatória); disparo Restart, Continue ou
  Relative (continua da posição do clipe anterior); **BeatLoopr** (loop com tamanho em
  batidas); **6 cue points**; "Transition Time 0–10 s"; "Select Transition: da lista ou ao
  acaso"; autopilot para frente, para trás ou aleatório.
- **Atalhos**: modos Toggle, Value, Piano (máximo enquanto segura), mouse esquerda-direita e
  cima-baixo; MIDI Relative (encoder sem fim), Absolute, Button.

### Plugins Wire (`plugins/wire/*.wired`) e modelos de IA

`.wired` é um contêiner com um `patch.wire` em JSON (nós e ligações) e presets em JSON;
os JSONs estão em `extraido/wire/`. **Background Removal** = nó "Human Segmentation" →
Fill Holes, Filter Specks, Temporal Smoothness, Dilate, Blur/Soft Edge, Refine Edge, Hard
Mask, Invert; presets Light-Weight, Low-Light, Moving Subject, Multiple Subjects, Music Video,
Static Subject, Webcam. **Depth Estimation** = nó "Depth Estimation" + Temporal Filter.
Os modelos são públicos, em `ai-models/`: segmentação **PP-HumanSeg** (6 MB), **MODNet** (41 MB),
**PP-MattingV2** (36 MB); profundidade **Depth Anything v1 e v2 ViT-S** (99 MB cada) e
**MiDaS v2.1 384** (416 MB), todos ONNX, rodados pelo onnxruntime + DirectML. Para o item 12
do roteiro, o caminho é o mesmo: onnxruntime-web (WebGPU) com um modelo de segmentação público,
conferindo a licença de cada um antes de embarcar.

### MCP oficial (`mcp/`)

O Resolume 7.28 traz um **servidor MCP oficial** (`resolume_arena_mcp_server.mcpb`, zip com
manifesto 0.3, binário por plataforma, ferramentas geradas da API REST; doc em
resolume.com/support/en/7.26.0/mcp-servers). Ideia para depois: o Projecionista expor a sua
API da mesma forma.

### Ficou faltando

- `casinha.xml` e `roosevelt.xml` (presets reais de Advanced Output) seguem só na nuvem: o
  Windows avisa "o provedor do arquivo de nuvem não está em execução". Abrir o OneDrive uma vez
  os traria.
- Os shaders das transições geométricas e o significado dos códigos de curva do Envelope.
