---
phase: 02-efeitos-do-resolume
plan: 02
subsystem: efeitos
tags: [webgl2, glsl, resolume, bancada, tilt-shift, crt, acuarela]
requires:
  - phase: 02-efeitos-do-resolume
    provides: bancada lado a lado (tools/compare) do 02-01
provides:
  - Tilt Shift, CRT e Acuarela no programa, com os controles da ficha do Resolume 7.28.1
  - gaussiana separável e passe intermediário no motor, para os próximos efeitos
affects: [02-03, webcam virtual]
tech-stack:
  added: []
  patterns: ["efeito com { gauss } e { stage } no motor", "comparação por estatística para efeito que muda sozinho"]
key-files:
  created: [tools/compare/lote2-check.mjs, tools/compare/lote.sh, tools/compare/sondas/varre.mjs, tools/compare/sondas/acu.mjs]
  modified: [app/effects2.js, app/engine.js, tools/selftest-main.js, tools/soft-check.mjs, tools/compare/README.md]
key-decisions:
  - "Só API e imagem de saída como fonte; presets do CRT ficam fora enquanto não houver leitura pela interface"
  - "Acuarela é modelo próprio ajustado pela saída, declarado como tal"
patterns-established:
  - "Medir cada controle isolado em imagem feita para aquela pergunta antes de escrever"
started: 2026-11-02T11:20:00-03:00
completed: 2026-11-02T13:10:00-03:00
duration: cerca de 2 h
description: "Tilt Shift praticamente igual ao Resolume; CRT próximo e sem presets; Acuarela ajustada por estatística; beta.44 publicada e aprovada pelo Felipe"
type: Summary
about: "OpenLume"
---

# Fase 2, Plano 02: Tilt Shift, CRT e Acuarela

**Tilt Shift ficou praticamente igual ao Resolume; o CRT está próximo, sem os 9 presets; a Acuarela foi ajustada por estatística e fica mais nítida que a original. Beta.44 publicada e aprovada pelo Felipe no checkpoint.**

## Critérios de aceite

| Critério | Status | Observação |
|----------|--------|------------|
| AC-1: Iguais por fora | **Parcial** | Nomes, controles, ordem, faixas e padrões seguem a ficha. **Faltam os 9 presets do CRT.** Reset da Acuarela é controle 0/1, não botão. |
| AC-2: Iguais na tela | **Parcial** | Números registrados no README e imagens em `saida/lote-02`. Casos acima do aceitável ficam como diferença aberta. **O limite não foi definido antes de escrever**, como o plano pedia: Tilt Shift ganhou limite (1,5/255) depois da primeira medição, e CRT e Acuarela ficaram sem meta por pixel. |
| AC-3: Variação no tempo | **Parcial** | Acuarela comparada por distância, mudança e nitidez em pares de quadros, com várias rodadas; não foram medidas variância nem frequência. Não medi cintilação no tempo no CRT. |
| AC-4: Controles funcionam | **Passou, com ressalva** | Todos os controles deslizantes responderam a mouse real (`lote2-check`). **As listas (Cor e Exibição do CRT) não foram testadas com mouse.** |
| AC-5: Nada quebra | **Parcial** | Selftest 74, `ao-check` 20, `soft-check` 33, `ui-check` 16 aprovados; 30 qps com cada efeito. Os valores atravessam o JSON da composição, mas **não testei abrir a composição salva de novo**. |

## Números finais

| Caso | Diferença média (/255) |
|------|------------------------|
| Tilt Shift: padrão / borda / saturação / posição / vinheta / quadro real | 0,52 / 0,01 / 0,17 / 0,18 / 0,03 / 1,1 |
| CRT: sem bloom / padrão / quadro real | 2,42 / 10,97 / 7,55 |
| CRT: Brightness 25 / 100 / Vignette 100 | 10,75 / 16,38 / 8,78 |
| CRT: Bloom Width 150 / Fisheye 100 | 23,7 / 34,9 |

| Acuarela (Resolume → nossa) | Distância | Mudança em 0,5 s | Nitidez |
|-----------------------------|-----------|------------------|---------|
| Padrão | 17,9 → 21,4 | 14,1 → 18,3 | 0,39 → 0,60 |
| Gain 0,1 | 29,5 → 33,5 | 14,3 → 22,2 | 0,38 → 0,67 |
| Strength 1 | 28,4 → 31,9 | 20,7 → 22,3 | 0,36 → 0,73 |
| Density 20 | 18,0 → 17,8 | 13,6 → 13,2 | 0,46 → 0,86 |

## Commits

| Tarefa | Commit | Descrição |
|--------|--------|-----------|
| Tarefas 1 a 3 | `5db64cb` | Os três efeitos, motor, sondas, testes e README |
| Pedido no meio | `d263969` | Modo de ponto: Reta ou Bezier |
| Beta | `7eca2e1` | Versão 0.2.0-beta.44, instalada e publicada |
| Fora de plano, Fase 2 | `831c9c5` | Background Removal da beta.43 |

## Desvios do plano

- **`app/engine.js` entrou sem estar na lista do plano:** o Tilt Shift precisava de desfoque gaussiano real, e o CRT de um passe intermediário para o bloom.
- **`tools/soft-check.mjs` foi alterado:** passou a fixar o modo Transformar, porque dependia do estado deixado pela suíte anterior.
- **Pedidos no meio:** "Curva" virou "Bezier" (o padrão já era Reta). A prova de conceito da webcam pelo OBS ficou fora do repositório, com registro no roadmap, e o OBS Studio 33.0.0 foi instalado com permissão do Felipe.
- **Uma suposição antiga caiu:** o Tilt Shift não renderiza em resolução menor; o achado vinha da imagem de prova ruim.
- **Sobre o `.wired`:** um `grep -il` confirmou que "trinitron" aparece em `CRT.wired`. Nenhum valor foi lido nem usado.

## Desvios anteriores da Fase 2 (betas 26–30 e 43)

Registrados no STATE: desempenho do recorte com grafos fixos e leitura assíncrona, máscara virada, volta do PP-MattingV2 após a bancada com poses, alinhamento da máscara com a imagem, tremor e prévia; controles medidos, vídeo atrás da webcam, salvar com o efeito ligado e lag. O Felipe considerou o Background Removal cerca de 95% em 2026-11-02.

## Diferenças abertas

| Item | Situação |
|------|----------|
| CRT: 9 presets | Fora; o Felipe escolhe cada um no Resolume e leio os valores pela API |
| CRT: Fisheye e Bloom Width | Acima do resto (34,9 e 23,7) |
| CRT: inclinações, Spread | Aproximados |
| CRT: Native | Não comparado |
| Acuarela | Mais nítida que a original em todos os casos; modelo próprio |
| Composição salva | Falta abrir de novo e conferir os três efeitos |
| Bancada temporal do recorte | Segue por fazer |

## Próximo passo

**Pronto:** o motor aceita gaussiana e passe intermediário, e a varredura e a estatística servem aos próximos lotes.
**Não conta como fase concluída:** faltam 14 efeitos do 7.28 e o resto da lista de igualar.
**Bloqueios:** nenhum.

---
*Fase: 02-efeitos-do-resolume, Plano: 02*
*Concluído: 2026-11-02*
