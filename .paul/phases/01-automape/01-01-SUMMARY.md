---
phase: 01-automape
plan: 01
status: complete
completed: 2026-10-22
description: "Maquete do Automape aprovada na prática: assistente em 7 passos, IA real nos exemplos, contornos, editor de pontos com bezier, zoom, nova forma, desfazer, mini animações, neon rosa"
type: Summary
about: "OpenLume"
---

# 01-01 SUMMARY: maquete do Automape

## O que foi construído

`automape-mockup.html` (raiz do repositório, ~600 KB com duas fotos e os resultados da IA embutidos). Abre num navegador comum, sem servidor. Dezessete rodadas de checkpoint com o Felipe em 2026-10-21/22; cada rodada mudou a especificação (ver abaixo). Verificação por `brag-output/automape/check.mjs` (fora do git): 76 checagens com eventos de entrada reais pelo CDP (cliques, arrastos, duplo cliques, roda do mouse, Ctrl+arrasto, teclas), zero erros de console.

## Especificação final (o que o programa tem de fazer)

**Fluxo:** assistente em 7 passos, uma ação por tela, cada tela com uma dica do porquê e mini animações (SVG + SMIL, 4 s em loop):
1. O que é o Automape (desenho).
2. Ligar o projetor e **mostrar a malha**: o projetor exibe um campo cinza claro com malha fina 32×18 escura e uma borda branca grossa. Botão pulsa em rosa até ser apertado.
3. Tirar a foto com o celular **logo acima da lente**, malha inteira dentro da foto (desenhos certo/errado, animação).
4. Mandar a foto (arrastar/escolher; três exemplos: fachada de prédio, sala, parede com a malha).
5. **A IA leu a foto**: a foto com cada coisa marcada e nomeada; resumo "A IA encontrou: 2 quadros, 3 portas, 1 sofá…". Editor de pontos (abaixo).
6. **O que fazer com cada coisa**: uma linha por classe, três botões grandes: Quadrado preto (máscara de saída), Projetar nele (slice com o contorno exato), Deixar quieto. Janela e porta nascem como máscara; o resto como slice; sala/prédio inteiro como nada.
7. Como fica no projetor (prévia 1920×1080, legenda), "Ajustar na mão antes (modo avançado)", "Criar na Saída avançada".

**IA:** o centro do recurso. Lê a foto, diz o que tem e recorta o contorno de cada coisa. Resultados reais usados na maquete: `idea-research/ram-grounded-sam` (lista o que há; na sala achou sofá, poltronas, lareira, mesa, viga, micro-ondas, parede) e `mattsays/sam3-image` (SAM 3, contorno por classe; 62 janelas na fachada, 15 coisas na sala). O RAM sozinho não acha janelas: é preciso perguntar por classes. No programa a IA roda **local** (ONNX) por padrão; Claude entra como camada opcional para entender/nomear; Replicate não entra no produto (crédito do Felipe < US$ 5 e cota limitada). Modos sem IA, para qualquer foto: "Janelas" (manchas escuras + fechamento morfológico + filtro de retângulo e convexidade) e "Superfícies" (bordas com mediana 5×5 + histerese, componentes, contorno).

**Geometria:** da lente, foto → projetor é UMA homografia (4 cantos da borda projetada → 1920×1080). `warp.js` já tem `homography`; falta `invert`.

**Editor de pontos (assistente e modo avançado):** clique seleciona a forma (só ela mostra pontos); clique num ponto seleciona o ponto (verde); barra "Ponto: Reto | Curvo" por ponto (ou forma toda); ponto curvo = bezier com duas alças (losangos rosa) alinhadas; **Ctrl ao arrastar solta a alça** (independente, vazada), "Curvo" realinha; duplo clique numa linha cria ponto (numa curva divide por de Casteljau); duplo clique num ponto apaga; a IA marca como curvo o que vira menos de 40° (tapete nasce oval); zoom pela roda em cima do cursor, arrastar o fundo move, botões − + Ajustar, bolinhas de tamanho fixo na tela; "＋ Nova forma" ponto a ponto (duplo clique/Concluir/primeiro ponto fecha, Esc cancela); "✕ Tirar do mapa" / Delete; **desfazer** Ctrl+Z e ↶; Enter avança o passo; linhas de 0,5 px (ele achou grosso três vezes). Mini popup de ajuda (seis animações) uma vez por sessão, botão "?" pulsa em rosa até ser visto. Neon rosa pulsando = "mexa aqui"; verde = feito/ativo.

**Saída:** mistura de `mkMask` (polígono em px do projetor) e `mkSlice` (4 cantos + `inMask` com o contorno em 0..1; lados curvos achatados em 8 segmentos cada) na tela "Projetor".

## Decisões registradas
- Nome: **Automape**. Foto com o projetor ligado mostrando borda + malha; câmera acima da lente.
- Mapeamento pelo contorno, nunca só a caixa.
- Interface = assistente com minitutoriais; painel cheio só como "modo avançado".
- MCP do OpenLume entra no roadmap (01-04); IA de profundidade (01-05).

## Desvios
- O checkpoint formal ("constrói igual") não foi dito; em 2026-10-22 o Felipe pediu para adiantar enquanto dormia e, antes, "veja o botão RECORD… o vídeo gravado já aparecer num dos clipes". Interpretado como aprovação de seguir para o programa, mantendo a maquete como referência.
- Replicate usado só para gerar os contornos da maquete (centavos).

## Pendências para os próximos planos
- 01-02: REC vira clipe na grade (pedido de 2026-10-22).
- 01-03: Automape dentro do programa com tudo acima menos a IA em fotos novas.
- 01-04: IA local (segmentação com nomes) e/ou Claude + MCP do OpenLume.
