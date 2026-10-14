// Efeitos de vídeo, com os nomes do Resolume. Cada um é um trecho de GLSL ES 3.0 com a função
// `vec4 fx(vec2 uv)`, lendo a entrada em uTex (premultiplicada), uRes (largura, altura), uTime e
// os parâmetros como uniforms float. O motor monta o programa (ver engine.js, applyChain).
// Um efeito pode ir num clipe, numa camada ou na composição.
import { MORE } from './effects2.js';
const P = (key, label, def, min, max, step = 0.01, unit = '') => ({ key, label, def, min, max, step, unit });
const HELPERS = `
float lum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec3 hsv2rgb(vec3 c){ vec3 p = abs(fract(c.xxx + vec3(0.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0); return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y); }
vec3 rgb2hsv(vec3 c){ vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0); vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g)); vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r)); float d = q.x - min(q.w, q.y); float e = 1.0e-10; return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x); }
vec4 tex(vec2 uv){ return texture(uTex, clamp(uv, 0.0, 1.0)); }
vec4 texIn(vec2 uv){ return (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) ? vec4(0.0) : texture(uTex, uv); }
// cor sem a multiplicação pelo alfa, e de volta
vec3 un(vec4 c){ return c.a > 0.001 ? c.rgb / c.a : c.rgb; }
vec4 pre(vec3 rgb, float a){ return vec4(clamp(rgb, 0.0, 1.0) * a, a); }
vec4 over(vec4 a, vec4 b){ return a * (1.0 - b.a) + b; }
vec2 rot2(vec2 p, float a){ float c = cos(a), s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }
float ar(){ return uRes.x / uRes.y; }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
// a saída deste efeito no quadro anterior (só nos efeitos com feedback)
vec4 prv(vec2 uv){ return texture(uPrev, clamp(uv, 0.0, 1.0)); }
`;
const BASE = [
  { id: 'blur', name: 'Blur', desc: 'Desfoca a imagem.', params: [P('amount', 'Quantidade', 0.3, 0, 1)], glsl: `vec4 fx(vec2 uv){ vec4 s = vec4(0.0); float r = amount * 12.0; for (int i = -3; i <= 3; i++) for (int j = -3; j <= 3; j++) s += tex(uv + vec2(float(i), float(j)) * r / uRes); return s / 49.0; }` },
  { id: 'radialblur', name: 'RadialBlur', desc: 'Borrão em volta do centro, como zoom em movimento.', params: [P('amount', 'Quantidade', 0.3, 0, 1)], glsl: `vec4 fx(vec2 uv){ vec4 s = vec4(0.0); vec2 d = (uv - 0.5) * amount * 0.15; for (int i = 0; i < 12; i++) s += tex(uv - d * float(i)); return s / 12.0; }` },
  { id: 'brightcontrast', name: 'Bright.Contrast', desc: 'Ajusta brilho e contraste.', params: [P('bright', 'Brilho', 0, -1, 1), P('contrast', 'Contraste', 0, -1, 1)], glsl: `vec4 fx(vec2 uv){ vec4 c = tex(uv); vec3 r = un(c) + bright; r = (r - 0.5) * (1.0 + contrast) + 0.5; return pre(r, c.a); }` },
  { id: 'exposure', name: 'Exposure', desc: 'Exposição, como na câmera.', params: [P('ev', 'Exposição', 0, -3, 3, 0.05)], glsl: `vec4 fx(vec2 uv){ vec4 c = tex(uv); return pre(un(c) * pow(2.0, ev), c.a); }` },
  { id: 'saturation', name: 'Saturation', desc: 'Mais ou menos cor.', params: [P('amount', 'Saturação', 1, 0, 3, 0.01)], glsl: `vec4 fx(vec2 uv){ vec4 c = tex(uv); vec3 r = un(c); return pre(mix(vec3(lum(r)), r, amount), c.a); }` },
  { id: 'huerotate', name: 'Hue Rotate', desc: 'Gira as cores pela roda de matiz, com velocidade.', params: [P('hue', 'Matiz', 0, 0, 1), P('speed', 'Velocidade', 0, -2, 2, 0.05)], glsl: `vec4 fx(vec2 uv){ vec4 c = tex(uv); vec3 h = rgb2hsv(un(c)); h.x = fract(h.x + hue + uTime * speed * 0.2); return pre(hsv2rgb(h), c.a); }` },
  { id: 'invertrgb', name: 'Invert RGB', desc: 'Inverte cada canal de cor.', params: [P('r', 'Vermelho', 1, 0, 1, 1), P('g', 'Verde', 1, 0, 1, 1), P('b', 'Azul', 1, 0, 1, 1)], glsl: `vec4 fx(vec2 uv){ vec4 c = tex(uv); vec3 u = un(c); return pre(mix(u, 1.0 - u, vec3(r, g, b)), c.a); }` },
  { id: 'tint', name: 'Tint', desc: 'Tinge a imagem com uma cor.', params: [P('hue', 'Matiz', 0.6, 0, 1), P('amount', 'Quantidade', 0.7, 0, 1)], glsl: `vec4 fx(vec2 uv){ vec4 c = tex(uv); vec3 u = un(c); return pre(mix(u, lum(u) * hsv2rgb(vec3(hue, 1.0, 1.0)), amount), c.a); }` },
  { id: 'colorize', name: 'Colorize', desc: 'Pinta os escuros com uma cor e os claros com outra.', params: [P('hue1', 'Matiz escuro', 0.65, 0, 1), P('hue2', 'Matiz claro', 0.1, 0, 1)], glsl: `vec4 fx(vec2 uv){ vec4 c = tex(uv); float l = lum(un(c)); return pre(mix(hsv2rgb(vec3(hue1, 1.0, 0.4)), hsv2rgb(vec3(hue2, 0.6, 1.0)), l), c.a); }` },
  { id: 'posterize', name: 'Posterize', desc: 'Reduz as cores a poucos níveis.', params: [P('levels', 'Níveis', 4, 2, 16, 1)], glsl: `vec4 fx(vec2 uv){ vec4 c = tex(uv); return pre(floor(un(c) * levels) / (levels - 1.0), c.a); }` },
  { id: 'threshold', name: 'Threshold', desc: 'Preto e branco por limiar.', params: [P('level', 'Limiar', 0.5, 0, 1)], glsl: `vec4 fx(vec2 uv){ vec4 c = tex(uv); return pre(vec3(step(level, lum(un(c)))), c.a); }` },
  { id: 'edgedetection', name: 'Edge Detection', desc: 'Só as bordas.', params: [P('amount', 'Intensidade', 1, 0, 3, 0.05)], glsl: `vec4 fx(vec2 uv){ vec2 d = 1.0 / uRes; float gx = lum(tex(uv + vec2(d.x, 0.0)).rgb) - lum(tex(uv - vec2(d.x, 0.0)).rgb); float gy = lum(tex(uv + vec2(0.0, d.y)).rgb) - lum(tex(uv - vec2(0.0, d.y)).rgb); float e = clamp(length(vec2(gx, gy)) * 4.0 * amount, 0.0, 1.0); return vec4(vec3(e) * tex(uv).a, tex(uv).a); }` },
  { id: 'dotscreen', name: 'Dot Screen', desc: 'Retícula de pontos, como impressão.', params: [P('size', 'Tamanho', 8, 2, 40, 1, ' px'), P('angle', 'Ângulo', 0.4, 0, 3.14, 0.01)], glsl: `vec4 fx(vec2 uv){ vec4 c = tex(uv); float l = lum(un(c)); vec2 p = uv * uRes; float s = sin(angle), co = cos(angle); vec2 q = vec2(co * p.x - s * p.y, s * p.x + co * p.y) / size; float d = length(fract(q) - 0.5); float v = step(d, l * 0.7); return pre(vec3(v), c.a); }` },
  { id: 'lorez', name: 'LoRez', desc: 'Pixela a imagem.', params: [P('size', 'Pixel', 16, 2, 128, 1, ' px')], glsl: `vec4 fx(vec2 uv){ vec2 p = floor(uv * uRes / size) * size + size * 0.5; return tex(p / uRes); }` },
  { id: 'mirror', name: 'Mirror', desc: 'Espelha a metade esquerda sobre a direita.', params: [P('axis', 'Eixo', 0, 0, 1, 1), P('center', 'Centro', 0.5, 0, 1)], glsl: `vec4 fx(vec2 uv){ if (axis < 0.5) { uv.x = uv.x > center ? 2.0 * center - uv.x : uv.x; } else { uv.y = uv.y > center ? 2.0 * center - uv.y : uv.y; } return tex(uv); }` },
  { id: 'mirrorquad', name: 'Mirror Quad', desc: 'Espelha nos quatro cantos.', params: [], glsl: `vec4 fx(vec2 uv){ return tex(vec2(uv.x > 0.5 ? 1.0 - uv.x : uv.x, uv.y > 0.5 ? 1.0 - uv.y : uv.y) * 2.0); }` },
  { id: 'kaleidoscope', name: 'Kaleidoscope', desc: 'Caleidoscópio em volta do centro.', params: [P('segments', 'Segmentos', 6, 2, 24, 1), P('rot', 'Giro', 0, -2, 2, 0.05)], glsl: `vec4 fx(vec2 uv){ vec2 p = uv - 0.5; p.x *= uRes.x / uRes.y; float a = atan(p.y, p.x) + uTime * rot, r = length(p); float seg = 6.2831853 / segments; a = mod(a, seg); a = abs(a - seg * 0.5); vec2 q = vec2(cos(a), sin(a)) * r; q.x /= uRes.x / uRes.y; return tex(q + 0.5); }` },
  { id: 'tile', name: 'Tile', desc: 'Repete a imagem em ladrilhos.', params: [P('x', 'Horizontal', 2, 1, 16, 1), P('y', 'Vertical', 2, 1, 16, 1)], glsl: `vec4 fx(vec2 uv){ return tex(fract(uv * vec2(x, y))); }` },
  { id: 'flip', name: 'Flip', desc: 'Vira a imagem.', params: [P('horiz', 'Horizontal', 1, 0, 1, 1), P('vert', 'Vertical', 0, 0, 1, 1)], glsl: `vec4 fx(vec2 uv){ return tex(vec2(horiz > 0.5 ? 1.0 - uv.x : uv.x, vert > 0.5 ? 1.0 - uv.y : uv.y)); }` },
  { id: 'shiftrgb', name: 'Shift RGB', desc: 'Desloca os canais de cor, como aberração.', params: [P('amount', 'Deslocamento', 0.3, 0, 1), P('angle', 'Ângulo', 0, 0, 6.28, 0.05)], glsl: `vec4 fx(vec2 uv){ vec2 d = vec2(cos(angle), sin(angle)) * amount * 0.03; vec4 a = tex(uv); return vec4(tex(uv + d).r, a.g, tex(uv - d).b, a.a); }` },
  { id: 'wavewarp', name: 'Wave Warp', desc: 'Ondula a imagem.', params: [P('amount', 'Força', 0.3, 0, 1), P('freq', 'Frequência', 6, 1, 30, 0.5), P('speed', 'Velocidade', 1, 0, 5, 0.1)], glsl: `vec4 fx(vec2 uv){ uv.x += sin(uv.y * freq + uTime * speed * 2.0) * amount * 0.08; uv.y += cos(uv.x * freq * 0.7 + uTime * speed * 1.3) * amount * 0.05; return texIn(uv); }` },
  { id: 'twitch', name: 'Twitch', desc: 'Pulos nervosos de posição.', params: [P('amount', 'Força', 0.3, 0, 1), P('rate', 'Ritmo', 8, 1, 30, 1)], glsl: `vec4 fx(vec2 uv){ float t = floor(uTime * rate); vec2 j = (vec2(hash(vec2(t, 1.0)), hash(vec2(t, 2.0))) - 0.5) * amount * 0.3; return texIn(uv + j); }` },
  { id: 'strobe', name: 'Strobe', desc: 'Pisca.', params: [P('rate', 'Ritmo', 8, 1, 30, 1), P('duty', 'Aceso', 0.5, 0.05, 0.95)], glsl: `vec4 fx(vec2 uv){ return fract(uTime * rate) < duty ? tex(uv) : vec4(0.0); }` },
  { id: 'vignette', name: 'Vignette', desc: 'Escurece as bordas para puxar o olhar ao centro.', params: [P('amount', 'Quantidade', 0.6, 0, 1), P('soft', 'Suavidade', 0.5, 0.05, 1)], glsl: `vec4 fx(vec2 uv){ vec4 c = tex(uv); float d = length((uv - 0.5) * vec2(1.0, uRes.y / uRes.x) * 2.0); float v = 1.0 - amount * smoothstep(1.0 - soft, 1.4, d); return vec4(c.rgb * v, c.a); }` },
  { id: 'noisy', name: 'Noisy', desc: 'Chuvisco por cima.', params: [P('amount', 'Quantidade', 0.3, 0, 1)], glsl: `vec4 fx(vec2 uv){ vec4 c = tex(uv); float n = hash(uv * uRes + fract(uTime) * 100.0) - 0.5; return vec4(c.rgb + n * amount * c.a, c.a); }` },
  { id: 'static', name: 'Static', desc: 'Faixas e ruído de TV antiga.', params: [P('amount', 'Quantidade', 0.4, 0, 1)], glsl: `vec4 fx(vec2 uv){ float line = step(0.97, hash(vec2(floor(uv.y * 200.0), floor(uTime * 20.0)))) * amount; vec4 c = tex(uv + vec2(line * 0.05, 0.0)); float n = hash(uv * uRes + uTime * 7.0); return vec4(mix(c.rgb, vec3(n) * c.a, amount * 0.3 + line), c.a); }` },
  { id: 'slide', name: 'Slide', desc: 'Desliza a imagem continuamente.', params: [P('x', 'Horizontal', 0.2, -2, 2, 0.05), P('y', 'Vertical', 0, -2, 2, 0.05)], glsl: `vec4 fx(vec2 uv){ return tex(fract(uv + vec2(x, y) * uTime * 0.2)); }` },
  { id: 'transform', name: 'Transform', desc: 'Move, redimensiona e gira.', params: [P('x', 'Posição X', 0, -1, 1), P('y', 'Posição Y', 0, -1, 1), P('scale', 'Escala', 1, 0.05, 4, 0.01), P('rot', 'Giro', 0, -180, 180, 1, '°')], glsl: `vec4 fx(vec2 uv){ vec2 p = uv - 0.5 - vec2(x, -y) * 0.5; p.x *= uRes.x / uRes.y; float a = -rot * 3.14159265 / 180.0; p = vec2(cos(a) * p.x - sin(a) * p.y, sin(a) * p.x + cos(a) * p.y) / scale; p.x /= uRes.x / uRes.y; return texIn(p + 0.5); }` },
];
// as duas levas, em ordem alfabética como no painel Efeitos do Resolume
export const EFFECTS = [...BASE, ...MORE].sort((a, b) => a.name.localeCompare(b.name));
export const EFFECT_HELPERS = HELPERS;
export const effectById = (id) => EFFECTS.find(e => e.id === id);
// uma instância de efeito numa cadeia (clipe, camada ou composição)
export function mkFx(id) { const d = effectById(id); if (!d) return null; const params = {}; for (const p of d.params) params[p.key] = p.def; return { id: d.id, params, bypass: false, anim: {} }; }
// cópia independente de uma instância de efeito (parâmetros e animações na batida)
export const cloneFx = (f) => ({ ...f, params: { ...f.params }, panim: JSON.parse(JSON.stringify(f.panim || {})) });
