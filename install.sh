#!/bin/sh
set -e

REPO="christianalfoni/claude-beacon"
BIN="claude-beacon"
INSTALL_DIR="/usr/local/bin"

OS=$(uname -s)
ARCH=$(uname -m)

if [ "$OS" = "Darwin" ] && [ "$ARCH" = "arm64" ]; then
  ASSET="claude-beacon-macos-arm64"
elif [ "$OS" = "Darwin" ]; then
  ASSET="claude-beacon-macos-x64"
elif [ "$OS" = "Linux" ]; then
  ASSET="claude-beacon-linux-x64"
else
  echo "Unsupported platform: $OS $ARCH"
  exit 1
fi

URL="https://github.com/$REPO/releases/latest/download/$ASSET"

echo "Downloading $ASSET..."
curl -fsSL "$URL" -o "/tmp/$BIN"
chmod +x "/tmp/$BIN"

echo "Installing to $INSTALL_DIR/$BIN (may require sudo)..."
sudo mv "/tmp/$BIN" "$INSTALL_DIR/$BIN"

echo "Done. Run: claude-beacon --version"
