---
phase: 02-efeitos-do-resolume
plan: 03
subsystem: ui
tags: [grade, clipes, resolume, cdp]

requires:
  - phase: 02-efeitos-do-resolume
    provides: bancada Resolume × OpenLume (API REST + cliques reais)
provides:
  - grade de clipes que funciona e aparece como a do Resolume 7.28
  - tools/grade-check.mjs (14 verificações com mouse real)
affects: [camadas e decks, APC40, celular]

tech-stack:
  added: []
  patterns: ["Prévia segue state.pv (casa mandada pelo nome), não a seleção", "state.selCol / state.colOn para a coluna"]

key-files:
  created: [tools/grade-check.mjs, grade-clipes-mockup.html]
  modified: [app/app.js, app/clips.js, app/style.css, tools/selftest-main.js]

key-decisions:
  - "Miniatura põe no ar; nome só seleciona e manda para a Prévia (como no Resolume)"
  - "Cabeçalho da coluna: ▶/■ dispara, nome só seleciona"

duration: ~1 dia (maquete, medida e APPLY em 2026-11-03)
completed: 2026-11-03T16:00:00-03:00
description: "Grade de clipes igual à do Resolume: miniatura põe no ar, nome manda para a Prévia, ▶/■ e seleção de coluna, verde-água, miniatura de gerador e onda do áudio"
type: Summary
about: "OpenLume"
---

# Fase 2, plano 03: Grade de clipes, resumo

**Os quadradinhos dos clipes e o cabeçalho das colunas agora se comportam e se parecem com os do Resolume 7.28. Entrou na beta.47, e o Felipe aprovou no programa instalado ("a grade ta ok").**

## Critérios de aceitação

| Critério | Status | Notas |
|----------|--------|-------|
| AC-1: Cliques na casa | Pass | grade-check com mouse real pelo CDP; ok do Felipe |
| AC-2: Cabeçalho das colunas | Pass | ▶/■, contorno verde-água, nome só seleciona |
| AC-3: Aparência | Pass | miniatura de ponta a ponta, nome sem extensão, verde-água, gerador com miniatura, onda rosa |
| AC-4: Nada mais quebra | Pass | selftest 75, ui-check 16, keymap ok, undo-check 11, ao-check 20 |

## O que foi feito

- **Comportamento (app.js):** a Prévia segue `state.pv`; o nome só seleciona e põe na Prévia; a miniatura põe no ar; casa vazia apaga a camada; ▶/■ da coluna dispara e o nome da coluna só seleciona (`state.selCol`, `state.colOn`); a miniatura de gerador é feita uma vez pelo motor (`engine.previewLayer`).
- **Aparência (style.css, clips.js):** casa no desenho do Resolume, estados em verde-água, nome sem extensão, onda do áudio decodificada uma vez (arquivos até 300 MB) e desenhada por cima da miniatura.
- **Testes:** tools/grade-check.mjs (14 verificações); o selftest troca "rodapé seleciona e dispara" pela regra nova.

## Commits

| O quê | Commit |
|-------|--------|
| Grade de clipes (tarefas 1 e 2) | `254fd40` |
| Versão 0.2.0-beta.47 | `f6b5988` |
| PAUL: 02-03 no checkpoint | `d22366f` |

## Desvios

- O lote de efeitos que se chamava 02-03 passa a ser o **02-04**, como estava no plano.
- **Feito no meio, fora do plano (commit `226aca3`):** os padrões dos 13 geradores do Resolume foram lidos pela API (`referencia-resolume/geradores-padrao.json`), e a maquete de camadas e decks (`camadas-decks-mockup.html`) ficou esperando aprovação.

## Problemas encontrados

| Problema | Situação |
|----------|----------|
| Uma falha de Ctrl+Z no undo-check que não se repetiu | Fica de olho; não reproduziu |
| Release da beta.47 barrada pelo classificador | Comando entregue ao Felipe |
| Resolume parou de mandar Spout e o monitor dele ficou preto, mesmo reiniciando o Arena | Perguntar ao Felipe; bloqueia a bancada dos geradores |

## Próximo

- **Pronto:** a grade pode receber as abas de deck e o nome da camada, que ficaram fora do escopo (a maquete de camadas e decks está esperando aprovação).
- **Pendências:** os geradores do OpenLume têm nomes, faixas e desenho diferentes dos do Resolume; o Lines sai em linhas verticais no OpenLume e horizontais no Resolume.
- **Bloqueios:** a bancada precisa do Spout do Resolume de volta.

---
*Fase: 02-efeitos-do-resolume, plano: 03*
*Concluído: 2026-11-03*
