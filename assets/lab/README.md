# Lab environment asset

Lab by Raid: https://sketchfab.com/3d-models/lab-80d760e688c84cda8077bb53ae15956f
Author: https://sketchfab.com/raid
License: CC BY 4.0, https://creativecommons.org/licenses/by/4.0/

The original `license.txt` is preserved. `CC-BY-4.0.html` is the license text from Creative Commons' official cc-legal-tools-data repository.

`scene.gltf`, `scene.bin`, and all eleven JPEGs are copied byte-for-byte from the user-supplied lab.zip. No image resizing, image recompression, or changes to the asset source are applied. `SHA256SUMS.json` records the original files. The application scales and positions the scene and uses the original color maps and surface normals with lit Phong materials, ceiling spotlights, hemisphere fill, and soft shadows in the preserved Three.js r71 renderer. The original JPEG resolution, UVs, and node transforms are retained. A separate procedural bump map adds subtle painted-metal grain. Lighting and material presentation are adaptations; this renderer does not perform path tracing. New educational floor markings, room labels, and selected-atom guides are separate, independently authored GPL-3.0-only code.

The Lab content remains CC BY 4.0; it is not relicensed as GPL. The simulation and the integration software are GPLv3. Redistribution must retain the model's author, source, license link, and notice of scene presentation changes.

Regenerate the offline asset module with `python3 scripts/prepare-lab.py` from the simulation directory. It embeds the original bytes for an offline standalone build. To restore from the original zip, pass `--archive /path/to/lab.zip`.
