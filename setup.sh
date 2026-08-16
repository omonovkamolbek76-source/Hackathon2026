#!/usr/bin/env bash
set -euo pipefail
pnpm install
pnpm db:generate
pnpm --filter @businessos/database push
pnpm db:seed
pnpm test
echo "Ready. Run: pnpm dev"
echo "Demo: tadbirkor@businessos.uz / Demo1234!"
