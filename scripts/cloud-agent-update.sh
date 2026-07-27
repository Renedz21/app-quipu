#!/usr/bin/env bash
# Idempotent update script for Cursor Cloud Agents.
# Runs on every agent boot (environment.json "install").
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> pnpm install"
corepack enable >/dev/null 2>&1 || true
pnpm install --frozen-lockfile

echo "==> Restore / update agent skills from skills-lock.json"
if [[ -f skills-lock.json ]]; then
  # Restore on fresh VMs, then refresh locked revisions.
  # Best-effort: renamed upstream skills must not fail boot.
  if [[ ! -d .agents/skills/caveman ]] || [[ ! -d .agents/skills/ponytail ]]; then
    npx --yes skills experimental_install -y || true
    # Critical packs if lock restore skipped renamed entries.
    npx --yes skills add obra/superpowers -a cursor -y --copy || true
    npx --yes skills add juliusbrussee/caveman -a cursor -y --copy || true
    npx --yes skills add dietrichgebert/ponytail -a cursor -y --copy || true
    npx --yes skills add get-convex/agent-skills -a cursor -y --copy || true
    npx --yes skills add vercel-labs/agent-skills --skill vercel-react-best-practices --skill vercel-composition-patterns -a cursor -y --copy || true
    npx --yes skills add better-auth/skills -a cursor -y --copy || true
    npx --yes skills add vercel/next.js -a cursor -y --copy || true
  fi
  npx --yes skills update -y -p || true
fi

# Optional heavy tools (skip by default — Playwright/Bun make boot slow).
# Set QUIPU_CLOUD_SETUP_GSTACK=1 on the environment secrets tab to enable.
if [[ "${QUIPU_CLOUD_SETUP_GSTACK:-0}" == "1" ]]; then
  echo "==> gstack (QUIPU_CLOUD_SETUP_GSTACK=1)"
  if [[ ! -d "${HOME}/gstack/.git" ]]; then
    git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git "${HOME}/gstack" || true
  fi
  if [[ -x "${HOME}/gstack/setup" ]]; then
    (cd "${HOME}/gstack" && ./setup) || true
  fi
fi

echo "==> Cloud agent update complete"
if [[ -d .agents/skills ]]; then
  echo "Skills on disk: $(ls -1 .agents/skills | wc -l)"
fi
