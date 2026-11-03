---
phase: 07-saida-avancada
plan: 01
subsystem: ui
tags: [soft-edge, saida-avancada, warp, homografia, malha-bezier]

requires:
  - phase: 02-efeitos-do-resolume
    provides: o que entrou nas betas 18–22 durante o checkpoint do 02-01 (emendas por degradê)
provides:
  - emendas por degradê registradas no PAUL, com o soft-check como prova
  - alças do degradê na aba Saída, sobre o slice deformado (quatro cantos e malha)
  - alças da emenda também no modo Editar pontos (beta.45)
affects: [saida-avancada, automape]

tech-stack:
  added: []
  patterns:
    - "A aba Saída é só outra vista do mesmo modelo: degradê guardado em pixels do recorte, mapeado por warp.localToOut/outToLocal"

key-files:
  created: []
  modified: [app/ao.js, app/warp.js, tools/soft-check.mjs]

key-decisions:
  - "Alças em Editar pontos: o plano as tirava desse modo; entraram na beta.45 porque o Felipe precisava puxar a pontinha com vários nós"

duration: 2026-10-30 a 2026-11-03 (com o checkpoint aberto por decisão dele)
started: 2026-10-30
completed: 2026-11-03
description: "Alças da emenda (soft edge) também na aba Saída, sobre o slice em trapézio ou malha, e em Editar pontos; betas 18–22 registradas"
type: Summary
about: "OpenLume"
---

# Fase 7 Plano 01: Soft Edge por degradê na aba Saída — Resumo

**As alças da emenda por degradê agora aparecem e se arrastam na aba Saída, por cima da imagem deformada
(quatro cantos ou malha bezier), e também em Editar pontos; um modelo só com a aba Entrada.**

## Desempenho

| Métrica | Valor |
|---------|-------|
| Início | 2026-10-30 |
| Fim | 2026-11-03 (ok do Felipe: "1 ta ok") |
| Tarefas | 2 auto + 1 checkpoint |
| Arquivos alterados | 3 |
| Betas | 32 (Tarefa 2), 45 (correção da malha) |

## Critérios de aceite

| Critério | Status | Notas |
|----------|--------|-------|
| AC-1: O que já entrou continua valendo | Pass | soft-check aprovado num app limpo; betas 18–22 listadas abaixo |
| AC-2: Alças na aba Saída, sobre o slice deformado | Pass | trapézio e malha 2×2; na malha, só a partir da beta.45 (ver desvio 1) |
| AC-3: Arrastar na aba Saída muda o degradê em pixels do recorte | Pass | soft-check: alça debaixo do mouse, mesma emenda na aba Entrada, probeScreen escurece onde manda |
| AC-4: Nada mais muda | Pass | ao, ui, undo e automape-check aprovados; engine.js intocado |

## Realizações

- Registro das betas 18–22: emenda só no trecho da sobreposição (13bd64f, 70d64dc), degradê com alça
  (42fb2ce), quatro emendas por slice (5079f0c), seleção na sobreposição (c88a6e0)
- `warp.localToOut` / `warp.outToLocal` (homografia nos quatro cantos; `meshPoint` + Newton na malha)
- `drawGrads` e o arrasto funcionando na aba Saída; contorno da faixa mapeado ponto a ponto
- soft-check: 26 → 33 verificações (beta.32) → 42 (beta.45)

## Commits

| Tarefa | Commit | Descrição |
|--------|--------|-----------|
| Tarefa 1 | (sem código) | soft-check rodado como prova das betas 18–22 |
| Tarefa 2 | `f8a0edc` | alças do degradê na aba Saída, sobre o slice deformado |
| Versão | `e6c09a0` | 0.2.0-beta.32 |
| Correção | `1c82781` | malha: desenho fora do slice consertado e alças em Editar pontos |
| Versão | `aa1466d` | 0.2.0-beta.45 |

## Arquivos

| Arquivo | Mudança | Para quê |
|---------|---------|----------|
| `app/warp.js` | Modificado | mapeamento recorte ↔ projetor; índice da malha preso dentro do slice |
| `app/ao.js` | Modificado | alças e arrasto na aba Saída e em Editar pontos |
| `tools/soft-check.mjs` | Modificado | verificações da aba Saída e da malha com alça fora do slice |

## Desvios do plano

| Tipo | Quantos | Impacto |
|------|---------|---------|
| Correção depois do checkpoint | 1 | essencial, achada pelo Felipe |
| Escopo a mais | 1 | pequeno, pedido dele |

**1. Bug: com vários nós, a alça não puxava a pontinha** (retorno do checkpoint: "quando eu insiro vários
nós, ele não puxa a pontinha"). `meshPoint` recebia índice negativo quando a alça saía do slice e o desenho
caía. Corrigido na beta.45 (`1c82781`), com verificação nova no soft-check.

**2. Alças em Editar pontos.** O plano dizia para não mostrar; passaram a aparecer na beta.45, junto com a
correção, para ele puxar a emenda sem trocar de modo. Sem conflito visto com os pontos da malha.

Entre o checkpoint e o ok, o loop ficou aberto por decisão dele ("vamos para o próximo plano"), enquanto
seguiam o 02-02 e a Fase 8.

## Próxima fase

**Pronto:** emendas por degradê completas nas duas abas; Fase 7 fechada.

**A considerar, se ele pedir (abriria o 07-02):** trecho do automático com mais de um vizinho na mesma borda;
emendas nos slices do Automape.

**Bloqueios:** nenhum.

---
*Fase: 07-saida-avancada, Plano: 01*
*Concluído: 2026-11-03*
