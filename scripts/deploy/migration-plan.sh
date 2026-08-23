#!/usr/bin/env bash
set -euo pipefail

BASE_REF="${1:-origin/main}"
TARGET_REF="${2:-}"

if [[ -n "${TARGET_REF}" ]]; then
  DIFF_ARGS=("${BASE_REF}...${TARGET_REF}")
else
  # Includes staged and unstaged work for the pre-commit review phase.
  DIFF_ARGS=("${BASE_REF}")
fi

print_section() {
  local title="$1"
  shift
  local files
  files="$(git diff --name-only "${DIFF_ARGS[@]}" -- "$@")"
  if [[ -z "${TARGET_REF}" ]]; then
    local untracked_files
    untracked_files="$(git ls-files --others --exclude-standard -- "$@")"
    files="$(printf '%s\n%s\n' "${files}" "${untracked_files}" | sed '/^$/d' | sort -u)"
  fi
  echo "${title}:"
  if [[ -z "${files}" ]]; then
    echo '  none'
  else
    while IFS= read -r file; do
      [[ -n "${file}" ]] && echo "  - ${file}"
    done <<< "${files}"
  fi
}

print_section 'Schema changes' apps/api/prisma/crm.prisma apps/api/prisma/migrations
print_section 'Production data migrations' apps/api/src/scripts/data-migrations
