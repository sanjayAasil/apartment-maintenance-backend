import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { UserRole } from '../src/generated/prisma/enums.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe.sequential('Apartments API', () => {
  const email = 'apartments-e2e@example.invalid';
  const password = 'test-password';
  const block = 'E2E-TEST';
  let app: INestApplication;
  let prisma: PrismaService;
  let residentToken: string;
  let adminToken: string;
  let apartmentId: string;

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
    await prisma.apartment.deleteMany({ where: { block } });
    await prisma.user.deleteMany({ where: { email } });

    const registration = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'Apartments E2E', email, password })
      .expect(201);
    residentToken = registration.body.accessToken as string;
  });

  afterAll(async () => {
    await prisma.apartment.deleteMany({ where: { block } });
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it('rejects unauthenticated access', () =>
    request(app.getHttpServer()).get('/api/apartments').expect(401));

  it('forbids resident apartment creation', () =>
    request(app.getHttpServer())
      .post('/api/apartments')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({ block, floor: 2, unitNumber: '204' })
      .expect(403));

  it('creates an apartment as admin', async () => {
    await prisma.user.update({
      where: { email },
      data: { role: UserRole.ADMIN },
    });
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);
    adminToken = login.body.accessToken as string;

    const response = await request(app.getHttpServer())
      .post('/api/apartments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ block, floor: 2, unitNumber: '204' })
      .expect(201);
    apartmentId = response.body.id as string;
    expect(response.body).toMatchObject({ block, floor: 2, unitNumber: '204' });
  });

  it('returns conflict for a duplicate apartment', () =>
    request(app.getHttpServer())
      .post('/api/apartments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ block, floor: 2, unitNumber: '204' })
      .expect(409));

  it('returns a filtered paginated list', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/apartments?block=${block}&floor=2&search=204&page=1&limit=20`)
      .set('Authorization', `Bearer ${residentToken}`)
      .expect(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.meta).toEqual({ page: 1, limit: 20, total: 1 });
  });

  it('returns an apartment by id', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/apartments/${apartmentId}`)
      .set('Authorization', `Bearer ${residentToken}`)
      .expect(200);
    expect(response.body.id).toBe(apartmentId);
  });

  it('updates an apartment as admin', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/apartments/${apartmentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ floor: 3, unitNumber: '304' })
      .expect(200);
    expect(response.body).toMatchObject({ floor: 3, unitNumber: '304' });
  });

  it('returns not found for a missing apartment', () =>
    request(app.getHttpServer())
      .get('/api/apartments/11111111-1111-4111-8111-111111111111')
      .set('Authorization', `Bearer ${residentToken}`)
      .expect(404));
});
