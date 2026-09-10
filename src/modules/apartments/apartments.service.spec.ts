import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type Apartment } from '../../generated/prisma/client.js';
import { ApartmentsRepository } from './apartments.repository.js';
import { ApartmentsService } from './apartments.service.js';

describe('ApartmentsService', () => {
  const apartment: Apartment = {
    id: '30ef9323-decf-4159-b31d-e649cefa2fd8',
    block: 'A',
    floor: 2,
    unitNumber: '204',
    createdAt: new Date('2026-09-10T00:00:00.000Z'),
    updatedAt: new Date('2026-09-10T00:00:00.000Z'),
  };
  const repository = {
    create: vi.fn(),
    findById: vi.fn(),
    findByBlockAndUnitNumber: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  };
  const service = new ApartmentsService(
    repository as unknown as ApartmentsRepository,
  );

  beforeEach(() => vi.clearAllMocks());

  it('creates a normalized apartment', async () => {
    repository.findByBlockAndUnitNumber.mockResolvedValue(null);
    repository.create.mockResolvedValue(apartment);

    await service.create({ block: ' A ', floor: 2, unitNumber: ' 204 ' });

    expect(repository.create).toHaveBeenCalledWith({
      block: 'A',
      floor: 2,
      unitNumber: '204',
    });
  });

  it('rejects a duplicate apartment', async () => {
    repository.findByBlockAndUnitNumber.mockResolvedValue(apartment);

    await expect(
      service.create({ block: 'A', floor: 2, unitNumber: '204' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('maps concurrent unique constraint violations to conflict', async () => {
    repository.findByBlockAndUnitNumber.mockResolvedValue(null);
    repository.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '7.10.0',
      }),
    );

    await expect(
      service.create({ block: 'A', floor: 2, unitNumber: '204' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('passes normalized filters to the repository', async () => {
    repository.findMany.mockResolvedValue({
      data: [apartment],
      meta: { page: 2, limit: 10, total: 1 },
    });

    await service.list({
      block: ' A ',
      search: ' 204 ',
      floor: 2,
      page: 2,
      limit: 10,
    });

    expect(repository.findMany).toHaveBeenCalledWith({
      block: 'A',
      search: '204',
      floor: 2,
      page: 2,
      limit: 10,
    });
  });

  it('returns an apartment by id', async () => {
    repository.findById.mockResolvedValue(apartment);
    await expect(service.getById(apartment.id)).resolves.toEqual(apartment);
  });

  it('throws when an apartment does not exist', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(service.getById(apartment.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updates allowed fields', async () => {
    repository.findById.mockResolvedValue(apartment);
    repository.findByBlockAndUnitNumber.mockResolvedValue(null);
    repository.update.mockResolvedValue({ ...apartment, unitNumber: '205' });

    await service.update(apartment.id, { unitNumber: ' 205 ' });

    expect(repository.update).toHaveBeenCalledWith(apartment.id, {
      unitNumber: '205',
    });
  });

  it('rejects an empty update', async () => {
    await expect(service.update(apartment.id, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
