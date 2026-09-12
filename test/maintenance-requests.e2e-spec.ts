import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import {
  MaintenanceHistoryAction,
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
  const secondTechnicianEmail =
    'requests-second-technician-e2e@example.invalid';
  const password = 'test-password';
  const block = 'REQ-E2E';
  const categoryName = 'E2E Request Plumbing';
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let residentToken: string;
  let otherResidentToken: string;
  let technicianToken: string;
  let secondTechnicianToken: string;
  let residentUserId: string;
  let apartmentId: string;
  let residentId: string;
  let categoryId: string;
  let maintenanceRequestId: string;
  let technicianId: string;
  let secondTechnicianId: string;

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
    const secondTechnicianRegistration = await register(
      'Second Requests Technician E2E',
      secondTechnicianEmail,
    );
    await prisma.user.update({
      where: { id: secondTechnicianRegistration.user.id as string },
      data: { role: UserRole.TECHNICIAN },
    });
    secondTechnicianToken = await login(secondTechnicianEmail);

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
    technicianId = (
      await request(app.getHttpServer())
        .post('/api/technicians')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: technicianRegistration.user.id,
          phone: '9000000001',
          experienceYears: 3,
        })
        .expect(201)
    ).body.id as string;
    secondTechnicianId = (
      await request(app.getHttpServer())
        .post('/api/technicians')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: secondTechnicianRegistration.user.id,
          phone: '9000000002',
          experienceYears: 5,
        })
        .expect(201)
    ).body.id as string;
    for (const id of [technicianId, secondTechnicianId]) {
      await request(app.getHttpServer())
        .post(`/api/technicians/${id}/skills`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ categoryId })
        .expect(201);
    }
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
    await prisma.maintenanceComment.deleteMany({
      where: { maintenanceRequest: { category: { name: categoryName } } },
    });
    await prisma.maintenanceHistory.deleteMany({
      where: { maintenanceRequest: { category: { name: categoryName } } },
    });
    await prisma.maintenanceAssignment.deleteMany({
      where: {
        OR: [
          { maintenanceRequest: { category: { name: categoryName } } },
          {
            technician: {
              user: {
                email: { in: [technicianEmail, secondTechnicianEmail] },
              },
            },
          },
        ],
      },
    });
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
    await prisma.technicianSkill.deleteMany({
      where: {
        technician: {
          user: { email: { in: [technicianEmail, secondTechnicianEmail] } },
        },
      },
    });
    await prisma.technician.deleteMany({
      where: {
        user: { email: { in: [technicianEmail, secondTechnicianEmail] } },
      },
    });
    await prisma.apartment.deleteMany({ where: { block } });
    await prisma.maintenanceCategory.deleteMany({
      where: { name: categoryName },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            adminEmail,
            residentEmail,
            otherResidentEmail,
            technicianEmail,
            secondTechnicianEmail,
          ],
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
      .expect(200)
      .expect((response) => expect(response.body.data).toHaveLength(0));
  });

  it('updates an open request and rejects direct assignment status changes', async () => {
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
  });

  it('assigns, unassigns, and preserves history transactionally', async () => {
    await request(app.getHttpServer())
      .post(`/api/maintenance-requests/${maintenanceRequestId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ technicianId })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/maintenance-requests/${maintenanceRequestId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ technicianId })
      .expect(409);
    const current = await request(app.getHttpServer())
      .get(`/api/maintenance-requests/${maintenanceRequestId}/assignment`)
      .set('Authorization', `Bearer ${residentToken}`)
      .expect(200);
    expect(current.body.technicianId).toBe(technicianId);

    await request(app.getHttpServer())
      .delete(`/api/maintenance-requests/${maintenanceRequestId}/assignment`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);
    const openRequest = await request(app.getHttpServer())
      .get(`/api/maintenance-requests/${maintenanceRequestId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(openRequest.body.status).toBe(MaintenanceStatus.OPEN);
    const history = await request(app.getHttpServer())
      .get(
        `/api/maintenance-requests/${maintenanceRequestId}/assignment-history`,
      )
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(history.body).toHaveLength(1);
    expect(history.body[0]).toMatchObject({ isActive: false });
    expect(history.body[0].unassignedAt).not.toBeNull();
  });

  it('reassigns before work and gives only the active technician access', async () => {
    await request(app.getHttpServer())
      .post(`/api/maintenance-requests/${maintenanceRequestId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ technicianId })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/api/maintenance-requests/${maintenanceRequestId}/assignment`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ technicianId: secondTechnicianId })
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/maintenance-requests/${maintenanceRequestId}`)
      .set('Authorization', `Bearer ${technicianToken}`)
      .expect(403);
    const jobs = await request(app.getHttpServer())
      .get('/api/maintenance-requests?page=1&limit=20')
      .set('Authorization', `Bearer ${secondTechnicianToken}`)
      .expect(200);
    expect(jobs.body.data).toHaveLength(1);

    const history = await request(app.getHttpServer())
      .get(
        `/api/maintenance-requests/${maintenanceRequestId}/assignment-history`,
      )
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(history.body).toHaveLength(3);
    expect(
      history.body.filter((item: { isActive: boolean }) => item.isActive),
    ).toHaveLength(1);
  });

  it('allows only involved users to add and read comments', async () => {
    await request(app.getHttpServer())
      .post(`/api/maintenance-requests/${maintenanceRequestId}/comments`)
      .set('Authorization', `Bearer ${residentToken}`)
      .send({ message: ' The leak is getting worse. ' })
      .expect(201)
      .expect((response) => {
        expect(response.body.message).toBe('The leak is getting worse.');
        expect(response.body.user).toMatchObject({
          name: 'Requests Resident E2E',
          role: UserRole.RESIDENT,
        });
        expect(response.body.user).not.toHaveProperty('email');
      });
    await request(app.getHttpServer())
      .post(`/api/maintenance-requests/${maintenanceRequestId}/comments`)
      .set('Authorization', `Bearer ${secondTechnicianToken}`)
      .send({ message: 'I inspected the valve.' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/maintenance-requests/${maintenanceRequestId}/comments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ message: 'Replacement approved.' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/maintenance-requests/${maintenanceRequestId}/comments`)
      .set('Authorization', `Bearer ${technicianToken}`)
      .send({ message: 'No longer assigned.' })
      .expect(403);
    await request(app.getHttpServer())
      .get(`/api/maintenance-requests/${maintenanceRequestId}/comments`)
      .set('Authorization', `Bearer ${otherResidentToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .post(`/api/maintenance-requests/${maintenanceRequestId}/comments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ message: '   ' })
      .expect(400);

    const comments = await request(app.getHttpServer())
      .get(`/api/maintenance-requests/${maintenanceRequestId}/comments`)
      .set('Authorization', `Bearer ${residentToken}`)
      .expect(200);
    expect(
      comments.body.map((item: { message: string }) => item.message),
    ).toEqual([
      'The leak is getting worse.',
      'I inspected the valve.',
      'Replacement approved.',
    ]);
  });

  it('lets the assigned technician start and resolve, then the resident close', async () => {
    await request(app.getHttpServer())
      .patch(`/api/maintenance-requests/${maintenanceRequestId}/status`)
      .set('Authorization', `Bearer ${secondTechnicianToken}`)
      .send({ status: MaintenanceStatus.IN_PROGRESS })
      .expect(200);
    const resolved = await request(app.getHttpServer())
      .patch(`/api/maintenance-requests/${maintenanceRequestId}/status`)
      .set('Authorization', `Bearer ${secondTechnicianToken}`)
      .send({ status: MaintenanceStatus.RESOLVED })
      .expect(200);
    expect(resolved.body.resolvedAt).not.toBeNull();
    const closed = await request(app.getHttpServer())
      .patch(`/api/maintenance-requests/${maintenanceRequestId}/status`)
      .set('Authorization', `Bearer ${residentToken}`)
      .send({ status: MaintenanceStatus.CLOSED })
      .expect(200);
    expect(closed.body.closedAt).not.toBeNull();
  });

  it('returns chronological business audit history to involved users', async () => {
    const historyResponse = await request(app.getHttpServer())
      .get(`/api/maintenance-requests/${maintenanceRequestId}/history`)
      .set('Authorization', `Bearer ${residentToken}`)
      .expect(200);
    const history = historyResponse.body as Array<{
      action: MaintenanceHistoryAction;
      oldValue: string | null;
      newValue: string | null;
      metadata: Record<string, unknown> | null;
    }>;
    expect(history[0].action).toBe(MaintenanceHistoryAction.REQUEST_CREATED);
    expect(
      history.some(
        (item) => item.action === MaintenanceHistoryAction.PRIORITY_CHANGED,
      ),
    ).toBe(true);
    expect(history).toContainEqual(
      expect.objectContaining({
        action: MaintenanceHistoryAction.TECHNICIAN_ASSIGNED,
        oldValue: null,
        newValue: technicianId,
      }),
    );
    expect(
      history.filter(
        (item) => item.action === MaintenanceHistoryAction.TECHNICIAN_ASSIGNED,
      ),
    ).toHaveLength(2);
    expect(history).toContainEqual(
      expect.objectContaining({
        action: MaintenanceHistoryAction.TECHNICIAN_UNASSIGNED,
        oldValue: technicianId,
        newValue: null,
      }),
    );
    expect(history).toContainEqual(
      expect.objectContaining({
        action: MaintenanceHistoryAction.TECHNICIAN_REASSIGNED,
        oldValue: technicianId,
        newValue: secondTechnicianId,
      }),
    );
    expect(
      history.filter(
        (item) => item.action === MaintenanceHistoryAction.COMMENT_ADDED,
      ),
    ).toHaveLength(3);
    expect(history).toContainEqual(
      expect.objectContaining({
        action: MaintenanceHistoryAction.STATUS_CHANGED,
        oldValue: MaintenanceStatus.IN_PROGRESS,
        newValue: MaintenanceStatus.RESOLVED,
      }),
    );
    await request(app.getHttpServer())
      .get(`/api/maintenance-requests/${maintenanceRequestId}/history`)
      .set('Authorization', `Bearer ${secondTechnicianToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/maintenance-requests/${maintenanceRequestId}/history`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/maintenance-requests/${maintenanceRequestId}/history`)
      .set('Authorization', `Bearer ${otherResidentToken}`)
      .expect(403);
  });

  it('returns not found for an unknown request', () =>
    request(app.getHttpServer())
      .get('/api/maintenance-requests/11111111-1111-4111-8111-111111111111')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404));
});
