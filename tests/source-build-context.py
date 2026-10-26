#!/usr/bin/env python3
"""Stage the committed candidate with the real Store downloader for CI builds.

This exercises an unpublished candidate, not a published catalog or Supervisor.
Use the same pinned .addon-sync checkout as the image-reuse guard. No download,
image publication, HA install, or change to the source checkout occurs here.
"""
import argparse
import json
from pathlib import Path
import subprocess
import sys


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--tooling', type=Path, required=True)
    parser.add_argument('--destination', type=Path, required=True)
    parser.add_argument('--arch', choices=['amd64', 'aarch64'], required=True)
    parser.add_argument('--receipt', type=Path, required=True)
    parser.add_argument('--github-output', type=Path)
    args = parser.parse_args()
    sys.path.insert(0, str(args.tooling.resolve()))
    import addon_sync as sync
    import download_addon as downloader

    # Archive HEAD, not runner-local tooling or untracked files. On a PR this
    # is GitHub's tested merge commit; on main it is the release source commit.
    root = Path(__file__).resolve().parents[1]
    sha = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
    archive = subprocess.check_output(
        ['git', 'archive', '--format=tar.gz', '--prefix=candidate/', 'HEAD'], cwd=root)
    files = sync.context_files(archive, '.')
    config = sync.config_from_files(files, 'config.yaml')
    if not sync.source_build_supported(files):
        raise ValueError('Candidate is missing local Dockerfile COPY/ADD inputs')
    entry = {
        'id': config['slug'], 'repository': 'WOOWTECH/Woow_ha_pi_agent_add_on',
        'source_sha': sha, 'source_path': '.', 'version': str(config['version']),
        'architectures': config['arch'], 'config_file': 'config.yaml',
        'config': config, 'config_sha256': sync.digest(files['config.yaml'][0]),
        'archive_sha256': sync.digest(archive), 'source_build_supported': True,
    }
    context = downloader.stage(entry, args.destination.resolve(), args.arch,
                               source_build=True, raw=archive)
    local_config = json.loads((context / 'config.yaml').read_text())
    expected_config = dict(config, boot='manual')
    expected_config.pop('image', None)
    if local_config != expected_config:
        raise ValueError('Unexpected local source-build manifest changes')
    lock = json.loads((context / '.woow-source-lock.json').read_text())
    if lock['source'] != entry or lock['local_config_sha256'] != sync.digest((context / 'config.yaml').read_bytes()):
        raise ValueError('Local context lock does not match candidate')
    expected_policy = {'boot': 'manual', 'source_build': True,
                       'architecture': args.arch, 'digest_wrapper': False}
    if lock['local_policy'] != expected_policy:
        raise ValueError('Expected actual source compilation, not an image wrapper')
    expected_paths = {name for name in files if Path(name).parts[0] not in downloader.IGNORE}
    actual_paths = {str(path.relative_to(context)) for path in context.rglob('*') if path.is_file()}
    if actual_paths != expected_paths | {'.woow-source-lock.json'}:
        raise ValueError('Generated context lost source files or included unexpected files')
    verified = {}
    for name in sorted(expected_paths - {'config.yaml'}):
        data, mode = files[name]
        path = context / name
        if path.read_bytes() != data or path.stat().st_mode & 0o777 != mode:
            raise ValueError(f'Generated context changed source bytes or permissions: {name}')
        verified[name] = sync.digest(data)
    if (context / 'Dockerfile.source').exists():
        raise ValueError('Source Dockerfile was replaced by an image wrapper')
    generated_files = {name: ((context / name).read_bytes(), (context / name).stat().st_mode & 0o777)
                       for name in actual_paths}
    if not sync.source_build_supported(generated_files):
        raise ValueError('Generated context is missing Docker build inputs')
    # The downloader also promises not to overwrite a user's existing context.
    try:
        downloader.stage(entry, args.destination.resolve(), args.arch, source_build=True, raw=archive)
    except FileExistsError:
        pass
    else:
        raise ValueError('Downloader replaced an existing context')
    receipt = {
        'scope': 'Unpublished committed candidate; real Store source-build staging',
        'source_sha': sha, 'version': entry['version'], 'architecture': args.arch,
        'context': str(context), 'passed': True, 'compared_files': len(verified),
        'checks': ['exact_source_bytes_and_modes', 'all_build_inputs_present',
                   'manual_boot_no_image_override', 'matching_source_lock',
                   'original_source_dockerfile', 'existing_context_preserved'],
        'file_sha256': verified,
        'image_build': 'separate CI Build & push step; this script does not build an image',
    }
    args.receipt.parent.mkdir(parents=True, exist_ok=True)
    args.receipt.write_text(json.dumps(receipt, indent=2) + '\n')
    if args.github_output:
        with args.github_output.open('a') as output:
            output.write(f'context={context}\n')
    print(f'PASS {args.arch}: {len(verified)} source files match; local source-build context: {context}')


if __name__ == '__main__':
    main()
