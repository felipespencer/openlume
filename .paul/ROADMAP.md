---
description: "OpenLume — milestone and phase structure"
type: Roadmap
about: "OpenLume"
---

# Roadmap: OpenLume

## Overview

O OpenLume já nasceu com o grosso do Resolume feito (release 0.1.0 para Windows em 2026-10-15).
Este roadmap começa daí: o próximo marco leva o programa do "funciona no PC do Felipe" ao
"mapeia sozinho, está provado no equipamento real e sai nas três versões". O `ROADMAP.md` da
raiz continua sendo a lista detalhada do que veio do Resolume e do que está feito.

## Current Milestone

**v0.2 Automape e provas no equipamento** (v0.2.0)
Status: In progress
Phases: 0 of 7 complete

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with [INSERTED])

| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 1 | Automape | 5 | In progress (3/5) | - |
| 2 | Efeitos do Resolume | TBD | In progress (1 fechado) | - |
| 3 | Celular e plugins | TBD | Not started | - |
| 4 | Provas no equipamento (laser e APC40) | TBD | Not started | - |
| 5 | Versão web | TBD | Not started | - |
| 6 | Versão Android | TBD | Not started | - |
| 7 | Saída avançada | TBD | Planning (executada agora, fora da ordem, a pedido do Felipe) | - |

## Phase Details

### Phase 1: Automape

**Goal:** mapear sozinho a partir de uma foto tirada da posição da lente do projetor: o
programa avisa de onde tirar a foto, recebe a foto, fatia a imagem em slices e abre uma caixa
de diálogo junto de Saída › Avançada para a pessoa conferir e aplicar.
**Depends on:** Nothing (Saída avançada já existe)
**Research:** Likely (como detectar as superfícies na foto no navegador: contornos/polígonos
sem biblioteca pesada vs. modelo ONNX; como alinhar a foto ao quadro do projetor)

**Scope:**
- Maquete HTML do fluxo (aviso → foto → diálogo) para aprovação, antes de construir
- Detecção das regiões/superfícies na foto e conversão em slices (entrada + forma de saída)
- Diálogo do Automape integrado à Saída avançada, com ajuste manual depois
- Teste automático e verificação por CDP

**Plans:**
- [x] 01-01: maquete `automape-mockup.html` com o fatiamento da foto funcionando; aprovação do Felipe
- [x] 01-02: REC vira clipe (botão REC na barra; a gravação entra na grade) — pedido de 2026-10-22, feito antes do Automape no programa
- [x] 01-03: `app/automape.js` + Saída › Automape… + botão na Saída avançada + malha projetada + editor + máscaras e slices de verdade; selftest e verificação por CDP
- [ ] 01-04: IA em fotos novas (SAM local em ONNX ou Claude) e MCP do OpenLume (servidor MCP exposto pelo programa: ler foto, criar slices/máscaras, mexer na composição) para o Claude e outros agentes operarem o programa; o Automape vira uma ferramenta dele (pedido de 2026-10-21, a confirmar)
- [ ] 01-05: IA de profundidade na foto (modelo monocular em ONNX, como o "tirar o fundo"): separar superfícies por profundidade e prévia 3D do mapeamento (pedido de 2026-10-21, a confirmar)

### Phase 2: Efeitos do Resolume

**Goal:** todos os efeitos, fontes e mixers do Resolume no OpenLume, iguais por fora (mesmo
nome, mesmos controles, mesmas faixas, mesmos presets) e iguais na tela, conferidos lado a lado
com o Resolume com os mesmos valores. Pedido de 2026-10-25 ("não quero efeitos próprios, quero
copiar"): copiar o COMPORTAMENTO, escrevendo cada efeito do zero; nada de shader, patch `.wired`
ou código tirado do Resolume (repo público GPL; risco de remoção do repositório).
**Depends on:** Phase 1 (ordem de prioridade do Felipe: antes de "Celular e plugins")
**Research:** Likely (como capturar o Resolume e o OpenLume com os mesmos valores e comparar a
imagem automaticamente; licença de cada modelo de `ai-models/` antes de embarcar)

**Scope:**
- Situação em 2026-10-25: `app/effects.js` + `effects2.js` já têm, por nome, quase toda a lista de efeitos de fábrica do catálogo (falta Text Animator); o trabalho é deixar cada um IGUAL na tela e nos controles, e trazer os 23 do Wire (só Background Removal existe)
- Ferramenta de comparação lado a lado (mesma imagem de entrada, mesmos valores, diferença por pixel)
- Efeitos de fábrica igualados em lotes. **1º lote, escolhido pelo Felipe: Delay RGB, Trails, Threshold**, completado com os mais usados do Resolume
- Os 23 do Wire (CRT, Strokes, Tilt Shift, Grid Cloner, Depth…) refeitos pelo resultado e pelos controles, não nó por nó
- Modelos públicos de `ai-models/` (Depth Anything, MiDaS, MODNet, PP-HumanSeg), conferida a licença, para Background Removal e efeitos de profundidade
- Ficha e controles no modelo do Wire: tipo (fonte/efeito/mixer), nome, autor, descrição, identificador, controles em ordem e grupos com mínimo/máximo/unidade/tipo de controle, presets

**Plans:**
- [x] 02-01: bancada lado a lado (REST do Resolume + CDP do OpenLume + captura + diferença por pixel), fichas de controles pela API, e o 1º lote igualado: Delay RGB, Trails, Threshold — fechado em 2026-10-30; de quebra Background Removal, Shape Mask, YouTube e celular (SUMMARY)
- [ ] 02-02 em diante: lotes dos mais usados (lista a combinar), Wire (CRT, Strokes, Tilt Shift, Grid Cloner…), profundidade

### Phase 3: Celular e plugins

**Goal:** o celular vira controle do OpenLume pela rede (QR code, nada para instalar) com quatro
modos — Desenhar, Toque, Pads e Controle —, em pé e deitado; o desenho do celular é um clipe;
o OpenLume ganha um sistema de plugins (pasta com `plugin.js`: fonte ou efeito, parâmetros,
toque) e os primeiros quatro plugins são de física em tempo real: Fluido (fogo, fumaça, tinta),
Partículas, Rastro neon e Bolinhas. Pedido de 2026-10-25, a partir de um reel de plugin de
física para o Resolume controlado pelo celular.
**Depends on:** Phase 2 (ordem de prioridade do Felipe: depois do Automape e dos efeitos do Resolume)
**Research:** Likely (servidor no Electron para o celular: WebSocket na rede local e descoberta
por QR; como carregar plugins de uma pasta com segurança; simulação de fluido em WebGL2 dentro do
`engine.js`; na versão web só o mouse, no Android o toque direto na tela)

**Scope:**
- Maquete aprovada antes de construir (feita em 2026-10-25: `plugins-celular-mockup.html`)
- Sistema de plugins: pasta `Documentos/OpenLume/plugins`, plugin aparece em Fontes/Efeitos, controles no painel Clipe e no celular, ligáveis a MIDI/som/Autopilot
- Celular: página servida pelo programa, QR code em "Conectar celular…", vários celulares e vários dedos
- Modos do celular: Desenhar (cores, espessura, borracha, some aos poucos, novo, limpar), Toque (dedo vira mão no plugin no ar; Explosão, Limpar, Auto), Pads (só os clipes, grandes, uma camada por vez, disparo do começo), Controle (master, opacidade por camada, parâmetros do que está no ar)
- Clipe de desenho: guarda os traços com o tempo; disparar refaz o desenho no ritmo em que foi feito
- Os quatro plugins de física
- Teste automático e verificação com eventos reais por CDP

**Plans:**
- [ ] 03-01: maquete `plugins-celular-mockup.html` (feita, falta aprovação do Felipe)
- [ ] 03-02+: a definir em /paul:plan (sistema de plugins; abrir plugins FFGL de terceiros na versão Windows, com teste de desempenho antes; celular pela rede; plugins de física; clipe de desenho)

### Phase 4: Provas no equipamento (laser e APC40)

**Goal:** confirmar no LaserCube real o atraso de cor e os 45 Hz, o mapeamento por âncoras, e
provar a APC40 mkII com a controladora (cores dos pads, SysEx, anéis dos knobs).
**Depends on:** Phase 1 (nada técnico; só ordem de prioridade do Felipe)
**Research:** Unlikely (tudo já implementado; falta a mão dele no aparelho)

**Plans:**
- [ ] 04-01: a definir

### Phase 5: Versão web

**Goal:** o `app/` servido por http abrindo como produto, sem o que depende do Electron, com
o que der para fazer no navegador (File System Access, janela de saída por `window.open`).
**Depends on:** Phase 1
**Research:** Likely (o que substitui `window.projDesktop` no navegador)

**Plans:**
- [ ] 05-01: a definir

### Phase 6: Versão Android

**Goal:** casca Kotlin (reaproveitada de `PROJECIONISTAapp/shell`) rodando o mesmo `app/`,
com `OutputPresentation` para o projetor.
**Depends on:** Phase 5
**Research:** Likely (WebView: WebGL2, WebCodecs, UDP para o laser)

**Plans:**
- [ ] 06-01: a definir

### Phase 7: Saída avançada

**Goal:** a Saída avançada do OpenLume vai além do Resolume onde o Felipe pede: emendas (soft edge) como
degradês com alça puxados na própria imagem, quatro por slice, seleção sem surpresa na sobreposição, e o
que mais surgir dos testes dele com projetores de verdade.
**Depends on:** nada (executada em 2026-10-30, fora da ordem das fases, porque os pedidos vieram
durante o checkpoint do 02-01; registrada como fase própria em 2026-10-30 — "não quero me perder")
**Research:** Unlikely

**Scope:**
- Já entregue em betas (a registrar no 07-01): emenda só no trecho da sobreposição; degradê com alça
  (A inteiro → B zero, faixa, cantos redondos do lado da projeção); quatro emendas por slice com
  liga/desliga; automático só posiciona; seleção: o selecionado por cima, clique alterna com o de trás
- A fazer: alças também na aba Saída (acompanhando a deformação), e os próximos pedidos do Felipe

**Plans:**
- [ ] 07-01: Soft Edge por degradê e seleção na sobreposição (registro do entregue + alças na aba Saída)

## Ideias para um marco futuro

- **Domo / planetário com vários projetores** (pedido de 2026-10-29, "quero deixar esse passo pra depois"):
  3 a 6 projetores na borda do domo, sem lente olho de peixe. Três pedaços: (1) conteúdo em domemaster
  (render das camadas numa esfera + conversor de 360° equirretangular); (2) malha de deformação esférica por
  projetor na Saída avançada (a homografia atual só serve para parede plana), calibrada por foto como no
  Automape; (3) soft-edge nas sobreposições. O Resolume não faz domo sozinho (usa Blendy Dome, VIOSO); seria
  recurso só nosso, como o Automape. Entra como fase quando ele pedir.

---
*Roadmap created: 2026-10-21*
*Last updated: 2026-10-30 (02-01 fechado; Fase 7 Saída avançada acrescentada); 2026-10-29 (ideia do domo/planetário anotada para depois); 2026-10-25 (inseridas depois do Automape: Fase 2 "Efeitos do Resolume" e Fase 3 "Celular e plugins"; as seguintes renumeradas)*
