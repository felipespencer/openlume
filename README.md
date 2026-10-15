# OpenLume

**[Português](#português) · [English](#english)**

---

## Português

OpenLume é um software livre e de código aberto pra VJ, performance visual ao vivo e projeção mapeada. A inspiração é o Resolume, com melhorias pensadas por quem faz projeção na rua e em palco.

Vai ter três versões: **web** (abre no navegador), **Windows** e **Android**, todas com o mesmo motor por baixo.

> **Status:** a versão **Windows** já funciona (0.1.0, instalador MSI e zip, gerados com `npx electron-builder --win msi zip --x64`). Web e Android vêm em seguida, do mesmo código.

### O que vai ter

- Camadas de conteúdo: texto, imagem, vídeo, sequência de imagens, desenho ao vivo, formas, câmera e links
- Sintetizadores de vídeo em tempo real (shaders WebGL), com efeitos de realimentação
- Efeitos de câmera ao vivo
- Projeção mapeada com corner pin, malha deformável e arestas curvas
- Controle e saída separados: o painel fica no celular ou no computador e o projetor recebe só a imagem limpa
- Funciona offline

### De onde vem

O OpenLume nasce da experiência do [projecionista.app](https://projecionista.app), ferramenta de projeção mapeada feita no Brasil pra rede [Projetemos](https://projetemos.org). A partir de agora o OpenLume é o motor, e o projecionista.app passa a ser uma versão feita em cima dele.

### Idioma

A interface começa em português. A tradução pra inglês e outros idiomas vem depois.

### Rodar (versão Windows, hoje)

```sh
npm install
npm start
```

O código vem do projecionista-pc (Electron): grade de clipes por camada, mistura em WebGL, saída avançada
no formato do Resolume, laser (LaserCube por Wi-Fi), APC40, gravação. Como usar: [COMO-USAR.md](COMO-USAR.md).
Rumo e pendências: [ROADMAP.md](ROADMAP.md).

### Contribuir

O projeto ainda está tomando forma. Ideias, relatos de uso e bugs são bem-vindos nas [issues](https://github.com/felipespencer/openlume/issues).

### Licença

GPL-3.0. Você pode usar, estudar, modificar e distribuir o OpenLume, mas quem distribuir uma versão modificada tem que liberar o código dela com a mesma licença. Texto completo em [LICENSE](LICENSE).

### Autor

Felipe Spencer · [Videodifusora](https://github.com/felipespencer)

---

## English

OpenLume is a free and open source tool for VJing, live visual performance and projection mapping. It's inspired by Resolume, with improvements shaped by people who project on streets and stages.

It will ship in three versions: **web** (runs in the browser), **Windows** and **Android**, all sharing the same engine underneath.

> **Status:** the **Windows** version already works (0.1.0, MSI installer and zip, built with `npx electron-builder --win msi zip --x64`). Web and Android come next, from the same code.

### Planned features

- Content layers: text, image, video, image sequences, live drawing, shapes, camera and links
- Real-time video synthesizers (WebGL shaders), including feedback effects
- Live camera effects
- Projection mapping with corner pin, deformable mesh and curved edges
- Separate control and output: the panel stays on your phone or computer and the projector only gets the clean image
- Works offline

### Background

OpenLume grows out of [projecionista.app](https://projecionista.app), a projection mapping tool made in Brazil for the [Projetemos](https://projetemos.org) network. From now on OpenLume is the engine, and projecionista.app becomes a version built on top of it.

### Language

The interface starts in Portuguese. English and other languages will come later.

### Run (Windows version, for now)

```sh
npm install
npm start
```

The code comes from projecionista-pc (Electron): clip grid per layer, WebGL mixing, advanced output in the
Resolume format, laser (LaserCube over Wi-Fi), APC40, recording. Usage (Portuguese): [COMO-USAR.md](COMO-USAR.md).
Roadmap (Portuguese): [ROADMAP.md](ROADMAP.md).

### Contributing

The project is still taking shape. Ideas, usage reports and bug reports are welcome in the [issues](https://github.com/felipespencer/openlume/issues).

### License

GPL-3.0. You're free to use, study, change and share OpenLume, but if you distribute a modified version you have to release its source under the same license. Full text in [LICENSE](LICENSE).

### Author

Felipe Spencer · [Videodifusora](https://github.com/felipespencer)
