# Dashboard and reporting

## API and access

All endpoints are GET, under `/api/dashboard`, and require an authenticated ADMIN. Existing JWT/Roles guards, validation and exception handling apply.

| Endpoint | Result / period basis |
| --- | --- |
| `/summary` | Live request counts, actionable urgent requests, resolutions today, closures this month, active residents/technicians, availability and low stock |
| `/requests-by-status` | Counts by request creation date; includes zero-count statuses |
| `/requests-by-category` | Counts by request creation date, descending count |
| `/technician-workload` | Current ASSIGNED/IN_PROGRESS jobs plus period resolutions credited to final active assignment |
| `/monthly-cost` | Parts usage historical quantity × price and work-note labor/other costs, by source record creation date |
| `/average-resolution-time` | Creation to resolution elapsed time, by resolution date; RESOLVED/CLOSED only |
| `/feedback-summary` | Weighted average and 1–5 distribution, by feedback creation date |
| `/low-stock-parts` | Existing Parts service, current active low-stock parts; paginated first 100 with total |

Period endpoints accept both `from` and `to` in YYYY-MM-DD format. Dates are inclusive UTC calendar dates. Omit both for the current UTC month. One-sided, impossible or reversed ranges return 400. Snapshot endpoints do not apply period filters.

Example: `GET /api/dashboard/monthly-cost?from=2026-09-01&to=2026-09-30`, with `Authorization: Bearer <admin-access-token>`. Following actual existing backend conventions, reports return plain objects/arrays, while low-stock returns `{data, meta}` pagination. Cost response: `{ "partsCost": 200, "laborCost": 650, "otherCost": 250, "totalCost": 1100 }` (example only). Empty averages are null, not fabricated ratings or durations.

## Files and database

Backend implementation and four test suites: `src/modules/dashboard/` (DTO, controller, service, repository, module and types). Registered in `src/app.module.ts`.

No dashboard tables. Migration `20260916094204_add_dashboard_reporting_indexes` adds MaintenanceRequest resolvedAt/closedAt and MaintenanceWorkNote createdAt indexes. Existing PartsRepository low-stock filtering now uses Prisma field comparison in PostgreSQL rather than loading all parts into Node.

Flutter feature: `lib/features/dashboard/{data/{datasources,models,repositories},domain/{entities,repositories,usecases},presentation/{bloc,pages}}`. Existing Dio, error mapper, injectable DI and shell are reused. Integration changes: API paths, generated DI, router, route-access/redirect helpers, shell navigation, former placeholder overview and router tests. Feature tests: `test/features/dashboard/dashboard_test.dart`.

## UI and testing

ADMIN lands at `/dashboard`; Residents/Technicians retain their existing overview and cannot access operational reports. Dashboard navigation is admin-only. The page includes snapshot cards, one shared date selector, status/category bars, workload table, INR costs, resolution time, feedback distribution and stock preview linking to Parts. Loading/error/empty states are explicit; failed refresh keeps previous successful data with a warning. No chart dependency or new networking layer.

Login as Admin, open Dashboard, choose a custom range, refresh, inspect reports and navigate to Parts. Repeat with Resident/Technician: `/dashboard` must redirect to `/forbidden`. In Postman call each endpoint using Admin JWT; non-admin JWT must receive 403 and no JWT 401; test reversed/invalid dates for 400.

Verification commands: `npm run prisma:generate`, `npx prisma migrate dev --name add_dashboard_reporting_indexes`, `npx prisma migrate status`, Prettier on changed backend files, `npm run lint`, `npm test`, `npm run build`; Flutter `dart run build_runner build`, `dart format lib test`, `flutter analyze`, `flutter test`, `flutter build web --release`.

## Reporting assumptions / limitations

- UTC calendar periods, INR display; no tenant-specific timezone/currency configuration exists here.
- Costs describe recorded maintenance costs, not payments/accounting. Edited work-note costs remain attributed to original creation date.
- Resolution performance uses final active assignment, not a score or fractional credit for historical technicians.
- Stock is a bounded first-100 preview with explicit total; Parts retains management/pagination.
- Separate endpoint reads can reflect concurrent operational changes; no cross-endpoint point-in-time snapshot is promised.
- No role-specific dashboard API, trends, feedback-by-technician report, reporting storage or unrelated modules were added.
