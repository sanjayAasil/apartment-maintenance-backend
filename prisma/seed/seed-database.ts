import {
  Prisma,
  type PrismaClient,
} from '../../src/generated/prisma/client.js';
import type { SeedPlan } from './seed-types.js';
import { validatePlan } from './seed-validate.js';

const tables = [
  'User',
  'Apartment',
  'Resident',
  'MaintenanceCategory',
  'Technician',
  'TechnicianSkill',
  'Part',
  'MaintenanceRequest',
  'MaintenanceAssignment',
  'MaintenanceComment',
  'MaintenanceHistory',
  'MaintenanceWorkNote',
  'MaintenanceRequestPart',
  'Feedback',
];

export async function persistPlan(
  prisma: PrismaClient,
  plan: SeedPlan,
  allowReset: boolean,
): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      // Serializes cooperating seed runners; reset and inserts are one atomic unit.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(20260916)::text AS lock`;
      const actual = await tx.$queryRaw<
        { tablename: string }[]
      >`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
      if (
        actual.length !== tables.length ||
        actual.some((row) => !tables.includes(row.tablename))
      )
        throw new Error(
          'Database business tables differ from seed coverage; apply migrations/update seed first',
        );
      const counts = await Promise.all(
        tables.map((table) =>
          tx.$queryRaw<{ count: number }[]>(
            Prisma.sql`SELECT COUNT(*)::int AS count FROM ${Prisma.raw(`public."${table}"`)}`,
          ),
        ),
      );
      const total = counts.reduce((sum, rows) => sum + rows[0].count, 0);
      if (total > 0 && !allowReset)
        throw new Error(
          `Database has ${total} business rows. Refusing to replace them without --reset (npm run prisma:reseed:local)`,
        );
      console.log(
        `Local reseed: replacing ${total} business rows; schema and migration history preserved.`,
      );
      // FK-safe order. No cascade, schema reset, migration deletion, or production path.
      await tx.feedback.deleteMany();
      await tx.maintenanceHistory.deleteMany();
      await tx.maintenanceComment.deleteMany();
      await tx.maintenanceRequestPart.deleteMany();
      await tx.maintenanceWorkNote.deleteMany();
      await tx.maintenanceAssignment.deleteMany();
      await tx.maintenanceRequest.deleteMany();
      await tx.technicianSkill.deleteMany();
      await tx.technician.deleteMany();
      await tx.resident.deleteMany();
      await tx.part.deleteMany();
      await tx.maintenanceCategory.deleteMany();
      await tx.apartment.deleteMany();
      await tx.user.deleteMany();
      const { data, openingStock } = plan;
      await tx.user.createMany({ data: data.users });
      await tx.apartment.createMany({ data: data.apartments });
      await tx.resident.createMany({ data: data.residents });
      await tx.maintenanceCategory.createMany({ data: data.categories });
      await tx.technician.createMany({ data: data.technicians });
      await tx.technicianSkill.createMany({ data: data.skills });
      await tx.part.createMany({
        data: data.parts.map((part) => ({
          ...part,
          quantity: openingStock[part.id!],
        })),
      });
      await tx.maintenanceRequest.createMany({ data: data.requests });
      await tx.maintenanceAssignment.createMany({ data: data.assignments });
      await tx.maintenanceComment.createMany({ data: data.comments });
      await tx.maintenanceWorkNote.createMany({ data: data.notes });
      await tx.maintenanceRequestPart.createMany({ data: data.usages });
      await tx.feedback.createMany({ data: data.feedback });
      await tx.maintenanceHistory.createMany({ data: data.history });
      // Reconcile consumption from opening inventory using PostgreSQL, not arbitrary totals.
      await tx.$executeRaw`UPDATE "Part" p SET "quantity" = p."quantity" - used.quantity FROM (SELECT "partId", SUM(quantity)::int AS quantity FROM "MaintenanceRequestPart" GROUP BY "partId") used WHERE p.id = used."partId"`;
      const [
        users,
        apartments,
        residents,
        categories,
        technicians,
        skills,
        parts,
        requests,
        assignments,
        comments,
        history,
        notes,
        usages,
        feedback,
      ] = await Promise.all([
        tx.user.findMany(),
        tx.apartment.findMany(),
        tx.resident.findMany(),
        tx.maintenanceCategory.findMany(),
        tx.technician.findMany(),
        tx.technicianSkill.findMany(),
        tx.part.findMany(),
        tx.maintenanceRequest.findMany(),
        tx.maintenanceAssignment.findMany(),
        tx.maintenanceComment.findMany(),
        tx.maintenanceHistory.findMany(),
        tx.maintenanceWorkNote.findMany(),
        tx.maintenanceRequestPart.findMany(),
        tx.feedback.findMany(),
      ]);
      const persisted = {
        users,
        apartments,
        residents,
        categories,
        technicians,
        skills,
        parts,
        requests,
        assignments,
        comments,
        history: history.map((row) => ({
          ...row,
          metadata: row.metadata ?? undefined,
        })),
        notes,
        usages,
        feedback,
      };
      for (const [key, rows] of Object.entries(data))
        if (persisted[key as keyof typeof persisted].length !== rows.length)
          throw new Error(`Persisted ${key} count mismatch`);
      validatePlan({ ...plan, data: persisted });
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 10_000,
      timeout: 120_000,
    },
  );
}
