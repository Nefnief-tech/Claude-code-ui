#!/usr/bin/env bash
set -euo pipefail

# Build a single-file self-extracting installer for cc-uui
# Uses Electrobun's extractor binary with embedded markers + compressed archive
# Usage: bash scripts/build-installer.sh

cd "$(git rev-parse --show-toplevel)"

# Build stable first
echo "Building stable release..."
bun run build:stable 2>&1 | tail -3

APP_DIR="build/stable-linux-x64/cc-uui"
EXTRACTOR="node_modules/electrobun/dist-linux-x64/extractor"

# Find the tar.zst archive
TAR_ZST=$(find "$APP_DIR/Resources" -name "*.tar.zst" | head -1)
if [ -z "$TAR_ZST" ]; then
  echo "ERROR: No tar.zst found in build output"
  exit 1
fi

# Read metadata
METADATA_JSON=$(cat "$APP_DIR/Resources/metadata.json")

echo ""
echo "Building self-extracting installer..."
echo "  Extractor: $EXTRACTOR"
echo "  Archive: $TAR_ZST"

OUT="dist/cc-uui-linux-x64"
mkdir -p dist

# Combine: extractor + ELECTROBUN_METADATA_V1 + metadata + ELECTROBUN_ARCHIVE_V1 + tar.zst
cat "$EXTRACTOR" > "$OUT"
printf 'ELECTROBUN_METADATA_V1' >> "$OUT"
printf '%s' "$METADATA_JSON" >> "$OUT"
printf 'ELECTROBUN_ARCHIVE_V1' >> "$OUT"
cat "$TAR_ZST" >> "$OUT"
chmod +x "$OUT"

SIZE=$(du -h "$OUT" | cut -f1)
echo ""
echo "Done: $OUT ($SIZE)"
