#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/frontend"
npm install
npm run build && npx next start --port 3000 --hostname 0.0.0.0 &
