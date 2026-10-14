// Misturas e transições, do jeito do Resolume: a mesma lista serve para misturar a camada com o
// que está embaixo (fader de opacidade) e para a transição entre dois clipes da mesma camada
// (o fader corre de 0 a 100 % na duração). Comportamento copiado do que se vê no Resolume:
//   - de 0 a 50 % a camada entra misturando (Add, Multiply, Screen…); de 50 a 100 % a mistura
//     vai virando "camada normal por cima" ou, numa transição, só o clipe novo;
//   - as versões "50" misturam no fader inteiro e nunca viram "normal por cima";
//   - onde um dos lados é transparente, mostra o outro; só mistura onde os dois existem.
// A entrada A é o que está embaixo (ou o clipe antigo), B a camada (ou o clipe novo); as duas
// vêm premultiplicadas, e a saída também. O código GLSL é nosso.
export const MIXERS = [
  // id, nome (como no Resolume), grupo: ps = família Photoshop (duas metades), ps50 = mistura pura, geo = geométrica/especial
  { id: 'alpha', name: 'Alpha' },
  { id: 'add', name: 'Add' }, { id: 'add50', name: '50 Add' },
  { id: 'subtract', name: 'Subtract' }, { id: 'subtract50', name: '50 Subtract' },
  { id: 'multiply', name: 'Multiply' }, { id: 'multiply50', name: '50 Multiply' },
  { id: 'screen', name: 'Screen' },
  { id: 'overlay', name: 'Overlay' }, { id: 'overlay50', name: '50 Overlay' },
  { id: 'softlight', name: 'Soft Light' }, { id: 'hardlight', name: 'Hard Light' },
  { id: 'lighten', name: 'Lighten' }, { id: 'lighten50', name: '50 Lighten' },
  { id: 'darken', name: 'Darken' },
  { id: 'burn', name: 'Burn' }, { id: 'burn50', name: '50 Burn' },
  { id: 'dodge', name: 'Dodge' }, { id: 'dodge50', name: '50 Dodge' },
  { id: 'difference', name: 'Difference' }, { id: 'differencei', name: 'Difference I' }, { id: 'difference50', name: '50 Difference' },
  { id: 'distance50', name: '50 Distance' },
  { id: 'exclusion', name: 'Exclusion' },
  { id: 'blackandwhite', name: 'Black and White' },
  { id: 'lumakey', name: 'Luma Key', smooth: true }, { id: 'lumakeyi', name: 'Luma Key I', smooth: true }, { id: 'lumaisalpha', name: 'Luma Is Alpha' },
  { id: 'mask50', name: '50 Mask' }, { id: 'automask', name: 'Auto Mask' }, { id: 'alphalimiter', name: 'Alpha Limiter', smooth: true },
  { id: 'rgb', name: 'RGB' }, { id: 'shiftrgb', name: 'Shift RGB' },
  { id: 'metamix', name: 'Meta Mix' }, { id: 'multitask', name: 'Multi Task' }, { id: 'parts', name: 'Parts' },
  { id: 'noisy', name: 'Noisy' }, { id: 'static', name: 'Static' }, { id: 'jitterbug', name: 'JitterBug' }, { id: 'twitch', name: 'Twitch Mixer' },
  { id: 'cut', name: 'Cut' }, { id: 'displace', name: 'Displace' }, { id: 'dissolve', name: 'Dissolve', smooth: true },
  { id: 'toblack', name: 'to Black' }, { id: 'towhite', name: 'to White' }, { id: 'tocolor', name: 'to Color', color: true }, { id: 'tocolorexposure', name: 'to Color Exposure', color: true },
  { id: 'pushleft', name: 'Push Left' }, { id: 'pushright', name: 'Push Right' }, { id: 'pushup', name: 'Push Up' }, { id: 'pushdown', name: 'Push Down' },
  { id: 'rotatex', name: 'Rotate X' }, { id: 'rotatey', name: 'Rotate Y' }, { id: 'cube', name: 'Cube' },
  { id: 'sidebyside', name: 'Side by Side' }, { id: 'zoomin', name: 'Zoom In' }, { id: 'zoomout', name: 'Zoom Out' },
  { id: 'wipeellipse', name: 'Wipe Ellipse', smooth: true }, { id: 'timeswitcher', name: 'Time Switcher' },
];
const ALIAS = { normal: 'alpha' };
export const normMixer = (id) => (MIXERS.some(m => m.id === (ALIAS[id] || id)) ? (ALIAS[id] || id) : 'alpha');
export const mixerCode = (id) => Math.max(0, MIXERS.findIndex(m => m.id === normMixer(id)));
export const mixerById = (id) => MIXERS.find(m => m.id === normMixer(id)) || MIXERS[0];
export const MIXER_OPTS = MIXERS.map(m => [m.id, m.name]);
export const MIXER_OPT = () => ({ color: '#000000', smooth: 0.1 });
export const randomMixer = () => MIXERS[1 + Math.floor(Math.random() * (MIXERS.length - 1))].id;
export const hexRgb = (h) => { const n = parseInt((h || '#000000').slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };

// família Photoshop: [id, conta com a (embaixo) e b (camada), despremultiplicadas]; as "50" misturam no fader inteiro
const PS = [
  ['add', 'min(a + b, 1.0)'], ['add50', 'min(a + b, 1.0)'],
  ['subtract', 'max(a - b, 0.0)'], ['subtract50', 'max(a - b, 0.0)'],
  ['multiply', 'a * b'], ['multiply50', 'a * b'],
  ['screen', '1.0 - (1.0 - a) * (1.0 - b)'],
  ['overlay', 'ovl(a, b)'], ['overlay50', 'ovl(a, b)'],
  ['softlight', 'sl(a, b)'], ['hardlight', 'ovl(b, a)'],
  ['lighten', 'max(a, b)'], ['lighten50', 'max(a, b)'],
  ['darken', 'min(a, b)'],
  ['burn', '1.0 - (1.0 - a) / max(b, 0.00001)'], ['burn50', '1.0 - (1.0 - a) / max(b, 0.00001)'],
  ['dodge', 'min(a / max(1.0 - b, 0.00001), 1.0)'], ['dodge50', 'min(a / max(1.0 - b, 0.00001), 1.0)'],
  ['difference', 'abs(a - b)'], ['differencei', '1.0 - abs(a - b)'], ['difference50', 'abs(a - b)'],
  ['distance50', 'vec3(1.0 - distance(a, b) / 1.7321)'],
  ['exclusion', 'a + b - 2.0 * a * b'],
  ['blackandwhite', '(a + b) * 0.5'],
];
const PS_FAMILY = PS.map(([id, expr]) => `vec4 mx_${id}(vec4 A, vec4 B, float k, vec2 uv){ vec3 a = un(A), b = un(B); vec4 bl = psBlend(A, B, ${expr}); return ${id.endsWith('50') ? 'psMixer(A, B, bl, k)' : 'halves(A, B, bl, k)'}; }`).join('\n');

// os casos do switch seguem a ordem de MIXERS
const CASES = MIXERS.map((m, i) => `case ${i}: return mx_${m.id}(A, B, k, uv);`).join('\n');

export const FS_MIX = `#version 300 es
precision highp float; in vec2 v; out vec4 o;
uniform sampler2D uA; uniform sampler2D uB; uniform float uK; uniform int uTrans; uniform int uMode;
uniform vec3 uColor; uniform float uSmooth; uniform float uTime; uniform vec2 uRes; uniform float uSeed;
float lum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
float hash(vec2 p){ return fract(sin(dot(p + uSeed, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; } return s; }
vec4 tA(vec2 uv){ return (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) ? vec4(0.0) : texture(uA, uv); }
vec4 tB(vec2 uv){ return (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) ? vec4(0.0) : texture(uB, uv); }
vec3 un(vec4 c){ return c.a > 0.001 ? c.rgb / c.a : c.rgb; }
vec4 over(vec4 A, vec4 B){ return A * (1.0 - B.a) + B; }
// o fim do fader: numa transição é só o clipe novo; na mistura da camada é "B por cima de A"
vec4 fim(vec4 A, vec4 B){ return uTrans != 0 ? B : over(A, B); }
float pre50(float k){ return min(1.0, k * 2.0); }
float post50(float k){ return max(0.0, (k - 0.5) * 2.0); }
// mistura tipo Photoshop: onde só um lado existe, mostra ele; onde os dois existem, a conta
vec4 psMixer(vec4 A, vec4 B, vec4 blend, float amount){ vec4 r = mix(A, blend, B.a); r = mix(B, r, A.a); return mix(A, r, amount); }
vec4 psBlend(vec4 A, vec4 B, vec3 rgb){ float a = A.a + B.a - A.a * B.a; return vec4(clamp(rgb, 0.0, 1.0) * a, a); }
// as duas metades: até 50 % mistura, de 50 a 100 % vai para o fim
vec4 halves(vec4 A, vec4 B, vec4 blend, float k){ return mix(psMixer(A, B, blend, pre50(k)), fim(A, B), post50(k)); }
vec3 ovl(vec3 A, vec3 B){ return mix(2.0 * A * B, 1.0 - 2.0 * (1.0 - A) * (1.0 - B), step(0.5, A)); }
vec3 sl(vec3 A, vec3 B){ return mix(A - (1.0 - 2.0 * B) * A * (1.0 - A), A + (2.0 * B - 1.0) * (sqrt(A) - A), step(0.5, B)); }
vec4 mx_alpha(vec4 A, vec4 B, float k, vec2 uv){ return mix(A, fim(A, B), k); }
${PS_FAMILY}
vec4 mx_lumakey(vec4 A, vec4 B, float k, vec2 uv){ float th = 1.0 - k, s = uSmooth * 0.5 + 0.002; float m = smoothstep(th - s, th + s, lum(un(B))) * B.a; return mix(A, uTrans != 0 ? B : over(A, B), m); }
vec4 mx_lumakeyi(vec4 A, vec4 B, float k, vec2 uv){ float th = k, s = uSmooth * 0.5 + 0.002; float m = (1.0 - smoothstep(th - s, th + s, lum(un(B)))) * B.a; return mix(A, uTrans != 0 ? B : over(A, B), m); }
vec4 mx_lumaisalpha(vec4 A, vec4 B, float k, vec2 uv){ float l = lum(un(B)); vec4 Bm = vec4(un(B) * l * B.a, l * B.a); return mix(A, uTrans != 0 ? Bm : over(A, Bm), k); }
vec4 mx_mask50(vec4 A, vec4 B, float k, vec2 uv){ return A * mix(1.0, B.a, k); }
vec4 mx_automask(vec4 A, vec4 B, float k, vec2 uv){ return A * mix(1.0, lum(un(B)) * B.a, k); }
vec4 mx_alphalimiter(vec4 A, vec4 B, float k, vec2 uv){ float s = uSmooth * 0.5 + 0.002; float m = smoothstep(1.0 - k - s, 1.0 - k + s, B.a); vec4 Bm = vec4(un(B) * m, m); return uTrans != 0 ? mix(A, Bm, m) : over(A, Bm); }
vec4 mx_rgb(vec4 A, vec4 B, float k, vec2 uv){ vec4 F = fim(A, B); vec3 m = clamp(vec3(k * 3.0, k * 3.0 - 1.0, k * 3.0 - 2.0), 0.0, 1.0); return vec4(mix(A.rgb, F.rgb, m), mix(A.a, F.a, max(m.r, max(m.g, m.b)))); }
vec4 mx_shiftrgb(vec4 A, vec4 B, float k, vec2 uv){ float amt = (1.0 - abs(k * 2.0 - 1.0)) * 0.08; vec2 d = vec2(amt, 0.0); vec4 r = mix(tA(uv + d), fim(tA(uv + d), tB(uv + d)), k), g = mix(A, fim(A, B), k), b = mix(tA(uv - d), fim(tA(uv - d), tB(uv - d)), k); return vec4(r.r, g.g, b.b, max(r.a, max(g.a, b.a))); }
vec4 mx_metamix(vec4 A, vec4 B, float k, vec2 uv){ float op = k * 2.0, sub = floor(1.0 + op * 100.0); if (sub < 2.0) return A; vec2 su = floor(uv * sub + 0.5) / sub, mu = fract(uv * sub); vec4 c1 = tB(su); float l = mix(1.0, lum(un(c1)), clamp(op, 0.0, 1.0)); c1 = mix(vec4(1.0), c1, clamp(op, 0.0, 1.0)); vec4 c0 = tA(mu) * vec4(vec3(l), 1.0); return mix(c0, fim(A, B), clamp(op - 1.0, 0.0, 1.0)); }
vec4 mx_multitask(vec4 A, vec4 B, float k, vec2 uv){ float n = floor(1.0 + k * 7.0); vec2 c = floor(uv * n); float ch = mod(c.x + c.y, 2.0); vec2 lu = fract(uv * n); return k >= 1.0 ? fim(A, B) : (ch < 0.5 ? tA(lu) : fim(tA(lu), tB(lu))); }
vec4 mx_parts(vec4 A, vec4 B, float k, vec2 uv){ vec2 c = floor(uv * vec2(12.0, 7.0)); float r = hash(c); return r < k ? fim(A, B) : A; }
vec4 mx_noisy(vec4 A, vec4 B, float k, vec2 uv){ float n = hash(floor(uv * uRes * 0.5) + floor(uTime * 30.0)); return n < k ? fim(A, B) : A; }
vec4 mx_static(vec4 A, vec4 B, float k, vec2 uv){ float amt = 1.0 - abs(k * 2.0 - 1.0); float n = hash(uv * uRes + fract(uTime) * 100.0); vec4 r = mix(A, fim(A, B), k); return mix(r, vec4(vec3(n), 1.0), amt * 0.8); }
vec4 mx_jitterbug(vec4 A, vec4 B, float k, vec2 uv){ float amt = (1.0 - abs(k * 2.0 - 1.0)) * 0.25, t = floor(uTime * 15.0); vec2 ja = (vec2(hash(vec2(t, 1.0)), hash(vec2(t, 2.0))) - 0.5) * amt, jb = (vec2(hash(vec2(t, 3.0)), hash(vec2(t, 4.0))) - 0.5) * amt; return mix(tA(uv + ja), fim(tA(uv + ja), tB(uv + jb)), k); }
vec4 mx_twitch(vec4 A, vec4 B, float k, vec2 uv){ float amt = 1.0 - abs(k * 2.0 - 1.0), t = floor(uTime * 10.0); vec2 j = (vec2(hash(vec2(t, 5.0)), hash(vec2(t, 6.0))) - 0.5) * amt * 0.4; float s = 1.0 + (hash(vec2(t, 7.0)) - 0.5) * amt * 0.6; vec2 p = (uv - 0.5) / s + 0.5 + j; vec4 a = tA(p), b = tB(p); return hash(vec2(t, 8.0)) < k ? fim(a, b) : a; }
vec4 mx_cut(vec4 A, vec4 B, float k, vec2 uv){ return k > 0.5 ? fim(A, B) : A; }
vec4 mx_displace(vec4 A, vec4 B, float k, vec2 uv){ float amt = 1.0 - abs(k - 0.5) * 2.0; float dp = mix((0.5 - lum(un(A))) * amt * A.a, (0.5 - lum(un(B))) * amt * B.a, k); vec4 d = tA(uv + vec2(dp * 0.5, 0.0)); return mix(mix(A, d, pre50(k)), fim(A, B), post50(k)); }
vec4 mx_dissolve(vec4 A, vec4 B, float k, vec2 uv){ float n = fbm(uv * vec2(uRes.x / uRes.y, 1.0) * 6.0); float s = uSmooth * 0.5 + 0.01; float m = 1.0 - smoothstep(k - s, k + s, n); return mix(A, fim(A, B), m); }
vec4 toC(vec4 A, vec4 B, float k, vec3 c){ vec4 C = vec4(c, 1.0); return k < 0.5 ? mix(A, C, k * 2.0) : mix(fim(A, B), C, 1.0 - (k - 0.5) * 2.0); }
vec4 mx_toblack(vec4 A, vec4 B, float k, vec2 uv){ return toC(A, B, k, vec3(0.0)); }
vec4 mx_towhite(vec4 A, vec4 B, float k, vec2 uv){ return toC(A, B, k, vec3(1.0)); }
vec4 mx_tocolor(vec4 A, vec4 B, float k, vec2 uv){ return toC(A, B, k, uColor); }
vec4 mx_tocolorexposure(vec4 A, vec4 B, float k, vec2 uv){ float e = 1.0 - abs(k * 2.0 - 1.0); vec4 r = mix(A, fim(A, B), k); return vec4(min(r.rgb + uColor * e * 1.5 * max(r.a, e), vec3(1.0)), max(r.a, e)); }
// geométricas: na transição o clipe antigo (A) sai e o novo (B) entra; na mistura da camada o
// que está embaixo (A) fica parado e só a camada (B) entra
vec4 push(vec4 A, vec4 B, float k, vec2 uv, vec2 dir){ vec4 b = tB(uv + dir * (k - 1.0)); return uTrans != 0 ? over(tA(uv + dir * k), b) : over(A, b); }
vec4 mx_pushleft(vec4 A, vec4 B, float k, vec2 uv){ return push(A, B, k, uv, vec2(1.0, 0.0)); }
vec4 mx_pushright(vec4 A, vec4 B, float k, vec2 uv){ return push(A, B, k, uv, vec2(-1.0, 0.0)); }
vec4 mx_pushup(vec4 A, vec4 B, float k, vec2 uv){ return push(A, B, k, uv, vec2(0.0, 1.0)); }
vec4 mx_pushdown(vec4 A, vec4 B, float k, vec2 uv){ return push(A, B, k, uv, vec2(0.0, -1.0)); }
// carta virando: na transição A vira até ficar de lado (50 %) e B vira de volta; na mistura só B vira para dentro
vec4 flipCard(vec4 A, vec4 B, float k, vec2 uv, bool axisX){
  float c = uTrans != 0 ? abs(cos(k * 3.14159265)) : sin(k * 1.5707963);
  vec2 p = uv - 0.5; if (axisX) p.y /= max(c, 0.001); else p.x /= max(c, 0.001); p += 0.5;
  float shade = 0.6 + 0.4 * c;
  if (uTrans != 0) { vec4 face = k < 0.5 ? tA(p) : tB(p); face.rgb *= shade; return face; }
  vec4 face = tB(p); face.rgb *= shade; return over(A, face);
}
vec4 mx_rotatex(vec4 A, vec4 B, float k, vec2 uv){ return flipCard(A, B, k, uv, true); }
vec4 mx_rotatey(vec4 A, vec4 B, float k, vec2 uv){ return flipCard(A, B, k, uv, false); }
vec4 mx_cube(vec4 A, vec4 B, float k, vec2 uv){ float w = 1.0 - k; if (uv.x >= w) { vec4 b = tB(vec2((uv.x - w) / max(k, 0.001), uv.y)); b.rgb *= 0.5 + 0.5 * k; return uTrans != 0 ? b : over(A, b); } if (uTrans == 0) return A; vec4 a = tA(vec2(uv.x / max(w, 0.001), uv.y)); a.rgb *= 1.0 - 0.5 * k; return a; }
vec4 mx_sidebyside(vec4 A, vec4 B, float k, vec2 uv){ float w = 1.0 - k; if (uv.x >= w) { vec4 b = tB(vec2((uv.x - w) / max(k, 0.001), uv.y)); return uTrans != 0 ? b : over(A, b); } return uTrans != 0 ? tA(vec2(uv.x / max(w, 0.001), uv.y)) : A; }
vec4 mx_zoomin(vec4 A, vec4 B, float k, vec2 uv){ if (k >= 1.0) return fim(A, B); float s = max(k, 0.001); vec2 p = (uv - 0.5) / s + 0.5; return over(A, tB(p)); }
vec4 mx_zoomout(vec4 A, vec4 B, float k, vec2 uv){ if (uTrans != 0) { if (k >= 1.0) return B; float s = max(1.0 - k, 0.001); return over(B, tA((uv - 0.5) / s + 0.5)); } float z = 1.0 + 4.0 * (1.0 - k); return over(A, tB((uv - 0.5) / z + 0.5) * k); }
vec4 mx_wipeellipse(vec4 A, vec4 B, float k, vec2 uv){ float d = length((uv - 0.5) * vec2(uRes.x / uRes.y, 1.0)) / length(vec2(uRes.x / uRes.y, 1.0) * 0.5); float s = uSmooth * 0.5 + 0.005; float m = 1.0 - smoothstep(k - s, k + s, d); return mix(A, fim(A, B), m); }
vec4 mx_timeswitcher(vec4 A, vec4 B, float k, vec2 uv){ float t = floor(uTime * 12.0); return hash(vec2(t, 9.0)) < k ? fim(A, B) : A; }
vec4 mixer(vec4 A, vec4 B, float k, vec2 uv){
  switch (uMode) {
${CASES}
  }
  return mix(A, fim(A, B), k);
}
void main(){ vec4 A = texture(uA, v), B = texture(uB, v); o = clamp(mixer(A, B, clamp(uK, 0.0, 1.0), v), 0.0, 1.0); }
`;
