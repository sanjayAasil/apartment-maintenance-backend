import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { UserRole } from '../src/generated/prisma/enums.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const password = 'Password@123';

const users = [
  {
    name: 'Aarav Sharma',
    email: 'admin.one@apartment.test',
    role: UserRole.ADMIN,
  },
  {
    name: 'Meera Iyer',
    email: 'admin.two@apartment.test',
    role: UserRole.ADMIN,
  },
  {
    name: 'Rohan Mehta',
    email: 'resident.rohan@apartment.test',
    role: UserRole.RESIDENT,
  },
  {
    name: 'Ananya Rao',
    email: 'resident.ananya@apartment.test',
    role: UserRole.RESIDENT,
  },
  {
    name: 'Vikram Singh',
    email: 'resident.vikram@apartment.test',
    role: UserRole.RESIDENT,
  },
  {
    name: 'Priya Nair',
    email: 'resident.priya@apartment.test',
    role: UserRole.RESIDENT,
  },
  {
    name: 'Karan Patel',
    email: 'resident.karan@apartment.test',
    role: UserRole.RESIDENT,
  },
  {
    name: 'Neha Verma',
    email: 'resident.neha@apartment.test',
    role: UserRole.RESIDENT,
  },
  {
    name: 'Arjun Das',
    email: 'resident.arjun@apartment.test',
    role: UserRole.RESIDENT,
  },
  {
    name: 'Isha Kapoor',
    email: 'resident.isha@apartment.test',
    role: UserRole.RESIDENT,
  },
  {
    name: 'Ravi Kumar',
    email: 'technician.ravi@apartment.test',
    role: UserRole.TECHNICIAN,
  },
  {
    name: 'Suresh Yadav',
    email: 'technician.suresh@apartment.test',
    role: UserRole.TECHNICIAN,
  },
  {
    name: 'Manoj Gupta',
    email: 'technician.manoj@apartment.test',
    role: UserRole.TECHNICIAN,
  },
  {
    name: 'Deepak Joshi',
    email: 'technician.deepak@apartment.test',
    role: UserRole.TECHNICIAN,
  },
  {
    name: 'Salim Khan',
    email: 'technician.salim@apartment.test',
    role: UserRole.TECHNICIAN,
  },
  {
    name: 'Joseph Thomas',
    email: 'technician.joseph@apartment.test',
    role: UserRole.TECHNICIAN,
  },
] as const;

const apartments = [
  { block: 'A', floor: 1, unitNumber: '101' },
  { block: 'A', floor: 1, unitNumber: '102' },
  { block: 'A', floor: 2, unitNumber: '201' },
  { block: 'A', floor: 2, unitNumber: '204' },
  { block: 'B', floor: 1, unitNumber: '101' },
  { block: 'B', floor: 2, unitNumber: '202' },
  { block: 'B', floor: 3, unitNumber: '301' },
  { block: 'B', floor: 3, unitNumber: '304' },
  { block: 'C', floor: 1, unitNumber: '103' },
  { block: 'C', floor: 2, unitNumber: '203' },
  { block: 'C', floor: 3, unitNumber: '302' },
  { block: 'C', floor: 4, unitNumber: '401' },
] as const;

const categories = [
  { name: 'Plumbing', description: 'Water leaks, pipes, taps and drainage' },
  {
    name: 'Electrical',
    description: 'Wiring, switches, sockets and electrical faults',
  },
  { name: 'AC', description: 'Air-conditioning servicing and repairs' },
  {
    name: 'Carpentry',
    description: 'Doors, cabinets, locks and wooden fixtures',
  },
  { name: 'Cleaning', description: 'Common-area and deep-cleaning services' },
  { name: 'Lift', description: 'Elevator operation, servicing and faults' },
] as const;

const residents = [
  {
    email: 'resident.rohan@apartment.test',
    apartment: ['A', '101'],
    phone: '9876500001',
    moveInDate: '2024-01-15',
  },
  {
    email: 'resident.ananya@apartment.test',
    apartment: ['A', '102'],
    phone: '9876500002',
    moveInDate: '2024-03-10',
  },
  {
    email: 'resident.vikram@apartment.test',
    apartment: ['A', '204'],
    phone: '9876500003',
    moveInDate: '2023-11-01',
  },
  {
    email: 'resident.priya@apartment.test',
    apartment: ['B', '101'],
    phone: '9876500004',
    moveInDate: '2025-02-20',
  },
  {
    email: 'resident.karan@apartment.test',
    apartment: ['B', '202'],
    phone: '9876500005',
    moveInDate: '2024-08-05',
  },
  {
    email: 'resident.neha@apartment.test',
    apartment: ['B', '304'],
    phone: '9876500006',
    moveInDate: '2025-06-12',
  },
  {
    email: 'resident.arjun@apartment.test',
    apartment: ['C', '103'],
    phone: '9876500007',
    moveInDate: '2023-09-18',
  },
  {
    email: 'resident.isha@apartment.test',
    apartment: ['C', '203'],
    phone: '9876500008',
    moveInDate: '2025-01-08',
  },
] as const;

const technicians = [
  {
    email: 'technician.ravi@apartment.test',
    phone: '9876600001',
    experienceYears: 6,
    isAvailable: true,
    isActive: true,
    skills: ['Plumbing', 'Electrical', 'Lift'],
  },
  {
    email: 'technician.suresh@apartment.test',
    phone: '9876600002',
    experienceYears: 3,
    isAvailable: true,
    isActive: true,
    skills: ['Electrical', 'AC'],
  },
  {
    email: 'technician.manoj@apartment.test',
    phone: '9876600003',
    experienceYears: 8,
    isAvailable: false,
    isActive: true,
    skills: ['Carpentry', 'Plumbing'],
  },
  {
    email: 'technician.deepak@apartment.test',
    phone: '9876600004',
    experienceYears: 2,
    isAvailable: true,
    isActive: true,
    skills: ['Cleaning'],
  },
  {
    email: 'technician.salim@apartment.test',
    phone: '9876600005',
    experienceYears: 5,
    isAvailable: false,
    isActive: false,
    skills: ['Lift', 'Electrical'],
  },
  {
    email: 'technician.joseph@apartment.test',
    phone: '9876600006',
    experienceYears: 4,
    isAvailable: true,
    isActive: true,
    skills: ['AC', 'Carpentry', 'Cleaning'],
  },
] as const;

async function main(): Promise<void> {
  const passwordHash = await argon2.hash(password);
  const seededUsers = new Map<string, { id: string }>();
  for (const user of users) {
    const record = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        isActive: true,
        passwordHash,
      },
      create: {
        ...user,
        isActive: true,
        passwordHash,
      },
      select: { id: true },
    });
    seededUsers.set(user.email, record);
  }

  const seededApartments = new Map<string, { id: string }>();
  for (const apartment of apartments) {
    const record = await prisma.apartment.upsert({
      where: {
        block_unitNumber: {
          block: apartment.block,
          unitNumber: apartment.unitNumber,
        },
      },
      update: { floor: apartment.floor },
      create: apartment,
      select: { id: true },
    });
    seededApartments.set(`${apartment.block}-${apartment.unitNumber}`, record);
  }

  const seededCategories = new Map<string, { id: string }>();
  for (const category of categories) {
    const existing = await prisma.maintenanceCategory.findFirst({
      where: { name: { equals: category.name, mode: 'insensitive' } },
      select: { id: true },
    });
    const record = existing
      ? await prisma.maintenanceCategory.update({
          where: { id: existing.id },
          data: { ...category, name: category.name, isActive: true },
          select: { id: true },
        })
      : await prisma.maintenanceCategory.create({
          data: { ...category, isActive: true },
          select: { id: true },
        });
    seededCategories.set(category.name, record);
  }

  for (const resident of residents) {
    const user = seededUsers.get(resident.email);
    const apartment = seededApartments.get(
      `${resident.apartment[0]}-${resident.apartment[1]}`,
    );
    if (!user || !apartment)
      throw new Error(`Missing relation for ${resident.email}`);
    await prisma.resident.upsert({
      where: { userId: user.id },
      update: {
        apartmentId: apartment.id,
        phone: resident.phone,
        moveInDate: new Date(`${resident.moveInDate}T00:00:00.000Z`),
        isActive: true,
      },
      create: {
        userId: user.id,
        apartmentId: apartment.id,
        phone: resident.phone,
        moveInDate: new Date(`${resident.moveInDate}T00:00:00.000Z`),
        isActive: true,
      },
    });
  }

  for (const technician of technicians) {
    const user = seededUsers.get(technician.email);
    if (!user) throw new Error(`Missing user for ${technician.email}`);
    const profile = await prisma.technician.upsert({
      where: { userId: user.id },
      update: {
        phone: technician.phone,
        experienceYears: technician.experienceYears,
        isAvailable: technician.isAvailable,
        isActive: technician.isActive,
      },
      create: {
        userId: user.id,
        phone: technician.phone,
        experienceYears: technician.experienceYears,
        isAvailable: technician.isAvailable,
        isActive: technician.isActive,
      },
      select: { id: true },
    });

    for (const skillName of technician.skills) {
      const category = seededCategories.get(skillName);
      if (!category) throw new Error(`Missing category ${skillName}`);
      await prisma.technicianSkill.upsert({
        where: {
          technicianId_categoryId: {
            technicianId: profile.id,
            categoryId: category.id,
          },
        },
        update: {},
        create: { technicianId: profile.id, categoryId: category.id },
      });
    }
  }

  console.log(
    `Seeded ${users.length} users, ${apartments.length} apartments, ${residents.length} residents, ${categories.length} categories, and ${technicians.length} technicians.`,
  );
  console.log(`Testing password for all seeded users: ${password}`);
}

main()
  .catch((error: unknown) => {
    console.error('Database seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
