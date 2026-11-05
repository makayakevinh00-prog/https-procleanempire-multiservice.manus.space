#!/bin/sh
# Génère les maquettes PDF : ./scripts/render-mockups.sh <dossier>
set -e
OUT="${1:-/tmp}"
node_modules/tsx/node_modules/.bin/esbuild scripts/render-mockups.tsx --bundle --platform=node --format=esm --packages=external --jsx=automatic --outfile="$OUT/.render.mjs" --log-level=warning 2>/dev/null || npx esbuild scripts/render-mockups.tsx --bundle --platform=node --format=esm --packages=external --jsx=automatic --outfile="$OUT/.render.mjs" --log-level=warning
cp "$OUT/.render.mjs" ./.render.tmp.mjs && node ./.render.tmp.mjs "$OUT"; rm -f ./.render.tmp.mjs
