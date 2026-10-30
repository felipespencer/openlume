# Fichas dos efeitos de vídeo do Resolume

Tiradas da API REST do Resolume Arena 7.26 (`GET /effects` + cada efeito posto na camada 1) por
`node tools/compare/resolume.mjs fichas`. Servem para igualar os controles dos efeitos do OpenLume.
"Opacity" é a mistura do próprio efeito; aparece em todos.

## Acuarela

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Gain | Range | 0 | 1 | 0.01 |  |
| Speed | Range | 0 | 40 | 4 |  |
| Detail | Range | 0 | 8 | 4 |  |
| Strength | Range | 0 | 1 | 0.3222 |  |
| Density | Range | 0 | 100 | 4 |  |
| Gain X | Range | 0 | 1 | 0.3 |  |
| Gain Y | Range | 0 | 1 | 0.3 |  |
| Reset | Event |  |  |  |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Add Subtract

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| R | Range | -1 | 1 | 0 | % |
| G | Range | -1 | 1 | 0 | % |
| B | Range | -1 | 1 | 0 | % |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Auto Mask

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Channel | Choice |  |  | Luminance | Luminance, Red, Green, Blue |
| Contrast | Range | 0 | 1 | 0.5 |  |
| Invert | Boolean |  |  | false |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Background Removal

Presets: Light-Weight, Low-Light, Moving Subject, Multiple Subjects, Music Video, Static Subject, Webcam

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Refine Edge | Range | 0 | 1 | 0.5 |  |
| Soft Edge | Range | 0 | 1 | 0.5 |  |
| Fill Holes | Boolean |  |  | true |  |
| Hard Mask | Boolean |  |  | false |  |
| Filter Specks | Range | 0 | 1 | 0.1 |  |
| Temporal Smoothness | Range | 0 | 1 | 0.1 |  |
| Mode | Choice |  |  | Alpha | Alpha, Mask |
| Invert | Boolean |  |  | false |  |
| Model Quality | Choice |  |  | Medium | Low, Medium, High |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Bendoscope

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Divisions | Range | 0 | 1 | 0.1 |  |
| Black BG | Boolean |  |  | false |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Bloom

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Amount | Range | 0 | 1 | 1 |  |
| Threshold | Range | 0 | 1 | 0.9 |  |
| Knee | Range | 0 | 1 | 0.1 |  |
| Iterations | Range | 1 | 5 | 2 |  |
| Size | Range | 0 | 1 | 0.25 |  |
| Gaussian | Range | 0 | 1 | 0.5 |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Blow

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| X | Range | 0 | 1 | 0.5 |  |
| Y | Range | 0 | 1 | 0.5 |  |
| Width | Range | 0 | 1 | 0.5 |  |
| Height | Range | 0 | 1 | 0.5 |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Blur

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Blur | Range | 0 | 1 | 1 |  |
| Blur X Distance | Range | 0 | 1 | 0.05 |  |
| Blur Y Distance | Range | 0 | 1 | 0.05 |  |
| Quality | Range | 0 | 1 | 0.15 |  |
| Gaussian | Range | 0 | 1 | 0.2 |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Bright.Contrast

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Brightness | Range | -1 | 1 | 0 | % |
| Contrast | Range | -1 | 1 | 0 |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## CRT

Presets: Big Beautiful Beams, Big Grid Energy, Bit of a Grid, Jagged Lines, Mind the Gap, Red-Green Lensch Flare, Scanlines Horizontal, Scanlines Vertical, Trinitron

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Columns | Range | 1 | 720 | 340 |  |
| Rows | Range | 1 | 240 | 115 |  |
| Shift | Range | 0 | 100 | 100 | % |
| Vignette | Range | 0 | 100 | 0 | % |
| Fisheye | Range | 0 | 100 | 0 | % |
| Spread | Range | 0 | 100 | 50 | % |
| Brightness | Range | 1 | 100 | 50 | % |
| Bloom Amount | Range | 0 | 100 | 100 | % |
| Bloom Width | Range | 0 | 300 | 50 | % |
| Bloom Height | Range | 0 | 300 | 50 | % |
| Between Slots | Range | 0 | 2 | 1 | px |
| Left/Right | Range | 0 | 5 | 1 | px |
| Top/Bottom | Range | 0 | 5 | 1 | px |
| Color Left | Choice |  |  | R | R, G, B |
| Power Left | Range | 0 | 1 | 1 |  |
| Tilt Left | Range | -1 | 1 | 0 | x |
| Color Middle | Choice |  |  | G | R, G, B |
| Power Middle | Range | 0 | 1 | 1 |  |
| Tilt Middle | Range | -1 | 1 | 0 | x |
| Color Right | Choice |  |  | B | R, G, B |
| Power Right | Range | 0 | 1 | 1 |  |
| Tilt Right | Range | -1 | 1 | 0 | x |
| Height Scale | Range | 1 | 10 | 4 | x |
| Display Mode | Choice |  |  | Fit to Output | Fit to Output, Native |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## ChromaKey

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Show Mask | Boolean |  |  | false |  |
| Key Hue | Range | 0 | 1 | 0.4401 | ° |
| Hue Threshold | Range | 0 | 1 | 0.1 |  |
| Hue Softness | Range | 0 | 1 | 0.25 |  |
| White Threshold | Range | 0 | 1 | 0.2 |  |
| White Softness | Range | 0 | 1 | 0.2 |  |
| Black Threshold | Range | 0 | 1 | 0.2 |  |
| Black Softness | Range | 0 | 1 | 0.1 |  |
| Spill Threshold | Range | 0 | 1 | 0.2 |  |
| Spill Softness | Range | 0 | 1 | 0.1 |  |
| Edge Shrink | Range | 0 | 1 | 0.125 |  |
| Edge Blur | Range | 0 | 1 | 0.125 |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Circles

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Size | Range | 0 | 1 | 0.5 |  |
| Black BG | Boolean |  |  | false |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Color Pass

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Hue 1 | Range | 0 | 1 | 0.5 |  |
| Hue 2 | Range | 0 | 1 | 1 |  |
| Invert | Boolean |  |  | false |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Colorize

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Color | Color |  |  | #ff0000ff |  |
| Mode | Choice |  |  | Color | Color, Palette |
| Weighted | Boolean |  |  | true |  |
| GreysKeep | Boolean |  |  | false |  |
| GreysTolerance | Range | 0 | 1 | 0.3 |  |
| Invert | Boolean |  |  | false |  |
| Contrast | Range | 0 | 1 | 0.2 |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Crop

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Left | Range | 0 | 32768 | 0 |  |
| Right | Range | 0 | 32768 | 1920 |  |
| Top | Range | 0 | 32768 | 0 |  |
| Bottom | Range | 0 | 32768 | 1080 |  |
| Invert | Boolean |  |  | false |  |
| Black BG | Boolean |  |  | false |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Cube Tiles

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Resolution | Range | 0 | 1 | 0.3 |  |
| Zoom | Range | 0 | 1 | 0.75 |  |
| Amount | Range | 0 | 1 | 0.5 |  |
| Randomize | Event |  |  |  |  |
| Rotate X | Range | 0 | 1 | 0.6 |  |
| Rotate Y | Range | 0 | 1 | 0.6 |  |
| Rotate Z | Range | 0 | 1 | 0.5 |  |
| Num Cubes | Range | 0 | 1 | 0 |  |
| Black BG | Boolean |  |  | false |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Delay RGB

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| R delay | Range | 0 | 1 | 0 |  |
| G delay | Range | 0 | 1 | 0.15 |  |
| B delay | Range | 0 | 1 | 0.3 |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Depth Blur

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Depth | Range | 0 | 1 | 0.2 |  |
| Width | Range | 0 | 1 | 0.1 |  |
| Radius | Range | 0 | 32 | 12 | px |
| Scale Near | Range | 0 | 2 | 1 |  |
| Scale Far | Range | 0 | 2 | 1 |  |
| Quality | Range | 0 | 1 | 0.3 |  |
| Depth Aware | Range | 0 | 1 | 0.75 |  |
| Boost | Range | 0 | 10 | 2 |  |
| Threshold | Range | 0 | 1 | 0.5 |  |
| Power | Range | 1 | 8 | 2 |  |
| Model Quality | Choice |  |  | Low | Low, Medium, High |
| Transparency | Boolean |  |  | true |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Depth Displace

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Depth | Range | 0 | 1 | 1 |  |
| Thickness | Range | 0 | 1 | 0.5 |  |
| Min | Range | 0 | 1 | 0 |  |
| Max | Range | 0 | 1 | 0.4 |  |
| Falloff | Range | 0.5 | 4 | 1 |  |
| Detail | Range | 2 | 64 | 10 |  |
| Speed | Range | 0 | 2 | 0.3 |  |
| Model Quality | Choice |  |  | Low | Low, Medium, High |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Depth Estimation

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Model Quality | Choice |  |  | Low | Low, Medium, High |
| Temporal Filter | Range | 0 | 1 | 0.5 |  |
| Transparency | Boolean |  |  | true |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Depth Field

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Depth | Range | 0 | 1 | 0.5 |  |
| Thickness | Range | 0.001 | 0.5 | 0.1 |  |
| Soft Edge | Range | 0 | 12 | 1 |  |
| Jitter | Range | 0 | 1 | 0 |  |
| Color | Color |  |  | #66e6ffff |  |
| Chroma | Range | 0 | 1 | 0 |  |
| Glow | Range | 0 | 8 | 2 |  |
| Enabled | Boolean |  |  | true |  |
| Negative | Boolean |  |  | false |  |
| Desaturate | Range | 0 | 1 | 1 |  |
| Brightness | Range | 0 | 2 | 0.5 |  |
| Model Quality | Choice |  |  | Low | Low, Medium, High |
| Transparency | Boolean |  |  | true |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Depth Pixelation

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Depth | Range | 0 | 1 | 1 |  |
| Thickness | Range | 0 | 1 | 0.5 |  |
| Min | Range | 1 | 64 | 1 | px |
| Max | Range | 1 | 256 | 40 | px |
| Falloff | Range | 0.5 | 4 | 1 | x |
| Model Quality | Choice |  |  | Low | Low, Medium, High |
| Transparency | Boolean |  |  | true |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Depth Shift

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| X | Range | -1 | 1 | 0.1 |  |
| Y | Range | -1 | 1 | -0.1 |  |
| Wrap | Choice |  |  | Clamp | Clamp, Repeat, Mirror Repeat |
| Scale | Range | 0 | 1 | 0.75 |  |
| Steps | Range | 1 | 128 | 10 |  |
| Power | Range | 0 | 1 | 0.5 |  |
| Mode | Choice |  |  | Multiply | Multiply, Tint, Fill |
| Close | Color |  |  | #ffffffff |  |
| Far | Color |  |  | #3c3c3cff |  |
| Edges | Boolean |  |  | false |  |
| Model Quality | Choice |  |  | Low | Low, Medium, High Quality |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Dilate

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Spread | Range | 0 | 1 | 0.15 |  |
| Size | Range | 1 | 10 | 3 |  |
| Threshold | Range | 0 | 1 | 0 |  |
| Mode | Choice |  |  | Light | Light, Dark |
| Shape | Choice |  |  | Rectangle | Rectangle, Circle, Triangle, Cross |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Displace

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| X factor | Range | 0 | 1 | 0.5 |  |
| Y factor | Range | 0 | 1 | 0.5 |  |
| Smooth | Boolean |  |  | false |  |
| Threshold | Range | 0 | 1 | 0 |  |
| Invert | Boolean |  |  | false |  |
| Mode | Choice |  |  | Clamp | Clamp, Wrap, Transparent |
| Black BG | Boolean |  |  | false |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Distortion

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Distort | Range | 0 | 1 | 0 |  |
| Radius | Range | 0 | 1 | 0.55 |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Dither

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Mode | Choice |  |  | 2x | 2x, 4x, 8x |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Dot Screen

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Saturation | Range | 0 | 1 | 0.5 |  |
| Angle | Range | 0 | 1 | 0 |  |
| Scale | Range | 0 | 1 | 0.5 |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Drop Shadow

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Distance | Range | 0 | 100 | 10 |  |
| Angle | Range | -180 | 180 | 45 |  |
| Color | Color |  |  | #000000ff |  |
| Spread | Range | 0 | 0.005 | 0.0013 | % |
| Strength | Range | 1 | 32 | 8 | % |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Edge Detection

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Mode | Range | 0 | 1 | 1 |  |
| Multiplier | Range | 0 | 1 | 0.2 |  |
| Use Color | Boolean |  |  | false |  |
| Color | Color |  |  | #ffffffff |  |
| Amount | Range | 0 | 1 | 1 |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Exposure

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Exposure | Range | 0 | 1 | 0.5 |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Fish Eye

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| FishEye | Range | 0 | 1 | 0.5 |  |
| Black BG | Boolean |  |  | false |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Flip

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Horizontal | Boolean |  |  | true |  |
| Vertical | Boolean |  |  | false |  |
| Black BG | Boolean |  |  | false |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Fragment

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Fragments | Range | 0 | 1 | 0.3 |  |
| Distance | Range | 0 | 1 | 0.33 |  |
| Rotation | Range | 0 | 1 | 0 |  |
| FragRotationX | Range | 0 | 1 | 0.5 |  |
| FragRotationY | Range | 0 | 1 | 0.5 |  |
| FragRotationZ | Range | 0 | 1 | 0.5 |  |
| FragScale | Range | 0 | 1 | 0.5 |  |
| CompositeOpacity | Range | 0 | 1 | 0.75 |  |
| Black BG | Boolean |  |  | true |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Freeze

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| X | Range | 0 | 1 | 0 |  |
| Y | Range | 0 | 1 | 0 |  |
| Frozen solid | Boolean |  |  | false |  |
| Black BG | Boolean |  |  | false |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Goo

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Resolution | Range | 4 | 128 | 32 |  |
| Speed | Range | 0 | 1 | 0.14 |  |
| MaxDistortionX | Range | 0 | 1 | 0.14 |  |
| MaxDistortionY | Range | 0 | 1 | 0.14 |  |
| MaxDistortionZ | Range | 0 | 1 | 0 |  |
| Black BG | Boolean |  |  | false |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Grid

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Width | Range | 0 | 1 | 0.05 |  |
| Size X | Range | 0 | 1 | 0.1 |  |
| Size Y | Range | 0 | 1 | 0.1 |  |
| Fuzzyness | Range | 0 | 1 | 0.05 |  |
| Color | Color |  |  | #ffffffff |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Grid Cloner

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Columns | Range | 1 | 10 | 4 |  |
| Rows | Range | 1 | 10 | 4 |  |
| Input Rotation | Range | -180 | 180 | 0 | ° |
| Input Scale | Range | 0 | 200 | 20 | % |
| Width | Range | 0 | 2 | 1.2 |  |
| Height | Range | 0 | 2 | 0.7 |  |
| Scale | Range | 0 | 500 | 100 | % |
| Rotation | Range | -180 | 180 | 0 | ° |
| Vertical Shift | Range | -1 | 1 | 0 |  |
| Horiztonal Shift | Range | -1 | 1 | 0 |  |
| Random Shift | Range | 0 | 1 | 0 |  |
| Order | Choice |  |  | Top Right | Center, Top Right |
| Delay | Boolean |  |  | false |  |
| Background | Color |  |  | #11ff6800 |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Hatched

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Density | Range | 1 | 8 | 4 |  |
| Levels | Range | 2 | 6 | 6 |  |
| Invert | Boolean |  |  | false |  |
| Color1 | Color |  |  | #ffffffff |  |
| Color2 | Color |  |  | #000000ff |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Heat

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Heat | Range | 0 | 1 | 0.5 |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Hue Rotate

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Hue Scale | Range | 0 | 1 | 1 |  |
| Hue Rotate | Range | 0 | 1 | 0 |  |
| Sat. Scale | Range | 0 | 1 | 0.5 |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Infinite Zoom

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Rotation Speed | Range | -2 | 2 | 0 |  |
| Zoom | Range | -0.2 | 0.2 | 0.05 |  |
| Range | Range | 0 | 20 | 3 |  |
| Alpha | Range | 0 | 1 | 0.5 |  |
| Num Slices | Range | 2 | 30 | 10 |  |
| Reset | Event |  |  |  |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Invert RGB

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| R | Range | 0 | 1 | 1 |  |
| G | Range | 0 | 1 | 1 |  |
| B | Range | 0 | 1 | 1 |  |
| A | Range | 0 | 1 | 0 |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Iterate

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| TransformStrength | Range | 0 | 1 | 1 |  |
| Iterations | Range | 0 | 1 | 0.3 |  |
| StartOpacity | Range | 0 | 1 | 1 |  |
| OpacityChange | Range | 0 | 1 | 0.5 |  |
| TranslateX | Range | 0 | 1 | 0.5 |  |
| TranslateY | Range | 0 | 1 | 0.5 |  |
| TranslateZ | Range | 0 | 1 | 0.5 |  |
| RotateX | Range | 0 | 1 | 0.5 |  |
| RotateY | Range | 0 | 1 | 0.5 |  |
| RotateZ | Range | 0 | 1 | 0.5 |  |
| Scale | Range | 0 | 1 | 0.5 |  |
| DOpacityChange | Range | 0 | 1 | 0.5 |  |
| DTranslateX | Range | 0 | 1 | 0.5 |  |
| DTranslateY | Range | 0 | 1 | 0.5 |  |
| DTranslateZ | Range | 0 | 1 | 0.5 |  |
| DRotateX | Range | 0 | 1 | 0.5 |  |
| DRotateY | Range | 0 | 1 | 0.5 |  |
| DRotateZ | Range | 0 | 1 | 0.5 |  |
| DScale | Range | 0 | 1 | 0.5 |  |
| BlendMode | Range | 0 | 1 | 0 |  |
| GRotateX | Range | 0 | 1 | 0.5 |  |
| GRotateY | Range | 0 | 1 | 0.5 |  |
| GRotateZ | Range | 0 | 1 | 0.5 |  |
| Black BG | Boolean |  |  | false |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Kaleidoscope

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Angles | Range | 0 | 1 | 0.3 |  |
| Rotation | Range | 0 | 1 | 0 |  |
| Zoom | Range | 0 | 1 | 0.5 |  |
| Input Rotation | Range | 0 | 1 | 0 |  |
| Black BG | Boolean |  |  | false |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Keystone

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Top Left X | Range | 0 | 1 | 0 |  |
| Top Left Y | Range | 0 | 1 | 0 |  |
| Top Right X | Range | 0 | 1 | 1 |  |
| Top Right Y | Range | 0 | 1 | 0 |  |
| Bot. Right X | Range | 0 | 1 | 1 |  |
| Bot. Right Y | Range | 0 | 1 | 1 |  |
| Bot. Left X | Range | 0 | 1 | 0 |  |
| Bot. Left Y | Range | 0 | 1 | 1 |  |
| Show Grid | Boolean |  |  | false |  |
| Black BG | Boolean |  |  | false |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Keystone Crop

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Top Left X | Range | 0 | 1 | 0.25 |  |
| Top Left Y | Range | 0 | 1 | 0.25 |  |
| Top Right X | Range | 0 | 1 | 0.75 |  |
| Top Right Y | Range | 0 | 1 | 0.25 |  |
| Bot. Right X | Range | 0 | 1 | 0.75 |  |
| Bot. Right Y | Range | 0 | 1 | 0.75 |  |
| Bot. Left X | Range | 0 | 1 | 0.25 |  |
| Bot. Left Y | Range | 0 | 1 | 0.75 |  |
| Show Grid | Boolean |  |  | false |  |
| Black BG | Boolean |  |  | false |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Keystone Mask

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Top Left X | Range | 0 | 1 | 0.25 |  |
| Top Left Y | Range | 0 | 1 | 0.25 |  |
| Top Right X | Range | 0 | 1 | 0.75 |  |
| Top Right Y | Range | 0 | 1 | 0.25 |  |
| Bot. Right X | Range | 0 | 1 | 0.75 |  |
| Bot. Right Y | Range | 0 | 1 | 0.75 |  |
| Bot. Left X | Range | 0 | 1 | 0.25 |  |
| Bot. Left Y | Range | 0 | 1 | 0.75 |  |
| Invert | Boolean |  |  | false |  |
| Show Grid | Boolean |  |  | false |  |
| Black BG | Boolean |  |  | false |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Kuwahara

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Radius | Range | 1 | 25 | 5 |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## LUT

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| LUT 3D | File |  |  |  |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Levels

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Base | Range | 0 | 1 | 0.5 |  |
| Midpoint | Range | 0 | 1 | 0.5 |  |
| Ratio | Range | 0 | 1 | 0.5 |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Linear Cloner

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Clones | Range | 1 | 50 | 25 |  |
| Tails | Range | 1 | 8 | 2 |  |
| Center | Range | -1 | 1 | 0 |  |
| Tail Length | Range | -1 | 1 | 0.5 |  |
| Start Scale | Range | 0 | 100 | 50 | % |
| Start Rotation | Range | -180 | 180 | 0 | ° |
| End Scale | Range | 0 | 100 | 0 | % |
| End Rotation | Range | 0 | 360 | 90 | ° |
| Distribution | Range | 0 | 100 | 50 | % |
| Distortion | Range | -100 | 100 | 45 | % |
| Reverse | Boolean |  |  | false |  |
| Tail Rotation | Range | 0 | 100 | 0 | % |
| Master Rotation | Range | -180 | 180 | 0 | ° |
| Delay Enabled | Boolean |  |  | false |  |
| Delay Amount | Range | 0 | 1 | 0.5 |  |
| Delay Order | Choice |  |  | New To Old | New To Old, Old To New, Bounce, Bounce Tail, Random |
| Delay Fill | Choice |  |  | Repeat | Repeat, Transparent |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## LoRez

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Pixel Size | Range | 0 | 1 | 0 |  |
| Bit Reduction | Range | 0 | 1 | 0 |  |
| Dither | Range | 0 | 1 | 0 |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Mask

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Image | File |  |  |  |  |
| Resize | Choice |  |  | Stretch | Fill, Fit, Stretch |
| Channel | Choice |  |  | Luminance | Luminance, Red, Green, Blue, Alpha |
| Invert | Boolean |  |  | false |  |

## Meta Shape

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Resolution | Range | 4 | 512 | 18 |  |
| Shape 1 | Choice |  |  | Rectangle | Circle, Rectangle, Hexagon, Cross |
| Shape 2 | Choice |  |  | Cross | Circle, Rectangle, Hexagon, Cross |
| Color | Choice |  |  | Sampled | White, Greyscale, Sampled, Original |
| Mode | Choice |  |  | Outline Scaled | Fill, Outline, Outline Scaled |
| Scale | Boolean |  |  | false |  |
| Invert | Boolean |  |  | false |  |
| Margin | Range | 0 | 0.95 | 0.125 |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Mirror

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| X | Range | 0 | 1 | 0 |  |
| Y | Range | 0 | 1 | 0 |  |
| In / Out | Range | 0 | 1 | 1 |  |
| Flip X | Boolean |  |  | false |  |
| Flip Y | Boolean |  |  | false |  |
| Black BG | Boolean |  |  | false |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Mirror Quad

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Flip X | Boolean |  |  | false |  |
| Flip Y | Boolean |  |  | false |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Noisy

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Noise | Range | 0 | 1 | 0.125 |  |
| Noise X | Range | 0 | 1 | 1 |  |
| Noise Y | Range | 0 | 1 | 1 |  |
| Noise S | Range | 0 | 1 | 1 |  |
| Noise C | Range | 0 | 1 | 0 |  |
| Resolution | Range | 0 | 1 | 1 |  |
| Interpolate | Boolean |  |  | false |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Particle System

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Particles | Range | 0 | 256 | 64 |  |
| Lifetime | Range | 0 | 10 | 3.5 |  |
| Spawn Mode | Choice |  |  | Auto | Auto, Manual |
| X Pos | Range | -1 | 1 | 0 |  |
| Y Pos | Range | -1 | 1 | 0 |  |
| Z Pos | Range | -1 | 1 | 0 |  |
| X Vel Min | Range | -0.02 | 0.02 | -0.002 |  |
| X Vel Max | Range | -0.02 | 0.02 | 0.002 |  |
| Y Vel Min | Range | -0.02 | 0.02 | -0.002 |  |
| Y Vel Max | Range | -0.02 | 0.02 | 0.002 |  |
| Z Vel Min | Range | -0.02 | 0.02 | 0 |  |
| Z Vel Max | Range | -0.02 | 0.02 | 0 |  |
| Rotate Min | Range | -5 | 5 | 0 |  |
| Rotate Max | Range | -5 | 5 | 0 |  |
| Scale Min | Range | 0 | 0.25 | 0.1 |  |
| Scale Max | Range | 0 | 0.25 | 0.15 |  |
| Scale Delta | Range | 0 | 1 | 0.93 |  |
| Opacity Delta | Range | 0 | 1 | 0.93 |  |
| Inherit Vel | Range | 0 | 1 | 0 |  |
| Gravity | Range | -0.002 | 0.002 | 0 |  |
| Wind | Range | -0.002 | 0.002 | 0 |  |
| Friction | Range | 0 | 1 | 0 |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Pixel Blur

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Blur | Range | 0 | 1 | 1 |  |
| Distance X | Range | 0 | 250 | 20 |  |
| Distance Y | Range | 0 | 250 | 20 |  |
| Interval | Range | 1 | 6 | 2 |  |
| Gaussian | Range | 0 | 1 | 0.2 |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Pixel High Pass

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| R | Range | 0 | 1 | 0 |  |
| G | Range | 0 | 1 | 0 |  |
| B | Range | 0 | 1 | 0 |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Point Grid

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Size | Range | 0 | 1 | 0.1 |  |
| Smooth Start | Range | 0 | 1 | 1 |  |
| Black BG | Boolean |  |  | false |  |
| Space | Range | 0 | 1 | 0 |  |
| Resolution | Range | 0 | 1 | 0.5 |  |
| Rotate X | Range | 0 | 1 | 0.5 |  |
| Rotate Y | Range | 0 | 1 | 0.5 |  |
| Rotate Z | Range | 0 | 1 | 0.5 |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## PolarKaleido

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Rings | Range | 1 | 16 | 1 |  |
| Parts | Range | 1 | 16 | 1 |  |
| Angle | Range | 0 | 1 | 0 |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Polkadot

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Dot Size | Range | 0 | 1 | 0.1 |  |
| Threshold | Range | 0 | 1 | 0 |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Posterize

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Posterize | Range | 0 | 1 | 0.5 |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Radar

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Angle | Range | 0 | 1 | 0 |  |
| Trail Length | Range | 0 | 0.99 | 0.75 |  |
| Fade | Range | 0 | 1 | 0.1 |  |
| Show Grid | Boolean |  |  | true |  |
| Grid Scale | Range | 0.08 | 1 | 0.5 |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Radial Cloner

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Clones | Range | 1 | 50 | 8 |  |
| Start Radius | Range | 0 | 1 | 0.5 |  |
| Start Scale | Range | 0 | 100 | 25 | % |
| Start Rotation | Range | -180 | 180 | 0 | ° |
| End Radius | Range | 0 | 1 | 1 |  |
| End Scale | Range | 0 | 100 | 100 | % |
| End Rotation | Range | 0 | 360 | 360 | ° |
| Fan | Range | 0 | 100 | 100 | % |
| Fan Offset | Range | 0 | 100 | 0 | % |
| Master Rotation | Range | -180 | 180 | 0 | ° |
| Delay Enabled | Boolean |  |  | false |  |
| Delay Amount | Range | 0 | 1 | 0.5 |  |
| Delay Order | Choice |  |  | New To Old | New To Old, Old To New, Bounce, Random |
| Delay Fill | Choice |  |  | Repeat | Repeat, Transparent |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## RadialBlur

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Steps | Range | 0 | 1 | 0.3 |  |
| Distance | Range | 0 | 1 | 0.1 |  |
| Rotation | Range | 0 | 1 | 0.5 |  |
| High Quality | Boolean |  |  | false |  |
| Black BG | Boolean |  |  | false |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Raster

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Modulo X | Range | 1 | 100 | 2 |  |
| Modulo Y | Range | 1 | 100 | 2 |  |
| Black BG | Boolean |  |  | false |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Recolor

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Palette | Range | 0 | 1 | 0 |  |
| Floor | Range | 0 | 1 | 0 |  |
| Ceiling | Range | 0 | 1 | 1 |  |
| Cycle Phase | Range | 0 | 1 | 0 |  |
| Cycle Speed | Range | 0 | 1 | 0.5 |  |
| Use Alpha | Boolean |  |  | false |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Reveal

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Phase | Range | 0 | 1 | 0.5 |  |
| X | Range | 1 | 80 | 8 |  |
| Y | Range | 1 | 80 | 8 |  |
| Border | Range | 0 | 20 | 3 |  |
| Texture | Choice |  |  | Full | Full, Color |
| Stretch | Boolean |  |  | false |  |
| Fade | Boolean |  |  | true |  |
| Scaling | Choice |  |  | Centre | None, Centre, Up, Right, Corner |
| Order | Choice |  |  | Random | Normal, Random |
| Seed | Choice |  |  | Normal | Normal, Audio |
| Black BG | Boolean |  |  | true |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Ripples

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Frequency H | Range | 0 | 1 | 0.2 |  |
| Amplitude H | Range | 0 | 1 | 0.5 |  |
| Frequency V | Range | 0 | 1 | 0.2 |  |
| Amplitude V | Range | 0 | 1 | 0.5 |  |
| Amplitude Both | Range | 0 | 1 | 1 |  |
| Phase | Range | 0 | 1 | 0 |  |
| Black BG | Boolean |  |  | false |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Saturation

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Saturation | Range | 0 | 1 | 0.5 |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## SearchLight

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Size | Range | 0 | 1 | 0.6 |  |
| Blur | Range | 0 | 1 | 0.5 |  |
| Frequency | Range | 0 | 2 | 0.77 |  |
| Invert | Boolean |  |  | false |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Shape Mask

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Shape | Choice |  |  | Square | Square, Circle, Triangle, Pentagon, Hexagon, Octagon, Hexagram |
| Feather | Range | 0 | 300 | 4 |  |
| Scale | Range | 0 | 200 | 60 | % |
| Rotation | Range | -180 | 180 | 0 | ° |
| Position X | Range | -2 | 2 | 0 |  |
| Position Y | Range | -2 | 2 | 0 |  |
| Invert | Boolean |  |  | false |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Shaper

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Scale | Range | 0.01 | 4 | 1 |  |
| Noise Type | Choice |  |  | Hatched | Grain, Hatched |
| Noise Amount | Range | -1 | 1 | 0 |  |
| Noise Speed | Range | 0 | 1 | 0.75 |  |
| Color | Color |  |  | #ffffffff |  |
| Outline | Range | 0 | 0.5 | 0.1 |  |
| Outline Color | Color |  |  | #1dd0ffff |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Sharpen

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Strength | Range | 0 | 1 | 0.5 |  |
| Distance | Range | 1 | 25 | 1 |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Shift Glitch

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Frequency | Range | 0 | 1 | 1 |  |
| Vertical | Range | 0 | 1 | 0 |  |
| Horizontal | Range | 0 | 1 | 0.5 |  |
| Size | Range | 0 | 1 | 0.5 |  |
| Black BG | Boolean |  |  | false |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Shift RGB

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Distance | Range | 0 | 1 | 1 |  |
| Mode | Choice |  |  | Shift X | Shift X, Shift Y, Rotate X, Rotate Y, Rotate Z, Zoom |
| R | Range | -1 | 1 | 0 |  |
| G | Range | -1 | 1 | 0 |  |
| B | Range | -1 | 1 | 0 |  |
| Black BG | Boolean |  |  | false |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Slice Delay

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Order | Choice |  |  | Original | Original, Size, Width, Height, X, Y, Name  |
| Scaling | Choice |  |  | Fill | None, Fit, Fill, Stretch |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Slice Transform

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Black BG | Boolean |  |  | false |  |
| Scaling | Choice |  |  | Fill | Fill, Fit, Stretch, Mask, Mask Invert |
| Scale | Range | 0 | 10 | 1 | % |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Slide

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| X | Range | 0 | 1 | 0 |  |
| Y | Range | 0 | 1 | 0 |  |
| Black BG | Boolean |  |  | false |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Snow

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Amount | Range | 0 | 1 | 0.75 |  |
| Speed | Range | 0 | 1 | 0.4 |  |
| Textured | Range | 0 | 1 | 0.05 |  |
| View Y | Range | 0 | 1 | 0.5 |  |
| View X | Range | 0 | 1 | 0.5 |  |
| Black BG | Boolean |  |  | false |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Snowy

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Size | Range | 1 | 2 | 1 |  |
| Speed | Range | 0.2 | 5 | 1 |  |
| Amount | Range | 1 | 200 | 10 |  |
| Spread | Range | 0.005 | 0.5 | 0.25 |  |
| Threshold | Range | 0.25 | 1 | 0.5 |  |
| Show Image | Boolean |  |  | true |  |
| Smart Edges | Boolean |  |  | true |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Solid Color

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Color | Color |  |  | #ff0000ff |  |
| Show Image | Boolean |  |  | false |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Sparkles

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Texture | Choice |  |  | Sparkle | Sparkle, Input |
| Spawn Mode | Choice |  |  | Auto | Auto, Manual |
| Size | Range | 1 | 2 | 1 |  |
| Color | Range | 0 | 0.999 | 0 |  |
| Speed | Range | 0.2 | 5 | 1 |  |
| Amount | Range | 1 | 2500 | 10 |  |
| Spread | Range | 0.005 | 0.5 | 0.25 |  |
| Threshold | Range | 64 | 255 | 128 |  |
| Move | Boolean |  |  | true |  |
| Show Image | Boolean |  |  | true |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Sphere

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Size | Range | 0 | 1 | 0.3 |  |
| Resolution | Range | 0 | 1 | 0.6 |  |
| Extrusion | Range | 0 | 1 | 0.1 |  |
| Invert | Boolean |  |  | false |  |
| NoisePhase | Range | 0 | 1 | 0 |  |
| NoiseType | Choice |  |  | Gradient | Gradient, Value, Fractal |
| ColorValue | Color |  |  | #ffffffff |  |
| ColorMode | Choice |  |  | Multiply | Add, Multiply, Interpolate |
| ColorContrast | Range | 1 | 10 | 1.5 |  |
| ThresholdValue | Range | 0 | 1 | 0.1 |  |
| ThresholdMode | Choice |  |  | Color | Color, Greyscale, Transparent |
| Zoom | Range | 0 | 1 | 0.5 |  |
| Rotation X | Range | -180 | 180 | 0 | ° |
| Rotation Y | Range | -180 | 180 | 0 | ° |
| Rotation Z | Range | -180 | 180 | 0 | ° |
| Black BG | Boolean |  |  | false |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Static

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Mode | Choice |  |  | Grayscale | Color, Grayscale, Two-tone |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Stingy Sphere

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Sphere size | Range | 0 | 1 | 0.5 |  |
| Extrusion | Range | 0 | 1 | 0.5 |  |
| FFT | Boolean |  |  | false |  |
| Input | Choice |  |  | Composition | Local, Composition, External |
| Fallback | Range | 100 | 2000 | 1000 |  |
| Gain | Range | -2 | 24 | 0 |  |
| Noise | Boolean |  |  | false |  |
| Noise Amount | Range | 0 | 1 | 0.5 |  |
| Light | Boolean |  |  | false |  |
| Light Flat | Boolean |  |  | false |  |
| Min Light | Range | 0 | 1 | 0.2 |  |
| Saturate | Boolean |  |  | false |  |
| Saturate Amount | Range | 0 | 1 | 0.2 |  |
| Wired | Boolean |  |  | false |  |
| Invert | Boolean |  |  | false |  |
| Zoom | Range | 0 | 1 | 0.5 |  |
| Resolution | Range | 0 | 1 | 1 |  |
| Rotate X | Range | -180 | 180 | 0 |  |
| Rotate Y | Range | -180 | 180 | 0 |  |
| Rotate Z | Range | -180 | 180 | 0 |  |
| Black BG | Boolean |  |  | false |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Stop Motion

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Frequency | Range | 0 | 1 | 0.5 |  |
| Frame Count | Range | 0 | 1 | 0 |  |
| Black BG | Boolean |  |  | false |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Stripper

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Number | Range | 0 | 1 | 0.1 |  |
| Mode | Range | 0 | 1 | 0 |  |
| Direction | Range | 0 | 1 | 0 |  |
| Direction Spread | Range | 0 | 1 | 0 |  |
| MovementType | Range | 0 | 1 | 0 |  |
| Speed | Range | 0 | 1 | 0 |  |
| SpeedSpread | Range | 0 | 1 | 0 |  |
| GlobalWidth | Range | 0 | 1 | 1 |  |
| MinWidth | Range | 0 | 1 | 0.1 |  |
| MaxWidth | Range | 0 | 1 | 0.4 |  |
| Feather | Range | 0 | 1 | 0 |  |
| Red | Range | 0 | 1 | 0 |  |
| Green | Range | 0 | 1 | 0 |  |
| Blue | Range | 0 | 1 | 0 |  |
| Alpha | Range | 0 | 1 | 1 |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Strobe

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Frequency | Range | 0 | 1 | 0.5 |  |
| Fade | Boolean |  |  | false |  |
| Color | Color |  |  | #ffffffff |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Strokes

Presets: Adamantium Claws, Arrow Cloud, Bubble Bath, Floating Oil, Product Placement, Starry Night

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Amount | Range | 1 | 5000 | 1024 |  |
| Edges Only | Boolean |  |  | false |  |
| Frequency Mode | Choice |  |  | Hz | Hz, BPM |
| Frequency | Range | 0 | 360 | 60 | Hz |
| Size Mode | Choice |  |  | Random | Random, Brightness |
| Size | Range | 0 | 1 | 0.2 |  |
| Variation | Range | 0 | 1 | 0.1 |  |
| Swirl | Range | 0 | 1 | 0.3 |  |
| Flow | Range | -1 | 1 | 0.25 |  |
| Feedback | Range | 0 | 1 | 0.5 |  |
| Reset | Event |  |  |  |  |
| Resource | File |  |  | Resource\Strokes_Brush.png |  |
| Rotation | Range | 0 | 1 | 0 |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Suckr

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Suck | Range | 0 | 1 | 0.5 |  |
| Black BG | Boolean |  |  | false |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Terrain

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Tilt | Range | 0 | 90 | 1 |  |
| Direction | Range | -180 | 180 | 0 |  |
| Position Y | Range | 0 | 35 | 8 |  |
| Height | Range | 0 | 23 | 15 |  |
| Wobble | Range | 0 | 0.02 | 0 |  |
| Speed | Range | -3 | 3 | 1 |  |
| Jagginess | Range | 0 | 1 | 0 |  |
| Attenuation | Range | 10 | 300 | 100 |  |
| Texture Rep | Range | 0 | 12 | 0 |  |
| Additive | Boolean |  |  | true |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Text Animator

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Text | Text |  |  | Resolume |  |
| Font | Choice |  |  | Arial | Alef, Alfa Slab One, Amiri, Amiri Quran, Anybody, Archivo Black, Arial, Azeret Mono, Bahnschrift, Black Ground, Bricolage Grotesque, Caladea, Calibri, Cambria, Cambria Math, Candara, Carlito, Comic Sans MS, Consolas, Constantia, Corbel, Courier New, Cratense, David CLM, David Libre, DejaVu Math TeX Gyre, DejaVu Sans, DejaVu Sans Mono, DejaVu Serif, EB Garamond, Ebrima, FD Carimboh, Frank Ruehl CLM, Frank Ruhl Hofshi, Franklin Gothic Medium, Gabriola, Gadugi, Gentium Basic, Gentium Book Basic, Georgia, Hanken Grotesk, HarmonyOS Sans SC, Impact, Ink Free, Instrument Sans, Javanese Text, JetBrains Mono, JetBrains Mono NL, Leelawadee UI, Liberation Mono, Liberation Sans, Liberation Sans Narrow, Liberation Serif, Linux Biolinum G, Linux Libertine Display G, Linux Libertine G, Lucida Console, Lucida Sans Unicode, MS Gothic, MS PGothic, MS UI Gothic, MV Boli, Malgun Gothic, Marlett, Michroma, Microsoft Himalaya, Microsoft JhengHei, Microsoft JhengHei UI, Microsoft New Tai Lue, Microsoft PhagsPa, Microsoft Sans Serif, Microsoft Tai Le, Microsoft YaHei, Microsoft YaHei UI, Microsoft Yi Baiti, MingLiU-ExtB, MingLiU_HKSCS-ExtB, MingLiU_MSCS-ExtB, Miriam CLM, Miriam Libre, Miriam Mono CLM, Mongolian Baiti, Myanmar Text, NSimSun, Nachlieli CLM, NanumGothic, Nirmala Text, Nirmala UI, Noto Kufi Arabic, Noto Naskh Arabic, Noto Sans, Noto Sans Arabic, Noto Sans Armenian, Noto Sans Georgian, Noto Sans Hebrew, Noto Sans Lao, Noto Sans Lisu, Noto Serif, Noto Serif Armenian, Noto Serif Georgian, Noto Serif Hebrew, Noto Serif Lao, Oferta do Dia, OpenSymbol, PMingLiU-ExtB, Palatino Linotype, Passion One, Radiant CG Bold ExtraCond, Reem Kufi, Rubik, Rustico - V2, Sans Serif Collection, Scheherazade, Segoe Fluent Icons, Segoe MDL2 Assets, Segoe Print, Segoe Script, Segoe UI, Segoe UI Emoji, Segoe UI Historic, Segoe UI Symbol, Segoe UI Variable, SimSun, SimSun-ExtB, SimSun-ExtG, Sitka, Source Han Sans JP, Sylfaen, Symbol, Tahoma, Times New Roman, Trebuchet MS, Verdana, Webdings, Wingdings, Xilosa, Yesteryear, Yu Gothic, Yu Gothic UI, ZWAdobeF, Zilla Slab |
| Style | Choice |  |  | Bold | Black, Bold, Bold Italic, Italic, Regular |
| Color | Color |  |  | #ffffffff |  |
| Size | Range | 0.5 | 10 | 1 |  |
| Alignment | Choice |  |  | Left | Left, Center, Right |
| AlignmentVertically | Choice |  |  | Center | Top, Center, Bottom |
| Position X | Range | -32768 | 32768 | 0 |  |
| Position Y | Range | -32768 | 32768 | 0 |  |
| Spacing X | Range | -20 | 200 | 0 | % |
| Spacing Y | Range | -100 | 200 | 0 | % |
| Outline Color | Color |  |  | #ff0000ff |  |
| Outline Width | Range | 0 | 1 | 0 | % |
| Glow In | Range | 0 | 1 | 0 | % |
| Glow Out | Range | 0 | 1 | 0 | % |
| Animated | Boolean |  |  | false |  |
| Range | Choice |  |  | Characters | All, Lines, Words, Characters |
| Order | Choice |  |  | Front to back | Front to back, Back to front, Random |
| Delay | Range | 0 | 2000 | 100 | ms |
| Scale | Range | 0 | 10 | 1 | % |
| Animated Position X | Range | -32768 | 32768 | 0 |  |
| Animated Position Y | Range | -32768 | 32768 | 0 |  |
| Rotation | Range | -3.1416 | 3.1416 | 0 | ° |
| Anchor X | Range | -32768 | 32768 | 0 |  |
| Anchor Y | Range | -32768 | 32768 | 0 |  |
| Animated Outline Width | Range | 0 | 1 | 0 | % |
| Animated Glow In | Range | 0 | 1 | 0 | % |
| Animated Glow Out | Range | 0 | 1 | 0 | % |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Text Block

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Text | Text |  |  | Resolume |  |
| Font | Choice |  |  | Arial | Alef, Alfa Slab One, Amiri, Amiri Quran, Anybody, Archivo Black, Arial, Azeret Mono, Bahnschrift, Black Ground, Bricolage Grotesque, Caladea, Calibri, Cambria, Cambria Math, Candara, Carlito, Comic Sans MS, Consolas, Constantia, Corbel, Courier New, Cratense, David CLM, David Libre, DejaVu Math TeX Gyre, DejaVu Sans, DejaVu Sans Mono, DejaVu Serif, EB Garamond, Ebrima, FD Carimboh, Frank Ruehl CLM, Frank Ruhl Hofshi, Franklin Gothic Medium, Gabriola, Gadugi, Gentium Basic, Gentium Book Basic, Georgia, Hanken Grotesk, HarmonyOS Sans SC, Impact, Ink Free, Instrument Sans, Javanese Text, JetBrains Mono, JetBrains Mono NL, Leelawadee UI, Liberation Mono, Liberation Sans, Liberation Sans Narrow, Liberation Serif, Linux Biolinum G, Linux Libertine Display G, Linux Libertine G, Lucida Console, Lucida Sans Unicode, MS Gothic, MS PGothic, MS UI Gothic, MV Boli, Malgun Gothic, Marlett, Michroma, Microsoft Himalaya, Microsoft JhengHei, Microsoft JhengHei UI, Microsoft New Tai Lue, Microsoft PhagsPa, Microsoft Sans Serif, Microsoft Tai Le, Microsoft YaHei, Microsoft YaHei UI, Microsoft Yi Baiti, MingLiU-ExtB, MingLiU_HKSCS-ExtB, MingLiU_MSCS-ExtB, Miriam CLM, Miriam Libre, Miriam Mono CLM, Mongolian Baiti, Myanmar Text, NSimSun, Nachlieli CLM, NanumGothic, Nirmala Text, Nirmala UI, Noto Kufi Arabic, Noto Naskh Arabic, Noto Sans, Noto Sans Arabic, Noto Sans Armenian, Noto Sans Georgian, Noto Sans Hebrew, Noto Sans Lao, Noto Sans Lisu, Noto Serif, Noto Serif Armenian, Noto Serif Georgian, Noto Serif Hebrew, Noto Serif Lao, Oferta do Dia, OpenSymbol, PMingLiU-ExtB, Palatino Linotype, Passion One, Radiant CG Bold ExtraCond, Reem Kufi, Rubik, Rustico - V2, Sans Serif Collection, Scheherazade, Segoe Fluent Icons, Segoe MDL2 Assets, Segoe Print, Segoe Script, Segoe UI, Segoe UI Emoji, Segoe UI Historic, Segoe UI Symbol, Segoe UI Variable, SimSun, SimSun-ExtB, SimSun-ExtG, Sitka, Source Han Sans JP, Sylfaen, Symbol, Tahoma, Times New Roman, Trebuchet MS, Verdana, Webdings, Wingdings, Xilosa, Yesteryear, Yu Gothic, Yu Gothic UI, ZWAdobeF, Zilla Slab |
| Style | Choice |  |  | Bold | Black, Bold, Bold Italic, Italic, Regular |
| Color | Color |  |  | #ffffffff |  |
| Size | Range | 0.5 | 10 | 1 |  |
| Alignment | Choice |  |  | Center | Left, Center, Right |
| AlignmentVertically | Choice |  |  | Center | Top, Center, Bottom |
| Line Width | Range | 10 | 32768 | 1920 |  |
| Position X | Range | -32768 | 32768 | 0 |  |
| Position Y | Range | -32768 | 32768 | 0 |  |
| Rotation | Range | -3.1416 | 3.1416 | 0 | ° |
| Scale | Range | 0 | 10 | 1 | % |
| Spacing X | Range | -20 | 200 | 0 | % |
| Spacing Y | Range | -100 | 200 | 0 | % |
| Outline Color | Color |  |  | #ff0000ff |  |
| Outline Width | Range | 0 | 1 | 0 | % |
| Glow In | Range | 0 | 1 | 0 | % |
| Glow Out | Range | 0 | 1 | 0 | % |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Threshold

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Threshold | Range | 0 | 1 | 0.5 |  |
| Smoothness | Range | 0 | 1 | 0 |  |
| Color 1 | Color |  |  | #ffffffff |  |
| Color 2 | Color |  |  | #000000ff |  |
| Alpha | Choice |  |  | Original | Original, Combine, Replace |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Tile

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Tile X | Range | 0 | 1 | 0.1 |  |
| Tile Y | Range | 0 | 1 | 0.1 |  |
| Skew X | Range | 0 | 1 | 0.5 |  |
| Skew Y | Range | 0 | 1 | 0.5 |  |
| Rotation Angle | Range | 0 | 1 | 0 |  |
| Black BG | Boolean |  |  | false |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Tilt Shift

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Blur | Range | 0 | 1 | 0.9 |  |
| Position | Range | 0 | 1 | 0.5 |  |
| Focus | Range | 0 | 1 | 0.4 |  |
| Falloff | Range | 0 | 1 | 1 |  |
| Saturation | Range | 0 | 1 | 0.7 |  |
| Vignette | Range | 0 | 1 | 0.5 |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Tint

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Black To | Color |  |  | #ff0000ff |  |
| White To | Color |  |  | #ccff00ff |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Trails

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Feedback | Range | 0 | 1 | 0.9 |  |
| Mode | Choice |  |  | Alpha | Alpha, Luma, Lighten |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Transform

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Position X | Range | -32768 | 32768 | 0 |  |
| Position Y | Range | -32768 | 32768 | 0 |  |
| Scale | Range | 0 | 1000 | 100 | % |
| Scale W | Range | 0 | 1000 | 100 | % |
| Scale H | Range | 0 | 1000 | 100 | % |
| Rotation X | Range | -180 | 180 | 0 | ° |
| Rotation Y | Range | -180 | 180 | 0 | ° |
| Rotation Z | Range | -180 | 180 | 0 | ° |
| Anchor X | Range | -16384 | 16384 | 0 |  |
| Anchor Y | Range | -16384 | 16384 | 0 |  |
| Anchor Z | Range | -16384 | 16384 | 0 |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Triangulate

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Scale | Range | 0 | 1 | 0.125 |  |
| Levels | Range | 1 | 10 | 4 |  |
| Flip Direction | Boolean |  |  | true |  |
| Threshold | Range | 0 | 1 | 0 |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Tunnel

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Position | Range | 0 | 1 | 0 |  |
| Speed | Range | 0 | 1 | 0.5 |  |
| Twist | Range | 0 | 1 | 0.5 |  |
| Kaleidoscope | Range | 0 | 1 | 0 |  |
| Rotation | Range | 0 | 1 | 0.5 |  |
| TurnH | Range | 0 | 1 | 0.5 |  |
| TurnV | Range | 0 | 1 | 0.5 |  |
| WobbleH | Range | 0 | 1 | 0 |  |
| WobbleV | Range | 0 | 1 | 0 |  |
| Black BG | Boolean |  |  | false |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Twisted

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Twirl | Range | 0 | 1 | 0.6 |  |
| Radius | Range | 0 | 1 | 0.25 |  |
| Black BG | Boolean |  |  | false |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Twitch

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Global Twitch | Range | 0 | 1 | 1 |  |
| Max Pos X | Range | 0 | 1 | 0 |  |
| Max Pos Y | Range | 0 | 1 | 0 |  |
| Pos Frequency | Range | 0 | 1 | 0 |  |
| Max Scale | Range | 0 | 1 | 0 |  |
| Scale Frequency | Range | 0 | 1 | 0 |  |
| Max Opacity | Range | 0 | 1 | 0 |  |
| Opacity Frequency | Range | 0 | 1 | 0 |  |
| Max Light | Range | 0 | 1 | 0 |  |
| Light Frequency | Range | 0 | 1 | 0 |  |
| Max RGB Shift | Range | 0 | 1 | 0 |  |
| RGB Frequency | Range | 0 | 1 | 0 |  |
| Max Blur | Range | 0 | 1 | 0 |  |
| Blur Frequency | Range | 0 | 1 | 0 |  |
| Black BG | Boolean |  |  | false |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## UV Map

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Image | File |  |  |  |  |
| Flip U | Boolean |  |  | false |  |
| Flip V | Boolean |  |  | false |  |
| Offset X | Range | 0 | 1 | 0 |  |
| Offset Y | Range | 0 | 1 | 0 |  |
| Filter Strength | Range | 0 | 1 | 0.25 |  |
| Filter Color | Color |  |  | #00000000 |  |
| Black Is Transparent | Boolean |  |  | false |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Vibrance

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Vibrance | Range | -1 | 1 | 0 |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## VideoWall

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Screens | Range | 0 | 1 | 0.3 |  |
| Zoom | Range | 0 | 1 | 0.3 |  |
| RotateX | Range | 0 | 1 | 0.5 |  |
| RotateY | Range | 0 | 1 | 0.5 |  |
| RotateZ | Range | 0 | 1 | 0.5 |  |
| PanX | Range | 0 | 1 | 0.5 |  |
| PanY | Range | 0 | 1 | 0.5 |  |
| SubscreenSize | Range | 0 | 1 | 0 |  |
| SubscreenMode | Range | 0 | 1 | 0 |  |
| GapSize | Range | 0 | 1 | 0 |  |
| BrightnessVary | Range | 0 | 1 | 0 |  |
| Black BG | Boolean |  |  | false |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Vignette

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Roundness | Range | 0 | 1 | 0.3 |  |
| Size | Range | 0 | 1 | 0 |  |
| Softness | Range | 0 | 1 | 0.96 |  |
| Black BG | Boolean |  |  | false |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## WarpSpeed

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Vignette | Range | 0 | 1 | 0.2 |  |
| Fade | Range | 0 | 1 | 0.5 |  |
| Scale | Range | 0 | 1 | 0.5 |  |
| Rotate | Range | -1 | 1 | 0 |  |
| Center X | Range | -1 | 1 | 0 |  |
| Center Y | Range | -1 | 1 | 0 |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |

## Wave Warp

| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |
|---|---|---|---|---|---|
| Opacity | Range | 0 | 1 | 1 | % |
| Mode | Range | 0 | 1 | 0 |  |
| Height | Range | 0 | 1 | 0.2 |  |
| Width | Range | 0 | 1 | 0.2 |  |
| Angle | Range | 0 | 1 | 1 |  |
| Speed | Range | 0 | 1 | 0.5 |  |
| Pin edges? | Boolean |  |  | true |  |
| Black BG | Boolean |  |  | false |  |
| Blend Mode (mistura) | Choice |  |  | Alpha | Add, Alpha, B&W, Burn, Cube, Cut, Darken, Depth, Difference, Difference I, Displace, Dissolve, Dodge, Exclusion, Hard Light, JitterBug, Lighten, LoRez, Luma Is Alpha, Luma Key, Luma Key I, Meta Mix, Multiply, Multi Task, Noisy, Overlay, Parts, PiP, Push Down, Push Left, Push Right, Push Up, RGB, Rotate X, Rotate Y, Screen, Shift RGB, Side by Side, Soft Light, Static, Subtract, Tile, TimeSwitcher, to Black, to Color, to White, Twitch, Video Bumper, Wipe Ellipse, Zoom In, Zoom Out |
