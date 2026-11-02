# Imagem de prova do 2º lote (Tilt Shift, CRT, Acuarela): metade de cima e de baixo iguais, para medir o que depende da altura.
# Cada coluna responde a uma pergunta: borda vertical nítida (raio do desfoque), manchas lisas de cor (saturação, vinheta),
# cinzas em degraus (curva de brilho), linhas finas (resolução interna). Uso: py tools/compare/clips/gera-prova.py
from pathlib import Path
from PIL import Image, ImageDraw

W, H = 1920, 1080
im = Image.new('RGB', (W, H), (128, 128, 128))
d = ImageDraw.Draw(im)
# borda vertical nítida: preto | branco
d.rectangle([0, 0, 239, H], fill=(0, 0, 0))
d.rectangle([240, 0, 479, H], fill=(255, 255, 255))
# manchas lisas de cor
for i, c in enumerate([(220, 40, 40), (40, 200, 60), (50, 70, 220), (230, 200, 40), (40, 200, 210), (210, 60, 190)]):
    y = i * H // 6
    d.rectangle([480, y, 959, y + H // 6 - 1], fill=c)
# cinzas em degraus
for i in range(9):
    y = i * H // 9
    g = round(i * 255 / 8)
    d.rectangle([960, y, 1439, y + H // 9 - 1], fill=(g, g, g))
# linhas finas de 1, 2 e 4 px, em faixas horizontais
for k, passo in enumerate((1, 2, 4)):
    y0, y1 = k * H // 3, (k + 1) * H // 3
    for x in range(1440, W, passo * 2):
        d.rectangle([x, y0, x + passo - 1, y1 - 1], fill=(255, 255, 255))
    for x in range(1440 + passo, W, passo * 2):
        d.rectangle([x, y0, x + passo - 1, y1 - 1], fill=(0, 0, 0))
im.save(Path(__file__).with_name('prova.png'))
print('prova.png', im.size)
