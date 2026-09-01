#!/usr/bin/env bash
# ==============================================================================
# Night Shift Automated Verification Runner for mos-lab Monorepo
# ==============================================================================
# Usage: bash scripts/night-shift-runner.sh [--quick]
# Exit Code: 0 on success, non-zero on verification failure.
# ==============================================================================

set -euo pipefail

COLOR_RESET="\033[0m"
COLOR_GREEN="\033[32m"
COLOR_RED="\033[31m"
COLOR_CYAN="\033[36m"
COLOR_YELLOW="\033[33m"

log_info() {
    echo -e "${COLOR_CYAN}[NIGHT-SHIFT]${COLOR_RESET} $1"
}

log_success() {
    echo -e "${COLOR_GREEN}[NIGHT-SHIFT PASS]${COLOR_RESET} $1"
}

log_error() {
    echo -e "${COLOR_RED}[NIGHT-SHIFT FAIL]${COLOR_RESET} $1"
}

QUICK_MODE=false
if [[ "${1:-}" == "--quick" ]]; then
    QUICK_MODE=true
    log_info "Running in QUICK verification mode..."
fi

START_TIME=$(date +%s)
log_info "Starting Night Shift Monorepo Verification at $(date)..."

if [[ "$QUICK_MODE" == "true" ]]; then
    log_info "Running canonical quick gate (lint, typecheck, tests)..."
    VERIFY_COMMAND=(pnpm verify:quick)
else
    log_info "Running canonical full gate (quick gate plus all-package production build)..."
    VERIFY_COMMAND=(pnpm verify)
fi

if "${VERIFY_COMMAND[@]}"; then
    log_success "Canonical verification gate passed cleanly."
else
    log_error "Canonical verification gate failed!"
    exit 1
fi

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo ""
log_success "ALL VERIFICATION CHECKS PASSED IN ${ELAPSED}s! Ready for git commit."
exit 0
