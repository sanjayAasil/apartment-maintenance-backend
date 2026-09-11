import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { UserRole } from '../src/generated/prisma/enums.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe.sequential('Technicians API', () => {
  const adminEmail = 'technicians-admin-e2e@example.invalid';
  const technicianEmail = 'technician-profile-e2e@example.invalid';
  const password = 'test-password';
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let technicianToken: string;
  let technicianUserId: string;
  let technicianId: string;
  let categoryId: string;
  let inactiveCategoryId: string;

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

    const adminRegistration = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'Technicians Admin E2E', email: adminEmail, password })
      .expect(201);
    await prisma.user.update({
      where: { id: adminRegistration.body.user.id as string },
      data: { role: UserRole.ADMIN },
    });
    adminToken = (
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: adminEmail, password })
        .expect(200)
    ).body.accessToken as string;

    const registration = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Technician Profile E2E',
        email: technicianEmail,
        password,
      })
      .expect(201);
    technicianUserId = registration.body.user.id as string;
    await prisma.user.update({
      where: { id: technicianUserId },
      data: { role: UserRole.TECHNICIAN },
    });
    technicianToken = (
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: technicianEmail, password })
        .expect(200)
    ).body.accessToken as string;

    categoryId = (
      await request(app.getHttpServer())
        .post('/api/maintenance-categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'E2E Technician Plumbing' })
        .expect(201)
    ).body.id as string;
    inactiveCategoryId = (
      await request(app.getHttpServer())
        .post('/api/maintenance-categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'E2E Technician Inactive' })
        .expect(201)
    ).body.id as string;
    await request(app.getHttpServer())
      .patch(`/api/maintenance-categories/${inactiveCategoryId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false })
      .expect(200);
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  async function cleanup(): Promise<void> {
    await prisma.technicianSkill.deleteMany({
      where: { technician: { user: { email: technicianEmail } } },
    });
    await prisma.technician.deleteMany({
      where: { user: { email: technicianEmail } },
    });
    await prisma.maintenanceCategory.deleteMany({
      where: { name: { startsWith: 'E2E Technician', mode: 'insensitive' } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [adminEmail, technicianEmail] } },
    });
  }

  it('rejects unauthenticated access and resident-role management', async () => {
    await request(app.getHttpServer()).get('/api/technicians').expect(401);
    await request(app.getHttpServer())
      .post('/api/technicians')
      .set('Authorization', `Bearer ${technicianToken}`)
      .send({
        userId: technicianUserId,
        phone: '9876543210',
        experienceYears: 3,
      })
      .expect(403);
  });

  it('creates a technician as admin and prevents duplicates', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/technicians')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userId: technicianUserId,
        phone: '9876543210',
        experienceYears: 3,
      })
      .expect(201);
    technicianId = response.body.id as string;
    expect(response.body.user).toMatchObject({
      id: technicianUserId,
      role: UserRole.TECHNICIAN,
    });
    expect(response.body.user).not.toHaveProperty('passwordHash');

    await request(app.getHttpServer())
      .post('/api/technicians')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userId: technicianUserId,
        phone: '9876543210',
        experienceYears: 3,
      })
      .expect(409);
  });

  it('lists and retrieves technician profiles', async () => {
    const list = await request(app.getHttpServer())
      .get(
        '/api/technicians?search=Profile&isActive=true&isAvailable=true&page=1&limit=20',
      )
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.meta).toEqual({ page: 1, limit: 20, total: 1 });

    const current = await request(app.getHttpServer())
      .get('/api/technicians/me')
      .set('Authorization', `Bearer ${technicianToken}`)
      .expect(200);
    expect(current.body.id).toBe(technicianId);
  });

  it('updates profile and allows self availability changes', async () => {
    await request(app.getHttpServer())
      .patch(`/api/technicians/${technicianId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ phone: '9999999999', experienceYears: 4 })
      .expect(200)
      .expect((response) => expect(response.body.experienceYears).toBe(4));
    await request(app.getHttpServer())
      .patch(`/api/technicians/${technicianId}/availability`)
      .set('Authorization', `Bearer ${technicianToken}`)
      .send({ isAvailable: false })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/api/technicians/${technicianId}/availability`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isAvailable: true })
      .expect(200);
  });

  it('assigns, lists, filters, and removes an active skill', async () => {
    await request(app.getHttpServer())
      .post(`/api/technicians/${technicianId}/skills`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ categoryId })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/technicians/${technicianId}/skills`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ categoryId })
      .expect(409);
    const skills = await request(app.getHttpServer())
      .get(`/api/technicians/${technicianId}/skills`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(skills.body[0].category.name).toBe('E2E Technician Plumbing');

    const available = await request(app.getHttpServer())
      .get(`/api/technicians/available?categoryId=${categoryId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(available.body).toHaveLength(1);

    await request(app.getHttpServer())
      .delete(`/api/technicians/${technicianId}/skills/${categoryId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);
  });

  it('rejects assigning an inactive category', () =>
    request(app.getHttpServer())
      .post(`/api/technicians/${technicianId}/skills`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ categoryId: inactiveCategoryId })
      .expect(400));

  it('updates technician status without changing User status', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/technicians/${technicianId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false })
      .expect(200);
    expect(response.body.isActive).toBe(false);
    expect(response.body.user.isActive).toBe(true);
  });

  it('returns not found for a missing technician', () =>
    request(app.getHttpServer())
      .get('/api/technicians/11111111-1111-4111-8111-111111111111')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404));
});
