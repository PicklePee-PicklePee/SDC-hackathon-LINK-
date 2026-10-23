#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

# Restore the exact locked dependencies, including tools needed for the build.
npm ci --include=dev --no-audit --no-fund
npm run build

# Do not apply database schema changes, seed accounts, or submit GPU jobs here.
