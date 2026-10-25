// Cliente da API REST do Resolume (Arena 7.26, servidor web na porta 8080) para a bancada de comparação.
// Uso:
//   node tools/compare/resolume.mjs fichas                 -> lista de efeitos de vídeo com todos os controles
//   node tools/compare/resolume.mjs abrir <arquivo>        -> abre o arquivo na camada 1, coluna 2, e dispara
//   node tools/compare/resolume.mjs efeito <nome>          -> deixa só esse efeito na camada 1 (além do Transform)
//   node tools/compare/resolume.mjs valor <controle> <v>   -> muda um controle do efeito posto
//   node tools/compare/resolume.mjs limpar                 -> tira os efeitos da camada 1
// Só usa a API pública do Resolume; nenhum código dele entra no OpenLume.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API = process.env.RESOLUME_API || 'http://127.0.0.1:8080/api/v1';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');

async function req(method, url, body) {
  const r = await fetch(API + url, { method, headers: body != null ? { 'Content-Type': typeof body === 'string' ? 'text/plain' : 'application/json' } : {}, body: body == null ? undefined : typeof body === 'string' ? body : JSON.stringify(body) });
  if (!r.ok) throw new Error(`${method} ${url} -> ${r.status} ${await r.text()}`);
  const t = await r.text(); return t ? JSON.parse(t) : null;
}
export const get = url => req('GET', url);

export async function layerEffects(layer = 1) { return (await get(`/composition/layers/${layer}`)).video.effects; }

// Tira todos os efeitos que podem sair (o Transform da camada fica)
export async function limpar(layer = 1) {
  const fx = await layerEffects(layer);
  for (let i = fx.length; i >= 1; i--) if (fx[i - 1].is_user_removable !== false) await req('DELETE', `/composition/layers/${layer}/effects/video/${i - 1}`);
}

export async function efeito(nome, layer = 1) {
  await limpar(layer);
  await req('POST', `/composition/layers/${layer}/effects/video/add`, `effect:///video/${encodeURIComponent(nome)}`);
  const fx = await layerEffects(layer);
  return fx[fx.length - 1];
}

// Muda um controle pelo id. Faixa: número; liga/desliga: true/false; lista: o texto da opção; cor: "#rrggbbaa"
export async function valor(nomeControle, v, layer = 1) {
  const fx = await layerEffects(layer), e = fx[fx.length - 1], p = e.params[nomeControle];
  if (!p) throw new Error(`"${e.name}" não tem o controle "${nomeControle}". Tem: ${Object.keys(e.params).join(', ')}`);
  const value = p.valuetype === 'ParamRange' ? Number(v) : p.valuetype === 'ParamBoolean' ? (v === true || v === 'true' || v === '1') : String(v);
  await req('PUT', `/parameter/by-id/${p.id}`, { value });
  return { id: p.id, value };
}

// usa a casa 2 da camada 1: abrir arquivo numa casa já usada mantém o tamanho do clipe que estava lá
export async function abrir(arquivo, layer = 1, clip = 2) {
  const abs = path.resolve(arquivo).replace(/\\/g, '/');
  await req('POST', `/composition/layers/${layer}/clips/${clip}/open`, 'file:///' + abs.split('/').map(encodeURIComponent).join('/').replace(/^([A-Za-z])%3A/, '$1:'));
  await req('POST', `/composition/layers/${layer}/clips/${clip}/connect`);
}

// Ficha de um parâmetro: só o que importa para igualar os controles
function ficha(nome, p) {
  const v = p.view || {};
  return { nome, tipo: p.valuetype, min: p.min, max: p.max, padrao: p.value, opcoes: p.options, unidade: (v.suffix || '').replace('Â', '').trim() || undefined, passo: v.step, controle: v.control_type };
}

async function fichas() {
  const lista = (await get('/effects')).video;
  const out = [];
  for (const e of lista) {
    let params = [], erro;
    try {
      const posto = await efeito(e.name);
      params = Object.entries(posto.params).map(([k, p]) => ficha(k, p));
      if (posto.mixer) params.push(...Object.entries(posto.mixer).filter(([, p]) => p && p.valuetype).map(([k, p]) => ({ ...ficha(k, p), mixer: true })));
    } catch (err) { erro = String(err.message || err); }
    out.push({ nome: e.name, id: e.idstring, descricao: e.description, presets: (e.presets || []).map(p => p.name), params, erro });
    process.stdout.write(`${e.name}${erro ? ' (erro)' : ''} · `);
  }
  await limpar();
  const dir = path.join(ROOT, 'referencia-resolume', 'extraido');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'effects-rest.json'), JSON.stringify(out, null, 1));
  // FICHAS.md: texto nosso descrevendo os controles (o JSON cru fica fora do git)
  const fmt = x => x == null ? '' : typeof x === 'number' ? String(+x.toFixed(4)) : String(x);
  let md = '# Fichas dos efeitos de vídeo do Resolume\n\nTiradas da API REST do Resolume Arena 7.26 (`GET /effects` + cada efeito posto na camada 1) por\n`node tools/compare/resolume.mjs fichas`. Servem para igualar os controles dos efeitos do OpenLume.\n"Opacity" é a mistura do próprio efeito; aparece em todos.\n';
  for (const e of out) {
    // a descrição é texto do Resolume: fica só no JSON (fora do git)
    md += `\n## ${e.nome}\n\n`;
    if (e.erro) { md += `Não foi possível pôr na camada: ${e.erro}\n`; continue; }
    if (e.presets.length) md += `Presets: ${e.presets.join(', ')}\n\n`;
    md += '| Controle | Tipo | Mín | Máx | Padrão | Opções / unidade |\n|---|---|---|---|---|---|\n';
    for (const p of e.params) md += `| ${p.nome}${p.mixer ? ' (mistura)' : ''} | ${p.tipo.replace('Param', '')} | ${fmt(p.min)} | ${fmt(p.max)} | ${fmt(p.padrao)} | ${p.opcoes ? p.opcoes.join(', ') : fmt(p.unidade)} |\n`;
  }
  fs.writeFileSync(path.join(ROOT, 'referencia-resolume', 'FICHAS.md'), md);
  console.log(`\n${out.length} efeitos; ${out.filter(e => e.erro).length} com erro.`);
}

const [cmd, ...args] = process.argv.slice(2);
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.argv[1].endsWith('resolume.mjs')) {
  const run = { fichas, limpar: () => limpar(), efeito: () => efeito(args.join(' ')).then(e => console.log(JSON.stringify(Object.keys(e.params)))), valor: () => valor(args[0], args[1]).then(r => console.log(r)), abrir: () => abrir(args[0]) }[cmd];
  if (!run) { console.log('comandos: fichas | abrir <arquivo> | efeito <nome> | valor <controle> <v> | limpar'); process.exit(1); }
  run().catch(e => { console.error(e.message || e); process.exit(1); });
}
