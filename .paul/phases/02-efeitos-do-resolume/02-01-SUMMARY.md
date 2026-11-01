---
phase: 02-efeitos-do-resolume
plan: 01
subsystem: effects
tags: [resolume, rest-api, spout, cdp, glsl, bancada, threshold, trails, delay-rgb, background-removal, onnxruntime, directml, soft-edge]

# Dependency graph
requires:
  - phase: 01-automape
    provides: motor de efeitos (effects.js/effects2.js), Saída avançada, tools/drive.mjs (CDP)
provides:
  - Bancada lado a lado Resolume × OpenLume (tools/compare): REST do Resolume + CDP do OpenLume + captura Spout + diferença por pixel
  - Fichas de controles de todos os efeitos de vídeo do Resolume (referencia-resolume/FICHAS.md)
  - Delay RGB, Trails e Threshold iguais ao Resolume nos controles e na tela
  - Fora do plano: Background Removal nativo (onnxruntime-node + DirectML, modelos do Resolume), Shape Mask, fontes YouTube e Celular, Soft Edge por degradê com alça
affects: [02-02 e lotes seguintes, 03-celular-e-plugins (o celular como fonte já entrou), Saída avançada]

# Tech tracking
tech-stack:
  added: [onnxruntime-node 1.31.1 (DirectML), onnxruntime-web 1.31.1 (reserva WebGPU), selfsigned, modelos PP-HumanSeg / MODNet-HRNet (Apache 2.0) / RVM (GPL-3)]
  patterns: [medir no Resolume com sondas antes de escrever; efeitos de tempo copiados por quadro renderizado; processo utilityProcess para IA com MessagePort por cópia; suítes de teste com mouse e teclado reais pelo CDP]

key-files:
  created: [tools/compare/resolume.mjs, tools/compare/capture.py, tools/compare/compare.mjs, tools/compare/README.md, referencia-resolume/FICHAS.md, app/seg-native.js, app/segment-worker.js, app/yt.html, app/celular.html, tools/ao-check.mjs, tools/ui-check.mjs, tools/soft-check.mjs, soft-edge-degrade-mockup.html]
  modified: [app/effects.js, app/effects2.js, app/engine.js, app/screens.js, app/ao.js, app/segment.js, app/clips.js, app/browser.js, app/app.js, main.js, app/preload.js, package.json]

key-decisions:
  - "Efeitos de tempo são copiados por quadro renderizado (o Resolume rende a ~30 fps nesta máquina)"
  - "Cores de efeito ganham alfa (#rrggbbaa) como no Resolume; o shader de camada só premultiplica textura de elemento"
  - "Background Removal: os mesmos modelos do Resolume (MODNet-HRNet) rodando nativos no DirectML; WebGPU só de reserva"
  - "Soft edge é um degradê com alça na imagem (ideia do Felipe); o Resolume não tem isso, é recurso nosso"
  - "Nada de shader, .wired ou código do Resolume no repositório"

patterns-established:
  - "Bancada: `node tools/compare/compare.mjs \"<Efeito>\" --r \"<controle>=<valor>\"` compara Resolume | OpenLume | diferença e dá a média por pixel"
  - "Efeito novo guarda `rname`/`rparams` para a bancada achar o par no Resolume"
  - "Cada recurso de interface ganha verificação por CDP com eventos reais (ao/ui/undo/automape/soft-check)"

# Metrics
duration: 5 dias de calendário (2026-10-25 → 2026-10-30), com o checkpoint aberto por 4 dias de betas
started: 2026-10-25T17:00:00-03:00
completed: 2026-10-30T16:40:00-03:00
description: "Bancada Resolume × OpenLume e lote 1 (Threshold, Trails, Delay RGB) iguais por quadro; de quebra Background Removal nativo com os modelos do Resolume, Shape Mask, YouTube e celular como fontes, e Soft Edge por degradê"
type: Summary
about: "OpenLume"
---

# Phase 2 Plan 01: Bancada e lote 1 dos efeitos do Resolume — Summary

**Bancada lado a lado (REST + CDP + Spout + diferença por pixel) funcionando, fichas de todos os efeitos, e Threshold, Trails e Delay RGB iguais ao Resolume por quadro (≤ 3/255 no Threshold; Trails e Delay RGB batem quadro a quadro). O checkpoint ficou aberto quatro dias de betas (v0.2.0-beta.1 → beta.22) e, nesse tempo, entraram fora do plano: Background Removal nativo com os modelos do Resolume, Shape Mask, YouTube e celular como fontes e o Soft Edge por degradê com alça.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | 2026-10-25 (plano) → 2026-10-30 (fechamento); trabalho do plano em si: 1 dia |
| Started | 2026-10-25T17:00:00-03:00 |
| Completed | 2026-10-30T16:40:00-03:00 |
| Tasks | 3 de 3 + 1 checkpoint (fechado por uso: Felipe usou as betas 1 a 22 sem reclamar do lote 1) |
| Files modified | ~25 no app, 8 em tools/, 1 em referencia-resolume/ |
| Releases | v0.2.0-beta.1 … beta.22 (pré-lançamentos no GitHub, MSI) |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Ficha de controles vinda do Resolume | Pass | `resolume.mjs fichas` gera `effects-rest.json` (fora do git) e `FICHAS.md` (1557 linhas, um efeito por seção, atualizado para o 7.28) |
| AC-2: Bancada lado a lado | Pass | REST 8080 + CDP 9333 + Spout (`capture.py`); PNG Resolume \| OpenLume \| diferença a 960×540; recusa captura preta/repetida (captura duas vezes por causa da marca d'água do demo) |
| AC-3: Os três efeitos iguais nos controles | Pass | Controles, ordem, faixas, padrões e listas da ficha; rótulos em português; `rname`/`rparams` no efeito |
| AC-4: Os três efeitos iguais na tela | Pass | Threshold: média 0–3/255 em 5 casos (máximo alto só na borda do limiar, 1 px). Trails e Delay RGB: comparados por quadro renderizado, batem (tabelas em `tools/compare/saida/lote-01/RELATORIO.md`) |
| AC-5: Sem código do Resolume | Pass | Nada dos shaders extraídos nem dos `.wired` nos arquivos; o Background Removal foi refeito pelo que o patch do Wire DESCREVE (comentários), não pelos nós |

## Accomplishments

- Bancada reaproveitável: já serviu ao Shape Mask (0,01/255 em 16 casos), ao Background Removal (2/255 no quadro do ombro) e ao começo do Tilt Shift.
- Lote 1 igual por quadro: Threshold (limiar pelo brilho Rec. 709, suavidade por smoothstep, modos de alfa conferidos pelo canal A do Spout), Trails (Alpha/Luma/Lighten, um passo por quadro), Delay RGB (fila de quadros renderizados, 1,0 = 40 quadros).
- Fora do plano, por pedido do Felipe durante o checkpoint: Background Removal igual ao do Resolume 7.28 (processo nativo onnxruntime-node + DirectML, MODNet-HRNet 480²/640², PP-HumanSeg 192, limpeza na ordem do Resolume, suavidade no tempo sem rastro), Shape Mask, fonte YouTube (URL), celular como fonte (WebRTC na rede local), Transport no formato do Resolume, fonte Captura, misturas "Principais" + Chroma Key, modo de mistura na faixa da camada, Test Card na saída, Soft Edge por degradê com alça (quatro por slice), seleção na sobreposição.

## Task Commits

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| Task 0: servidor web do Resolume | — | checkpoint | Felipe ligou (REST em 127.0.0.1:8080) |
| Task 1: bancada + fichas | `c69ddd5` | feat | tools/compare (resolume.mjs, capture.py, compare.mjs, README), clipes de teste, FICHAS.md |
| Task 2: lote 1 | `6ff04d8` | feat | Threshold, Trails e Delay RGB iguais por quadro; cor com alfa; shader de camada premultiplicava duas vezes |
| Checkpoint (betas 1–22) | `15cc3a5` … `c88a6e0` | feat/fix | 60 commits de pedidos no meio (ver Deviations) |

Plan metadata: `7460334` (estado do checkpoint), `b1ca2d2`, `57d3c6a` e os "STATE: beta.N" (docs).

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `tools/compare/resolume.mjs` | Created | Cliente REST do Resolume: `fichas`, `abrir`, `efeito`, `valor`, `limpar` |
| `tools/compare/capture.py` | Created | Captura da saída do Resolume pelo Spout (a GDI mente em janela de vídeo) |
| `tools/compare/compare.mjs` | Created | Junta tudo e gera PNG + diferença média por pixel |
| `tools/compare/README.md` | Created | Como usar, armadilhas da máquina, o que foi medido |
| `referencia-resolume/FICHAS.md` | Created | Ficha de controles de todos os efeitos de vídeo (texto nosso) |
| `app/effects.js`, `app/effects2.js` | Modified | Threshold, Trails, Delay RGB refeitos; Shape Mask; Background Removal; `rname`/`rparams` |
| `app/engine.js` | Modified | Fila de quadros (Delay RGB), premultiplicação (`uPre`), shader do slice com degradês de emenda |
| `app/seg-native.js`, `app/segment-worker.js`, `app/segment.js` | Created/Modified | Background Removal nativo (DirectML) e reserva WebGPU |
| `app/screens.js`, `app/ao.js`, `app/style.css` | Modified | Soft Edge por degradê (softGrads/adoptGrad), alças, quatro emendas, seleção na sobreposição |
| `app/yt.html`, `app/celular.html`, `main.js`, `app/preload.js`, `app/clips.js`, `app/browser.js`, `app/app.js` | Created/Modified | Fontes YouTube e Celular, Transport, Captura, Test Card, misturas |
| `tools/ao-check.mjs`, `tools/ui-check.mjs`, `tools/soft-check.mjs` | Created | Suítes por CDP com eventos reais (18 + 14 + 26 verificações) |
| `soft-edge-degrade-mockup.html` | Created | Maquete aprovada do degradê com alça |
| `package.json` | Modified | onnxruntime-node, selfsigned, filtros do instalador; versão 0.2.0-beta.22 |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Efeitos de tempo copiados por quadro renderizado | O Resolume rende a ~30 fps nesta máquina e o OpenLume a 60; comparar por tempo dava números falsos | Vale para todos os lotes: medir por quadro |
| Cor de efeito com alfa (`COLOR(..., true)`) | O Threshold do Resolume tem cor com alfa e modos de alfa | Painel ganhou controle de alfa; shader de camada premultiplica só textura de elemento |
| Background Removal nativo (utilityProcess + onnxruntime-node/DirectML) com os modelos do Resolume | WebGPU do onnxruntime-web é 5–15× mais lento e calcula errado ceil_mode/Conv ímpar; o Resolume usa MODNet-HRNet | Instalador leva só os binários win32/x64; Média ≈ Medium do Resolume (2/255) |
| Soft Edge vira degradê com alça; quatro por slice; o automático só posiciona | Ideia do Felipe ("gradiente do Illustrator puxado na imagem"); resolve a quina e o projetor em pé | Recurso nosso, fora do "copiar o Resolume"; alças só na aba Entrada por enquanto |
| Checkpoint fechado por uso | Felipe usou 22 betas e pediu só coisas novas; nunca apontou erro no lote 1 | O "aprovado" formal fica subentendido; registrado aqui |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 3 | Correções essenciais achadas pela bancada (premultiplicação dupla; sigmoide a mais no PP-HumanSeg; rastro da suavidade no tempo) |
| Scope additions | 14 | Pedidos do Felipe durante o checkpoint, todos entregues em betas; nenhum quebrou o lote 1 (suítes aprovadas) |
| Deferred | 4 | Logados abaixo |

**Total impact:** o plano em si foi cumprido em um dia; o resto do tempo foi o checkpoint aberto virando uma fila de pedidos. Funcionou para o Felipe (betas no mesmo dia), mas ficou fora do PAUL: a partir daqui os pedidos de Saída avançada entram num plano próprio.

### Auto-fixed Issues

**1. [Render] Shader de camada premultiplicava duas vezes o que passava por efeito**
- **Found during:** Task 2 (Threshold com modos de alfa)
- **Fix:** `uPre` só para textura de elemento
- **Commit:** `6ff04d8`

**2. [IA] PP-HumanSeg exportado já tem Softmax; o app aplicava outra sigmoide (Baixa saía cinza)**
- **Found during:** bancada do Background Removal
- **Fix:** usar o canal 1 direto; Baixa foi de 68 para 4/255
- **Commit:** `2b511f1`

**3. [IA] Suavidade no tempo deixava rastro (EMA com portão)**
- **Found during:** gravação do Felipe
- **Fix:** mediana de 3 quadros com portão de movimento + passa-baixa adaptativo
- **Commit:** `82c3787`

### Scope additions (pedidos no meio, todos entregues)

Misturas "Principais" + Chroma Key; Transport no formato do Resolume; fonte Captura (tela/janela/página); botão direito no clipe; Test Card na saída; Mostrar saídas; pergunta ao fechar; setas na Saída avançada; versão no Sobre; coluna "Layer"; modo de mistura na faixa da camada; Background Removal (8 betas); YouTube e celular como fontes; Shape Mask; Soft Edge no trecho → degradê com alça → quatro por slice; seleção na sobreposição.

### Deferred Items

- Tilt Shift: capturas começadas, imagem de prova ruim; refazer com borda vertical + manchas lisas (02-02)
- Acuarela, CRT, Depth*, Grid Cloner, LUT, SearchLight, Slice Delay, Strokes, Text Animator/Block, WarpSpeed (17 do Resolume 7.28 que faltam) → lotes seguintes
- Alças do degradê também na aba Saída (hoje só na Entrada, porque na Saída o slice pode estar deformado) → plano da Saída avançada
- Celular como fonte testado só com uma janela do próprio programa; falta o telefone de verdade; composição salva não recria clipe de celular

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| Captura GDI devolve imagem parada em janela de vídeo | Captura pelo Spout (`capture.py`) |
| Resolume congela de vez em quando (API responde, Spout some) | Reiniciar só o Arena; clipe H.264 60 fps congela nele |
| Marca d'água do demo passa pela captura | `compare.mjs` captura duas vezes |
| WebGPU do onnxruntime-web calcula errado AveragePool ceil_mode e Conv com canais ímpares | Remendo no grafo (RVM) e depois DirectML nativo |
| MessagePort do Electron não transfere ArrayBuffer | Dados por cópia |
| Teclas do CDP se perdem sem foco / depois de uso pesado | Page.bringToFront + foco emulado + Shift de aquecimento; Esc com até 3 tentativas |
| Tag beta.16 saiu sem o código (git add numa pasta apagada) | Refeita como beta.17 |
| Classificador barrou `gh release` (uma vez), `git push -f`, PaddleSeg export.py | Release passa com pedido explícito do Felipe; exportação em 384×480 ficou para ele rodar |

## Next Phase Readiness

**Ready:**
- Bancada e fichas para os lotes seguintes (02-02 em diante)
- Background Removal e Shape Mask já iguais; Tilt Shift começado
- Kit de suítes por CDP cobrindo Saída avançada, grade, desfazer, Automape e emendas

**Concerns:**
- O checkpoint aberto virou fila de pedidos por quatro dias; pedidos de Saída avançada vão para plano próprio
- Primeiro uso de cada modelo no DML demora ~5 s (saída sem recorte nesse tempo)
- Felipe ainda não deu veredito final sobre o recorte (beta.17+) com a webcam dele

**Blockers:**
- None

---
*Built with PAUL Framework v1.4 · https://chrisai.cv/skool · https://youtube.com/@chris-ai-systems*
*Phase: 02-efeitos-do-resolume, Plan: 01*
*Completed: 2026-10-30*
