---
phase: 01-automape
plan: 02
status: complete
completed: 2026-10-22
description: "Botão REC na barra de cima; ao parar, a gravação vira clipe na primeira casa vazia da camada selecionada; VP8 para não pesar; teste embutido mede o FPS"
type: Summary
about: "OpenLume"
---

# 01-02 SUMMARY: REC vira clipe

## O que foi construído
- `app/record.js`: opção `after: 'clip'` (padrão); ao terminar chama `ctx.toClip(path, name, file)`; VP8 antes do VP9.
- `app/app.js`: `recordingToClip` (primeira casa vazia da camada selecionada, ou coluna nova), botão `#btnRec` com estados (● REC / ■ 0:12 piscando / ● ARMADO), `projecionista.frames()` para medir FPS.
- `app/index.html` + `app/style.css`: o botão ao lado de "Abrir saída".
- `app/browser.js`: painel Gravar, "Depois de gravar: Virar clipe na grade / Mostrar na pasta / Nada".
- `tools/selftest-main.js`: grava 2,5 s pelo botão, confere o clipe (vídeo .webm 1920×1080 na casa vazia) e o FPS.

## Resultado
Selftest: `REC grava e a gravação vira clipe na casa vazia` PASS; `gravar não pesa`: 30 fps antes, 30 fps gravando. Commit `d31bdc5` no branch `automape`.

## Notas
- O selftest precisa de `anim.gif` na pasta de teste (gerado com ffmpeg lavfi); sem ele a verificação do GIF falha, o que não é bug do programa.
- Não testado com microfone nem com fonte "tela"; o caminho é o mesmo.
