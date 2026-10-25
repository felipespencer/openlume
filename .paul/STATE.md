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
**Current focus:** Milestone v0.2 — Fase 2, Efeitos do Resolume (pedido de 2026-10-25: "faça isso"); Fase 1 com 01-04 e 01-05 ainda abertos

## Current Position

Milestone: v0.2 Automape e provas no equipamento (v0.2.0)
Phase: 2 of 6 (Efeitos do Resolume) — Planning
Plan: 02-01 created, awaiting approval
Status: PLAN created, ready for APPLY. Fase 1 (Automape) segue com 3 de 5 planos: 01-03 no branch `automape` esperando o Felipe ver; 01-04 e 01-05 depois.
Last activity: 2026-10-25 — Created .paul/phases/02-efeitos-do-resolume/02-01-PLAN.md (bancada lado a lado + Delay RGB, Trails, Threshold)

Progress:
- Milestone: [██░░░░░░░░] 15%
- Phase 1: [██████░░░░] 60%
- Phase 2: [░░░░░░░░░░] 0%

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ○        ○     [02-01 criado, esperando aprovação]
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
| 2026-10-25: Added Phase 3: Celular e plugins, depois do Automape ("depois do automape") | Phase 1 | Extends milestone scope; maquete `plugins-celular-mockup.html` feita fora do PAUL antes da fase existir, entra como 03-01 |
| 2026-10-25: Added Phase 2: Efeitos do Resolume, ANTES de Celular e plugins ("1 antes"); provas no equipamento, web e Android viram Fases 4, 5 e 6 | Phase 1 | Extends milestone scope |
| 2026-10-25: "não quero efeitos próprios, quero copiar" — os efeitos do Resolume entram iguais por fora e na tela, conferidos lado a lado, mas escritos do zero (sem shader, `.wired` ou código do Resolume: repo público GPL) | Phase 2 | Ferramenta de comparação lado a lado; modelos públicos de `ai-models/` podem entrar após conferir licença; plugins FFGL de terceiros podem ser abertos (Fase 3, só Windows); `.wired` não abre (formato fechado, 139 nós) |
| 2026-10-25 (durante o APPLY do 02-01, pedido no meio): lista de misturas com grupo "Principais" no topo (Alpha, Add, Multiply, Screen, Chroma Key, Luma Key, Luma Key I, Lighten, Darken, Difference, Overlay, Subtract) e "Todos os outros" embaixo; Chroma Key novo como mistura (chave verde padrão, Suavidade = tolerância) | Phase 2 | Desvio de escopo do 02-01, registrar no UNIFY; `pselect` aceita grupo; selftest 69 APROVADO com caso do Chroma Key |
| 2026-10-25 (durante o APPLY do 02-01, pedidos no meio): Transport do clipe no formato do Resolume (Tipo, Modo com Play Once & Clear/Hold, Ao voltar Restart/Continue/Relative, Velocidade 0–10, Duração editável com /2 ×2) e fonte nativa "Captura" em Fontes: tela, janela (desktopCapturer + getDisplayMedia com setDisplayMediaRequestHandler) e Página web (janela do Electron na tela com opacidade 0, capturada como janela; a captura de conteúdo/webContents não inicia no Electron 33 e fora da tela sai branca) | Phase 2 | Desvios de escopo do 02-01, registrar no UNIFY; selftest 71 APROVADO; cada janela de página leva ~4 s para carregar nesta máquina (motivo não investigado) |
| 2026-10-25: no celular, o desenho é um CLIPE (camada própria, pads, vários desenhos); disparar refaz o traço no ritmo em que foi feito | Phase 3 | O clipe de desenho entra na grade como os outros (mover, Autopilot) |
| 2026-10-25: efeitos de física entram como PLUGINS (pasta com `plugin.js`), não no código do programa; o celular é do programa, não plugin | Phase 3 | Sistema de plugins antes dos quatro plugins de física |

### Deferred Issues

| Issue | Origin | Effort | Revisit |
|-------|--------|--------|---------|
| Laser: piscar e letras borradas no cubo real | pré-PAUL | M | Fase 4, com o cubo na mão |
| Slices em polígono na Saída avançada | pré-PAUL | M | Parcial: slices do Automape nascem com inMask do contorno; falta editar lados curvos lá |
| DXV1/DXV3 do Resolume | pré-PAUL | L | Quando houver pedido |

### Blockers/Concerns

| Blocker | Impact | Resolution Path |
|---------|--------|-----------------|
| Organização no GitHub ainda não criada | Repo segue privado, sem admin para colaboradores | Felipe cria a org (sugestão: `openlume-app`); eu transfiro o repo |

## Boundaries (Active)

- `PROJECIONISTAapp/` não se altera (só copiar a casca Android quando chegar a Fase 6)
- Nada de código descompilado do Resolume ou do LaserOS

## Session Continuity

Last session: 2026-10-25 (tarde/noite)
Stopped at: APPLY do 02-01 em andamento no branch `efeitos-resolume` (nada commitado). Task 0 feito (servidor web ligado por mim em server.xml, cópia em server.xml.bak-claude); Task 1 quase: fichas dos 96 efeitos em referencia-resolume/FICHAS.md, bancada em tools/compare (resolume.mjs, capture.py por Spout, diff.py, compare.mjs, medir-threshold.mjs) — BLOQUEADA porque o Resolume parou de renderizar nesta máquina (relógio anda, imagem congelada no próprio monitor da composição; Felipe confirmou "paradas"; persiste após reiniciar o Resolume; Steam baixando 112 GB e memória baixa na hora). Task 2 parcial: Threshold com os controles do Resolume e Suavidade medida (smoothstep 0,43×); Delay RGB e Trails com os controles da ficha, conta a conferir na bancada. Desvios feitos no meio (pedidos do Felipe): misturas "Principais" + Chroma Key; Transport do clipe igual ao Resolume; fonte Captura (tela, janela, página web). Selftest 71 APROVADO.
Next action: quando o Resolume voltar a renderizar (pausar o Steam; Preferences → Video; ou reiniciar o PC), reabrir o OpenLume com `npx electron . --remote-debugging-port=9333`, conferir `py tools/compare/capture.py x.png 5` com quadros mudando, rodar `node tools/compare/compare.mjs Threshold --r "Smoothness=0.4"` e ajustar Threshold/Delay RGB/Trails; depois checkpoint do Felipe e /paul:unify. Commitar o branch (Título PT / Title EN).
Resume file: .paul/phases/02-efeitos-do-resolume/02-01-PLAN.md
Resume context: Resolume: API em 127.0.0.1:8080 (resolume.mjs abre clipes na camada 1 casa 2; Saída avançada Screen 1 = Spout "Arena - Screen 1"); clipes de teste em tools/compare/clips (rampa.mp4, quadrado.mp4); saída da bancada em tools/compare/saida (fora do git). Composição do Resolume "Untitled(9)" restaurada com o reel do Felipe na casa 1.

---
*STATE.md — Updated after every significant action*
