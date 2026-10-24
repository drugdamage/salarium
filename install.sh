#!/bin/sh
# Installs (or updates) the latest Salarium release on macOS and starts it.
#   curl -fsSL https://raw.githubusercontent.com/drugdamage/salarium/main/install.sh | sh
# Your Supabase settings are kept between updates.
set -eu

REPO="drugdamage/salarium"
API="https://api.github.com/repos/$REPO/releases/latest"

say() { printf '\033[1;34m::\033[0m %s\n' "$*"; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }
command -v curl >/dev/null 2>&1 || die "curl is required"

[ "$(uname -s)" = Darwin ] || die "this script is for macOS; on Windows run install.ps1"
# Apple Silicon, even from a terminal running under Rosetta.
if [ "$(sysctl -n hw.optional.arm64 2>/dev/null || echo 0)" = 1 ]; then arch=arm64; else arch=x64; fi

say "Looking up the latest release"
url=$(curl -fsSL "$API" | grep -o "\"browser_download_url\": *\"[^\"]*-mac-$arch\.zip\"" | head -n 1 | sed 's/.*"\(http[^"]*\)"/\1/')
[ -n "$url" ] || die "no macOS ($arch) build found in the latest release"

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
say "Downloading $(basename "$url")"
curl -fL --progress-bar "$url" -o "$tmp/salarium.zip"
ditto -x -k "$tmp/salarium.zip" "$tmp/out"
app="$tmp/out/Salarium.app"
[ -d "$app" ] || die "Salarium.app not found in the download"

dest="/Applications"
[ -w "$dest" ] || dest="$HOME/Applications"
mkdir -p "$dest"
osascript -e 'quit app "Salarium"' >/dev/null 2>&1 || true
rm -rf "$dest/Salarium.app"
mv "$app" "$dest/Salarium.app"
# The build is not notarized: clear the quarantine flag so it opens normally.
xattr -cr "$dest/Salarium.app" 2>/dev/null || true
say "Installed to $dest/Salarium.app"
open "$dest/Salarium.app"
