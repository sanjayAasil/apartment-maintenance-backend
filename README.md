# Apartment Maintenance Management API

NestJS REST API foundation for apartment maintenance management. The current
application includes PostgreSQL/Prisma persistence, Users management, and
email/password authentication with Argon2 and JWT access tokens.

## Requirements

- Node.js 24 or newer
- PostgreSQL
- An `apartment_maintenance` database (or another database in `DATABASE_URL`)

## Environment

Copy `.env.example` to `.env` and replace all placeholder credentials:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/apartment_maintenance?schema=public"
PORT=3000
CORS_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
JWT_SECRET="replace-with-a-long-random-secret"
JWT_EXPIRES_IN="1h"
```

Generate a local JWT secret with a password manager or a cryptographically
secure random generator. The application refuses to start when `JWT_SECRET` is
missing. Never commit `.env`.

Native Flutter applications do not enforce browser CORS. For Flutter Web, add
its exact development origin to the comma-separated `CORS_ORIGINS` value.

## Install and run

```bash
npm install
npm run prisma:generate
npm run prisma:migrate -- --name create_users
npm run start:dev
```

Swagger UI is available at `http://localhost:3000/api/docs`.

## Public development URL with ngrok

Install and authenticate the ngrok agent once:

```bash
ngrok config add-authtoken <your-ngrok-authtoken>
```

Run the API and tunnel in separate terminals:

```bash
npm run start:dev
```

```bash
npm run tunnel
```

The tunnel forwards to `PORT` (default `3000`). Its public API URL is the
HTTPS forwarding URL followed by `/api`, for example
`https://example.ngrok-free.app/api`. Swagger is available at `/api/docs`.

If your ngrok account has a reserved domain, set `NGROK_URL` before starting:

```bash
NGROK_URL=https://your-name.ngrok.app npm run tunnel
```

Never commit an ngrok authtoken. The CLI stores it in the user's ngrok config,
outside this repository. A public tunnel exposes the development API to the
internet, so stop it when testing is complete.

## Authentication

Public registration always creates an active `RESIDENT`. Client requests cannot
set `role`, `isActive`, or `passwordHash`.

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Alex Kumar","email":"alex@example.com","password":"replace-this-password"}'
```

Log in with the same credentials:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alex@example.com","password":"replace-this-password"}'
```

Both endpoints return a public user and an `accessToken`. Pass that token in the
Bearer header for authenticated requests:

```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

Tokens are rejected if their user has been deleted or deactivated. This initial
version intentionally has no refresh tokens, cookies, logout blacklist, or OAuth.

## Users management

All `/api/users` routes require an authenticated `ADMIN`:

- `GET /api/users`
- `GET /api/users/:id`
- `PATCH /api/users/:id`
- `PATCH /api/users/:id/status`

Administrative user creation is intentionally omitted for now. `/api/auth/register`
is the supported user-creation API. To bootstrap the first local administrator,
register normally and change that user's role to `ADMIN` through Prisma Studio:

```bash
npm run prisma:studio
```

## Development commands

```bash
npm run prisma:generate
npm run prisma:migrate -- --name <migration_name>
npm run prisma:studio
npm run build
npm run lint
npm test
```

## Architecture

```text
src/
├── common/
├── generated/prisma/       # Generated and gitignored
├── modules/
│   ├── auth/
│   │   ├── decorators/
│   │   ├── dto/
│   │   ├── guards/
│   │   └── strategies/
│   └── users/
│       └── dto/
├── prisma/
├── app.module.ts
└── main.ts
```

Business modules follow `Controller -> Service -> Repository -> Prisma -> PostgreSQL`.
