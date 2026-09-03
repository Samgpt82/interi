# Interi

Interi is an Expo mobile app for creating AI-assisted interior redesigns, with a Bun/Hono backend for accounts, saved projects, and design services.

## Workspace

- `mobile/` — Expo React Native app
- `backend/` — Hono API with Prisma and Better Auth

## Authentication

Email sign-in uses a six-digit verification code. The mobile app requests codes through `POST /api/verification-code`; the backend creates the Better Auth OTP, waits for the email provider to accept it, and returns a clear error if delivery cannot be started. Requests for the same email address have a 30-second resend cooldown.

## Mobile startup performance

The mobile app imports Lucide icons through `mobile/src/components/icons.ts`. That file intentionally uses direct icon modules instead of the package-wide export so Metro does not process the full icon catalog during the initial bundle.
