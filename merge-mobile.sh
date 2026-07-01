#!/usr/bin/env bash
# merge-mobile.sh
#
# Copies geo-location-tracker-app into geo-location-tracker-backend/mobile-app/
# so both frontend and backend live in one repo without the 349MB node_modules bloat.
#
# Usage (run from the repo root):
#   bash merge-mobile.sh
#
# Run once after cloning. Re-run any time you want to pull in fresh mobile changes.

set -euo pipefail

SRC="./geo-location-tracker-app/"
DEST="./geo-location-tracker-backend/mobile-app/"

echo "→ Syncing $SRC → $DEST"

rsync -av \
  --exclude='node_modules' \
  --exclude='.expo' \
  --exclude='.git' \
  "$SRC" "$DEST"

echo "✓ Done. mobile-app/ is up to date."
echo ""
echo "Tip: node_modules and .expo are excluded — run 'npm install' inside"
echo "     geo-location-tracker-backend/mobile-app/ before starting Expo."
