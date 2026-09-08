#!/bin/bash
# Shared environment setup for backend scripts

ENVIRONMENT="${ENVIRONMENT:-development}"

if [[ "${ENVIRONMENT}" == "production" ]]; then
  echo "Starting in production mode..."
  export NODE_ENV="production"
  DATA_DIR="${DATA_DIR:-/data}"

  # Runtime and migration URLs must come from the same configuration source.
  # Mixing one injected value with one dotenv fallback could migrate a different
  # database than the application uses.
  if { [[ -n "${DATABASE_URL:-}" ]] && [[ -z "${DIRECT_URL:-}" ]]; } ||
     { [[ -z "${DATABASE_URL:-}" ]] && [[ -n "${DIRECT_URL:-}" ]]; }; then
    echo "scripts/env.sh: DATABASE_URL and DIRECT_URL must be configured together"
    exit 1
  fi

  # Bun loads committed dotenv files for the application, but this shell also
  # needs both URLs while preparing Prisma migrations. Preserve injected
  # production secrets when present; otherwise load the same dotenv values Bun
  # will use. Never replace a managed PostgreSQL URL with a local SQLite file.
  if [[ -z "${DATABASE_URL:-}" ]]; then
    DATABASE_URL="$(bun -e 'process.stdout.write(process.env.DATABASE_URL ?? "")')"
    DIRECT_URL="$(bun -e 'process.stdout.write(process.env.DIRECT_URL ?? "")')"
    export DATABASE_URL DIRECT_URL
  fi

  if [[ -z "${DATABASE_URL}" || -z "${DIRECT_URL}" ]]; then
    echo "scripts/env.sh: DATABASE_URL and DIRECT_URL are required in production"
    exit 1
  fi
else
  echo "Starting in development mode..."
  export NODE_ENV="development"
fi
