# LaserOS: a ligação por Wi-Fi (análise com o REA, 2026-10-14)

Alvo: LaserOS 0.18.1 BETA (build de 10/12/2025), instalado em `C:\Program Files\LaserOS`.
Ferramenta: REA com Ghidra 12.1.4. Arquivos lidos: `laserdocklib.dll` (a classe
`LaserdockNetworkDevice`, onde mora o protocolo) e as cadeias de texto de `ldCore.dll`.
Tudo abaixo é **observado no código do aparelho de rede**; o que é inferência está marcado.

## O que o LaserOS faz (observado)

| Assunto | Valor |
|---|---|
| Descoberta ("alive") | 1 byte `0x27`, em broadcast de cada interface IPv4 ativa, porta UDP **45456** (`0xb190`). Resposta válida: exatamente `27 00`. |
| Comandos | UDP **45457** (`0xb191`) do aparelho. O LaserOS liga o próprio soquete de comandos na 45457 e o de pontos na **45458** (`0xb192`); buffers de 5 250 000 bytes. |
| Informações | Comando `0x77`. O LaserOS manda no início e **a cada 250 ms**. Se passar **4 s sem resposta**, o aparelho é dado como desconectado. |
| Resposta de informações | 64 bytes, byte 2 igual a 0. Campos: 3 firmware maior, 4 firmware menor, 5 flags, 10–13 taxa, 14–17 taxa máxima, 19–20 buffer livre, 21–22 tamanho do buffer, 23 bateria, 24 temperatura (com sinal), 25 tipo de conexão (+1), 26–31 número de série, 32–35 IP, 37 número do modelo, 38… nome do modelo (texto terminado em zero). |
| Flags | Bit 0 = saída ligada. Firmware ≥ 0.13: bit 1 interlock, bit 2 aviso de temperatura, bit 3 superaquecimento, **bits 4–7 = contagem de erros de pacote**. Firmware < 0.13: bit 3 interlock, 4 aviso, 5 superaquecimento. |
| Buffer livre | Resposta `8a 00 lo hi` (4 bytes) a cada pacote de pontos, com `0x78` ligado. |
| Pontos | Pacotes `[0xa9, 0, n, l, …]`: **byte 2 = contador por pacote**, **byte 3 = contador que muda a cada lote** enviado; depois 140 amostras de 10 bytes (x, y, r, g, b em u16 LE). Até 20 pacotes por lote. |
| Ritmo | Estima o buffer livre sozinho (somando 30 amostras por ms) e manda no máximo o que cabe. Fila interna passou de 8000 amostras: limpa. |
| Comandos críticos | Enviados **em duplicata** (`send_command` com repetição), porque UDP por Wi-Fi perde pacote. |
| Limiar do buffer | Comando `0xa0` + u32: só em aparelho novo (modelo ≥ 10, firmware maior ≥ 2 ou menor ≥ 0x18). O cubo de teste (fw 0.17, modelo 5) **não** usa. |
| Estratégia por tipo de conexão | Há ajustes distintos para `CON_WIFI_SERVER`, `CON_WIFI_SERVER_MULTI_CLIENT`, `CON_WIFI_CLIENT` e `CON_DUAL_WIFI_CLIENT` (textos em `ldCore.dll`). Os números não foram lidos. |
| Autenticação | Existe um aperto de mão opcional: `0xb0` + desafio vai ao aparelho, que responde `0xb1 00 00` + resposta; quem gera e confere os dados é código do aplicativo (`LaserOS.exe`), não da biblioteca. O LaserCube de teste **não exige** isso para receber pontos. Não foi investigado nem copiado. |

## O que o cubo de teste mostrou (observado, com o aparelho real)

- "Wifi LaserCube 7.5W", firmware 0.17, modelo 5, tipo de conexão 2, 35 000 pontos por segundo no máximo, buffer de 6000.
- Modo "WiFi Server": o PC entra na rede **LaserCube** (192.168.1.x) e o cubo é o 192.168.1.1.
- A bateria passou a ler **255** com o carregador ligado (inferência: 255 = ligado na energia).
- O desenho sai **espelhado na horizontal** com o mapeamento padrão; por isso o módulo de laser agora vem com "Espelhar saída → Horizontal".
- Com o driver novo, 10 s de transmissão a 30 000 pontos por segundo: **0 erros de pacote**, buffer estável em metade.

## O que mudou no `lasercube.js` por causa disso

1. Pergunta o estado a cada 250 ms e se desconecta (desligando a saída) se passar 4 s sem resposta.
2. "Saída desligada", "limpar" e a etapa de segurança ao conectar saem em duplicata.
3. Contador do byte 3 do pacote de pontos muda por lote, como no LaserOS.
4. `parseInfo` lê também erros de pacote, tipo de conexão, modelo e o IP que o próprio cubo informa.

## Em aberto

- ~~Valores numéricos da estratégia de buffer por tipo de conexão~~ — lidos em 2026-10-15, ver `QUADROS-E-BUFFER.md`
  (Wi-Fi Server: alvo de 2000 amostras no cubo, 140 por pacote, 20 pacotes por lote, laço de 4 ms).
- Modos "WiFi Client" e "LAN": o cubo entrando na rede de casa; só o "WiFi Server" foi testado.
- Mudar o modo ou a senha do cubo: não é feito por este protocolo (usa o botão do aparelho ou a página web dele).
