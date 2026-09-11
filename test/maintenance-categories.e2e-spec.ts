import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { UserRole } from '../src/generated/prisma/enums.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe.sequential('Maintenance Categories API', () => {
  const adminEmail = 'categories-admin-e2e@example.invalid';
  const memberEmail = 'categories-member-e2e@example.invalid';
  const password = 'test-password';
  const name = 'E2E Plumbing';
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let residentToken: string;
  let technicianToken: string;
  let categoryId: string;

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
      .send({ name: 'Categories Admin E2E', email: adminEmail, password })
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

    const memberRegistration = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'Categories Member E2E', email: memberEmail, password })
      .expect(201);
    residentToken = memberRegistration.body.accessToken as string;
    await prisma.user.update({
      where: { id: memberRegistration.body.user.id as string },
      data: { role: UserRole.TECHNICIAN },
    });
    technicianToken = (
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: memberEmail, password })
        .expect(200)
    ).body.accessToken as string;
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  async function cleanup(): Promise<void> {
    await prisma.maintenanceCategory.deleteMany({
      where: { name: { in: ['E2E Plumbing', 'E2E Electrical'] } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [adminEmail, memberEmail] } },
    });
  }

  it('rejects unauthenticated reads', () =>
    request(app.getHttpServer())
      .get('/api/maintenance-categories')
      .expect(401));

  it('forbids resident category creation', () =>
    request(app.getHttpServer())
      .post('/api/maintenance-categories')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({ name })
      .expect(403));

  it('creates a category as admin', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/maintenance-categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: ` ${name} `, description: ' Water and pipes ' })
      .expect(201);
    categoryId = response.body.id as string;
    expect(response.body).toMatchObject({
      name,
      description: 'Water and pipes',
      isActive: true,
    });
  });

  it('rejects a case-insensitive duplicate', () =>
    request(app.getHttpServer())
      .post('/api/maintenance-categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: name.toLowerCase() })
      .expect(409));

  it('allows resident and technician list/detail reads', async () => {
    const list = await request(app.getHttpServer())
      .get(
        '/api/maintenance-categories?search=E2E%20Plumbing&isActive=true&page=1&limit=20',
      )
      .set('Authorization', `Bearer ${residentToken}`)
      .expect(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.meta).toEqual({ page: 1, limit: 20, total: 1 });

    const detail = await request(app.getHttpServer())
      .get(`/api/maintenance-categories/${categoryId}`)
      .set('Authorization', `Bearer ${technicianToken}`)
      .expect(200);
    expect(detail.body.id).toBe(categoryId);
  });

  it('updates category details and status as admin', async () => {
    await request(app.getHttpServer())
      .patch(`/api/maintenance-categories/${categoryId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'E2E Electrical', description: '' })
      .expect(200)
      .expect((response) => {
        expect(response.body.name).toBe('E2E Electrical');
        expect(response.body.description).toBeNull();
      });
    await request(app.getHttpServer())
      .patch(`/api/maintenance-categories/${categoryId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false })
      .expect(200)
      .expect((response) => expect(response.body.isActive).toBe(false));
  });

  it('forbids technician updates', () =>
    request(app.getHttpServer())
      .patch(`/api/maintenance-categories/${categoryId}`)
      .set('Authorization', `Bearer ${technicianToken}`)
      .send({ name: 'E2E Forbidden' })
      .expect(403));

  it('returns not found for a missing category', () =>
    request(app.getHttpServer())
      .get('/api/maintenance-categories/11111111-1111-4111-8111-111111111111')
      .set('Authorization', `Bearer ${residentToken}`)
      .expect(404));
});
