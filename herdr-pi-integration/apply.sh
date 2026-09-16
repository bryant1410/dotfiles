#!/usr/bin/env bash
# Install the locally patched herdr Pi integration extension.
#
# Re-run after every `herdr update` — herdr rewrites the extension file and the
# patch is lost. See README.md in this directory for why the patch exists.
set -euo pipefail

dir="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")" && pwd)"
target="${HERDR_PI_EXTENSION:-$HOME/.pi/agent/extensions/herdr-agent-state.ts}"
pristine="$dir/herdr-agent-state.v9.pristine.ts"
patched="$dir/herdr-agent-state.patched.ts"

[ -f "$pristine" ] && [ -f "$patched" ] || { echo "apply: patch files missing beside $dir" >&2; exit 1; }
[ -f "$target" ] || {
  echo "apply: $target not found — install herdr's pi integration first:" >&2
  echo "         herdr integration install pi" >&2
  exit 1
}

if diff -q "$patched" "$target" >/dev/null 2>&1; then
  echo "apply: already applied ($target)"
  exit 0
fi

if ! grep -q 'HERDR_PI_PATCH' "$target"; then
  if ! diff -q "$pristine" "$target" >/dev/null 2>&1; then
    echo "apply: WARNING — the installed extension is neither our patch nor the pristine v9 file" >&2
    echo "       it was written against. herdr likely shipped a newer integration; rebase:" >&2
    echo "         diff -u '$pristine' '$target'    # see what upstream changed" >&2
    echo "       (update herdr-agent-state.patched.ts + the pristine copy), or pass --force." >&2
    [ "${1:-}" = "--force" ] || exit 1
  fi
fi

install -m 0644 "$patched" "$target"
echo "apply: installed patched extension -> $target"
echo "       new Pi sessions pick it up immediately; running sessions need /reload."
