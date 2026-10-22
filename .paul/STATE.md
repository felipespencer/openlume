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
Phase: 1 of 4 (Automape) — Applying
Plan: 01-01 (1 of 3 previstos na fase)
Status: APPLY em curso — Tasks 1 e 2 feitas e verificadas (19/19 por CDP); checkpoint rodada 6: (5) assistente em 7 passos feito; (6) Felipe quer MAPEAMENTO de verdade dentro de casa (contorno, não caixa) e EDITAR CADA PONTO. Feito: contornos reais do SAM 3 (Replicate, classe por classe) embutidos para sala (15 coisas) e fachada (62 janelas); pontos arrastáveis, duplo clique acrescenta/apaga; prévia mostra o contorno. (7) zoom e deslocamento na foto (roda do mouse, botões, arrastar o fundo) para ajustar a malha; bolinhas de tamanho fixo na tela. (8) linhas finas (0,8 px); (9) "＋ Nova forma": desenhar uma área ponto a ponto onde a IA não achou; (10) mini popup de ajuda acima da foto (Entendi / botão ?); (11) bezier: duas alças por canto (losangos rosa), retas por padrão, visíveis na forma sob o mouse; arrastar curva, duplo clique endireita; ponto novo numa curva divide a curva (de Casteljau); resultado achata cada lado curvo em 8 segmentos; (12) mini animações nos tutoriais (SVG+SMIL em loop de 4 s): seis no popup de ajuste (arrastar, criar, apagar ponto, bezier, zoom, nova forma) e uma grande nos passos 2 (malha acende), 3 (celular acima da lente) e 6 (janela preta / sofá com conteúdo); (13) edição PONTO A PONTO: clique seleciona a forma (só ela mostra pontos); clique num ponto seleciona o ponto; barra "Ponto: Reto | Curvo" vale para o ponto (ou a forma toda sem ponto escolhido); ponto curvo = bezier com alças alinhadas; a IA marca como curvo o que vira menos de 40° (o tapete nasce oval); "✕ Tirar do mapa" na barra substitui o clique-que-tirava; (14) alças como no Adobe: alinhadas por padrão, Ctrl ao arrastar solta a alça (fica independente e vazada), "Curvo" realinha; (15) linhas a 0,5 px (fio de cabelo), selecionada 0,9 px, bolinhas/losangos menores: ele achou grosso duas vezes, talvez por escala de DPI do Windows; (16) passada fina a pedido dele ("tá ficando bem legal"): nomes da prévia escalam com a forma, texto do passo 5 numa linha, popup de ajuda uma vez por sessão e numa linha, DESFAZER (Ctrl+Z e ↶), Enter avança, Delete tira do mapa, "IA" curto; (17) neon rosa pulsando = "mexa aqui" (ideia dele, contraponto ao verde): botão da malha, área de soltar foto, "?" até ver a ajuda, "Concluir forma"; botões Reto/Curvo/Tirar somem sem forma selecionada e no lugar pulsa "← clique numa forma". 76 verificações por CDP. Perguntas dele respondidas: Claude vs Replicate (Replicate só serviu para gerar os contornos da maquete; no produto é SAM local + Claude opcional para entender) e MCP do OpenLume (entra no roadmap, 01-04). Falta a resposta dele
Last activity: 2026-10-21 — automape-mockup.html pronto, aberto no navegador dele

Progress:
- Milestone: [░░░░░░░░░░] 0%
- Phase 1: [░░░░░░░░░░] 0%

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ◉        ○     [Applying — checkpoint human-verify]
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
| 2026-10-21: Felipe perguntou por IA para ver a foto em 3D (profundidade) | Phase 1 | Avaliado: entra como plano 01-04 (modelo de profundidade no onnxruntime-web, já embarcado), depois do básico funcionar |

### Deferred Issues

| Issue | Origin | Effort | Revisit |
|-------|--------|--------|---------|
| Laser: piscar e letras borradas no cubo real | pré-PAUL | M | Fase 2, com o cubo na mão |
| Slices em polígono na Saída avançada | pré-PAUL | M | Depois do Automape |
| DXV1/DXV3 do Resolume | pré-PAUL | L | Quando houver pedido |

### Blockers/Concerns

| Blocker | Impact | Resolution Path |
|---------|--------|-----------------|
| Organização no GitHub ainda não criada | Repo segue privado, sem admin para colaboradores | Felipe cria a org (sugestão: `openlume-app`); eu transfiro o repo |

## Boundaries (Active)

- `PROJECIONISTAapp/` não se altera (só copiar a casca Android quando chegar a Fase 4)
- Nada de código descompilado do Resolume ou do LaserOS

## Session Continuity

Last session: 2026-10-21
Stopped at: checkpoint do plano 01-01 — maquete pronta (automape-mockup.html), capturas em brag-output/automape/, teste brag-output/automape/check.mjs (Chrome headless na porta 9444)
Next action: ouvir o Felipe ("constrói igual" ou mudanças); depois /paul:unify .paul/phases/01-automape/01-01-PLAN.md
Resume file: .paul/phases/01-automape/01-01-PLAN.md
Resume context: da lente, foto → projetor é uma homografia só (`app/warp.js` já tem `homography`); slices nascem no formato de `mkSlice` (`app/screens.js`); item "Automape…" entra sob "Avançada…" no menu Saída (`app/app.js` ~1088)

---
*STATE.md — Updated after every significant action*
