#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "==> Building canary..."
bun run build:canary

RES_DIR="$SCRIPT_DIR/build/canary-linux-x64/cc-uui-canary/Resources"
TAR=$(ls "$RES_DIR"/*.tar.zst)
if [ -z "$TAR" ]; then
  echo "ERROR: No tar.zst found in $RES_DIR"
  exit 1
fi

TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

echo "==> Extracting app from $(basename $TAR)..."
mkdir -p "$TMPDIR/extract"
tar --zstd -xf "$TAR" -C "$TMPDIR/extract"

# Find the extracted app directory (name may vary)
APP_SRC=$(find "$TMPDIR/extract" -maxdepth 1 -mindepth 1 -type d | head -1)
if [ -z "$APP_SRC" ]; then
  echo "ERROR: Could not find extracted app directory"
  exit 1
fi

APPDIR="$TMPDIR/cc-uui.AppDir"
mkdir -p "$APPDIR"
mv "$APP_SRC" "$APPDIR/cc-uui-canary"

cat > "$APPDIR/AppRun" << 'LAUNCH'
#!/bin/bash
DIR="$(dirname "$(readlink -f "$0")")"
export PATH="$DIR/cc-uui-canary/bin:$PATH"
cd "$DIR/cc-uui-canary/bin"
exec ./launcher
LAUNCH
chmod +x "$APPDIR/AppRun"

cat > "$APPDIR/cc-uui.desktop" << 'EOF'
[Desktop Entry]
Name=cc-ui
Exec=cc-uui
Icon=cc-uui
Type=Application
Categories=Development;
EOF

cat > "$APPDIR/cc-uui.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <rect width="256" height="256" rx="48" fill="#0f172a"/>
  <text x="128" y="160" font-family="sans-serif" font-size="120" font-weight="bold" fill="#818cf8" text-anchor="middle">cc</text>
</svg>
EOF

# Find appimagetool
TOOL=""
if command -v appimagetool &>/dev/null; then
  TOOL="appimagetool"
elif [ -f "$SCRIPT_DIR/squashfs-root/usr/bin/appimagetool" ]; then
  TOOL="$SCRIPT_DIR/squashfs-root/usr/bin/appimagetool"
  export PATH="$SCRIPT_DIR/squashfs-root/usr/bin:$PATH"
fi

if [ -z "$TOOL" ]; then
  echo "ERROR: appimagetool not found. Install it or extract it next to this script."
  exit 1
fi

OUTPUT="$SCRIPT_DIR/cc-ui-x86_64.AppImage"

echo "==> Packaging AppImage..."
ARCH=x86_64 "$TOOL" "$APPDIR" "$OUTPUT"

echo "==> Done: $OUTPUT ($(du -h "$OUTPUT" | cut -f1))"
