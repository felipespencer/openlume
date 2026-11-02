// Webcam virtual: um utilityProcess escreve os quadros na memória compartilhada que a câmera virtual do OBS lê; ela aparece como
// "OBS Virtual Camera" nos programas de vídeo, com o OBS instalado e fechado. Código nosso; do OBS vem só o formato da memória (OBS 33):
//   cabeçalho de 80 bytes: write_idx 0, read_idx 4, state 8 (1 iniciando, 2 pronto, 3 parando), offsets[3] 12, type 24, cx 28, cy 32, interval (u64, 100 ns) 40;
//   três quadros alinhados a 32 bytes, cada um com 32 bytes de cabeçalho (timestamp u64 em ns) + NV12. O índice é o contador % 3.
// Fica fora da janela para a escrita não atrapalhar o desenho. A janela fala direto com este processo por MessagePort.
const { execFileSync } = require('child_process');
const NOME = 'OBSVirtualCamVideo', CLSID = '{A3FCE0F5-3493-419F-958A-ABA1250EC20B}';
const ACESSO_TOTAL = 0xF001F, LEITURA = 4, RW = 0x04;
let k32 = null, koffiErr = '', koffi = null;
try {
  koffi = require('koffi');
  const lib = koffi.load('kernel32.dll');
  k32 = {
    criar: lib.func('void* __stdcall CreateFileMappingW(intptr_t hFile, void* attr, uint32_t protect, uint32_t hi, uint32_t lo, str16 name)'),
    abrir: lib.func('void* __stdcall OpenFileMappingW(uint32_t access, int inherit, str16 name)'),
    mapear: lib.func('void* __stdcall MapViewOfFile(void* h, uint32_t access, uint32_t hi, uint32_t lo, size_t n)'),
    desmapear: lib.func('int __stdcall UnmapViewOfFile(void* p)'),
    fechar: lib.func('int __stdcall CloseHandle(void* h)'),
    erro: lib.func('uint32_t __stdcall GetLastError()'),
    // o Electron não aceita ArrayBuffer externo (koffi.view derruba o processo): tudo entra na memória por cópia
    copiar: lib.func('void __stdcall RtlMoveMemory(uintptr_t dst, const void* src, size_t n)'),
  };
} catch (e) { koffiErr = e.message || String(e); }

const al = (n) => (n + 31) & ~31;
let cam = null;   // { h, p, u8, dv, off, FS, W, H, inc, t0 }

// o OBS registra a câmera virtual no Windows ao instalar: sem o registro, a câmera não existe
function obsInstalado() {
  try { execFileSync('reg', ['query', 'HKCR\\CLSID\\' + CLSID + '\\InprocServer32'], { stdio: 'ignore', windowsHide: true }); return true; } catch { return false; }
}
function ligar(W, H) {
  if (cam) return { ok: true };
  if (!k32) return { ok: false, motivo: 'nativo', erro: koffiErr };
  if (process.env.PROJ_WEBCAM_SEM_OBS || !obsInstalado()) return { ok: false, motivo: 'sem-obs' };
  const ja = k32.abrir(LEITURA, 0, NOME);
  if (ja) { k32.fechar(ja); return { ok: false, motivo: 'ocupada' }; }
  const FS = W * H * 3 / 2, off = [al(80)]; off[1] = al(off[0] + FS + 32); off[2] = al(off[1] + FS + 32);
  const total = al(off[2] + FS + 32);
  const h = k32.criar(-1, null, RW, 0, total, NOME); if (!h) return { ok: false, motivo: 'nativo', erro: 'CreateFileMapping ' + k32.erro() };
  const p = k32.mapear(h, ACESSO_TOTAL, 0, 0, 0); if (!p) { k32.fechar(h); return { ok: false, motivo: 'nativo', erro: 'MapViewOfFile ' + k32.erro() }; }
  const cab = Buffer.alloc(80); cab.writeUInt32LE(1, 8); for (let i = 0; i < 3; i++) cab.writeUInt32LE(off[i], 12 + i * 4);
  cab.writeUInt32LE(0, 24); cab.writeUInt32LE(W, 28); cab.writeUInt32LE(H, 32); cab.writeBigUInt64LE(333333n, 40);
  const a = koffi.address(p); k32.copiar(a, cab, 80);
  cam = { h, p, a, off, FS, W, H, inc: 0, t0: Date.now(), ts: Buffer.alloc(8), idx: Buffer.alloc(12) };
  return { ok: true };
}
function escrever(buf) {
  if (!cam) return;
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf); if (bytes.length !== cam.FS) return;
  const inc = ++cam.inc, o = BigInt(cam.off[inc % 3]);
  cam.ts.writeBigUInt64LE(BigInt(Date.now() - cam.t0) * 1000000n, 0); k32.copiar(cam.a + o, cam.ts, 8);
  k32.copiar(cam.a + o + 32n, bytes, bytes.length);
  cam.idx.writeUInt32LE(inc, 0); cam.idx.writeUInt32LE(inc, 4); cam.idx.writeUInt32LE(2, 8); k32.copiar(cam.a, cam.idx, 12);   // só agora o leitor vê o quadro novo
}
function desligar() {
  if (!cam) return;
  const fim = Buffer.alloc(4); fim.writeUInt32LE(3, 0); k32.copiar(cam.a + 8n, fim, 4); k32.desmapear(cam.p); k32.fechar(cam.h); cam = null;
}

process.parentPort.on('message', (ev) => {
  if (ev.data && ev.data.type !== 'port') return;
  const port = ev.ports[0]; if (!port) return;
  port.on('message', (e) => {
    const m = e.data; if (!m) return;
    if (m.type === 'ligar') port.postMessage({ type: 'status', ...ligar(m.W, m.H) });
    else if (m.type === 'quadro') { escrever(m.buf); port.postMessage({ type: 'feito' }); }
    else if (m.type === 'desligar') { desligar(); port.postMessage({ type: 'status', ok: false, motivo: 'desligada' }); }
  });
  port.on('close', desligar);   // a janela fechou ou recarregou: a câmera sai do ar
  port.start();
});
process.on('exit', desligar);
