import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { MaintenanceCategoriesRepository } from './maintenance-categories.repository.js';
import { MaintenanceCategoriesService } from './maintenance-categories.service.js';
import type { MaintenanceCategoryRecord } from './maintenance-categories.types.js';

describe('MaintenanceCategoriesService', () => {
  const category: MaintenanceCategoryRecord = {
    id: '1ddd35e6-284d-4f08-930d-215eb65605e0',
    name: 'Plumbing',
    description: 'Water and pipe related maintenance',
    isActive: true,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
  };
  const repository = {
    create: vi.fn(),
    findById: vi.fn(),
    findByName: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    setActiveStatus: vi.fn(),
  };
  const service = new MaintenanceCategoriesService(
    repository as unknown as MaintenanceCategoriesRepository,
  );

  beforeEach(() => vi.clearAllMocks());

  it('creates a normalized category', async () => {
    repository.findByName.mockResolvedValue(null);
    repository.create.mockResolvedValue(category);
    await service.create({
      name: ' Plumbing ',
      description: ' Water and pipes ',
    });
    expect(repository.create).toHaveBeenCalledWith({
      name: 'Plumbing',
      description: 'Water and pipes',
    });
  });

  it('rejects a case-insensitive duplicate', async () => {
    repository.findByName.mockResolvedValue(category);
    await expect(service.create({ name: 'plumbing' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('forwards normalized list filters', async () => {
    repository.findMany.mockResolvedValue({
      data: [category],
      meta: { page: 2, limit: 10, total: 1 },
    });
    await service.list({
      search: ' pipe ',
      isActive: true,
      page: 2,
      limit: 10,
    });
    expect(repository.findMany).toHaveBeenCalledWith({
      search: 'pipe',
      isActive: true,
      page: 2,
      limit: 10,
    });
  });

  it('gets a category by id', async () => {
    repository.findById.mockResolvedValue(category);
    await expect(service.getById(category.id)).resolves.toEqual(category);
  });

  it('throws when a category is missing', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(service.getById(category.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updates category fields and permits the current name', async () => {
    repository.findById.mockResolvedValue(category);
    repository.findByName.mockResolvedValue(category);
    repository.update.mockResolvedValue({ ...category, description: null });
    await service.update(category.id, { name: ' Plumbing ', description: '' });
    expect(repository.update).toHaveBeenCalledWith(category.id, {
      name: 'Plumbing',
      description: null,
    });
  });

  it('rejects a conflicting name during update', async () => {
    repository.findById.mockResolvedValue(category);
    repository.findByName.mockResolvedValue({ ...category, id: 'other-id' });
    await expect(
      service.update(category.id, { name: 'Electrical' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects an empty update', async () => {
    await expect(service.update(category.id, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('activates or deactivates a category', async () => {
    repository.findById.mockResolvedValue(category);
    repository.setActiveStatus.mockResolvedValue({
      ...category,
      isActive: false,
    });
    await service.updateStatus(category.id, false);
    expect(repository.setActiveStatus).toHaveBeenCalledWith(category.id, false);
  });
});
