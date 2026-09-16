# Local-development historical seed

This replaces the former small upsert fixture with a deterministic, relationally validated dataset for **all 14 current business models**. It uses the existing Prisma 7 configuration (`prisma.config.ts`), generated client and PostgreSQL adapter. No schema changes, application logic changes or new libraries are needed.

## Commands

Run from the backend project, with the existing local `.env`:

```bash
npm run prisma:generate
npm run prisma:seed:preview  # generate/validate without connecting or writing
npm run prisma:seed          # populate an EMPTY database only
npm run prisma:reseed:local  # DESTRUCTIVE: replace ALL local business data
```

Equivalent Prisma commands are `npx prisma db seed`, `npx prisma db seed -- --dry-run`, and `npx prisma db seed -- --reset`.

**Reset removes every business record, including accounts and audit logs**, not merely previously seeded records. It preserves tables, indexes and `_prisma_migrations`. Deleted data requires a backup to recover. The runner refuses production NODE_ENV, remote hosts, any database except loopback `apartment_maintenance`, unknown tables/schema drift, unknown CLI flags, and non-empty databases without explicit `--reset`.

An advisory lock and a serializable transaction cover FK-safe deletion, batched insertion, inventory deduction and persisted-data validation. Any failure inside that transaction rolls back the replacement. Run after migrations and preferably with the development API stopped; application writes may cause a safe serialization failure. Do not bypass guards to point this fixture at production, even through a local tunnel.

For exact reproducibility, pin the end instant and optional unsigned integer PRNG seed:

```bash
SEED_AS_OF=2026-09-16T10:28:17.447Z SEED_RANDOM_SEED=20260916 npm run prisma:reseed:local
```

Without overrides the period ends at execution time and begins six calendar months earlier (UTC, month-end clamped). IDs and randomness are deterministic; fixed inputs reproduce every business value except password hashes, which correctly use fresh cryptographic salts. The ordinary default produces similar data as the clock advances. The end date cannot be in the future.

## Verified dataset

The verified fixed-anchor period is **2026-03-16 through 2026-09-16 UTC**. Foundational accounts, apartment construction, move-in dates and skill registration predate requests where needed; maintenance activity covers the six-month period.

| Model                  |                                             Rows |
| ---------------------- | -----------------------------------------------: |
| User                   |         60 (2 ADMIN, 45 RESIDENT, 13 TECHNICIAN) |
| Apartment              | 48 (A/B/C/D, four floors, three units per floor) |
| Resident               |                                               45 |
| MaintenanceCategory    |                                               10 |
| Technician             |                                               13 |
| TechnicianSkill        |                                               32 |
| Part                   |                                               25 |
| MaintenanceRequest     |                                              220 |
| MaintenanceAssignment  |                                              232 |
| MaintenanceComment     |                                              626 |
| MaintenanceHistory     |                                            2,363 |
| MaintenanceWorkNote    |                                              189 |
| MaintenanceRequestPart |                                              195 |
| Feedback               |                                              123 |

Request statuses: 171 CLOSED, 8 RESOLVED, 10 IN_PROGRESS, 10 ASSIGNED, 10 OPEN and 11 CANCELLED. There are 33 pre-start reassignments (about 17% of assigned requests), 8 active low-stock parts including 2 out of stock, and feedback at each rating 1–5. Feedback covers about 72% of closed requests. Costs occur throughout the period. Counts may vary with PRNG overrides.

Residents occupy 35 units with 10 second household members; 13 units have no profiles. Profile/account active flags are intentionally independent. Two categories, one technician account/profile, several residents and two unused historical parts are inactive. Unavailable technicians remain separate from workload—availability is not automatically changed by receiving a job.

## Test accounts

All emails and identities are fictional sample data. Phones are synthetic validation-compatible values, not contactable fixtures; never send email/SMS from this dataset.

| Role       | Email                   | Password     |
| ---------- | ----------------------- | ------------ |
| ADMIN      | admin1@example.com      | Password@123 |
| RESIDENT   | resident1@example.com   | Password@123 |
| TECHNICIAN | technician1@example.com | Password@123 |

Numbered emails extend through admin2, resident45 and technician13 at `example.com`. Resident43–45 and technician13 accounts are inactive for access-denial testing. The actual Auth module uses **Argon2, not bcrypt**; this runner uses exactly its `argon2.hash(password)` package defaults and verifies sample passwords after writing. No hashes are printed.

## Data quality and schema assumptions

- Request apartments match their residents; no household moves are invented because the schema lacks apartment-assignment history.
- Old requests are mostly completed; actionable requests are recent. Urgent titles describe believable safety/flood/electrical failures. A current-day resolution fixture supports the live dashboard.
- Assignment technicians are active, available and skilled for the final category. Reassignment occurs while ASSIGNED, before work starts. Old records have unassignedAt; final records remain active even for resolved/closed jobs, matching current application behavior.
- Comments are from the owner, Admin or technician assigned at that instant. Exact audit action names, reference IDs, timestamps and status transitions match the final request. Meaningful priority/category corrections happen only while OPEN.
- The schema permits one work note per request; it is written by the final technician after work starts, with varied labor/other costs. IN_PROGRESS notes describe unfinished work. No arbitrary request total is stored.
- Historical usage unit prices snapshot the catalogue price at usage; the fixture assumes stable prices and no replenishment over the period. There is no inventory movement/opening-balance model. Opening stock is explicitly computed as consumption plus final stock, inserted first, then reduced by usage in SQL. All positive consumption prefixes are safe, and persisted current balances are checked against the plan. Summary prints opening/consumed/current unit totals.
- Feedback is unique, only after CLOSED, from the owning Resident; audit metadata includes rating, never the full message. Ratings are weighted rather than universally five stars.
- This is dataset generation, not a replay through HTTP services: it directly batches Prisma inserts to preserve historical timestamps. It mirrors inspected business rules without weakening application validation.

## Files and validation

`../seed.ts` orchestrates guarded execution. `seed-utils.ts` supplies IDs/randomness/date/safety utilities; `seed-catalog.ts` supplies fictional identities and issue/part/message templates; `seed-foundation.ts` creates master data; `seed-maintenance-requests.ts` generates workflows; `seed-plan.ts` composes the dataset and inventory; `seed-database.ts` handles atomic persistence; `seed-validate.ts` checks generated and reread data; `seed-types.ts` uses actual Prisma input types. `../tsconfig.seed.json` type-checks these independently of Nest's source-root build.

```bash
npm run prisma:seed:check
npx oxlint prisma/seed.ts prisma/seed
npx vitest run prisma/seed/seed.spec.ts
npm run lint
npm test
npm run build
```

Tests need no database and cover repeatability, month ends/leap years/UTC midnight, coverage, uniqueness, orphan/ownership errors, stock reconciliation, conflicting assignments/history, invalid feedback and local-only guards. Every real run also rereads all business tables and checks expected counts, foreign-key relationships, timeline ordering, final status/history agreement, assignment/skill matching, author ownership, stock balances and feedback eligibility before commit. PostgreSQL enforces the actual FK and unique constraints.

For manual testing, login with each role, paginate/search the corresponding modules, open historical request timelines, inspect current technician jobs, submit updates on recent jobs, and filter the admin dashboard across earlier months and the current month. Seeded CLOSED records with no feedback allow the Resident submission flow to be exercised.
