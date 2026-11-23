# Cerium

[**Open the simulation**](https://oasisbulys.github.io/cerium/) · [Controls, setup, and tests](doc/cartesian-coordinates.md) · [Releases](https://github.com/oasisbulys/cerium/releases)

An interactive molecular geometry laboratory with Cartesian axes, textbook reference diagrams, labelled atoms and lone pairs, molecular/world reference frames, camera orbit, and an optional textured 3D laboratory. Modified 2026-11-23.

Cerium is an independent adaptation of [PhET Molecule Shapes](https://github.com/phetsims/molecule-shapes), by PhET Interactive Simulations, University of Colorado Boulder. It is not an official PhET release or endorsed by PhET. The original VSEPR solver, bond-angle calculations, electron domains, lone-pair dynamics, and generic AXnEm configurations are preserved. The upstream starting revision is recorded in `development-dependencies.json`.

## Run locally

The website is self-contained: download `docs/index.html` and open it in a modern browser, or serve `docs/` with `python3 -m http.server --directory docs 8081` and open <http://localhost:8081/>.

To develop, install Git, Python 3, and Node.js with npm (Node 24 was used for validation). Keep the simulation directory name `molecule-shapes`:

```sh
git clone https://github.com/oasisbulys/cerium.git molecule-shapes
cd molecule-shapes
python3 scripts/bootstrap.py
npm start
```

Open <http://localhost:8080/molecule-shapes/molecule-shapes_en.html?brand=cerium>. The bootstrap restores the pinned public PhET dependencies, patches the splash, and installs the bundled Cerium brand. Existing changes are never overwritten.

## Test and publish

```sh
npm test
npm run lint:cartesian
npm run test:browser
npm run test:textbook
npm run test:lab
npm run test:splash
node node_modules/grunt/bin/grunt --brands=cerium --locales=en
python3 scripts/prepare-pages.py
```

Browser tests need Playwright and Chromium/Brave; see the [test instructions](doc/cartesian-coordinates.md). The existing validation covers 28 generic configurations, 13 real molecules, numerical regression against upstream, rotation/coordinate frames, textbook stability, lone-pair repulsion, and lab rendering. Commit source and `docs/` together. The **Deploy Cerium** GitHub Actions workflow verifies the artifact, runs the 18 core tests, and publishes `docs/` to Pages. It does not rebuild the simulation. GitHub must permit Pages deployments on the hosting account before the public site can become available.

## License and credits

Simulation code is distributed under [GNU GPLv3](LICENSE); original PhET copyright notices are retained. The custom Cerium code and branding are independently authored. [PhET development instructions](https://github.com/phetsims/phet-info/blob/main/doc/phet-development-overview.md) describe the underlying polyrepo architecture.

The laboratory is based on [“Lab”](https://sketchfab.com/3d-models/lab-80d760e688c84cda8077bb53ae15956f) by [Raid](https://sketchfab.com/raid), licensed under [CC BY 4.0](assets/lab/CC-BY-4.0.html). Its original geometry and texture bytes are retained; Cerium adds scene placement, lighting, shadows, axes, and teaching overlays. See [lab attribution](assets/lab/license.txt) and [asset notes](assets/lab/README.md). These assets retain their separate license.
