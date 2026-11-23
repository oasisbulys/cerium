#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
# Added 2026-11-23 by the Cerium extension contributors.
"""Copy the tested standalone build and required notices to GitHub Pages."""
from pathlib import Path
import hashlib
import shutil

SIM = Path(__file__).resolve().parents[1]
PAGES = SIM / 'docs'
BUILD = SIM / 'build/cerium/molecule-shapes_en_cerium.html'


def main():
    if not BUILD.is_file():
        raise SystemExit('Build first: node node_modules/grunt/bin/grunt --brands=cerium --locales=en')
    PAGES.mkdir(exist_ok=True)
    shutil.copyfile(BUILD, PAGES / 'index.html')
    shutil.copyfile(SIM / 'LICENSE', PAGES / 'LICENSE.txt')
    shutil.copyfile(SIM / 'assets/lab/license.txt', PAGES / 'LAB-ATTRIBUTION.txt')
    shutil.copyfile(SIM / 'assets/lab/CC-BY-4.0.html', PAGES / 'CC-BY-4.0.html')
    (PAGES / '.nojekyll').write_text('')
    (PAGES / 'credits.html').write_text('''<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Cerium — credits and source</title>
<style>body{font:18px/1.6 system-ui,sans-serif;max-width:48rem;margin:4rem auto;padding:0 1.5rem;color:#20242a}a{color:#1557a0}h1{line-height:1.2}</style>
<h1>Cerium</h1><p><a href="./">Open the molecular geometry laboratory</a></p>
<p>An independent adaptation of <a href="https://github.com/phetsims/molecule-shapes">PhET Molecule Shapes</a>,
by PhET Interactive Simulations, University of Colorado Boulder. Modified 2026-11-23.
This is not an official PhET release or endorsed by PhET.</p>
<p>Simulation code: <a href="LICENSE.txt">GNU GPLv3</a>.
<a href="https://github.com/oasisbulys/cerium">Editable source, build instructions, and tests</a> ·
<a href="https://github.com/oasisbulys/cerium/releases">Source downloads</a>.</p>
<p>The laboratory is based on <a href="https://sketchfab.com/3d-models/lab-80d760e688c84cda8077bb53ae15956f">“Lab”</a>
by <a href="https://sketchfab.com/raid">Raid</a>, licensed under <a href="CC-BY-4.0.html">CC BY 4.0</a>.
Original geometry and textures are retained. Cerium adds placement, lighting, shadows, coordinates, and teaching overlays.
<a href="LAB-ATTRIBUTION.txt">Original attribution notice</a>.</p></html>
''')
    names = sorted(p.name for p in PAGES.iterdir() if p.is_file() and p.name != 'SHA256SUMS.txt')
    (PAGES / 'SHA256SUMS.txt').write_text(''.join(
        hashlib.sha256((PAGES / name).read_bytes()).hexdigest() + '  ' + name + '\n' for name in names))
    print(f'Prepared {PAGES}: {len(names)} files; standalone simulation {BUILD.stat().st_size:,} bytes')


if __name__ == '__main__':
    main()
