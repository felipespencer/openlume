# Rumo do Projecionista

Decisão do Felipe em 2026-10-13: fazer o máximo possível do que o Resolume faz, do jeito dele,
e o mapeamento **igual ao Advanced Output do Resolume**. Código próprio; do Resolume vem o jeito
de trabalhar.

## Feito

- Grade de camadas, colunas e clipes, com arrastar e soltar
- Mistura das camadas numa imagem só (opacidade; Normal, Somar, Tela)
- Prévia do clipe, ajuste na tela (encaixar, preencher, esticar), velocidade
- Janela de saída que mostra a imagem misturada
- Mapeamento da saída inteira por quatro cantos (provisório: vira um caso do Advanced Output)

## Ordem de trabalho

1. **Advanced Output**, como no Resolume
   - Telas: cada tela é um destino (um projetor, ou uma janela)
   - Slices: cada slice recorta um pedaço da composição (Input Selection) e o posiciona e
     deforma na tela (Output Transformation)
   - Deformação por quatro cantos e por malha com curvas
   - Máscaras e slices em polígono
   - Soft edge para emendar dois projetores
   - Presets de saída: salvar, carregar
2. **Transição** entre clipes da mesma camada (duração e modo)
3. **Transporte do clipe**: trecho de entrada e saída, vai e volta, tocar uma vez, ré
4. **Efeitos** no clipe, na camada e na composição (os 24 do Projecionista antigo primeiro)
5. **Salvar e abrir a composição**, com os arquivos de mídia por caminho
6. **Fontes além de arquivo**: texto, câmera, cor sólida, shader gerador
7. **Decks**
8. **Grupos de camadas**, solo, máscara de camada, crossfader A/B
9. **MIDI**: clicar no controle e mexer na controladora para amarrar; teclado também
10. **BPM**: tempo, sincronia de clipe e de efeito com a batida
11. **Autopilot**: próximo clipe sozinho
12. **Tirar o fundo da webcam** e efeitos de profundidade (novidades do Resolume 7.28)
13. **Áudio** do clipe e reação ao som (FFT)
14. **Instalador** para Windows e publicação como projeto aberto

Fora, por enquanto: DMX e luminárias (Lumiverse), NDI e Spout.

## Como estudar o Resolume para o item 1

- O que o próprio programa instala: `rest/docs/swagger.yaml`, `default/Example.avc`,
  `docs/help/English.xml` (em `C:\Program Files\Resolume Arena`)
- Presets reais de Advanced Output do Felipe: `Documentos\Resolume Arena\Presets\Advanced Output`
  (`casinha.xml`, `roosevelt.xml`). Estão só na nuvem do OneDrive: é preciso abrir o OneDrive
  para baixar
- REA com Ghidra 12.1.4, para o que não está documentado (soft edge, deformação por curvas).
  Serve para entender; nenhum código descompilado entra no projeto
