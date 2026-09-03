# Interi

Interi is an Expo mobile app for creating AI-assisted interior redesigns, with a Bun/Hono backend for accounts, saved projects, and design services.

## Workspace

- `mobile/` — Expo React Native app
- `backend/` — Hono API with Prisma and Better Auth

## Mobile startup performance

The mobile app imports Lucide icons through `mobile/src/components/icons.ts`. That file intentionally uses direct icon modules instead of the package-wide export so Metro does not process the full icon catalog during the initial bundle.
