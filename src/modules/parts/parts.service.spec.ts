import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PartsRepository } from './parts.repository.js';
import { PartsService } from './parts.service.js';
import type { PartRecord } from './parts.types.js';

describe('PartsService', () => {
  const part: PartRecord = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Water Valve',
    description: 'Bathroom inlet valve',
    quantity: 20,
    unitPrice: new Prisma.Decimal(250),
    minimumStock: 5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const repository = {
    create: vi.fn(),
    findById: vi.fn(),
    findByName: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  };
  const service = new PartsService(repository as unknown as PartsRepository);

  beforeEach(() => vi.clearAllMocks());

  it('creates a normalized part', async () => {
    repository.findByName.mockResolvedValue(null);
    repository.create.mockResolvedValue(part);
    await service.create({
      name: ' Water Valve ',
      description: ' Bathroom inlet valve ',
      quantity: 20,
      unitPrice: 250,
      minimumStock: 5,
    });
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Water Valve',
        description: 'Bathroom inlet valve',
        quantity: 20,
        minimumStock: 5,
      }),
    );
  });

  it('rejects duplicate names case-insensitively', async () => {
    repository.findByName.mockResolvedValue(part);
    await expect(
      service.create({
        name: 'water valve',
        quantity: 1,
        unitPrice: 10,
        minimumStock: 0,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('lists with normalized filters and supports low stock', async () => {
    repository.findMany.mockResolvedValue({
      data: [part],
      meta: { page: 1, limit: 20, total: 1 },
    });
    await service.list({ search: ' valve ', page: 1, limit: 20 });
    expect(repository.findMany).toHaveBeenCalledWith({
      search: 'valve',
      page: 1,
      limit: 20,
    });
    await service.lowStock();
    expect(repository.findMany).toHaveBeenLastCalledWith({
      page: 1,
      limit: 100,
      isActive: true,
      lowStock: true,
    });
  });

  it('updates metadata without changing stock', async () => {
    repository.findById.mockResolvedValue(part);
    repository.findByName.mockResolvedValue(part);
    repository.update.mockResolvedValue(part);
    await service.update(part.id, {
      name: part.name,
      unitPrice: 275,
      minimumStock: 4,
    });
    expect(repository.update).toHaveBeenCalledWith(
      part.id,
      expect.not.objectContaining({ quantity: expect.anything() }),
    );
  });

  it('sets stock and status explicitly', async () => {
    repository.findById.mockResolvedValue(part);
    repository.update.mockResolvedValue(part);
    await service.setStock(part.id, 12);
    expect(repository.update).toHaveBeenCalledWith(part.id, { quantity: 12 });
    await service.updateStatus(part.id, false);
    expect(repository.update).toHaveBeenCalledWith(part.id, {
      isActive: false,
    });
  });

  it('rejects missing parts and negative stock', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(service.getById(part.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    repository.findById.mockResolvedValue(part);
    await expect(service.setStock(part.id, -1)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
