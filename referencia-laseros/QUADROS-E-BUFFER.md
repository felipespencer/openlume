# LaserOS: como ele monta os quadros e enche o buffer do cubo (REA, 2026-10-15)

Alvo: LaserOS 0.18.1 BETA, `C:\Program Files\LaserOS`. Ferramenta: REA com Ghidra 12.1.4. Arquivos lidos:
`ldCore.dll` (motor), `openlase.dll` (a cópia da libol que ele usa, classe `ldLibol`) e `laserdocklib.dll`
(fala com o cubo). Motivo: o cubo real pisca e "caga" as letras com o nosso driver e não com o LaserOS; a captura
de rede do LaserOS deu zero pontos (ele estava conectado, mas com a saída desligada), então fui ler o código.

Tudo abaixo é **observado no código descompilado**; inferência está marcada. Para projeto aberto: nada daqui é
cópia de código, só o comportamento.

## 1. O caminho de um quadro

```
ldVisualizationTask::update ──▶ ldRendererOpenlase::renderFrame ──▶ ldLibol::olRenderFrame
        ▲                            │ filtros (ldFilterManager)        (pontos da libol)
        │                            ▼
 sinal isCleaned          ldFrameBuffer::pushFrame ──▶ ldHardwareFilter::processFrame (por aparelho)
 (buffer esvaziou)                   │                   cor atrasada 4 amostras, proteção, zona morta
        │                            ▼
 ldThreadedDataWorker::run ◀── ldFrameBuffer (até 4000 vértices) ──▶ ldHardware::setFrame (amostra de 8 bytes)
        │ a cada 4 ms
        ▼
 ldHardwareBatch::sendData ──▶ ldNetworkHardware::send_samples ──▶ LaserdockNetworkDevice::send_samples (fila)
                                                                          │ sinal SamplesReady
                                                                          ▼
                                                            LaserdockNetworkDevice::processSamples
                                                            pacotes 0xa9 de 140 amostras × 10 bytes, até 20 por lote
```

- **Um quadro por vez, só quando o anterior acabou.** `ldTaskWorker` liga o sinal `ldFrameBuffer::isCleaned` ao
  `update` com conexão **bloqueante** (tipo 3): o fio de envio para, o visualizador desenha o próximo quadro, e só
  então o envio continua. Não há dois quadros em fila nem repetição do quadro anterior.
- **Taxa de quadros: 45 por segundo** (`ldVisualizer::targetFPS` devolve 0x2d = 45; sem visualizador, 30). Vai como
  `max_fps` para `olRenderFrame` e como `rate / fps` para `max_framelen` em `setRenderParamsStandard`.
- **Tamanho do quadro é fixo = pontos/s ÷ 45** (a 35 000 pps, 777 pontos; a 30 000, 666):
  - se o desenho tem menos pontos, `olRenderFrame` completa com cópias **apagadas** do último ponto até `rate/fps`;
  - se tem mais que `max_framelen`, **reamostra**: os pontos acesos são percorridos com passo `n/max_framelen`
    (interpolação linear de x e y, cor do ponto de origem); os apagados ficam 1:1 (passo 1). Depois completa como acima.
  - Resultado: o laser repassa o desenho sempre 45 vezes por segundo, nem mais nem menos.
- **Taxa de pontos**: `ldHardwareBatch::UpdateDACRates` põe todos os aparelhos na **menor taxa máxima** entre eles
  (para o cubo de teste, 35 000), salvo valor forçado pelo usuário. A `ldLibol` nasce com 30 000 e recebe a taxa
  real em `setRenderParams*`.
- **Parâmetros "Padrão"** (`setRenderParamsStandard`): on_speed 1/16, off_speed 1/16, start_wait 8, start_dwell 2,
  curve_dwell 1, corner_dwell 3, end_dwell 2, end_wait 1, curve_angle cos 30°, flatness 0, snap 0,001,
  render_flags 7, min_length 0, max_framelen = rate/fps. (Iguais aos já copiados em `app/laser-model.js`.)
- A `ldLibol` é a libol original com nome de classe: `line_to`, `get_dwell`, `render_object`, `point_to` fazem o que o
  `libol.c` faz (distância de Chebyshev, esperas, viagem apagada com end_wait + travessia a off_speed + start_wait).

## 2. O que acontece com cada ponto antes de ir ao cubo (`ldHardwareFilter`)

`pushFrame` passa o quadro pelo filtro de cada aparelho (`processFrame`), vértice a vértice:

1. filtros do aparelho (espelho, escala, rotação, deslocamento, keystone, TTL, cor, curva de cor, potência);
2. **`processSafeLaserOutput`** — é aqui que mora a diferença mais importante para as "letras cagadas":
   - **atraso de cor**: o filtro guarda um histórico de 9 vértices; o ponto que sai leva **x, y do vértice atual e
     r, g, b do vértice de 4 amostras atrás** (`this+0x10 = 4` no construtor, fixo). Ou seja, a cor chega ao cubo
     4 amostras depois da posição — o galvanômetro atrasa em relação ao comando, e a cor espera por ele. A 35 000 pps
     são ~115 µs. Nosso driver mandava posição e cor da mesma amostra: o feixe acende antes de o espelho chegar e
     apaga antes de ele terminar o traço (ponta de letra borrada, canto "comido").
   - proteção de ponto parado: se o feixe fica parado (distância < 0,003 entre amostras) por tempo demais, a cor é
     reduzida gradualmente (média móvel 0,99/0,01). Zona morta e desligamento ficam em `ldDeadzoneFilter`.
   - há ainda um redutor de escala lento (3e-5 por amostra) quando o movimento médio em 1200 amostras passa de 0,04,
     condicionado a um bit de modo do quadro cujo valor padrão **não foi lido** (inferência: desligado em uso normal,
     porque o texto do LaserOS não encolhe).
3. zona morta (`ldDeadzoneFilter::processFrame`).

Conversão para a amostra do cubo (`ldCompressedSample`): r, g, b em **8 bits** (0..255) e x, y em 12 bits, com
**x invertido** (`0xfff - x`) — por isso o nosso "espelhar horizontal" é o padrão certo. Na hora de mandar
(`processSamples`), a `laserdocklib` monta 10 bytes por amostra: x, y, r·16, g·16, b·16 (cor máxima 4080, não 4095).

## 3. Como ele enche o buffer do cubo (`ldThreadedDataWorker::run` + `laserdocklib`)

Laço do fio de envio, por iteração:

1. `getBufferConfig()` — estratégia por tipo de conexão (abaixo).
2. `count` = quantas amostras o cubo tem no buffer = `tamanho − livre` (livre vem das respostas `8a` a cada pacote e
   do pacote de informações `77`; entre respostas a `laserdocklib` soma **30 amostras por ms** ao livre, fixo, não a
   taxa real).
3. consumo desde a última volta = `taxa/1000 × ms`.
4. quanto mandar (aparelho de rede):
   - se `count < alvo` (2000 no modo Wi-Fi Server): manda `min(disponível no quadro, alvo − count)`;
   - senão: manda `min(disponível, consumo desde a última volta)`.
5. `ldFrameBuffer::get` entrega esses pontos; `sendData` → `send_samples` → fila da `laserdocklib`.
6. **dorme 4 ms** (`std::this_thread::sleep_for`; o campo "12 ms" da configuração só vale sem aparelho ativo).
7. se o quadro acabou: `reset` → sinal `isCleaned` → o próximo quadro é desenhado (bloqueante, item 1).

A `laserdocklib`, ao receber `SamplesReady`, manda de uma vez `min(fila, livre estimado, 20 × 140)` em pacotes de
140 amostras (`[a9 00 nº-do-pacote nº-do-lote] + 140 × 10 bytes`); o nº do lote muda a cada chamada. Fila acima de
8000 amostras é descartada ("thread queue exceeded limit").

### Estratégia por tipo de conexão (`ldDeviceBufferConfigDelegator`, construtor)

Estrutura de 7 inteiros: [limiar do buffer (0xa0), **alvo de amostras no cubo**, espera sem aparelho (ms), ?, ?,
**amostras por pacote**, **pacotes por lote**]. Os campos 4 e 5 não são lidos em `ldCore.dll` (talvez no `LaserOS.exe`).

| Conexão | limiar 0xa0 | alvo no cubo | espera | ? | ? | amostras/pacote | pacotes/lote |
|---|---|---|---|---|---|---|---|
| USB | 768 | 1024 | 12 | 6 | 0 | 0 | 0 |
| **Wi-Fi Server** (nosso caso, e o padrão) | 600 | **2000** | 12 | 4 | 10 | **140** | **20** |
| Wi-Fi Server multi-cliente | 600 | 2500 | 12 | 5 | 10 | 140 | 10 |
| Wi-Fi Client | 700 | 1800 | 12 | 6 | 4 | 80 | 20 |
| Dual Wi-Fi Client | 700 | 1500 | 12 | 6 | 8 | 140 | 10 |
| Ethernet Server / Client | 700 | 1800 | 12 | 6 | 4 | 80 | 20 |
| Dual Ethernet Client | 700 | 1800 | 12 | 6 | 4 | 140 | 10 |

Os dois últimos campos vão para `set_max_udp_samples_per_xfer` / `set_max_udp_packets_per_xfer` da `laserdocklib`.
O limiar só é mandado (`0xa0`) a aparelhos novos (ver WIFI.md); o cubo de teste não recebe.

Ou seja: com buffer de 6000, o LaserOS mantém o cubo com **~2000 amostras** (um terço, ~57 ms a 35 000 pps), não
metade. Com o nosso driver em 50 % o atraso é maior, mas isso não causa piscar.

## 4. Diferenças que valiam contra o nosso driver (e o que foi feito em 2026-10-15)

| Item | LaserOS | Projecionista antes | Agora |
|---|---|---|---|
| Cor × posição | cor atrasada 4 amostras | mesma amostra | `colorShift` = 4 (ajustável em "Atraso da cor") |
| Repasses por segundo | 45 fixos (quadro = pps ÷ 45) | 60 (quadro = pps ÷ 60; 25 % menos pontos por traço) | padrão 45; arquivos com o 60 imposto antes voltam a 45 |
| Reamostragem | acesos por passo, apagados 1:1, completa com apagados | igual | igual |
| Cor | 8 bits × 16 (máx. 4080) | 12 bits (máx. 4095) | igual (diferença irrelevante) |
| Alvo no buffer | 2000 de 6000 | 50 % (3000) | mantido 50 % (mais folga contra perda de Wi-Fi) |
| Período do envio | 4 ms, fio dedicado | 4 ms, `setInterval` no processo principal | igual (sujeito ao relógio do Electron) |
| Troca de quadro | só quando o anterior acabou | só no fim da volta | igual |

## Em aberto

- Valor padrão dos bits de modo do quadro (`ldFilterBasicData+0x28`) que ligam a proteção de ponto parado e o
  redutor de escala; os campos 4 e 5 da estratégia de buffer.
- O que `ldDeadzoneFilter` faz com o brilho (não lido).
- Captura de rede do LaserOS **com a saída ligada** continua valendo como prova final: o script
  `cap-laseros.ps1` está no scratchpad da sessão de 2026-10-14; conferir no LaserOS o indicador de saída antes.
