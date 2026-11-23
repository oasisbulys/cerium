#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
# Added 2026-11-22 by the Cartesian-coordinate extension contributors.
"""Restore the tested public PhET polyrepo revisions, then install the locked build dependencies."""
import argparse
import concurrent.futures
import hashlib
import json
import os
from pathlib import Path
import shlex
import shutil
import subprocess

SIM = Path(__file__).resolve().parents[1]
ROOT = SIM.parent
MANIFEST = json.loads((SIM / 'development-dependencies.json').read_text())


def restore_cerium_brand():
    """Install the independently authored brand without overwriting other work."""
    source = SIM / 'scripts/brand/cerium'
    target = ROOT / 'brand/cerium'
    files = [path for path in source.rglob('*') if path.is_file()]
    for path in files:
        destination = target / path.relative_to(source)
        if destination.exists() and destination.read_bytes() != path.read_bytes():
            raise RuntimeError(f'{destination} differs from the bundled Cerium brand; existing work is never overwritten.')
    for path in files:
        destination = target / path.relative_to(source)
        destination.parent.mkdir(parents=True, exist_ok=True)
        if not destination.exists():
            shutil.copyfile(path, destination)
    print('Verified bundled Cerium brand', flush=True)


def run(args, cwd):
    subprocess.run(args, cwd=cwd, check=True)


def prepare_local_patch(target, revision):
    changes = subprocess.check_output(['git', 'status', '--porcelain', '--untracked-files=no'], cwd=target, text=True)
    patch = revision.get('patch')
    if not patch:
        if changes.strip():
            raise RuntimeError(f'{target} has modified tracked files; existing work is never overwritten.')
        return
    expected = revision['patchedFiles']
    changed_paths = subprocess.check_output(['git', 'diff', 'HEAD', '--name-only'], cwd=target, text=True).splitlines()
    if changes.strip():
        if not set(changed_paths).issubset(expected):
            raise RuntimeError(f'{target} has changes beyond the bundled Cerium patch; existing work is never overwritten.')
    else:
        run(['git', 'apply', str(SIM / patch)], target)
    for name, digest in expected.items():
        if hashlib.sha256((target / name).read_bytes()).hexdigest() != digest:
            raise RuntimeError(f'{target / name} differs from the bundled Cerium patch; existing work is never overwritten.')


def checkout(item):
    name, revision = item
    target = ROOT / name
    if target.exists():
        if not (target / '.git').exists():
            raise RuntimeError(f'{target} exists without Git metadata; move it aside before restoring dependencies.')
        head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=target, text=True).strip()
        if head != revision['sha']:
            raise RuntimeError(f'{target} is at {head}; expected {revision["sha"]}. Existing checkouts are never overwritten.')
        prepare_local_patch(target, revision)
        print(f'Verified {name} {head[:12]}', flush=True)
        return
    target.mkdir()
    run(['git', 'init', '--quiet'], target)
    run(['git', 'remote', 'add', 'origin', revision['url']], target)
    run(['git', 'fetch', '--quiet', '--depth', '1', 'origin', revision['sha']], target)
    run(['git', '-c', 'advice.detachedHead=false', 'checkout', '--quiet', '--detach', 'FETCH_HEAD'], target)
    prepare_local_patch(target, revision)
    print(f'Restored {name} {revision["sha"][:12]}', flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--skip-install', action='store_true', help='Only restore/verify Git dependencies.')
    args = parser.parse_args()
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        list(executor.map(checkout, MANIFEST['repositories'].items()))
    restore_cerium_brand()
    if not args.skip_install:
        env = os.environ.copy()
        env['PUPPETEER_SKIP_DOWNLOAD'] = '1'
        env['PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD'] = '1'
        npm = shlex.split(os.environ.get('NPM_COMMAND', 'npm'))
        for name in ['chipper', 'perennial-alias', SIM.name]:
            subprocess.run(npm + ['ci', '--no-audit', '--no-fund'], cwd=ROOT / name, env=env, check=True)
    print('\nReady: cd ' + str(SIM) + ' && npm start')
    print('Open http://localhost:8080/molecule-shapes/molecule-shapes_en.html?brand=cerium&screens=1')


if __name__ == '__main__':
    main()
