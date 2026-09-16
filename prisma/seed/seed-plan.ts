import { foundation } from './seed-foundation.js';
import { maintenance } from './seed-maintenance-requests.js';
import type { SeedPlan } from './seed-types.js';
import { Random, sixMonthsBefore } from './seed-utils.js';

export function buildPlan(
  end: Date,
  passwordHash: string,
  randomSeed = 20260916,
): SeedPlan {
  if (!Number.isFinite(end.getTime())) throw new Error('Invalid seed end date');
  const start = sixMonthsBefore(end);
  const random = new Random(randomSeed);
  const data = foundation(start, end, passwordHash, random);
  maintenance(data, start, end, random);
  for (const part of data.parts) {
    const latestUsage = Math.max(
      0,
      ...data.usages
        .filter((usage) => usage.partId === part.id)
        .map((usage) => (usage.createdAt as Date).getTime()),
    );
    if (latestUsage > (part.updatedAt as Date).getTime())
      part.updatedAt = new Date(latestUsage);
  }
  const openingStock = Object.fromEntries(
    data.parts.map((part) => [
      part.id!,
      part.quantity! +
        data.usages
          .filter((usage) => usage.partId === part.id)
          .reduce((sum, usage) => sum + usage.quantity, 0),
    ]),
  );
  return { data, start, end, openingStock };
}

export function summary(plan: SeedPlan) {
  const { data } = plan;
  const group = <T>(rows: T[], key: (row: T) => string) =>
    rows.reduce<Record<string, number>>((counts, row) => {
      const name = key(row);
      counts[name] = (counts[name] ?? 0) + 1;
      return counts;
    }, {});
  return {
    period: { from: plan.start.toISOString(), to: plan.end.toISOString() },
    counts: Object.fromEntries(
      Object.entries(data).map(([name, rows]) => [name, rows.length]),
    ),
    roles: group(data.users, (row) => row.role),
    statuses: group(data.requests, (row) => row.status!),
    requestsByMonth: group(data.requests, (row) =>
      (row.createdAt as Date).toISOString().slice(0, 7),
    ),
    costsByMonth: group([...data.notes, ...data.usages], (row) =>
      (row.createdAt as Date).toISOString().slice(0, 7),
    ),
    ratings: group(data.feedback, (row) => String(row.rating)),
    lowStockParts: data.parts.filter(
      (part) => part.isActive && part.quantity! <= part.minimumStock!,
    ).length,
    reassignedRequests: new Set(
      data.assignments
        .filter((row) => !row.isActive)
        .map((row) => row.maintenanceRequestId),
    ).size,
    inventory: {
      openingUnits: Object.values(plan.openingStock).reduce(
        (sum, value) => sum + value,
        0,
      ),
      consumedUnits: data.usages.reduce((sum, row) => sum + row.quantity, 0),
      currentUnits: data.parts.reduce((sum, part) => sum + part.quantity!, 0),
    },
  };
}
