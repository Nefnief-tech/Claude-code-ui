#!/usr/bin/env bash
set -euo pipefail

# Build a single-file self-extracting installer for cc-uui
# Usage: bash scripts/build-installer.sh

cd "$(git rev-parse --show-toplevel)"

# Build stable first
echo "Building stable release..."
bun run build:stable 2>&1 | tail -3

APP_DIR="build/stable-linux-x64/cc-uui"
OUT="dist/cc-uui-linux-x64.run"
INSTALL_DIR='$HOME/.local/share/cc-uui'

echo "Creating single-file installer..."

# Create the self-extracting script
cat > "$OUT" << 'HEADER'
#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="$HOME/.local/share/cc-uui"
DESKTOP_FILE="$HOME/.local/applications/cc-uui.desktop"
EXTRACT=0

for arg in "$@"; do
  case "$arg" in
    --help|-h)
      echo "cc-uui installer / launcher"
      echo ""
      echo "  Run without args to install (first time) or launch"
      echo "  --install    Force re-install"
      echo "  --uninstall  Remove cc-uui"
      echo "  --help       Show this help"
      exit 0
      ;;
    --install) EXTRACT=1 ;;
    --uninstall)
      echo "Removing cc-uui..."
      rm -rf "$INSTALL_DIR"
      rm -f "$DESKTOP_FILE"
      rm -f "$HOME/.local/bin/cc-uui"
      echo "Done."
      exit 0
      ;;
  esac
done

# Extract if not yet installed or forced
if [ "$EXTRACT" -eq 1 ] || [ ! -f "$INSTALL_DIR/bin/launcher" ]; then
  echo "Installing cc-uui to $INSTALL_DIR ..."
  mkdir -p "$INSTALL_DIR"
  sed '1,/^#__PAYLOAD__/d' "$0" | tar xz -C "$INSTALL_DIR"
  chmod +x "$INSTALL_DIR/bin/launcher"

  # Create desktop entry
  mkdir -p "$(dirname "$DESKTOP_FILE")"
  cat > "$DESKTOP_FILE" << DESKTOP
[Desktop Entry]
Type=Application
Name=cc-uui
Comment=AI coding assistant
Exec=$INSTALL_DIR/bin/launcher
Icon=$INSTALL_DIR/Resources/icon.png
Terminal=false
Categories=Development;
DESKTOP

  # Symlink to ~/.local/bin if it exists
  if [ -d "$HOME/.local/bin" ]; then
    ln -sf "$INSTALL_DIR/bin/launcher" "$HOME/.local/bin/cc-uui"
  fi

  echo "Installed. Launching..."
fi

exec "$INSTALL_DIR/bin/launcher" "$@"
exit 0
#__PAYLOAD__
HEADER

# Append the compressed app
tar cz -C "$APP_DIR" . >> "$OUT"
chmod +x "$OUT"

SIZE=$(du -h "$OUT" | cut -f1)
echo ""
echo "Done: $OUT ($SIZE)"
