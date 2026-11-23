# Cerium — molecular geometry laboratory

Modified on **2026-11-23**. This is an independent adaptation of PhET Interactive Simulations' Molecule Shapes, University of Colorado Boulder; it is not an official PhET release.

## Start the simulation

The public site is [Cerium](https://oasisbulys.github.io/cerium/). Its editable source is at [oasisbulys/cerium](https://github.com/oasisbulys/cerium). GitHub Pages serves the tested, self-contained `docs/index.html`, including the full laboratory textures. No backend or external model hosting is required.

To build from GitHub, clone into a directory named `molecule-shapes` (the upstream module paths use that name):

```sh
git clone https://github.com/oasisbulys/cerium.git molecule-shapes
cd molecule-shapes
python3 scripts/bootstrap.py
npm start
```

The delivered standalone `cerium-molecular-shapes.html` contains the simulation and its resources. Open it in a modern browser. If your browser restricts local files, serve the deliverables directory with `python3 -m http.server 8081`, then open `http://localhost:8081/cerium-molecular-shapes.html`.

The development checkout in this workspace is `work/phetsims/molecule-shapes`. A development server was started at:

<http://localhost:8080/molecule-shapes/molecule-shapes_en.html?brand=cerium>

To restart that checkout, put Node.js and npm on PATH, change into the checkout, and run `npm start`. The server serves the common `phetsims` parent directory, not just this simulation directory. Stop it with Ctrl+C.

On this machine Node is bundled with the desktop app rather than installed on the default PATH. From the existing checkout, the tested restart command is:

```sh
PATH=/usr/lib/chatgpt/resources/cua_node/bin:$PATH corepack npm start
```

To use the source archive on another machine:

1. Extract `cerium-molecular-shapes-source.tar.gz`. It contains the modified simulation and the exact public dependency checkouts, licenses, and Git metadata in a `phetsims/` directory. It excludes installed npm packages and generated builds.
2. Install Python 3, Git, and Node.js with npm. Node 24.21.0 was used for validation; the archived tools require Node 18.18 or newer (Node 20 requires at least 20.9).
3. From `phetsims/molecule-shapes`, run:

   ```sh
   python3 scripts/bootstrap.py
   npm start
   ```

4. Open the development URL above. Choose **Model** or **Real Molecules**.

`bootstrap.py` verifies exact commits from `development-dependencies.json`, restores missing sibling repositories, and runs `npm ci` in chipper, perennial-alias, and molecule-shapes. Internet access is needed to install npm packages. It applies or verifies the bundled Cerium brand configuration and Joist splash patches using exact hashes from the manifest, and restores the custom brand from `scripts/brand/cerium`; other dependency changes are never overwritten. `--skip-install` only restores/verifies source. `NPM_COMMAND="corepack npm"` is supported if npm is managed by Corepack. No global Grunt installation is required.

### Update the public site

After making and testing source changes, build and prepare Pages from the simulation checkout:

```sh
node node_modules/grunt/bin/grunt --brands=cerium --locales=en
python3 scripts/prepare-pages.py
```

Commit the updated source and `docs/` together. The **Deploy Cerium** GitHub Actions workflow checks the standalone artifact, notices, and 18 core tests, then publishes `docs/`. The simulation is already compiled; Pages does not rebuild it. Choose **GitHub Actions** as the Pages source. Publication requires GitHub to permit Pages deployments on the hosting account. `docs/credits.html`, GPLv3, and the laboratory's CC BY 4.0 notice are published alongside the simulation.

## Use the coordinate system

The **Cartesian coordinates** panel is at the upper left on both screens. Axes, **Lock textbook orientation**, and **Lock axes to molecule** start enabled. Textbook lock keeps the molecular pose aligned with its conventional axes; dragging orbits the camera. Turn it off to enable **Rotate molecule** or **Drag atoms and lone pairs**. Turning it back on restores textbook alignment without modifying any atom positions, velocities, electron domains, or bond angles. Disable **Show axes and coordinates** whenever you want to remove the coordinate overlay. The panel provides:

- Red X, green Y, and blue Z axes through the central atom, with positive arrowheads and axis labels. Negative axis halves are also drawn.
- One optional plane: Off, XY, XZ, or YZ. The plane follows the currently selected coordinate frame.
- Identifiers A1–A6 beside surrounding atoms, matched to the coordinate table. Lone-pair clouds are electron domains, not atoms, so they are not listed in that table.
- **Lock axes to molecule** (on by default): keep this on to keep the axes and selected plane attached during molecule-only rotation, using the molecule's local coordinate frame. The axes rotate with the molecule and the table keeps molecular coordinates. Turn it off to restore fixed world axes in molecule-only mode. Camera orbit already uses molecular axes.
- A **Reset orientation** button that restores the recommended home camera for the current geometry and aligns the molecule with the textbook coordinate frame. It retains the molecule, atoms, bonds, lone pairs, velocities, selected plane, coordinate visibility, axis-lock setting, individual-atom drag setting, and rotation mode.

With textbook orientation unlocked, grab an atom, lone pair, the central atom, or empty space to use the selected rotation mode. The entire molecule rotates rigidly, so grabbing A3 does not accidentally bend a bond and trigger VSEPR relaxation. Enable **Drag atoms and lone pairs** to use PhET's original spherical atom/lone-pair dragging and repulsion-driven relaxation. The locked view is intended for book comparison; unlock it and enable this checkbox to pull LP1 toward a bond and watch neighboring domains move away. The repulsion solver runs in both modes, including when adding or removing domains. The generic Model screen converges to PhET's ideal VSEPR angles; use the Real Molecules screen to compare measured angle distortions. No additional force multiplier or artificial angle compression has been introduced. With the axis lock enabled, the axes follow the molecule's overall orientation during that interaction; the view does not automatically rotate back after release. While a molecule is deformed, an orthogonal frame cannot pass through every displaced bond. Coordinates then show the actual deformation relative to the best-fit molecular frame. Existing bonding controls, bond-angle controls, real/model switches, and generic AXnEm construction remain available. **Reset All** also restores the new controls to their defaults. **Hide GUI** hides both control panels, geometry-name controls, Reset All, and the bottom navigation bar. A small **Show GUI** button remains to restore the controls and their existing settings; molecule interaction and coordinate graphics remain available. This presentation setting is shared across both screens.

| Mode | What rotates | Axes and planes | Displayed coordinates |
| --- | --- | --- | --- |
| Molecule only, lock off | Molecule view; camera holds its current pose | Fixed world directions, origin at central atom | World frame, relative to central atom |
| Molecule only, lock on | Molecule and axis frame together; camera holds its current pose | Attached to the molecular coordinate frame | Molecular frame, relative to central atom |
| Camera orbit | Actual camera pose about the central atom; molecule view holds its current rotation | Attached to the molecular coordinate frame | Molecular frame, relative to central atom; unaffected by camera orbit |

This lock follows the **Local orientation** convention used in 3D modeling: the object's axes follow its rotation, as described in the [Blender Manual](https://docs.blender.org/manual/en/4.4/editors/3dview/controls/orientation.html). It does not constrain individual atoms or alter VSEPR dynamics.

### Textbook alignment and a readable 3D view

At startup, after changing the electron-domain configuration, and when **Reset orientation** is pressed, the view is rotated into a conventional drawing pose. The simulation never moves the atoms to obtain this view. Linear AX2 bonds lie along X; trigonal-planar AX3 and square-planar AX4E2 lie in XY; bent groups lie in XY around their angle bisector. Trigonal-pyramidal AX3E places the lone-pair direction on +Z and its three bonds below. T-shaped configurations use two opposite bonds along ±Z and a third along X. Seesaw AX4E has two axial bonds on ±Z and two equatorial bonds in XY. Trigonal-bipyramidal AX5 uses ±Z for the axial pair and XY for the equatorial trio. Square-pyramidal AX5E has a square in XY and its remaining bond on +Z. Octahedral AX6 occupies all six cardinal directions.

Tetrahedral AX4 keeps all six 109.47° interbond angles while placing two bonds in the reference XY drawing plane. The other two have opposite Z coordinates: one is in front of that page and one behind. Its **Match the book** inset uses the same A1–A4 identifiers as the 3D model: two ordinary lines in XY, a filled wedge toward the reader (+Z), and a hatched wedge away (−Z). The inset is schematic; its drawn angles are not measurements. The main view is oblique so front and back atoms stay distinguishable. Orbiting changes your viewpoint while the inset continues to describe the fixed molecular reference page. Spheres represent bonded atoms; clouds represent lone-pair electron domains. Tetrahedral geometry has no opposite up/down pair of bonds. These drawing choices follow the geometries described in [OpenStax Chemistry 2e §7.6](https://openstax.org/books/chemistry-2e/pages/7-6-molecular-structure-and-polarity). X/Y/Z are reference labels for the drawing, not physical constraints on a free molecule.

Every supported geometry now has a **Match the book** reference, including linear, bent, trigonal planar, tetrahedral, trigonal pyramidal, seesaw, T-shaped, trigonal bipyramidal, square planar, square pyramidal, octahedral, and the one-bond and empty/domain-only cases. All 28 AXnEm configurations use the same domain assignment as the molecular frame, so every A label matches the 3D model. Shaded two-electron lobes labelled **LP1**, **LP2**, and so on mark central lone pairs. Each number matches its 3D cloud. Filled blue lobes point out of the reference page; orange lobes with dashed outlines go behind it; purple lobes lie in the page. The reference retains these domains when the main 3D clouds are hidden. The **Show Lone Pairs** checkbox also hides or shows their 3D labels. Ordinary lines mean in the reference page; blue filled wedges mean toward the reader; orange hatching means away. The page, toward direction, upward direction, and recommended viewing side are written below the drawing. The main 3D atom and central lone-pair labels also say **in page**, **out of page**, or **behind page**, using the same white, blue, and orange key as the inset. These captions refer to that labelled reference page, even after camera orbit. Lone-pair identifiers remain available when unlocked. Captions sit outside the molecular silhouette and keep the same readable size at every depth. Reference drawings show the ideal arrangement; real molecules can have measured distortions, which remain visible in their actual coordinate and bond-angle readouts. No bond orders are inferred from these reference lines. Lone-pair lobes are electron domains and are never counted as additional atoms or bonds.

The studio automatically chooses a readable default camera when a geometry changes with textbook lock on:

| Geometry | Reference page | Look from | Page up |
| --- | --- | --- | --- |
| AX2 linear, AX3 trigonal planar | XY | +Z, face-on | +Y |
| Bent, tetrahedral, square planar | XY | +Z side, turned slightly when domains have depth | +Y |
| Trigonal pyramidal, T-shaped, seesaw, trigonal bipyramidal, square pyramidal, octahedral | XZ | −Y side, turned to reveal depth | +Z |
| One bonded atom | XZ | −Y side; depth turn when needed | +Z |

These viewing choices are teaching defaults, rather than a unique physical orientation of a free molecule. Looking exactly along a depth axis can hide atoms behind one another, so nonplanar arrangements use an oblique camera. **Reset orientation** restores the recommended camera and molecular alignment. An orbit gesture cancels any ongoing automatic camera transition and leaves you in control. The recommended camera does not continually pull back after orbiting, and it never replaces the lab room camera. The inset keeps its reference page while you orbit; toward/away in that inset are relative to its labelled page, rather than your current camera. It appears while textbook lock and coordinates are on in the studio.

The molecule is centered between the controls. Axis labels keep a consistent visible size. While textbook lock is on, the view eases into a new fitted textbook pose with a bounded turn per frame; the home camera keeps the reference page’s up axis vertical and eases at at most three degrees per 60 Hz frame; camera gestures leave this pose fixed. Unlocking preserves the displayed pose immediately, and re-locking starts from that same displayed pose before easing back. Rotation and individual-atom controls appear when unlocked. The display uses a separate double-precision quaternion fit with continuity for underdetermined frames, leaving the molecular solver unchanged. With textbook lock off, the view orientation is retained: only an explicit orientation reset or a topology change establishes a new home alignment. The molecular axes follow subsequent solver-induced overall rotation instead of forcing the view back into its initial pose.

With textbook lock off, changing rotation modes preserves the camera pose, molecular orientation, and axis-lock setting. The axes and table change to the selected reference frame; the molecule does not jump. The new controls are currently English-language controls, including in other locales.

Let `p` be an atom's model position, `c` the central atom's position, `R` the user-controlled rigid rotation, `B` the fixed initial textbook alignment, and `F` the current best-fit model-to-molecular-frame rotation. With textbook lock off, the molecule view uses `R B`. During textbook locking, an eased rigid display pose `L` approaches `F`; the molecular axes use `L F⁻¹`, so they remain consistent with the readout throughout the transition. Molecular coordinates are `F(p − c)`, with axis orientation `R B F⁻¹`, so axes and coordinates describe the same points even during individual-domain dragging. Fixed-world coordinates are `R B(p − c)` and their axes have identity rotation. Camera rotation never enters either coordinate calculation. Equivalent electron-domain assignments are retained while valid. When relaxation invalidates an assignment, the view selects a materially better fit and prefers the preceding orientation among equivalent alternatives. Values use **simulation model units**, rounded to two decimals; they are not calibrated experimental distances in ångströms. The display suppresses rounded negative zero.

## Explore the laboratory

Turn on **Lab environment** on either screen. The complete user-supplied **Lab by Raid** scene is bundled offline. The lab stays fixed in the world; **Look around (camera)** moves your viewpoint around the enlarged molecular model. The horizon stays level, and camera pitch is limited to stay between the floor and ceiling. **Front**, **Side**, **Above**, and **Home** provide repeatable viewpoints. With textbook lock on, the molecule stays in its canonical pose while you look around. Unlock it, then select **Rotate molecule**, to turn the molecule inside the stationary room. Re-locking realigns the molecule while retaining the camera pose.

In lab mode the room uses a **Z-up** frame: red **X · RIGHT**, green **Y · BACK** (−Y is front), and blue **Z · UP**. X and Y lie on the floor; Z points vertically. The origin is the central atom. Floor arrows and RIGHT/LEFT/FRONT/BACK labels provide matching room references. The renderer itself uses Y-up, so the lab readout maps rendered coordinates into this right-handed Z-up room frame; the axes, plane, atom table, and plain-language description use that same mapping. These directions belong to the room: after orbiting, room right need not be screen right. Molecular-axis locking is hidden in this mode because the room axes stay fixed. Turning the lab off restores the previous studio camera and axis settings. The molecule's textbook frame remains separate.

Click an atom or press **Next atom** to inspect it. A gold ring identifies the selected atom. **Where is this atom?** describes its left/right, front/back, and above/below offsets in words. The translucent green grid is the **height of the central atom (Z = 0)**, rather than the room floor. A dashed vertical guide from that grid to the selected atom shows what “below the XY plane” means; red and green guides show horizontal offsets. **Guides** hides these projections. **All atom coordinates** reveals the complete numerical table. **Hide GUI** provides an unobstructed room view and retains the small Show GUI button.

The molecule is an **enlarged teaching model**. Coordinates remain simulation model units; they are not room metres or measured atomic distances. Furniture provides a spatial reference, not collision physics. The molecule and educational overlays render over the room furniture for visibility. None of the lab code writes molecular positions, velocities, bond orders, lone pairs, domain configurations, or angle calculations. Canvas fallback keeps the simulation available and disables the WebGL-only lab control.

All eleven original JPEGs are retained byte-for-byte at their original sizes: four 2048², five 1024², and two 512². Mipmaps and the device's maximum anisotropic filtering preserve texture detail at oblique angles. Source surface normals, two ceiling spotlights, hemisphere fill, 2048² soft shadow maps, and Phong specular highlights give equipment depth. A separate small procedural bump map adds subtle painted-metal grain without altering the original color images. These are interactive rasterized lighting approximations supported by the preserved Three.js r71 renderer, rather than a path-traced or physically calibrated rendering. Original studio lighting remains unchanged. The glTF source has no nonzero emissive factor; treating its base color as unlit had incorrectly flattened white cabinets. See the [glTF material specification](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#materials) and [Three.js Phong material documentation](https://threejs.org/docs/pages/MeshPhongMaterial.html).

## Tests

Keep the development server running in another terminal, then run from `phetsims/molecule-shapes`:

```sh
npm test
npm run lint:cartesian
node ../perennial-alias/node_modules/playwright/cli.js install chromium
npm run test:browser
npm run test:lab
npm run test:splash
npm run test:textbook
```

If using an installed Chromium-compatible browser, omit the download command and run, for example:

```sh
BROWSER_EXECUTABLE=/usr/bin/chromium npm run test:browser
```

`SIM_BASE_URL` changes the server origin. `TEST_OUTPUT_DIR` changes the screenshot destination. `PLAYWRIGHT_MODULE_PATH` can override the Playwright module location. Screenshots normally go in ignored `tests/artifacts/`.

The eighteen Node tests cover a known 90° transform around a nonzero origin, molecule-attached axis locking and unlocking, projected-pivot stability during true camera orbit, camera-relative molecule gestures after orbiting, angle invariance, repeated quaternion normalization, orientation reset, textbook conventions and angle preservation for all 28 configurations, upright book-camera axes and unchanged AX2/AX3 starting views, shared view/axis/readout transforms, domain-induced frame rotation without view snapping, SHA-256 checks of the untouched upstream solver/domain/angle source files, room-frame transforms, a level room horizon, default textbook locking, source-asset hashes, and byte-identical offline embedding of geometry and JPEGs. The splash browser check measures the live Cerium wordmark and loading-bar centers at 1920 × 1080.

The browser suite compares against `tests/vsepr-baseline.json`, captured from the untouched upstream commit with the same public runtime libraries. It checks 41 deterministic scenarios: all 28 combinations with `n + m ≤ 6` (including zero surrounding atoms) and all 13 real-molecule presets. Snapshots include group positions and velocities, electron domains, radial and outer lone pairs, bond orders, and atom-to-atom bond angles before and after solver steps. Numerical tolerance is `1e-9`. Generic scenarios mix single, double, and triple bonds.

It also checks default textbook alignment for all 28 configurations, actual A3 pointer dragging with rigid rotation and retained release orientation, optional original atom deformation and relaxation with a following frame, Hide/Show GUI and keyboard recovery, actual pointer-driven rotation in both modes, keyboard controls, displayed coordinates, local-orientation lock with axes and plane following the molecule, all plane choices, orientation reset, camera-aware atom picking and spherical drag geometry, adding/removing atoms after an edge-on orbit, real/model view replacement for every preset, screen switching, Reset All, Canvas fallback, and absence of browser JavaScript errors.

The textbook browser suite runs 72 deterministic relaxation cases that previously caused frame flips, verifies a maximum six-degree display turn per 60 Hz frame, both lock-toggle directions without an immediate snap, and matching axes/readouts throughout easing. It also checks the tetrahedral wedge/dash diagram against all four atom IDs and their actual Z coordinates. The reference suite covers all 28 configurations: matching atom IDs, exact ideal-domain assignments, central lone-pair counts, page/depth signs, readable default cameras, visible atom and lone-pair separation, matching LP identifiers and depth captions, label collisions, and panel fit. It uses an actual pointer drag on a named lone-pair cloud to verify picking, an outward repulsion impulse, neighboring atom motion while held, and relaxation after release. It also checks the Show Lone Pairs label visibility. It additionally covers all 13 real presets in real/model views, orbit/reset behavior, textbook toggle visibility, and zero browser JavaScript errors. The original solver remains active during relaxation, and every alignment call is checked for model-state preservation.

The lab browser suite additionally verifies both screens, all 13 real presets in real/model views, original full-resolution images, source normals, light-responsive materials, both soft-shadow maps, room-direction labels, default textbook lock, explicit unlocking and re-locking, camera/molecule rotation, selected-atom projections, original atom deformation, GUI visibility, repeat-toggle resource reuse, empty molecules, and disabled lab controls in Canvas fallback.

Validation completed on Linux with Node 24.21.0 and headless Brave/Chromium using software WebGL. Both browser suites are run against the development simulation and the standalone build; see VALIDATION.txt in the deliverables for the final results. This is not a full cross-device or accessibility certification.

## GPU profiling

Run `BROWSER_EXECUTABLE=/usr/bin/brave npm run profile:lab` with the server running to measure the actual browser GPU backend. The harness reports the renderer string, texture sizes, anisotropy, shadow-map sizes, frame intervals, and CPU time spent in the view step. It measures the studio, static lab, and continuously orbiting lab with an AX6 molecule and the solver active, after warm-up. It defaults to 1920 × 1080 at the browser's device pixel ratio. `PROFILE_WIDTH`, `PROFILE_HEIGHT`, `PROFILE_OUTPUT`, and `SIM_PATH` override the viewport, report path, and tested build. The report normally goes to `tests/artifacts/lab-profile.json`.

This device has a Radeon RX 9060 XT with 8 GB VRAM. The final measured result and actual ANGLE backend are recorded in the delivered `lab-profile.json` and `PERFORMANCE.txt`. Frame rate is limited by the display/browser refresh rate. CPU view-step timing is not GPU execution time, loading time is excluded, and these measurements are not a cross-device performance guarantee. All measurements retain the full original textures and soft shadows.

## Build a standalone HTML file

From `phetsims/molecule-shapes`:

```sh
node node_modules/grunt/bin/grunt --brands=cerium --locales=en
```

The English result is `build/cerium/molecule-shapes_en_cerium.html`. This command runs the repository's lint stage and production build. Type checking is skipped by the upstream default build task. The archived tools may emit warnings about unavailable private PhET-iO repositories and an unused original string; these do not prevent the public adapted build.

To run the same browser suite against the build:

```sh
SIM_PATH=/molecule-shapes/build/cerium/molecule-shapes_en_cerium.html npm run test:browser
```

## Repository inspection and implementation

The current public [main branch](https://github.com/phetsims/molecule-shapes) was retired and its source removed. The adaptation is based on the last public source commit, [`1aee7cee7bcbea4276a6a416ff943acac13e9506`](https://github.com/phetsims/molecule-shapes/tree/1aee7cee7bcbea4276a6a416ff943acac13e9506), dated 2026-03-31. Its simulation version is `1.7.0-dev.0`. The preserved `dependencies.json` refers to a much older 2022 snapshot; `development-dependencies.json` records the revisions actually tested here. Chipper and perennial-alias are pinned to March 2026 revisions because later archived revisions assume the unavailable totality monorepo for build metadata.

Instructions reviewed:

- The source commit's [README and quick start](https://github.com/phetsims/molecule-shapes/blob/1aee7cee7bcbea4276a6a416ff943acac13e9506/README.md).
- The preserved [PhET Development Overview](https://github.com/phetsims/phet-info/blob/a39cfbf7fa73/doc/phet-development-overview.md).
- `doc/implementation-notes.md`, including coordinate frames, three-layer rendering, and the requirement for renderer-local Three.js geometry.
- `doc/model.md`, including lone-pair slot priority, generic bond equivalence, model/real distinctions, and the SVD-based solver.
- The simulation's GPLv3 `LICENSE`, dependency license files, and the [brand documentation](https://github.com/phetsims/brand/blob/3748f9717bb6/README.md).

No AGENTS.md instructions were present in the checked-out source/dependency trees.

Lab-specific rendering is contained in `3d/LabModelLoader.js`, `3d/LabEnvironmentView.js`, and `3d/RoomPositionGuides.js`; `LabLearningPanel.js` and `RoomCoordinates.js` provide the room-position explanation. `scripts/prepare-lab.py` generates the offline module from original asset files.

New files `CartesianFrame.js`, `CartesianCoordinatesPanel.js`, `TextbookGeometry.js`, `TextbookOrientation.js`, `RigidAlignment.js`, `TextbookDiagram.js`, and `3d/CartesianCoordinatesView.js` contain the extension. `MoleculeShapesScreenView.js` connects input, reset, camera pose, and the shared controls. `MoleculeView.js` now reads the active camera position so bond rendering and angle-label visibility follow camera orbit; its bond-angle calculations are unchanged. The original common model classes, solver, pair-group dynamics, electron-domain definitions, generic configuration tables, real-molecule data, real-screen model, and BondAngle classes are byte-for-byte preserved. The Model screen's initialization is the one model-file change: its original two single bonds now start at ±X at the same ideal bond distance, instead of starting at arbitrary angles and relaxing into a line. Default pointer behavior rotates the whole molecule; the original individual-atom deformation remains selectable. Alignment and frame fitting never write atom positions, velocities, bond orders, or domain configurations. Axis-arrow geometry is cloned per screen because Three.js r71's shared ArrowHelper geometry cannot safely be shared by this simulation's separate renderers.

## License, attribution, and distribution

Original simulation: **PhET Interactive Simulations, University of Colorado Boulder**, with original authors and credits retained in the source. The original simulation is licensed under **GPL version 3**; the full text remains in `LICENSE`. The extension is marked GPL-3.0-only and dated 2026-11-23. Modified files and the README identify the adaptation. Independently added files do not claim authorship or copyright by the University of Colorado Boulder.

The build uses the public PhET simulation libraries with the custom **cerium** brand. Navigation, page title, app heading, splash screen, and logos use the Cerium identity. Original PhET and Raid names remain in attribution, license, source, and original-resource links; small brand configuration and splash-centering patches are included in the source archive. Original simulation credits remain in the source and visible attribution/modification notices appear in the coordinate panel and About. The source archive includes the complete modified simulation and public dependency source, their license files, exact revisions, and npm lockfiles. The standalone HTML includes the build system's third-party notices. Distribute the corresponding source archive alongside the standalone HTML, retain the license and notices, and preserve recipients' GPL rights. There is no warranty.

The PhET name is retained for required attribution. Cerium has an independent wordmark and splash in a bold sans-serif style with the original white-on-black color treatment; no PhET logo is used as the product identity and no endorsement is claimed. No private PhET-iO code is included.

### Lab asset attribution

**Lab by Raid**, [original model](https://sketchfab.com/3d-models/lab-80d760e688c84cda8077bb53ae15956f), [author](https://sketchfab.com/raid), licensed under [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/). The original archive's license notice and source geometry/color images are preserved in `assets/lab/`; the complete CC BY legal code is included there. The integration scales and positions the scene, adapts its lighting/materials, and adds independent teaching guides and floor markings. The underlying Lab model and images retain CC BY 4.0; the simulation and integration code retain GPLv3. Redistribution must include both sets of notices and acknowledge these presentation changes. Visible author/source/license links appear when the lab is enabled.
