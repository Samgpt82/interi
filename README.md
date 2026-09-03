# Interi

Interi is an Expo mobile app for creating AI-assisted interior redesigns, with a Bun/Hono backend for accounts, saved projects, and design services.

## Workspace

- `mobile/` — Expo React Native app
- `backend/` — Hono API with Prisma and Better Auth

## Authentication

Email sign-in uses a six-digit verification code. The mobile app requests codes through `POST /api/verification-code`; the backend creates the Better Auth OTP, waits for the email provider to accept it, and returns a clear error if delivery cannot be started. Requests for the same email address have a 30-second resend cooldown.

## Mobile startup performance

The mobile app imports Lucide icons through `mobile/src/components/icons.ts`. That file intentionally uses direct icon modules instead of the package-wide export so Metro does not process the full icon catalog during the initial bundle.

## Saved-design reliability

Saved-project, version, and folder creation requests include a stable client request ID. The backend uses that ID as the new record ID, so retrying after a temporary gateway interruption returns the original result instead of creating a duplicate. The mobile API client automatically retries temporary 502, 503, and 504 responses for reads and these idempotent create operations.

## Design assets

The empty photo-upload card uses an interior photograph by Elvira Nisman, sourced from [Unsplash](https://unsplash.com/photos/minimalist-living-room-with-wooden-sideboard-aX1TTOuq83M).
