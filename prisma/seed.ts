import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import { Prisma, PrismaClient } from '../src/generated/prisma/client.js';
import {
  MaintenanceHistoryAction,
  MaintenancePriority,
  MaintenanceStatus,
  UserRole,
} from '../src/generated/prisma/enums.js';

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

  const seededResidents = new Map<string, { id: string }>();
  for (const resident of residents) {
    const user = seededUsers.get(resident.email);
    const apartment = seededApartments.get(
      `${resident.apartment[0]}-${resident.apartment[1]}`,
    );
    if (!user || !apartment)
      throw new Error(`Missing relation for ${resident.email}`);
    const profile = await prisma.resident.upsert({
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
      select: { id: true },
    });
    seededResidents.set(resident.email, profile);
  }

  const seededTechnicians = new Map<string, { id: string }>();
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
    seededTechnicians.set(technician.email, profile);

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

  const requestSeeds = [
    {
      id: 'a1000000-0000-4000-8000-000000000001',
      residentEmail: 'resident.rohan@apartment.test',
      apartment: 'A-101',
      category: 'Plumbing',
      title: 'Kitchen sink pipe leaking',
      description:
        'Water is leaking below the kitchen sink whenever the tap is used.',
      priority: MaintenancePriority.MEDIUM,
      status: MaintenanceStatus.OPEN,
      createdAt: new Date('2026-08-20T08:30:00.000Z'),
      resolvedAt: null,
      closedAt: null,
    },
    {
      id: 'a1000000-0000-4000-8000-000000000002',
      residentEmail: 'resident.ananya@apartment.test',
      apartment: 'A-102',
      category: 'Electrical',
      title: 'Living room power keeps tripping',
      description:
        'The living room circuit breaker trips when multiple sockets are used.',
      priority: MaintenancePriority.HIGH,
      status: MaintenanceStatus.ASSIGNED,
      createdAt: new Date('2026-08-22T05:45:00.000Z'),
      resolvedAt: null,
      closedAt: null,
    },
    {
      id: 'a1000000-0000-4000-8000-000000000003',
      residentEmail: 'resident.vikram@apartment.test',
      apartment: 'A-204',
      category: 'AC',
      title: 'Bedroom AC is not cooling',
      description: 'The bedroom AC runs continuously but only blows warm air.',
      priority: MaintenancePriority.URGENT,
      status: MaintenanceStatus.IN_PROGRESS,
      createdAt: new Date('2026-08-23T10:15:00.000Z'),
      resolvedAt: null,
      closedAt: null,
    },
    {
      id: 'a1000000-0000-4000-8000-000000000004',
      residentEmail: 'resident.priya@apartment.test',
      apartment: 'B-101',
      category: 'Plumbing',
      title: 'Bathroom valve replacement',
      description:
        'The concealed bathroom valve was damaged and required replacement.',
      priority: MaintenancePriority.HIGH,
      status: MaintenanceStatus.RESOLVED,
      createdAt: new Date('2026-08-15T06:00:00.000Z'),
      resolvedAt: new Date('2026-08-16T11:45:00.000Z'),
      closedAt: null,
    },
    {
      id: 'a1000000-0000-4000-8000-000000000005',
      residentEmail: 'resident.karan@apartment.test',
      apartment: 'B-202',
      category: 'Cleaning',
      title: 'Balcony deep cleaning required',
      description:
        'The balcony drainage area needs a thorough deep cleaning service.',
      priority: MaintenancePriority.LOW,
      status: MaintenanceStatus.CLOSED,
      createdAt: new Date('2026-08-10T04:30:00.000Z'),
      resolvedAt: new Date('2026-08-10T09:00:00.000Z'),
      closedAt: new Date('2026-08-11T03:30:00.000Z'),
    },
    {
      id: 'a1000000-0000-4000-8000-000000000006',
      residentEmail: 'resident.neha@apartment.test',
      apartment: 'B-304',
      category: 'Lift',
      title: 'Lift making unusual noise',
      description:
        'The lift makes a grinding noise while stopping on the third floor.',
      priority: MaintenancePriority.MEDIUM,
      status: MaintenanceStatus.CANCELLED,
      createdAt: new Date('2026-08-12T13:20:00.000Z'),
      resolvedAt: null,
      closedAt: null,
    },
  ] as const;

  for (const request of requestSeeds) {
    const resident = seededResidents.get(request.residentEmail);
    const apartment = seededApartments.get(request.apartment);
    const category = seededCategories.get(request.category);
    if (!resident || !apartment || !category) {
      throw new Error(`Missing maintenance request relation for ${request.id}`);
    }
    await prisma.maintenanceRequest.upsert({
      where: { id: request.id },
      update: {
        residentId: resident.id,
        apartmentId: apartment.id,
        categoryId: category.id,
        title: request.title,
        description: request.description,
        priority: request.priority,
        status: request.status,
        createdAt: request.createdAt,
        resolvedAt: request.resolvedAt,
        closedAt: request.closedAt,
      },
      create: {
        id: request.id,
        residentId: resident.id,
        apartmentId: apartment.id,
        categoryId: category.id,
        title: request.title,
        description: request.description,
        priority: request.priority,
        status: request.status,
        createdAt: request.createdAt,
        resolvedAt: request.resolvedAt,
        closedAt: request.closedAt,
      },
    });
  }

  const admin = seededUsers.get('admin.one@apartment.test');
  if (!admin) throw new Error('Missing seeded assignment admin');
  const technicianId = (email: string): string => {
    const technician = seededTechnicians.get(email);
    if (!technician) throw new Error(`Missing seeded technician ${email}`);
    return technician.id;
  };
  const assignmentSeeds = [
    {
      id: 'a2000000-0000-4000-8000-000000000001',
      requestId: requestSeeds[1].id,
      technicianId: technicianId('technician.ravi@apartment.test'),
      assignedAt: new Date('2026-08-22T07:00:00.000Z'),
      unassignedAt: null,
      isActive: true,
    },
    {
      id: 'a2000000-0000-4000-8000-000000000002',
      requestId: requestSeeds[2].id,
      technicianId: technicianId('technician.suresh@apartment.test'),
      assignedAt: new Date('2026-08-23T10:45:00.000Z'),
      unassignedAt: null,
      isActive: true,
    },
    {
      id: 'a2000000-0000-4000-8000-000000000003',
      requestId: requestSeeds[3].id,
      technicianId: technicianId('technician.ravi@apartment.test'),
      assignedAt: new Date('2026-08-15T07:00:00.000Z'),
      unassignedAt: new Date('2026-08-15T09:15:00.000Z'),
      isActive: false,
    },
    {
      id: 'a2000000-0000-4000-8000-000000000004',
      requestId: requestSeeds[3].id,
      technicianId: technicianId('technician.manoj@apartment.test'),
      assignedAt: new Date('2026-08-15T09:20:00.000Z'),
      unassignedAt: null,
      isActive: true,
    },
    {
      id: 'a2000000-0000-4000-8000-000000000005',
      requestId: requestSeeds[4].id,
      technicianId: technicianId('technician.deepak@apartment.test'),
      assignedAt: new Date('2026-08-10T05:00:00.000Z'),
      unassignedAt: null,
      isActive: true,
    },
    {
      id: 'a2000000-0000-4000-8000-000000000006',
      requestId: requestSeeds[5].id,
      technicianId: technicianId('technician.salim@apartment.test'),
      assignedAt: new Date('2026-08-12T14:00:00.000Z'),
      unassignedAt: new Date('2026-08-12T15:00:00.000Z'),
      isActive: false,
    },
  ] as const;

  await prisma.maintenanceAssignment.updateMany({
    where: { maintenanceRequestId: { in: requestSeeds.map(({ id }) => id) } },
    data: { isActive: false },
  });
  for (const assignment of assignmentSeeds) {
    await prisma.maintenanceAssignment.upsert({
      where: { id: assignment.id },
      update: {
        maintenanceRequestId: assignment.requestId,
        technicianId: assignment.technicianId,
        assignedByUserId: admin.id,
        assignedAt: assignment.assignedAt,
        unassignedAt: assignment.unassignedAt,
        isActive: assignment.isActive,
      },
      create: {
        id: assignment.id,
        maintenanceRequestId: assignment.requestId,
        technicianId: assignment.technicianId,
        assignedByUserId: admin.id,
        assignedAt: assignment.assignedAt,
        unassignedAt: assignment.unassignedAt,
        isActive: assignment.isActive,
      },
    });
  }

  const commentSeeds = [
    {
      id: 'a3000000-0000-4000-8000-000000000001',
      requestId: requestSeeds[1].id,
      userEmail: 'resident.ananya@apartment.test',
      message: 'The breaker tripped again this morning.',
      createdAt: new Date('2026-08-22T06:20:00.000Z'),
    },
    {
      id: 'a3000000-0000-4000-8000-000000000002',
      requestId: requestSeeds[1].id,
      userEmail: 'technician.ravi@apartment.test',
      message: 'I will inspect the socket load and breaker rating today.',
      createdAt: new Date('2026-08-22T07:15:00.000Z'),
    },
    {
      id: 'a3000000-0000-4000-8000-000000000003',
      requestId: requestSeeds[2].id,
      userEmail: 'technician.suresh@apartment.test',
      message: 'The outdoor unit capacitor needs replacement.',
      createdAt: new Date('2026-08-23T11:30:00.000Z'),
    },
    {
      id: 'a3000000-0000-4000-8000-000000000004',
      requestId: requestSeeds[3].id,
      userEmail: 'resident.priya@apartment.test',
      message: 'The new valve is working and there is no leakage now.',
      createdAt: new Date('2026-08-16T12:00:00.000Z'),
    },
    {
      id: 'a3000000-0000-4000-8000-000000000005',
      requestId: requestSeeds[3].id,
      userEmail: 'admin.one@apartment.test',
      message: 'Resolution confirmed. Waiting for resident closure.',
      createdAt: new Date('2026-08-16T12:15:00.000Z'),
    },
  ] as const;

  for (const comment of commentSeeds) {
    const user = seededUsers.get(comment.userEmail);
    if (!user) throw new Error(`Missing comment author ${comment.userEmail}`);
    await prisma.maintenanceComment.upsert({
      where: { id: comment.id },
      update: {
        maintenanceRequestId: comment.requestId,
        userId: user.id,
        message: comment.message,
        createdAt: comment.createdAt,
      },
      create: {
        id: comment.id,
        maintenanceRequestId: comment.requestId,
        userId: user.id,
        message: comment.message,
        createdAt: comment.createdAt,
      },
    });
  }

  const historySeeds: Array<{
    id: string;
    data: Prisma.MaintenanceHistoryUncheckedCreateInput;
  }> = [];
  let historyIndex = 1;
  const userId = (email: string): string => {
    const user = seededUsers.get(email);
    if (!user) throw new Error(`Missing history actor ${email}`);
    return user.id;
  };
  const addHistory = (
    maintenanceRequestId: string,
    actorUserId: string,
    action: MaintenanceHistoryAction,
    createdAt: Date,
    oldValue?: string | null,
    newValue?: string | null,
    metadata?: Prisma.InputJsonValue,
  ): void => {
    historySeeds.push({
      id: `a4000000-0000-4000-8000-${String(historyIndex++).padStart(12, '0')}`,
      data: {
        maintenanceRequestId,
        userId: actorUserId,
        action,
        createdAt,
        ...(oldValue !== undefined ? { oldValue } : {}),
        ...(newValue !== undefined ? { newValue } : {}),
        ...(metadata !== undefined ? { metadata } : {}),
      },
    });
  };

  for (const request of requestSeeds) {
    addHistory(
      request.id,
      userId(request.residentEmail),
      MaintenanceHistoryAction.REQUEST_CREATED,
      request.createdAt,
    );
  }
  addHistory(
    requestSeeds[1].id,
    admin.id,
    MaintenanceHistoryAction.TECHNICIAN_ASSIGNED,
    new Date('2026-08-22T07:00:00.000Z'),
    null,
    assignmentSeeds[0].technicianId,
    { technicianName: 'Ravi Kumar' },
  );
  addHistory(
    requestSeeds[1].id,
    admin.id,
    MaintenanceHistoryAction.STATUS_CHANGED,
    new Date('2026-08-22T07:00:01.000Z'),
    MaintenanceStatus.OPEN,
    MaintenanceStatus.ASSIGNED,
  );
  addHistory(
    requestSeeds[2].id,
    admin.id,
    MaintenanceHistoryAction.TECHNICIAN_ASSIGNED,
    new Date('2026-08-23T10:45:00.000Z'),
    null,
    assignmentSeeds[1].technicianId,
    { technicianName: 'Suresh Yadav' },
  );
  addHistory(
    requestSeeds[2].id,
    admin.id,
    MaintenanceHistoryAction.STATUS_CHANGED,
    new Date('2026-08-23T10:45:01.000Z'),
    MaintenanceStatus.OPEN,
    MaintenanceStatus.ASSIGNED,
  );
  addHistory(
    requestSeeds[2].id,
    userId('technician.suresh@apartment.test'),
    MaintenanceHistoryAction.STATUS_CHANGED,
    new Date('2026-08-23T11:00:00.000Z'),
    MaintenanceStatus.ASSIGNED,
    MaintenanceStatus.IN_PROGRESS,
  );
  addHistory(
    requestSeeds[3].id,
    admin.id,
    MaintenanceHistoryAction.TECHNICIAN_ASSIGNED,
    new Date('2026-08-15T07:00:00.000Z'),
    null,
    assignmentSeeds[2].technicianId,
    { technicianName: 'Ravi Kumar' },
  );
  addHistory(
    requestSeeds[3].id,
    admin.id,
    MaintenanceHistoryAction.STATUS_CHANGED,
    new Date('2026-08-15T07:00:01.000Z'),
    MaintenanceStatus.OPEN,
    MaintenanceStatus.ASSIGNED,
  );
  addHistory(
    requestSeeds[3].id,
    admin.id,
    MaintenanceHistoryAction.TECHNICIAN_REASSIGNED,
    new Date('2026-08-15T09:20:00.000Z'),
    assignmentSeeds[2].technicianId,
    assignmentSeeds[3].technicianId,
    {
      previousTechnicianName: 'Ravi Kumar',
      technicianName: 'Manoj Gupta',
    },
  );
  addHistory(
    requestSeeds[3].id,
    userId('technician.manoj@apartment.test'),
    MaintenanceHistoryAction.STATUS_CHANGED,
    new Date('2026-08-15T10:00:00.000Z'),
    MaintenanceStatus.ASSIGNED,
    MaintenanceStatus.IN_PROGRESS,
  );
  addHistory(
    requestSeeds[3].id,
    userId('technician.manoj@apartment.test'),
    MaintenanceHistoryAction.STATUS_CHANGED,
    new Date('2026-08-16T11:45:00.000Z'),
    MaintenanceStatus.IN_PROGRESS,
    MaintenanceStatus.RESOLVED,
  );
  addHistory(
    requestSeeds[4].id,
    admin.id,
    MaintenanceHistoryAction.TECHNICIAN_ASSIGNED,
    new Date('2026-08-10T05:00:00.000Z'),
    null,
    assignmentSeeds[4].technicianId,
    { technicianName: 'Deepak Joshi' },
  );
  for (const transition of [
    [
      MaintenanceStatus.OPEN,
      MaintenanceStatus.ASSIGNED,
      '2026-08-10T05:00:01.000Z',
      admin.id,
    ],
    [
      MaintenanceStatus.ASSIGNED,
      MaintenanceStatus.IN_PROGRESS,
      '2026-08-10T06:00:00.000Z',
      userId('technician.deepak@apartment.test'),
    ],
    [
      MaintenanceStatus.IN_PROGRESS,
      MaintenanceStatus.RESOLVED,
      '2026-08-10T09:00:00.000Z',
      userId('technician.deepak@apartment.test'),
    ],
    [
      MaintenanceStatus.RESOLVED,
      MaintenanceStatus.CLOSED,
      '2026-08-11T03:30:00.000Z',
      userId('resident.karan@apartment.test'),
    ],
  ] as const) {
    addHistory(
      requestSeeds[4].id,
      transition[3],
      MaintenanceHistoryAction.STATUS_CHANGED,
      new Date(transition[2]),
      transition[0],
      transition[1],
    );
  }
  addHistory(
    requestSeeds[5].id,
    admin.id,
    MaintenanceHistoryAction.TECHNICIAN_ASSIGNED,
    new Date('2026-08-12T14:00:00.000Z'),
    null,
    assignmentSeeds[5].technicianId,
    { technicianName: 'Salim Khan' },
  );
  addHistory(
    requestSeeds[5].id,
    admin.id,
    MaintenanceHistoryAction.STATUS_CHANGED,
    new Date('2026-08-12T14:00:01.000Z'),
    MaintenanceStatus.OPEN,
    MaintenanceStatus.ASSIGNED,
  );
  addHistory(
    requestSeeds[5].id,
    admin.id,
    MaintenanceHistoryAction.TECHNICIAN_UNASSIGNED,
    new Date('2026-08-12T15:00:00.000Z'),
    assignmentSeeds[5].technicianId,
    null,
    { technicianName: 'Salim Khan' },
  );
  addHistory(
    requestSeeds[5].id,
    admin.id,
    MaintenanceHistoryAction.STATUS_CHANGED,
    new Date('2026-08-12T15:00:01.000Z'),
    MaintenanceStatus.ASSIGNED,
    MaintenanceStatus.OPEN,
  );
  addHistory(
    requestSeeds[5].id,
    userId('resident.neha@apartment.test'),
    MaintenanceHistoryAction.STATUS_CHANGED,
    new Date('2026-08-12T15:10:00.000Z'),
    MaintenanceStatus.OPEN,
    MaintenanceStatus.CANCELLED,
  );
  for (const comment of commentSeeds) {
    addHistory(
      comment.requestId,
      userId(comment.userEmail),
      MaintenanceHistoryAction.COMMENT_ADDED,
      new Date(comment.createdAt.getTime() + 1),
      undefined,
      comment.id,
    );
  }
  for (const history of historySeeds) {
    await prisma.maintenanceHistory.upsert({
      where: { id: history.id },
      update: history.data,
      create: { id: history.id, ...history.data },
    });
  }

  console.log(
    `Seeded ${users.length} users, ${apartments.length} apartments, ${residents.length} residents, ${categories.length} categories, ${technicians.length} technicians, ${requestSeeds.length} maintenance requests, ${assignmentSeeds.length} assignments, ${commentSeeds.length} comments, and ${historySeeds.length} history entries.`,
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
