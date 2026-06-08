#!/usr/bin/env bash
# ============================================================
# Run DB migrations for the backend
# ============================================================
set -e
cd "$(dirname "$0")/../apps/backend"
echo "🗃️  Running Drizzle migrations..."
npx drizzle-kit migrate
echo "✅ Migrations complete."
