// Mapeamento por quatro cantos. Usado pelo controle (prévia) e pela saída (projetor).
// Dado um retângulo w×h e os quatro cantos de destino em pixels (cima-esquerda, cima-direita,
// baixo-direita, baixo-esquerda), devolve a matrix3d de CSS que leva o retângulo ao quadrilátero.
// É a transformação projetiva de quadrado para quadrilátero (Heckbert, 1989).
window.projHomography = function (w, h, p) {
  var x0 = p[0][0], y0 = p[0][1], x1 = p[1][0], y1 = p[1][1], x2 = p[2][0], y2 = p[2][1], x3 = p[3][0], y3 = p[3][1];
  var dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
  var dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  var den = dx1 * dy2 - dx2 * dy1;
  if (Math.abs(den) < 1e-9) return 'none';            // cantos alinhados: não há transformação válida
  var g = (dx3 * dy2 - dx2 * dy3) / den, k = (dx1 * dy3 - dx3 * dy1) / den;
  var a = x1 - x0 + g * x1, b = x3 - x0 + k * x3, d = y1 - y0 + g * y1, e = y3 - y0 + k * y3;
  return 'matrix3d(' + [a / w, d / w, 0, g / w, b / h, e / h, 0, k / h, 0, 0, 1, 0, x0, y0, 0, 1].join(',') + ')';
};
window.projMapIsIdentity = function (m) {
  var I = [[0, 0], [1, 0], [1, 1], [0, 1]];
  return m.every(function (p, i) { return Math.abs(p[0] - I[i][0]) < 1e-4 && Math.abs(p[1] - I[i][1]) < 1e-4; });
};
