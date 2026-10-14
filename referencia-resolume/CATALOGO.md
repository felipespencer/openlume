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
