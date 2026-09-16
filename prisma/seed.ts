import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { persistPlan } from './seed/seed-database.js';
import { buildPlan, summary } from './seed/seed-plan.js';
import { assertLocalDatabase, PASSWORD } from './seed/seed-utils.js';
import { validatePlan } from './seed/seed-validate.js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.some((arg) => !['--reset', '--dry-run'].includes(arg)))
    throw new Error('Supported flags: --reset, --dry-run');
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required');
  const target = assertLocalDatabase(connectionString, process.env.NODE_ENV);
  const now = new Date();
  const end = process.env.SEED_AS_OF ? new Date(process.env.SEED_AS_OF) : now;
  if (!Number.isFinite(end.getTime()) || end > now)
    throw new Error(
      'SEED_AS_OF must be a valid ISO date/time no later than now',
    );
  const randomSeed = process.env.SEED_RANDOM_SEED
    ? Number(process.env.SEED_RANDOM_SEED)
    : 20260916;
  if (
    !Number.isInteger(randomSeed) ||
    randomSeed < 0 ||
    randomSeed > 0xffffffff
  )
    throw new Error('SEED_RANDOM_SEED must be an unsigned 32-bit integer');
  // AuthService uses argon2.hash(password) with package defaults; bcrypt would break login.
  const passwordHash = await argon2.hash(PASSWORD);
  const plan = buildPlan(end, passwordHash, randomSeed);
  validatePlan(plan);
  console.log(`Development seed target: ${target}; random seed ${randomSeed}`);
  if (!args.includes('--dry-run')) {
    const prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
    });
    try {
      await persistPlan(prisma, plan, args.includes('--reset'));
      for (const email of [
        'admin1@example.com',
        'resident1@example.com',
        'technician1@example.com',
      ]) {
        const user = await prisma.user.findUniqueOrThrow({ where: { email } });
        if (
          !user.isActive ||
          !(await argon2.verify(user.passwordHash, PASSWORD))
        )
          throw new Error(`Seed password verification failed for ${email}`);
      }
    } finally {
      await prisma.$disconnect();
    }
  }
  console.log(
    args.includes('--dry-run')
      ? 'Dry run validated (no database writes).'
      : 'Seed completed; persisted integrity and sample password checks passed.',
  );
  console.log(JSON.stringify(summary(plan), null, 2));
  console.log(
    'Development accounts: admin1@example.com, resident1@example.com, technician1@example.com',
  );
  console.log(`Development password: ${PASSWORD}`);
}

main().catch((error: unknown) => {
  // Avoid logging connection strings, driver internals or password hashes on failure.
  console.error(
    'Seed failed:',
    error instanceof Error && !error.name.startsWith('Prisma')
      ? error.message
      : 'Database seed operation failed; transaction rolled back. Check schema and local database availability.',
  );
  process.exitCode = 1;
});
