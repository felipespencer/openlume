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
Phases: 0 of 4 complete

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with [INSERTED])

| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 1 | Automape | 5 | In progress (3/5) | - |
| 2 | Provas no equipamento (laser e APC40) | TBD | Not started | - |
| 3 | Versão web | TBD | Not started | - |
| 4 | Versão Android | TBD | Not started | - |

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

### Phase 2: Provas no equipamento (laser e APC40)

**Goal:** confirmar no LaserCube real o atraso de cor e os 45 Hz, o mapeamento por âncoras, e
provar a APC40 mkII com a controladora (cores dos pads, SysEx, anéis dos knobs).
**Depends on:** Phase 1 (nada técnico; só ordem de prioridade do Felipe)
**Research:** Unlikely (tudo já implementado; falta a mão dele no aparelho)

**Plans:**
- [ ] 02-01: a definir

### Phase 3: Versão web

**Goal:** o `app/` servido por http abrindo como produto, sem o que depende do Electron, com
o que der para fazer no navegador (File System Access, janela de saída por `window.open`).
**Depends on:** Phase 1
**Research:** Likely (o que substitui `window.projDesktop` no navegador)

**Plans:**
- [ ] 03-01: a definir

### Phase 4: Versão Android

**Goal:** casca Kotlin (reaproveitada de `PROJECIONISTAapp/shell`) rodando o mesmo `app/`,
com `OutputPresentation` para o projetor.
**Depends on:** Phase 3
**Research:** Likely (WebView: WebGL2, WebCodecs, UDP para o laser)

**Plans:**
- [ ] 04-01: a definir

---
*Roadmap created: 2026-10-21*
*Last updated: 2026-10-22 (01-02 e 01-03 fechados)*
