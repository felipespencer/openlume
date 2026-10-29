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
Phase: 2 of 6 (Efeitos do Resolume) — Applying
Plan: 02-01 — Tasks 0, 1 e 2 feitos; no checkpoint final (Felipe conferir o lote)
Status: APPLY no checkpoint human-verify. Fase 1 (Automape) segue com 3 de 5 planos: 01-03 no branch `automape` esperando o Felipe ver; 01-04 e 01-05 depois.
Last activity: 2026-10-29 — Felipe testou no Dell G3 (release v0.2.0-beta.1, repo público): Delay RGB "funcionou". Retorno do checkpoint: (1) BUG, corrigido: na Saída avançada, Cancelar/Esc/Ctrl+Z/Ctrl+Y/preset chamavam setScreens, que fechava as janelas de saída sem reabrir ("desliga a tela e tenho que religar no botão"); agora setScreens reabre as telas que estavam no ar (tools/ao-check.mjs, 11 verificações por CDP; selftest 71 APROVADO). (2) "o avançado não tem Ctrl+Z": tem (ao.js key), o que ele viu foi a saída caindo ao desfazer; reconferir com ele. (3) Pede efeitos "aquarela" e "o que tira o fundo das pessoas" (recorte de pessoa por IA local, ONNX): candidatos ao lote 2; conferir na bancada qual é o nome deles no Resolume

Progress:
- Milestone: [██░░░░░░░░] 18%
- Phase 1: [██████░░░░] 60%
- Phase 2: [████░░░░░░] 40%

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ◐        ○     [02-01: tarefas feitas, esperando o "aprovado" do Felipe no checkpoint]
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
| 2026-10-25 (APPLY 02-01): efeitos de tempo são copiados POR QUADRO RENDERIZADO (o Resolume rende a ~30 fps nesta máquina; Trails dá um passo por quadro; Delay RGB é fila de quadros renderizados, 1,0 = 40 quadros, e a troca de clipe mostra o clipe novo de uma vez); as cores dos efeitos ganham alfa como no Resolume (`COLOR(..., true)`, "#rrggbbaa", controle de alfa no painel); o shader de camada só premultiplica textura de elemento (`uPre`), porque premultiplicava duas vezes o que passava por efeito | Phase 2 | Vale para todos os lotes seguintes: medir primeiro no Resolume com as sondas de tools/compare/sondas, escrever depois |
| 2026-10-25: no celular, o desenho é um CLIPE (camada própria, pads, vários desenhos); disparar refaz o traço no ritmo em que foi feito | Phase 3 | O clipe de desenho entra na grade como os outros (mover, Autopilot) |
| 2026-10-25: efeitos de física entram como PLUGINS (pasta com `plugin.js`), não no código do programa; o celular é do programa, não plugin | Phase 3 | Sistema de plugins antes dos quatro plugins de física |

| 2026-10-29: a malha do Automape representa a ÁREA TOTAL de projeção (pedido dele) e liga/desliga a qualquer hora: deixou de ser camada/clipe; é desenhada pela janela de saída por cima de tudo (ajudante `mesh`, mesmo visual da fonte "malha": cinza, malha fina escura, borda clara a 10–20 px), menu Saída › "Mostrar malha do Automape"; o assistente só desliga a malha que ele mesmo ligou | Phase 1 | automape-check 22/22, selftest 71; a fonte "malha" continua existindo como fonte comum |
| 2026-10-29 (checkpoint 02-01, teste no CAIOPRADO): mais quatro pedidos atendidos fora do plano — botão direito na casa abre o menu do clipe (antes apagava o clipe sem perguntar; casa vazia oferece Colar); Test Card como no Resolume (substitui a composição na saída, passa pelos slices/warps, nome e tamanho da tela por cima; não é mais uma camada/clipe); "Mostrar saídas" traz as janelas de saída para a frente via processo principal (outputs:show); o X do programa pergunta Salvar e fechar / Fechar sem salvar / Cancelar (main.js segura o close; app:quit). "Mudo o projetor no avançado e não muda" NÃO reproduziu no código atual (select Dispositivo com tecla real move a janela de saída de monitor): provável que ele estivesse na 0.1.0 instalada; reconferir na beta.2. tools/ui-check.mjs (14 verificações por CDP). Depois, pedido: setas do teclado movem o ponto selecionado ou o slice na Saída avançada (1 px; Shift 10 px; toques seguidos = um desfazer) — feito (308c42b), ao-check com 18 verificações; beta.3 (MSI) instalada no CAIOPRADO, tag v0.2.0-beta.3 no GitHub. Sobre passou a mostrar "Versão X (instalado/desenvolvimento)" via app:info → beta.4 instalada no CAIOPRADO, tag v0.2.0-beta.4; release para o Felipe criar | Phase 2 | Registrar no UNIFY; beta.2 (MSI: o NSIS voltou a ser barrado pelo Smart App Control) instalada no CAIOPRADO; branch e tag v0.2.0-beta.2 no GitHub; a release com o MSI ficou para o Felipe criar (o classificador do auto mode barrou o gh release create) |
| 2026-10-29 (checkpoint 02-01, teste no Dell G3): correção fora do plano em app.js setScreens/openOutputs(quais) para a saída não cair na Saída avançada; registrar no UNIFY. Pedidos para o lote 2: aquarela e recorte de pessoas | Phase 2 | tools/ao-check.mjs entra no kit de testes |
| 2026-10-29: Felipe quer um PLANETÁRIO: projeção em domo com VÁRIOS projetores na borda, não olho de peixe; "deixar esse passo pra depois" | futuro | Anotado em ROADMAP.md (Ideias para um marco futuro); não entra no v0.2 |

### Deferred Issues

| Issue | Origin | Effort | Revisit |
|-------|--------|--------|---------|
| Laser: piscar e letras borradas no cubo real | pré-PAUL | M | Fase 4, com o cubo na mão |
| Slices em polígono na Saída avançada | pré-PAUL | M | Parcial: slices do Automape nascem com inMask do contorno; falta editar lados curvos lá |
| DXV1/DXV3 do Resolume | pré-PAUL | L | Quando houver pedido |

### Blockers/Concerns

| Blocker | Impact | Resolution Path |
|---------|--------|-----------------|
| Organização no GitHub ainda não criada | Repo ficou PÚBLICO em 2026-10-29 (release v0.2.0-beta.1 para o Dell G3); colaboradores seguem sem admin | Felipe cria a org (sugestão: `openlume-app`); eu transfiro o repo |

## Boundaries (Active)

- `PROJECIONISTAapp/` não se altera (só copiar a casca Android quando chegar a Fase 6)
- Nada de código descompilado do Resolume ou do LaserOS

## Session Continuity

Last session: 2026-10-25 (noite, depois de reiniciar o PC)
Stopped at: APPLY do 02-01 no checkpoint final (human-verify), branch `efeitos-resolume`, commitado. Tasks 0, 1 e 2 feitas: bancada funcionando (Spout + API REST + CDP), Threshold/Trails/Delay RGB medidos no Resolume e refeitos iguais por quadro (relatório com números em tools/compare/saida/lote-01/RELATORIO.md, fora do git; resumo em tools/compare/README.md). De quebra: cor com alfa nos efeitos (COLOR(..., true) → vec4, controle de alfa no painel) e correção do shader de camada que premultiplicava duas vezes (uPre). Selftest 71 APROVADO. Desvios anteriores (misturas "Principais" + Chroma Key, Transport, fonte Captura) continuam a registrar no UNIFY.
Next action: Felipe confere o lote (abrir os PNGs de lote-01 e mexer nos três efeitos no OpenLume); com "aprovado", rodar /paul:unify 02-01 e planejar o 02-02 (próximo lote).
Resume file: .paul/phases/02-efeitos-do-resolume/02-01-PLAN.md
Resume context: Resolume: API em 127.0.0.1:8080; Saída avançada Screen 1 = Spout "Arena - Screen 1". ARMADILHAS desta máquina: o Resolume congela de vez em quando (API responde, Spout some, monitor preto) — reiniciar só o Arena resolve (ele abre com o aviso "Wire integration is missing", é só Continue); clipe H.264 a 60 fps congela nele; a marca d'água do demo passa pela captura (compare.mjs já captura duas vezes); o Resolume rende a ~30 fps aqui. OpenLume: `location.reload()` NÃO recarrega os módulos (cache do app://), é preciso reabrir o Electron; o diálogo "Projetores" abre ao iniciar (botão Pular). Clipes de teste em tools/compare/clips (rampa, alfa.png, quadA/B/C.png, andando.mp4 a 375 px/s).

---
*STATE.md — Updated after every significant action*
