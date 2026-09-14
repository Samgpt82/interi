#!/bin/bash
# Shared environment setup for backend scripts.

REQUESTED_ENVIRONMENT="${ENVIRONMENT:-}"
REQUESTED_NODE_ENV="${NODE_ENV:-}"

if [[ -z "${REQUESTED_ENVIRONMENT}" ]]; then
  if [[ -z "${REQUESTED_NODE_ENV}" ]]; then
    echo "scripts/env.sh: Set ENVIRONMENT or NODE_ENV explicitly." >&2
    return 1 2>/dev/null || exit 1
  fi

  case "${REQUESTED_NODE_ENV}" in
    production)
      ENVIRONMENT="production"
      ;;
    test)
      ENVIRONMENT="test"
      ;;
    development)
      ENVIRONMENT="development"
      ;;
    *)
      echo "scripts/env.sh: NODE_ENV must be development, test, or production." >&2
      return 1 2>/dev/null || exit 1
      ;;
  esac
else
  case "${REQUESTED_ENVIRONMENT}" in
    production)
      EXPECTED_NODE_ENV="production"
      ;;
    test)
      EXPECTED_NODE_ENV="test"
      ;;
    development|preview)
      EXPECTED_NODE_ENV="development"
      ;;
    *)
      echo "scripts/env.sh: ENVIRONMENT must be development, preview, test, or production." >&2
      return 1 2>/dev/null || exit 1
      ;;
  esac

  if [[ -n "${REQUESTED_NODE_ENV}" && "${REQUESTED_NODE_ENV}" != "${EXPECTED_NODE_ENV}" ]]; then
    echo "scripts/env.sh: ENVIRONMENT and NODE_ENV describe different deployment modes." >&2
    return 1 2>/dev/null || exit 1
  fi

  ENVIRONMENT="${REQUESTED_ENVIRONMENT}"
fi

case "${ENVIRONMENT}" in
  production)
    NODE_ENV="production"
    echo "Starting in production mode..."
    ;;
  test)
    NODE_ENV="test"
    echo "Starting in test mode..."
    ;;
  preview)
    NODE_ENV="development"
    echo "Starting in preview mode..."
    ;;
  development)
    NODE_ENV="development"
    echo "Starting in development mode..."
    ;;
esac

export ENVIRONMENT NODE_ENV
