#!/usr/bin/env bash
# ============================================================
# Workspace-wide lint & format
# ============================================================
set -e

echo "🔍 Linting all TypeScript apps..."
npx nx run-many -t lint --parallel=4

echo "✨ Formatting all files..."
npx prettier --write "**/*.{ts,tsx,js,jsx,json,md,css}" --ignore-path .gitignore

echo "✅ All done!"
