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

Saved-project, version, and folder creation requests include a stable client request ID. Image uploads run in parallel to keep saves below gateway time limits. If a temporary 502, 503, or 504 interrupts the response after the database write succeeds, the mobile app looks up that exact record before retrying, so it reports the successful save instead of showing a false failure or creating a duplicate.

## Membership access

After the three included designs are used, the create flow checks the signed-in account's active RevenueCat entitlement or subscription before showing subscription options. Active subscribers continue directly to generation, while accounts without full access see the membership screen.

## Design generation

New room compositions use high-quality image generation with an automated visual quality check. Follow-up refinements keep the same high-quality image output but use a single bounded generation pass, avoiding extra review and regeneration cycles so small adjustments return much sooner.

## Design assets

The empty photo-upload card uses an interior photograph by Elvira Nisman, sourced from [Unsplash](https://unsplash.com/photos/minimalist-living-room-with-wooden-sideboard-aX1TTOuq83M).
