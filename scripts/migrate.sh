#!/usr/bin/env bash
# scripts/migrate.sh
# Run Drizzle ORM migrations against the live database.
# Usage: ./scripts/migrate.sh
# Prerequisites: Docker services must be running (docker compose up -d postgres)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$ROOT_DIR/backend"

echo "🔄 Running Drizzle migrations..."
echo "   Backend: $BACKEND_DIR"

cd "$BACKEND_DIR"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "📦 Installing backend dependencies..."
  npm install
fi

# Push schema to database using drizzle-kit
# This creates/updates tables to match the Drizzle schema definition
echo "📡 Pushing schema to database..."
npm run db:push

echo "✅ Migration complete!"
