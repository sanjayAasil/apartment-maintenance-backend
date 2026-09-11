import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { UserRole } from '../src/generated/prisma/enums.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe.sequential('Residents API', () => {
  const adminEmail = 'residents-admin-e2e@example.invalid';
  const residentEmail = 'resident-profile-e2e@example.invalid';
  const password = 'test-password';
  const block = 'RES-E2E';
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let residentToken: string;
  let residentUserId: string;
  let firstApartmentId: string;
  let secondApartmentId: string;
  let residentId: string;

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
      .send({ name: 'Residents Admin E2E', email: adminEmail, password })
      .expect(201);
    await prisma.user.update({
      where: { id: adminRegistration.body.user.id as string },
      data: { role: UserRole.ADMIN },
    });
    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: adminEmail, password })
      .expect(200);
    adminToken = adminLogin.body.accessToken as string;

    const residentRegistration = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'Resident Profile E2E', email: residentEmail, password })
      .expect(201);
    residentToken = residentRegistration.body.accessToken as string;
    residentUserId = residentRegistration.body.user.id as string;

    const firstApartment = await request(app.getHttpServer())
      .post('/api/apartments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ block, floor: 1, unitNumber: '101' })
      .expect(201);
    firstApartmentId = firstApartment.body.id as string;
    const secondApartment = await request(app.getHttpServer())
      .post('/api/apartments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ block, floor: 2, unitNumber: '201' })
      .expect(201);
    secondApartmentId = secondApartment.body.id as string;
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  async function cleanup(): Promise<void> {
    await prisma.resident.deleteMany({
      where: { user: { email: { in: [adminEmail, residentEmail] } } },
    });
    await prisma.apartment.deleteMany({ where: { block } });
    await prisma.user.deleteMany({
      where: { email: { in: [adminEmail, residentEmail] } },
    });
  }

  it('rejects unauthenticated list access', () =>
    request(app.getHttpServer()).get('/api/residents').expect(401));

  it('forbids resident access to management endpoints', () =>
    request(app.getHttpServer())
      .get('/api/residents')
      .set('Authorization', `Bearer ${residentToken}`)
      .expect(403));

  it('creates a resident profile as admin', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/residents')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userId: residentUserId,
        apartmentId: firstApartmentId,
        phone: '9876543210',
        moveInDate: '2026-09-01',
      })
      .expect(201);
    residentId = response.body.id as string;
    expect(response.body.user).toMatchObject({
      id: residentUserId,
      role: UserRole.RESIDENT,
    });
    expect(response.body.user).not.toHaveProperty('passwordHash');
    expect(response.body.apartment.id).toBe(firstApartmentId);
  });

  it('rejects a duplicate profile for the same user', () =>
    request(app.getHttpServer())
      .post('/api/residents')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userId: residentUserId,
        apartmentId: firstApartmentId,
        phone: '9876543210',
        moveInDate: '2026-09-01',
      })
      .expect(409));

  it('lists filtered residents with pagination', async () => {
    const response = await request(app.getHttpServer())
      .get(
        `/api/residents?search=Profile&apartmentId=${firstApartmentId}&isActive=true&page=1&limit=20`,
      )
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.meta).toEqual({ page: 1, limit: 20, total: 1 });
  });

  it('gets the resident by id and current user', async () => {
    const byId = await request(app.getHttpServer())
      .get(`/api/residents/${residentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(byId.body.id).toBe(residentId);

    const current = await request(app.getHttpServer())
      .get('/api/residents/me')
      .set('Authorization', `Bearer ${residentToken}`)
      .expect(200);
    expect(current.body.id).toBe(residentId);
  });

  it('updates profile fields, apartment, and status', async () => {
    await request(app.getHttpServer())
      .patch(`/api/residents/${residentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ phone: '9999999999', moveInDate: '2026-09-02' })
      .expect(200)
      .expect((response) => {
        expect(response.body.phone).toBe('9999999999');
      });
    await request(app.getHttpServer())
      .patch(`/api/residents/${residentId}/apartment`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ apartmentId: secondApartmentId })
      .expect(200)
      .expect((response) => {
        expect(response.body.apartment.id).toBe(secondApartmentId);
      });
    await request(app.getHttpServer())
      .patch(`/api/residents/${residentId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false })
      .expect(200)
      .expect((response) => {
        expect(response.body.isActive).toBe(false);
        expect(response.body.user.isActive).toBe(true);
      });
  });

  it('returns not found for a missing resident', () =>
    request(app.getHttpServer())
      .get('/api/residents/11111111-1111-4111-8111-111111111111')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404));
});
