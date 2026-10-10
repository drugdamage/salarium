#!/bin/bash
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "ERROR: Node.js not found."
  echo "Download from: https://nodejs.org"
  echo ""
  read -p "Press Enter to exit..."
  exit 1
fi

if [ ! -f config.js ]; then
  echo ""
  echo "ERROR: config.js not found."
  echo "Copy config.example.js to config.js and fill in your Supabase keys."
  echo ""
  read -p "Press Enter to exit..."
  exit 1
fi

echo ""
echo "[1/2] Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
  echo "ERROR: npm install failed."
  read -p "Press Enter to exit..."
  exit 1
fi

echo ""
echo "[2/2] Building app..."
npm run build
if [ $? -ne 0 ]; then
  echo "ERROR: Build failed."
  read -p "Press Enter to exit..."
  exit 1
fi

echo ""
echo "Done."
echo "Run the app from: dist/mac-arm64/Salarium.app (Apple Silicon: M1/M2/M3/M4)"
echo ""
read -p "Press Enter to exit..."
