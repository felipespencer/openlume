---
description: "OpenLume — current position and accumulated context"
type: ProjectState
about: "OpenLume"
---

# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-10-21)

**Core value:** projecionistas de rua e de palco têm, de graça e aberto, um programa de
mapeamento de nível profissional.
**Current focus:** Milestone v0.2 — Fase 1, Automape (pedido de 2026-10-21)

## Current Position

Milestone: v0.2 Automape e provas no equipamento (v0.2.0)
Phase: 1 of 4 (Automape) — 3 de 5 planos feitos
Plan: 01-03 (feito; o próximo é 01-04)
Status: Noite de 2026-10-22 (ele dormindo): 01-02 REC → clipe (commit d31bdc5) e 01-03 Automape no programa (commit 38bb884) feitos, testados (selftest APROVADO 67; automape-check 22/22 por CDP) e resumidos. Tudo no branch `automape`; `main` intocado. Falta o Felipe abrir e dizer o que muda. A maquete (01-01) segue como referência visual aprovada em 17 rodadas.
Last activity: 2026-10-22 — commit 38bb884, capturas em brag-output/automape/app/

Progress:
- Milestone: [██░░░░░░░░] 15%
- Phase 1: [██████░░░░] 60%

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ✓     [01-03 fechado; próximo: /paul:plan 1 → 01-04]
```

## Accumulated Context

### Decisions

| Decision | Phase | Impact |
|----------|-------|--------|
| Maquete HTML aprovada antes de construir telas grandes | all | Fase 1 começa por uma maquete do Automape |
| Tudo do Resolume entra; poda é do Felipe | all | Não cortar recurso por conta própria |
| Interface em português; GitHub bilíngue | all | Commits "Título PT / Title EN" |
| 2026-10-21: o recurso chama **Automape**; na hora da foto o projetor mostra borda + malha fina, câmera logo acima da lente | Phase 1 | Padrão projetado entra no app em 01-02; detector usa mediana 5×5 + histerese para ignorar a malha |
| 2026-10-21: o caso de uso que ele quer ver é FACHADA DE PRÉDIO: achar janelas e pôr quadradinho preto (máscara de saída) em cada uma | Phase 1 | Detector de janelas por mancha escura; máscaras entram em 01-03 junto com os slices |
| 2026-10-21: mapeamento é pelo CONTORNO (SAM) e cada ponto é editável (arrastar, duplo clique acrescenta/apaga), com curvas BEZIER por lado, zoom, nova forma à mão e mini popup de ajuda | Phase 1 | 01-02: slices nascem com inMask do contorno; o editor de pontos/curvas do assistente vira o mesmo da Saída avançada (máscaras ganham lados curvos; hoje são polígonos) |
| 2026-10-21: crédito do Replicate do Felipe está abaixo de US$ 5 (cota 6 pedidos/min); a IA do programa deve rodar local | Phase 1 | Modelos ONNX no app; nuvem só como opção |
| 2026-10-21: interface do Automape = ASSISTENTE passo a passo com minitutoriais; painel de controles só como modo avançado | Phase 1 | Vale para o programa (01-02): o fluxo normal é o assistente |
| 2026-10-21: o Automape é IA que LÊ A FOTO e diz o que tem (janelas, portas, sofá, mesa…), fachada ou dentro de casa; o usuário diz o que cada coisa vira | Phase 1 | 01-02 precisa de segmentação com nomes rodando local (ONNX: Grounding DINO/OWL-ViT leve + SAM pequeno) ou, como opção, serviço na nuvem; o RAM sozinho não acha janelas, é preciso perguntar por classes |
| 2026-10-21: Felipe perguntou por IA para ver a foto em 3D (profundidade) | Phase 1 | Avaliado: entra como plano 01-05 (modelo de profundidade no onnxruntime-web), depois do básico funcionar |
| 2026-10-22: REC vira clipe (como no Resolume), VP8 para não pesar | Phase 1 | 01-02 feito; "Depois de gravar" configurável no painel Gravar |
| 2026-10-22: o Automape entrou no programa sem IA em fotos novas; os exemplos trazem o resultado da IA embutido e o assistente diz isso | Phase 1 | 01-04 traz a IA local (ONNX) ou Claude via MCP |

### Deferred Issues

| Issue | Origin | Effort | Revisit |
|-------|--------|--------|---------|
| Laser: piscar e letras borradas no cubo real | pré-PAUL | M | Fase 2, com o cubo na mão |
| Slices em polígono na Saída avançada | pré-PAUL | M | Parcial: slices do Automape nascem com inMask do contorno; falta editar lados curvos lá |
| DXV1/DXV3 do Resolume | pré-PAUL | L | Quando houver pedido |

### Blockers/Concerns

| Blocker | Impact | Resolution Path |
|---------|--------|-----------------|
| Organização no GitHub ainda não criada | Repo segue privado, sem admin para colaboradores | Felipe cria a org (sugestão: `openlume-app`); eu transfiro o repo |

## Boundaries (Active)

- `PROJECIONISTAapp/` não se altera (só copiar a casca Android quando chegar a Fase 4)
- Nada de código descompilado do Resolume ou do LaserOS

## Session Continuity

Last session: 2026-10-22 (madrugada)
Stopped at: 01-03 fechado e commitado no branch `automape`; programa de depuração (porta 9333) encerrado
Next action: Felipe roda `git checkout automape && npm start`, Saída › Automape…, percorre com a sala de exemplo; depois /paul:plan 1 para 01-04 (IA em fotos novas: SAM local em ONNX ou Claude + MCP do OpenLume)
Resume file: .paul/phases/01-automape/01-03-SUMMARY.md
Resume context: `app/automape.js` (classe Automape, ctx {compW, compH, toast, setGrid, gridOn, create, desktop}); `projecionista.automape.open()`; check real: `node tools/automape-check.mjs` com o app em `npx electron . --remote-debugging-port=9333`

---
*STATE.md — Updated after every significant action*
