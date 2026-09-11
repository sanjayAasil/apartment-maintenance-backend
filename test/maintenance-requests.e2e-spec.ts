import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import {
  MaintenancePriority,
  MaintenanceStatus,
  UserRole,
} from '../src/generated/prisma/enums.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe.sequential('Maintenance Requests API', () => {
  const adminEmail = 'requests-admin-e2e@example.invalid';
  const residentEmail = 'requests-resident-e2e@example.invalid';
  const otherResidentEmail = 'requests-other-resident-e2e@example.invalid';
  const technicianEmail = 'requests-technician-e2e@example.invalid';
  const password = 'test-password';
  const block = 'REQ-E2E';
  const categoryName = 'E2E Request Plumbing';
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let residentToken: string;
  let otherResidentToken: string;
  let technicianToken: string;
  let residentUserId: string;
  let apartmentId: string;
  let residentId: string;
  let categoryId: string;
  let maintenanceRequestId: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
    await cleanup();

    const adminRegistration = await register('Requests Admin E2E', adminEmail);
    await prisma.user.update({
      where: { id: adminRegistration.user.id as string },
      data: { role: UserRole.ADMIN },
    });
    adminToken = await login(adminEmail);

    const residentRegistration = await register(
      'Requests Resident E2E',
      residentEmail,
    );
    residentUserId = residentRegistration.user.id as string;
    residentToken = residentRegistration.accessToken as string;
    otherResidentToken = (
      await register('Other Resident E2E', otherResidentEmail)
    ).accessToken as string;

    const technicianRegistration = await register(
      'Requests Technician E2E',
      technicianEmail,
    );
    await prisma.user.update({
      where: { id: technicianRegistration.user.id as string },
      data: { role: UserRole.TECHNICIAN },
    });
    technicianToken = await login(technicianEmail);

    apartmentId = (
      await request(app.getHttpServer())
        .post('/api/apartments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ block, floor: 2, unitNumber: '204' })
        .expect(201)
    ).body.id as string;
    residentId = (
      await request(app.getHttpServer())
        .post('/api/residents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: residentUserId,
          apartmentId,
          phone: '9876543210',
          moveInDate: '2026-09-01',
        })
        .expect(201)
    ).body.id as string;
    categoryId = (
      await request(app.getHttpServer())
        .post('/api/maintenance-categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: categoryName, description: 'Request test category' })
        .expect(201)
    ).body.id as string;
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  async function register(name: string, email: string) {
    return (
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ name, email, password })
        .expect(201)
    ).body as { accessToken: string; user: { id: string } };
  }
  async function login(email: string): Promise<string> {
    return (
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password })
        .expect(200)
    ).body.accessToken as string;
  }
  async function cleanup(): Promise<void> {
    await prisma.maintenanceRequest.deleteMany({
      where: {
        OR: [
          {
            resident: {
              user: { email: { in: [residentEmail, otherResidentEmail] } },
            },
          },
          { category: { name: categoryName } },
        ],
      },
    });
    await prisma.resident.deleteMany({
      where: { user: { email: { in: [residentEmail, otherResidentEmail] } } },
    });
    await prisma.apartment.deleteMany({ where: { block } });
    await prisma.maintenanceCategory.deleteMany({
      where: { name: categoryName },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [adminEmail, residentEmail, otherResidentEmail, technicianEmail],
        },
      },
    });
  }

  it('rejects unauthenticated access and non-resident creation', async () => {
    await request(app.getHttpServer())
      .get('/api/maintenance-requests')
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/maintenance-requests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        categoryId,
        title: 'Leaking tap',
        description: 'The kitchen tap leaks continuously.',
        priority: MaintenancePriority.MEDIUM,
      })
      .expect(403);
  });

  it('creates a request using the resident and apartment from JWT context', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/maintenance-requests')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        categoryId,
        title: 'Leaking tap',
        description: 'The kitchen tap leaks continuously.',
        priority: MaintenancePriority.MEDIUM,
      })
      .expect(201);
    maintenanceRequestId = response.body.id as string;
    expect(response.body).toMatchObject({
      residentId,
      apartmentId,
      categoryId,
      status: MaintenanceStatus.OPEN,
    });
    expect(response.body.resident.user).not.toHaveProperty('passwordHash');
  });

  it('enforces list and detail visibility by role and ownership', async () => {
    const own = await request(app.getHttpServer())
      .get('/api/maintenance-requests?page=1&limit=20&status=OPEN')
      .set('Authorization', `Bearer ${residentToken}`)
      .expect(200);
    expect(own.body.data).toHaveLength(1);
    const all = await request(app.getHttpServer())
      .get(
        `/api/maintenance-requests?residentId=${residentId}&search=leak&page=1&limit=20`,
      )
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(all.body.meta).toEqual({ page: 1, limit: 20, total: 1 });
    await request(app.getHttpServer())
      .get(`/api/maintenance-requests/${maintenanceRequestId}`)
      .set('Authorization', `Bearer ${otherResidentToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/maintenance-requests')
      .set('Authorization', `Bearer ${technicianToken}`)
      .expect(403);
  });

  it('updates an open request and rejects invalid transitions', async () => {
    await request(app.getHttpServer())
      .patch(`/api/maintenance-requests/${maintenanceRequestId}`)
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        title: 'Leaking kitchen tap',
        priority: MaintenancePriority.HIGH,
      })
      .expect(200)
      .expect((response) =>
        expect(response.body.title).toBe('Leaking kitchen tap'),
      );
    await request(app.getHttpServer())
      .patch(`/api/maintenance-requests/${maintenanceRequestId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: MaintenanceStatus.ASSIGNED })
      .expect(400);
    await request(app.getHttpServer())
      .patch(`/api/maintenance-requests/${maintenanceRequestId}/status`)
      .set('Authorization', `Bearer ${residentToken}`)
      .send({ status: MaintenanceStatus.CANCELLED })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/api/maintenance-requests/${maintenanceRequestId}`)
      .set('Authorization', `Bearer ${residentToken}`)
      .send({ title: 'Cannot edit this now' })
      .expect(400);
  });

  it('returns not found for an unknown request', () =>
    request(app.getHttpServer())
      .get('/api/maintenance-requests/11111111-1111-4111-8111-111111111111')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404));
});
