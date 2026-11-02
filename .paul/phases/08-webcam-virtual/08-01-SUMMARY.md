---
phase: 08-webcam-virtual
plan: 01
subsystem: saida
tags: [webcam, obs, koffi, nv12, utilityprocess, electron]
requires: []
provides:
  - Saída › Webcam virtual, com a composição aparecendo como "OBS Virtual Camera"
affects: [versão web, instalador]
tech-stack:
  added: [koffi 3.3.6]
  patterns: ["processo nativo separado falando direto com a janela por MessagePort", "NV12 gerado na placa e lido sem parar o desenho"]
key-files:
  created: [app/webcam-native.js, app/webcam.js, tools/webcam-check.mjs, tools/compare/clips/cam-prova.png]
  modified: [app/engine.js, app/app.js, app/preload.js, main.js, package.json, package-lock.json, tools/selftest-main.js, COMO-USAR.md]
key-decisions:
  - "Escrever na câmera do OBS em vez de criar uma câmera própria: a DLL assinada evita certificado"
  - "Escrever com RtlMoveMemory: koffi.view derruba o processo no Electron"
patterns-established:
  - "No laço do programa, now está em segundos; para intervalos em milissegundos, usar performance.now()"
started: 2026-11-02T13:25:00-03:00
completed: 2026-11-02T14:00:00-03:00
duration: cerca de 35 min de execução
description: "Saída › Webcam virtual: a composição aparece como câmera no Google Meet pela câmera do OBS; confirmado pelo Felipe"
type: Summary
about: "OpenLume"
---

# Fase 8, Plano 01: Webcam virtual

**A composição do OpenLume aparece como câmera no Google Meet, pela "OBS Virtual Camera", com o OBS instalado e fechado. O Felipe confirmou: "funcionou no meet".**

## Critérios de aceite

| Critério | Status | Observação |
|----------|--------|------------|
| AC-1: Liga e aparece como câmera | **Passou** | Clique real no menu, programa instalado pelo MSI, Smart App Control ligado, 1920×1080. |
| AC-2: Imagem certa | **Passou, com ressalva** | Faixas a até 1/255 do motor, de pé, sem espelhar; composição quadrada com barras. O atraso não foi medido em milissegundos: só garantido por não haver fila. |
| AC-3: Não pesa | **Passou** | Composição de 29,9 para 29,8 qps; câmera com 30 quadros/s; 176 enviados e 2 pulados. |
| AC-4: Desliga e falha com clareza | **Passou, com ressalva** | Desligar e religar aprovados no instalado. Avisos de OBS ausente e câmera ocupada aprovados em desenvolvimento, não no instalado. **Fechar o programa com a webcam ligada não entrou na suíte**, embora o plano pedisse. |
| AC-5: Google Meet | **Passou** | Confirmado pelo Felipe. Não recebi detalhes da conferência além de "funcionou". |

## Commits

| Tarefas | Commit | Descrição |
|---------|--------|-----------|
| 1 a 3 | `780520d` | Webcam virtual: processo nativo, NV12, menu, avisos, testes |
| Beta | `b3b4dcf` | Versão 0.2.0-beta.46 |

## Verificação

- `webcam-check` no programa instalado: 10 de 10; `--sem-obs`: 3 de 3; `--ocupada`: 1 de 1 (os dois em desenvolvimento)
- Selftest 75, `ao-check` 20, `soft-check` 42, `ui-check` 16

## Desvios do plano

- **Ordem:** o plano pedia provar a peça nativa no instalado antes do resto. Fiz o código todo e testei em desenvolvimento primeiro; o instalado veio depois e passou.
- **`koffi` sem filtro no empacotamento:** o plano previa filtros em `build.files`, mas só o binário win32 x64 é instalado nesta máquina, então não foram necessários. Um build feito em outra plataforma precisaria revê-lo.
- **`package-lock.json` e `cam-prova.png`** entraram sem estar na lista do plano.
- **Release não publicada:** o classificador barrou o `gh release create`; a tag está no GitHub e o comando foi entregue ao Felipe.

## Problemas encontrados

| Problema | Solução |
|----------|---------|
| `koffi.view` derruba o processo no Electron (código 134); na prova de conceito, em Node, funcionava | Escrita por cópia com `RtlMoveMemory` |
| Só um quadro a cada 31 s: o `now` do laço está em segundos | `performance.now()` |
| Vermelho e verde saturados: codificado em BT.709, lido em BT.601 | Matriz BT.601, medida com faixas de cor |

## Limites desta versão

Só Windows e só vídeo; sempre 1920×1080 a 30 qps; a composição inteira; o nome na lista é "OBS Virtual Camera"; cada computador precisa do OBS instalado. Levar a DLL junto envolveria a licença do OBS, que o GitHub marca como GPL-2.0, e isso não foi conferido.

---
*Fase: 08-webcam-virtual, Plano: 01*
*Concluído: 2026-11-02*
