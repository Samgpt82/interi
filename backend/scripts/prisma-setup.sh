# shellcheck shell=bash
# Prisma setup sourced by scripts/start.

if [[ ! -f "prisma/schema.prisma" ]]; then
  return 0 2>/dev/null || exit 0
fi

echo "Validating Prisma schema..."
bunx prisma validate

echo "Generating Prisma client..."
bunx prisma generate

if [[ "${ENVIRONMENT}" == "production" ]]; then
  if ! compgen -G "prisma/migrations/*/migration.sql" >/dev/null; then
    echo "Production startup requires committed Prisma migrations." >&2
    return 1 2>/dev/null || exit 1
  fi

  echo "Applying Prisma migrations (migrate deploy)..."
  bunx prisma migrate deploy
else
  echo "Synchronizing development schema (non-destructive db push)..."
  bunx prisma db push
fi

if [[ "${ENVIRONMENT}" != "production" && -n "${VIBECODE_PROJECT_ID:-}" ]]; then
  echo "Enabling database viewer..."
  curl -sS -X POST "https://api.vibecodeapp.com/api/projects/${VIBECODE_PROJECT_ID}/cloud/db/enable" || true
fi
