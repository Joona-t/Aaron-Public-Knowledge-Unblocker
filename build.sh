#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "Building icons..."
python3 generate_icons.py

echo ""
echo "=== Permission Audit ==="
grep -n "permissions" manifest.json
echo ""

# Clean old zips
rm -f aaron-chrome.zip aaron-firefox.zip

# Build both zips with Python (avoids macOS extended attributes / resource forks)
echo "Packaging..."
python3 -c "
import zipfile, json, os

EXCLUDE_DIRS = {'.git', '__pycache__', '.claude'}
EXCLUDE_FILES = {'.gitignore', 'generate_icons.py', 'build.sh',
                 '.DS_Store', 'manifest.json.bak'}
EXCLUDE_ROOT = {'icon128.png'}  # old root-level icon only

def should_include(path):
    parts = path.split(os.sep)
    if any(p in EXCLUDE_DIRS for p in parts):
        return False
    filename = parts[-1]
    if filename in EXCLUDE_FILES or filename.endswith('.pyc') or filename.endswith('.zip'):
        return False
    if len(parts) == 1 and filename in EXCLUDE_ROOT:
        return False
    return True

def collect_files():
    files = []
    for root, dirs, filenames in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        for f in filenames:
            rel = os.path.join(root, f)[2:]  # strip leading ./
            if should_include(rel):
                files.append(rel)
    return sorted(files)

files = collect_files()

# Firefox zip (full manifest)
with zipfile.ZipFile('aaron-firefox.zip', 'w', zipfile.ZIP_DEFLATED) as zf:
    for f in files:
        zf.write(f)
print(f'  aaron-firefox.zip ({len(files)} files)')

# Chrome zip (strip browser_specific_settings)
manifest = json.load(open('manifest.json'))
manifest.pop('browser_specific_settings', None)
chrome_manifest = json.dumps(manifest, indent=2)

with zipfile.ZipFile('aaron-chrome.zip', 'w', zipfile.ZIP_DEFLATED) as zf:
    for f in files:
        if f == 'manifest.json':
            zf.writestr('manifest.json', chrome_manifest)
        else:
            zf.write(f)
print(f'  aaron-chrome.zip ({len(files)} files)')
"

echo ""
echo "Done:"
ls -lh aaron-*.zip
