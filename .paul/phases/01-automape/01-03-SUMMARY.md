---
phase: 01-automape
plan: 03
status: complete
completed: 2026-10-22
description: "O Automape dentro do OpenLume: Saída › Automape…, malha projetada de verdade, foto do disco ou exemplos, editor ponto a ponto com bezier, máscaras e slices com contorno na Saída avançada; IA só nos exemplos"
type: Summary
about: "OpenLume"
---

# 01-03 SUMMARY: Automape no programa

## O que foi construído
- `app/automape.js` (77 KB): bloco `AM` (as funções puras da maquete: cinza, mediana, Sobel, Otsu, componentes, contorno de Moore, Douglas-Peucker, quadro do projetor, homografia foto → projetor, janelas, superfícies) e a classe `Automape` sobre `openDialog`: os 7 passos, foto do disco / arrastar / três exemplos, editor ponto a ponto (clique seleciona a forma; Reto/Curvo por ponto; bezier com alças alinhadas e Ctrl solta a alça; zoom e deslocamento; nova forma; desfazer; Enter/Delete), prévia e `create()`.
- `app/automape-samples.js` (495 KB): fachada, sala, foto sintética, resultados da IA, nomes em português, mini animações.
- `app/sources.js`: fonte `malha` (cinza, malha 32×18, borda branca). `app/app.js`: `setAutomapeGrid` (camada "Malha do Automape" por cima, como o Test Card), `automapeCreate` (mkMask por "quadrado preto", mkSlice com 4 cantos e `inMask` do contorno por "projetar nele", escala pelo tamanho da tela, abre a Saída avançada), item **Saída › Automape…**, `projecionista.automape`. `app/ao.js`: botão "Automape" na barra. `app/warp.js`: `invertHomography`. `app/style.css`: o assistente inteiro.
- Testes: bloco Automape em `tools/selftest-main.js` (3 verificações) e `tools/automape-check.mjs` (22 verificações com eventos reais pelo CDP contra o programa na porta 9333: menu, malha na saída, exemplo da sala, arrastar ponto, Curvo, zoom, desfazer, criar).

## Resultado
- `node --check` em todos os módulos; selftest **APROVADO** (67 verificações, REC incluído); `automape-check.mjs` **22/22**.
- Criar com a sala de exemplo: 3 máscaras (portas) + 13 slices com contorno na tela "Projetor"; a Saída avançada abre mostrando. Capturas em `brag-output/automape/app/`.
- Commit `38bb884` no branch `automape` (junto com a maquete, `.paul/` e o check).

## Desvios do plano
- `app/index.html` não precisou mudar (o botão REC já tinha entrado em 01-02).
- A foto nova sem IA (AC-3) usa o modo Janelas/Superfícies do bloco `AM`, como previsto; não foi testada com foto real de projetor (não há uma), só com a foto sintética.

## Fica para depois
- IA em fotos novas (01-04: modelo local ou Claude + MCP).
- Lados curvos nos slices e máscaras da Saída avançada: hoje o contorno chega achatado (8 segmentos por lado curvo); editar a curva depois é só no Automape.
- Felipe ainda não viu o programa: o checkpoint humano de 01-01 (maquete) vale como aprovação do visual; o do programa é a manhã de 2026-10-22.
