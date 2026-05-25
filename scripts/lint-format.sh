#!/usr/bin/env bash
# scripts/lint-format.sh
# ─────────────────────────────────────────────────────────────────────────────
# Workspace-wide linting and formatting runner.
# Runs ESLint + Prettier for all Node.js services and Ruff + Black for Python.
#
# Usage:
#   ./scripts/lint-format.sh           # Lint & format all services (fix mode)
#   ./scripts/lint-format.sh --check   # CI mode: fail on any issues, no auto-fix
#
# Exit code: 0 = clean, 1 = issues found (in --check mode)
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHECK_MODE=false

# ── Argument parsing ──────────────────────────────────────────────────────────
for arg in "$@"; do
  case "$arg" in
    --check)
      CHECK_MODE=true
      ;;
    -h|--help)
      echo "Usage: $0 [--check]"
      echo "  --check  CI mode: report issues but do not auto-fix"
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg. Use --help for usage." >&2
      exit 1
      ;;
  esac
done

# ── Colour helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
RESET='\033[0m'

log_section() { echo -e "\n${BOLD}${YELLOW}▶ $1${RESET}"; }
log_ok()      { echo -e "  ${GREEN}✔ $1${RESET}"; }
log_fail()    { echo -e "  ${RED}✖ $1${RESET}"; }

FAILED_STEPS=()

run_or_record() {
  local label="$1"
  shift
  if "$@"; then
    log_ok "$label passed"
  else
    log_fail "$label failed"
    FAILED_STEPS+=("$label")
  fi
}

# ── Node.js Services ─────────────────────────────────────────────────────────

NODE_SERVICES=(backend worker frontend widget)

for service in "${NODE_SERVICES[@]}"; do
  SERVICE_DIR="$REPO_ROOT/$service"
  if [[ ! -d "$SERVICE_DIR" ]]; then
    echo "  Skipping $service (directory not found)"
    continue
  fi

  log_section "$service — ESLint"
  if [[ "$CHECK_MODE" == true ]]; then
    run_or_record "$service ESLint" \
      npx --prefix "$SERVICE_DIR" eslint "$SERVICE_DIR/src" --max-warnings 0
  else
    run_or_record "$service ESLint (fix)" \
      npx --prefix "$SERVICE_DIR" eslint "$SERVICE_DIR/src" --fix
  fi

  # Prettier (only if config exists)
  if [[ -f "$SERVICE_DIR/.prettierrc" || -f "$SERVICE_DIR/prettier.config.js" || -f "$SERVICE_DIR/.prettierrc.json" ]]; then
    log_section "$service — Prettier"
    if [[ "$CHECK_MODE" == true ]]; then
      run_or_record "$service Prettier" \
        npx --prefix "$SERVICE_DIR" prettier --check "$SERVICE_DIR/src"
    else
      run_or_record "$service Prettier (write)" \
        npx --prefix "$SERVICE_DIR" prettier --write "$SERVICE_DIR/src"
    fi
  fi
done

# ── Python (ai-service) ───────────────────────────────────────────────────────

AI_SERVICE_DIR="$REPO_ROOT/ai-service"

if [[ -d "$AI_SERVICE_DIR" ]]; then
  # Ruff
  log_section "ai-service — Ruff (lint)"
  if command -v ruff &>/dev/null; then
    if [[ "$CHECK_MODE" == true ]]; then
      run_or_record "ai-service Ruff" \
        ruff check "$AI_SERVICE_DIR/app"
    else
      run_or_record "ai-service Ruff (fix)" \
        ruff check --fix "$AI_SERVICE_DIR/app"
    fi
  elif [[ -f "$AI_SERVICE_DIR/venv/bin/ruff" ]]; then
    RUFF="$AI_SERVICE_DIR/venv/bin/ruff"
    if [[ "$CHECK_MODE" == true ]]; then
      run_or_record "ai-service Ruff" \
        "$RUFF" check "$AI_SERVICE_DIR/app"
    else
      run_or_record "ai-service Ruff (fix)" \
        "$RUFF" check --fix "$AI_SERVICE_DIR/app"
    fi
  else
    echo "  ⚠  ruff not found — skipping (install with: pip install ruff)"
  fi

  # Black
  log_section "ai-service — Black (format)"
  if command -v black &>/dev/null; then
    if [[ "$CHECK_MODE" == true ]]; then
      run_or_record "ai-service Black" \
        black --check "$AI_SERVICE_DIR/app"
    else
      run_or_record "ai-service Black (format)" \
        black "$AI_SERVICE_DIR/app"
    fi
  elif [[ -f "$AI_SERVICE_DIR/venv/bin/black" ]]; then
    BLACK="$AI_SERVICE_DIR/venv/bin/black"
    if [[ "$CHECK_MODE" == true ]]; then
      run_or_record "ai-service Black" \
        "$BLACK" --check "$AI_SERVICE_DIR/app"
    else
      run_or_record "ai-service Black (format)" \
        "$BLACK" "$AI_SERVICE_DIR/app"
    fi
  else
    echo "  ⚠  black not found — skipping (install with: pip install black)"
  fi
fi

# ── Summary ───────────────────────────────────────────────────────────────────

echo ""
if [[ ${#FAILED_STEPS[@]} -eq 0 ]]; then
  echo -e "${GREEN}${BOLD}All checks passed ✔${RESET}"
  exit 0
else
  echo -e "${RED}${BOLD}Failed steps:${RESET}"
  for step in "${FAILED_STEPS[@]}"; do
    echo -e "  ${RED}• $step${RESET}"
  done
  exit 1
fi
