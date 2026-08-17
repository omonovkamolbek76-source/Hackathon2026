#!/usr/bin/env bash
# ============================================================
# TadbirkorAI — kodni tortib olib, hammasini bitta buyruq bilan ishga tushirish
#   ./start.sh          -> git pull + dev rejimida ishga tushiradi (backend + frontend, chunki Next.js'da ular bitta)
#   ./start.sh prod     -> git pull + build qiladi va production rejimida ishga tushiradi
#   ./start.sh postgres -> Docker orqali Postgres'ni ham ko'taradi (SQLite o'rniga)
#   ./start.sh nopull   -> git pull'ni o'tkazib yuboradi (faqat lokal kod bilan ishga tushiradi)
#
# Bu skript quyidagilarni o'zi bajaradi:
#   0) git pull orqali eng so'nggi kodni oladi (main branch, saqlanmagan o'zgarish bo'lsa xavfsiz o'tkazib yuboradi)
#   1) .env faylini tekshiradi/yaratadi
#   2) node_modules'ni o'rnatadi (agar kerak bo'lsa)
#   3) AUTH_SECRET va boshqa default qiymatlarni to'ldiradi
#   4) (ixtiyoriy) Postgres konteynerini ko'taradi
#   5) Prisma client generatsiya qiladi, bazani sozlaydi, seed qiladi
#   6) Serverni ishga tushiradi (dev yoki prod)
# ============================================================

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

MODE="dev"
USE_POSTGRES="false"
DO_PULL="true"
for arg in "$@"; do
  case "$arg" in
    prod|production) MODE="prod" ;;
    dev|development) MODE="dev" ;;
    postgres|pg) USE_POSTGRES="true" ;;
    nopull|no-pull) DO_PULL="false" ;;
    *) echo "Noma'lum argument: $arg (dev|prod|postgres|nopull qabul qilinadi)"; exit 1 ;;
  esac
done

BOLD="\033[1m"; GREEN="\033[32m"; YELLOW="\033[33m"; RED="\033[31m"; RESET="\033[0m"
info()  { echo -e "${BOLD}==>${RESET} $1"; }
ok()    { echo -e "${GREEN}✔${RESET} $1"; }
warn()  { echo -e "${YELLOW}!${RESET} $1"; }
fail()  { echo -e "${RED}✘${RESET} $1"; exit 1; }

# --- 0) Talab qilinadigan vositalarni tekshirish ---
command -v node >/dev/null 2>&1 || fail "Node.js topilmadi. O'rnating: https://nodejs.org"
command -v npm  >/dev/null 2>&1 || fail "npm topilmadi."
info "Node $(node -v), npm $(npm -v)"

# --- 0.5) Eng so'nggi kodni git orqali tortib olish ---
if [ "$DO_PULL" = "true" ]; then
  if ! command -v git >/dev/null 2>&1; then
    warn "git topilmadi — pull bosqichi o'tkazib yuborildi"
  elif [ ! -d .git ]; then
    warn "Bu git repository emas — pull bosqichi o'tkazib yuborildi"
  elif ! git remote get-url origin >/dev/null 2>&1; then
    warn "git remote (origin) topilmadi — pull bosqichi o'tkazib yuborildi"
  else
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
    if [ -z "$CURRENT_BRANCH" ] || [ "$CURRENT_BRANCH" = "HEAD" ]; then
      warn "Joriy branch aniqlanmadi (detached HEAD) — pull bosqichi o'tkazib yuborildi"
    elif [ -n "$(git status --porcelain)" ]; then
      warn "Saqlanmagan o'zgarishlar bor — xavfsizlik uchun 'git pull' o'tkazib yuborildi."
      warn "  Avval o'zgarishlaringizni saqlang: git add -A && git commit -m \"...\"  (yoki: git stash)"
    else
      info "Eng so'nggi kod olinmoqda (git pull --ff-only origin $CURRENT_BRANCH)..."
      if git fetch origin "$CURRENT_BRANCH" 2>&1 && git merge --ff-only "origin/$CURRENT_BRANCH" 2>&1; then
        ok "Kod eng so'nggi holatga yangilandi ($CURRENT_BRANCH)"
      else
        warn "git pull muvaffaqiyatsiz tugadi (tarmoq yo'q yoki lokal tarix uzilgan bo'lishi mumkin) — joriy lokal kod bilan davom etiladi"
      fi
    fi
  fi
else
  warn "git pull o'tkazib yuborildi (--nopull)"
fi

# --- 1) .env faylini tayyorlash ---
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    ok ".env yaratildi (.env.example asosida)"
  else
    touch .env
    warn ".env.example topilmadi, bo'sh .env yaratildi"
  fi
else
  ok ".env allaqachon mavjud"
fi

# --- 2) Paketlarni o'rnatish (faqat kerak bo'lsa) ---
if [ ! -d node_modules ] || [ package-lock.json -nt node_modules/.package-lock.json 2>/dev/null ]; then
  info "Paketlar o'rnatilmoqda (npm ci)..."
  npm ci
  ok "Paketlar o'rnatildi"
else
  ok "node_modules mavjud, o'rnatish o'tkazib yuborildi"
fi

# --- 3) AUTH_SECRET va default qiymatlarni to'ldirish (mavjud qiymatlarni buzmaydi) ---
info "Sozlamalar (.env) tekshirilmoqda..."
npm run secrets:sync --silent
ok "Sozlamalar tayyor"

# shellcheck disable=SC1091
set -a; source .env; set +a

# --- 4) (ixtiyoriy) Postgres'ni Docker orqali ko'tarish ---
if [ "$USE_POSTGRES" = "true" ]; then
  command -v docker >/dev/null 2>&1 || fail "Postgres uchun Docker kerak, lekin topilmadi."
  info "Postgres konteyneri ko'tarilmoqda (docker compose up -d)..."
  docker compose up -d
  info "Postgres tayyor bo'lishini kutyapmiz..."
  for i in $(seq 1 30); do
    if docker compose exec -T db pg_isready -U tadbirkor -d tadbirkorai >/dev/null 2>&1; then
      ok "Postgres tayyor"
      break
    fi
    sleep 1
    if [ "$i" = "30" ]; then fail "Postgres 30 soniyada tayyor bo'lmadi"; fi
  done
  if ! grep -q '^DATABASE_URL="postgresql' .env; then
    warn "DATABASE_URL hali Postgres'ga yo'naltirilmagan."
    warn "  .env ichida DATABASE_URL ni quyidagicha o'zgartiring va prisma/schema.prisma'da provider=\"postgresql\" qiling:"
    warn "  DATABASE_URL=\"postgresql://tadbirkor:tadbirkor@localhost:5432/tadbirkorai?schema=public\""
  fi
fi

# --- 5) Prisma: client generatsiya + baza + seed ---
info "Prisma client generatsiya qilinmoqda..."
npx prisma generate
info "Baza sxemasi sinxronlanmoqda (prisma db push)..."
npx prisma db push
info "Boshlang'ich ma'lumotlar (seed) yuklanmoqda..."
npm run db:seed
ok "Baza tayyor"

# --- 6) Serverni ishga tushirish ---
if [ "$MODE" = "prod" ]; then
  info "Production build qilinmoqda (npm run build)..."
  npm run build
  ok "Build tayyor"
  info "Server ishga tushmoqda: http://localhost:3000 (production)"
  exec npm run start
else
  info "Server ishga tushmoqda: http://localhost:3000 (development)"
  exec npm run dev
fi
