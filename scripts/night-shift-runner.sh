#!/usr/bin/env bash
# ==============================================================================
# Night Shift Automated Verification Runner for mos-lab Monorepo
# ==============================================================================
# Usage: bash scripts/night-shift-runner.sh [--quick]
# Exit Code: 0 on success, non-zero on verification failure.
# ==============================================================================

set -eo pipefail

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
if [[ "$1" == "--quick" ]]; then
    QUICK_MODE=true
    log_info "Running in QUICK verification mode..."
fi

START_TIME=$(date +%s)
log_info "Starting Night Shift Monorepo Verification at $(date)..."

# Step 1: Lint check
log_info "Step 1/3: Running ESLint across workspace..."
if pnpm lint; then
    log_success "ESLint passed clean."
else
    log_error "ESLint failed!"
    exit 1
fi

# Step 2: Build Shared Package
log_info "Step 2/3: Building @mos-lab/shared..."
if pnpm --filter @mos-lab/shared build; then
    log_success "@mos-lab/shared built successfully."
else
    log_error "Failed to build @mos-lab/shared!"
    exit 1
fi

# Step 3: Monorepo Turbo Build (Compilation & Next.js/Fastify Bundle Check)
if [[ "$QUICK_MODE" == "false" ]]; then
    log_info "Step 3/3: Running Turbo build for monorepo (@mos-lab/web & @mos-lab/api)..."
    if pnpm build; then
        log_success "Monorepo Turbo build passed cleanly!"
    else
        log_error "Turbo build failed!"
        exit 1
    fi
else
    log_info "Step 3/3: Skipping full Turbo build (QUICK MODE active)."
fi

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo ""
log_success "ALL VERIFICATION CHECKS PASSED IN ${ELAPSED}s! Ready for git commit."
exit 0
