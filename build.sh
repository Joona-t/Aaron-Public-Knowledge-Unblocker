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

# Firefox zip (full manifest with browser_specific_settings)
echo "Packaging Firefox..."
zip -r aaron-firefox.zip . \
  -x ".git/*" ".gitignore" "generate_icons.py" "*.zip" "build.sh" \
     "__pycache__/*" ".DS_Store" "*.pyc" "manifest.json.bak" "icon128.png" \
     ".claude/*" ".claude"

# Chrome zip (strip browser_specific_settings from manifest)
echo "Packaging Chrome..."
cp manifest.json manifest.json.bak
node -e "
  const fs = require('fs');
  const m = JSON.parse(fs.readFileSync('manifest.json', 'utf-8'));
  delete m.browser_specific_settings;
  fs.writeFileSync('manifest.json', JSON.stringify(m, null, 2));
"
zip -r aaron-chrome.zip . \
  -x ".git/*" ".gitignore" "generate_icons.py" "*.zip" "build.sh" \
     "__pycache__/*" ".DS_Store" "*.pyc" "manifest.json.bak" "icon128.png" \
     ".claude/*" ".claude"

# Restore full manifest
mv manifest.json.bak manifest.json

echo ""
echo "Done:"
ls -lh aaron-*.zip
