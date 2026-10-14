// Conversa com o LaserCube pela rede (Wi-Fi), por UDP, no processo principal.
//
// Protocolo (da libLaserdockCore, a biblioteca aberta da Wicked Lasers que o LaserOS usa, e
// do LaserCubeSharp): três portas UDP no aparelho — 45456 só responde "alive", 45457 recebe
// comandos, 45458 recebe os pontos. Comando é um byte seguido do valor; o aparelho responde
// com o mesmo byte na frente. Pontos vão em pacotes de até 140 amostras de x, y, r, g, b
// (u16 little-endian, 0..4095), com cabeçalho [0xa9, 0, nº da mensagem, nº do quadro]; com
// 0x78 ligado, cada pacote de pontos é respondido com quantas amostras cabem no buffer.
//
// Segurança: a saída começa desligada, é desligada ao desconectar e ao fechar o programa, e se
// o controle parar de mandar quadros o laser recebe pontos apagados em vez de repetir o último.
const dgram = require('node:dgram');
const os = require('node:os');
const { EventEmitter } = require('node:events');

const PORT_ALIVE = 45456, PORT_CMD = 45457, PORT_DATA = 45458;
const CMD = { ALIVE: 0x27, INFO: 0x77, BUFFER_REPLIES: 0x78, OUTPUT: 0x80, RATE: 0x82, BUFFER_FREE: 0x8a, CLEAR: 0x8d, DATA: 0xa9 };
const MAX_PTS = 140, MAX_PKTS = 20;

function parseInfo(b, ip) {
  if (b.length !== 64 || b[0] !== CMD.INFO) return null;
  const fwMajor = b[3], fwMinor = b[4], flags = b[5], novo = fwMajor > 0 || fwMinor >= 13;
  const name = b.subarray(38, 64).toString('utf8').split('\0')[0];
  return {
    ip, fw: fwMajor + '.' + fwMinor,
    outputOn: !!(flags & 1), interlock: !!(flags & (novo ? 2 : 8)), tempWarn: !!(flags & (novo ? 4 : 16)), overTemp: !!(flags & (novo ? 8 : 32)),
    rate: b.readUInt32LE(10), maxRate: b.readUInt32LE(14), bufFree: b.readUInt16LE(19), bufSize: b.readUInt16LE(21),
    battery: b[23], temp: b.readInt8(24), serial: [...b.subarray(26, 32)].map(x => x.toString(16).padStart(2, '0')).join(''), name: name || 'LaserCube',
  };
}

class LaserCube extends EventEmitter {
  constructor() {
    super();
    this.ip = null; this.info = null; this.cmd = null; this.data = null;
    this.rate = 30000; this.outputOn = false;
    this.frame = null;          // Uint16Array x,y,r,g,b por ponto (0..4095), repetido em laço
    this.frameAt = 0; this.pos = 0; this.msg = 0; this.frameNo = 0;
    this.bufFree = 0; this.bufSize = 0; this.lastReply = 0;
    this.timer = null; this.poll = null;
  }

  // ---------- descoberta ----------
  // manda 0x77 em broadcast por todas as interfaces e junta quem responder
  discover(ms = 1200) {
    return new Promise((resolve) => {
      const found = new Map();
      const s = dgram.createSocket({ type: 'udp4', reuseAddr: true });
      s.on('message', (b, r) => { const i = parseInfo(b, r.address); if (i) found.set(r.address, i); });
      s.on('error', () => { });
      s.bind(0, () => {
        s.setBroadcast(true);
        const targets = ['255.255.255.255'];
        for (const list of Object.values(os.networkInterfaces())) for (const n of list) {
          if (n.family !== 'IPv4' || n.internal) continue;
          const ip = n.address.split('.').map(Number), mask = n.netmask.split('.').map(Number);
          targets.push(ip.map((x, k) => (x | (~mask[k] & 255))).join('.'));
        }
        for (const t of targets) { try { s.send(Buffer.from([CMD.INFO]), PORT_CMD, t); s.send(Buffer.from([CMD.ALIVE]), PORT_ALIVE, t); } catch { } }
        setTimeout(() => { try { s.close(); } catch { } resolve([...found.values()]); }, ms);
      });
    });
  }

  // ---------- ligação ----------
  async connect(ip) {
    this.disconnect();
    this.ip = ip;
    this.cmd = dgram.createSocket('udp4'); this.data = dgram.createSocket('udp4');
    this.cmd.on('message', (b) => this.onCmd(b)); this.data.on('message', (b) => this.onReply(b));
    this.cmd.on('error', (e) => this.emit('error', e.message)); this.data.on('error', (e) => this.emit('error', e.message));
    await new Promise(r => this.cmd.bind(0, r)); await new Promise(r => this.data.bind(0, r));
    this.send(CMD.OUTPUT, [0]);                 // nunca começa ligado
    this.send(CMD.CLEAR, [0]);
    this.send(CMD.BUFFER_REPLIES, [1]);
    this.send(CMD.INFO);
    const info = await this.waitInfo(1500);
    if (!info) { this.disconnect(); throw new Error('O LaserCube em ' + ip + ' não respondeu'); }
    this.setRate(Math.min(this.rate, info.maxRate || this.rate));
    this.bufSize = info.bufSize; this.bufFree = info.bufFree;
    this.timer = setInterval(() => this.pump(), 4);
    this.poll = setInterval(() => { this.send(CMD.INFO); if (Date.now() - this.lastReply > 300) this.send(CMD.BUFFER_FREE); }, 500);
    this.emit('status', this.status());
    return info;
  }
  waitInfo(ms) {
    return new Promise((resolve) => {
      const t = setTimeout(() => { this.off('info', h); resolve(null); }, ms);
      const h = (i) => { clearTimeout(t); resolve(i); };
      this.once('info', h);
    });
  }
  disconnect() {
    if (this.cmd) { try { this.send(CMD.OUTPUT, [0]); } catch { } }
    clearInterval(this.timer); clearInterval(this.poll); this.timer = this.poll = null;
    for (const s of [this.cmd, this.data]) { if (s) { try { s.close(); } catch { } } }
    this.cmd = this.data = null; this.ip = null; this.info = null; this.outputOn = false; this.frame = null;
    this.emit('status', this.status());
  }
  send(cmd, payload = []) { if (this.cmd && this.ip) this.cmd.send(Buffer.from([cmd, ...payload]), PORT_CMD, this.ip); }
  setOutput(on) { this.outputOn = !!on; this.send(CMD.OUTPUT, [on ? 1 : 0]); if (!on) this.send(CMD.CLEAR, [0]); this.emit('status', this.status()); }
  setRate(r) { this.rate = Math.max(1000, Math.min(this.info && this.info.maxRate || 60000, r | 0)); const b = Buffer.alloc(4); b.writeUInt32LE(this.rate); this.send(CMD.RATE, [...b]); }
  onCmd(b) {
    if (b[0] === CMD.INFO) { const i = parseInfo(b, this.ip); if (i) { this.info = i; this.emit('info', i); this.emit('status', this.status()); } }
    else if (b[0] === CMD.BUFFER_FREE && b.length >= 4) { this.bufFree = b.readUInt16LE(2); this.lastReply = Date.now(); }
  }
  onReply(b) { if (b[0] === CMD.BUFFER_FREE && b.length >= 4) { this.bufFree = b.readUInt16LE(2); this.lastReply = Date.now(); } }
  status() {
    return { connected: !!this.ip, ip: this.ip, outputOn: this.outputOn, rate: this.rate, bufFree: this.bufFree, bufSize: this.bufSize, info: this.info };
  }

  // ---------- pontos ----------
  // o controle manda o quadro inteiro (x y r g b por ponto); aqui ele é repetido em laço
  setFrame(u16) { this.frame = u16 && u16.length >= 5 ? u16 : null; this.frameAt = Date.now(); if (this.pos >= (this.frame ? this.frame.length / 5 : 0)) this.pos = 0; }
  pump() {
    if (!this.data || !this.ip || !this.outputOn) return;
    let frame = this.frame;
    // sem quadro novo há mais de um segundo: o laser recebe pontos apagados, não o último desenho
    if (!frame || Date.now() - this.frameAt > 1000) frame = BLANK;
    const n = frame.length / 5;
    // mantém o buffer do aparelho com pelo menos metade cheio; sem resposta recente, manda devagar
    const stale = Date.now() - this.lastReply > 250, now = Date.now();
    let budget = stale ? Math.min(MAX_PTS, Math.round(this.rate * 0.004)) : Math.max(0, this.bufFree - Math.floor(this.bufSize / 2));
    // nunca mais do que o laser consome, mesmo que o buffer diga que cabe: balde de fichas com
    // até 100 ms de pontos, reabastecido pela taxa
    if (this.pumpAt == null) { this.pumpAt = now; this.tokens = this.rate * 0.1; }
    this.tokens = Math.min(this.rate * 0.1, this.tokens + this.rate * (now - this.pumpAt) / 1000); this.pumpAt = now;
    budget = Math.min(budget, Math.floor(this.tokens));
    let pkts = 0;
    while (budget > 0 && pkts < MAX_PKTS) {
      const cnt = Math.min(MAX_PTS, budget, n - this.pos);
      const b = Buffer.alloc(4 + cnt * 10);
      b[0] = CMD.DATA; b[1] = 0; b[2] = this.msg; b[3] = this.frameNo;
      for (let i = 0; i < cnt; i++) {
        const p = (this.pos + i) * 5, o = 4 + i * 10;
        b.writeUInt16LE(frame[p], o); b.writeUInt16LE(frame[p + 1], o + 2); b.writeUInt16LE(frame[p + 2], o + 4); b.writeUInt16LE(frame[p + 3], o + 6); b.writeUInt16LE(frame[p + 4], o + 8);
      }
      this.data.send(b, PORT_DATA, this.ip);
      this.msg = (this.msg + 1) & 0xff; this.pos += cnt; budget -= cnt; this.bufFree -= cnt; this.tokens -= cnt; pkts++;
      if (this.pos >= n) { this.pos = 0; this.frameNo = (this.frameNo + 1) & 0xff; if (frame !== this.frame) break; }
    }
  }
}
const BLANK = new Uint16Array(Array(20).fill([2048, 2048, 0, 0, 0]).flat());

module.exports = { LaserCube, parseInfo, CMD, PORT_ALIVE, PORT_CMD, PORT_DATA };
