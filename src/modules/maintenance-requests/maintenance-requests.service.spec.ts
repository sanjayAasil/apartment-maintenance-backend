import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  MaintenancePriority,
  MaintenanceStatus,
  UserRole,
} from '../../generated/prisma/enums.js';
import { MaintenanceCategoriesService } from '../maintenance-categories/maintenance-categories.service.js';
import { ResidentsService } from '../residents/residents.service.js';
import type { PublicUser } from '../users/users.types.js';
import { MaintenanceRequestsRepository } from './maintenance-requests.repository.js';
import { MaintenanceRequestsService } from './maintenance-requests.service.js';
import type { MaintenanceRequestWithRelations } from './maintenance-requests.types.js';

describe('MaintenanceRequestsService', () => {
  const residentUser: PublicUser = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Riya Resident',
    email: 'riya@example.com',
    role: UserRole.RESIDENT,
    isActive: true,
    createdAt: new Date('2026-09-01'),
    updatedAt: new Date('2026-09-01'),
  };
  const admin: PublicUser = {
    ...residentUser,
    id: '22222222-2222-4222-8222-222222222222',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
  };
  const resident = {
    id: '33333333-3333-4333-8333-333333333333',
    userId: residentUser.id,
    apartmentId: '44444444-4444-4444-8444-444444444444',
    phone: '9876543210',
    moveInDate: new Date('2026-01-01'),
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    user: residentUser,
    apartment: {
      id: '44444444-4444-4444-8444-444444444444',
      block: 'A',
      floor: 2,
      unitNumber: '204',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
  };
  const category = {
    id: '55555555-5555-4555-8555-555555555555',
    name: 'Plumbing',
    description: 'Water issues',
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };
  const request: MaintenanceRequestWithRelations = {
    id: '66666666-6666-4666-8666-666666666666',
    residentId: resident.id,
    apartmentId: resident.apartmentId,
    categoryId: category.id,
    title: 'Leaking tap',
    description: 'The kitchen tap is leaking continuously.',
    priority: MaintenancePriority.MEDIUM,
    status: MaintenanceStatus.OPEN,
    createdAt: new Date('2026-09-01'),
    updatedAt: new Date('2026-09-01'),
    resolvedAt: null,
    closedAt: null,
    resident: {
      id: resident.id,
      userId: resident.userId,
      phone: resident.phone,
      isActive: resident.isActive,
      user: residentUser,
    },
    apartment: resident.apartment,
    category,
  };
  const repository = {
    create: vi.fn(),
    findById: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  };
  const residentsService = { getByUserId: vi.fn() };
  const categoriesService = { getById: vi.fn() };
  const service = new MaintenanceRequestsService(
    repository as unknown as MaintenanceRequestsRepository,
    residentsService as unknown as ResidentsService,
    categoriesService as unknown as MaintenanceCategoriesService,
  );

  beforeEach(() => vi.clearAllMocks());

  it('creates from the authenticated resident and snapshots their apartment', async () => {
    residentsService.getByUserId.mockResolvedValue(resident);
    categoriesService.getById.mockResolvedValue(category);
    repository.create.mockResolvedValue(request);
    await service.create(
      {
        categoryId: category.id,
        title: ' Leaking tap ',
        description: ' The kitchen tap is leaking continuously. ',
        priority: MaintenancePriority.MEDIUM,
      },
      residentUser,
    );
    expect(repository.create).toHaveBeenCalledWith({
      residentId: resident.id,
      apartmentId: resident.apartmentId,
      categoryId: category.id,
      title: 'Leaking tap',
      description: 'The kitchen tap is leaking continuously.',
      priority: MaintenancePriority.MEDIUM,
      status: MaintenanceStatus.OPEN,
    });
  });

  it('rejects inactive residents and categories', async () => {
    residentsService.getByUserId.mockResolvedValue({
      ...resident,
      isActive: false,
    });
    await expect(
      service.create(
        {
          categoryId: category.id,
          title: 'Leak',
          description: 'A sufficiently long description',
          priority: MaintenancePriority.LOW,
        },
        residentUser,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    residentsService.getByUserId.mockResolvedValue(resident);
    categoriesService.getById.mockResolvedValue({
      ...category,
      isActive: false,
    });
    await expect(
      service.create(
        {
          categoryId: category.id,
          title: 'Leak',
          description: 'A sufficiently long description',
          priority: MaintenancePriority.LOW,
        },
        residentUser,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('propagates missing resident profiles and categories', async () => {
    residentsService.getByUserId.mockRejectedValueOnce(
      new NotFoundException('Resident profile not found'),
    );
    await expect(
      service.create(
        {
          categoryId: category.id,
          title: 'Leak',
          description: 'A sufficiently long description',
          priority: MaintenancePriority.LOW,
        },
        residentUser,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    residentsService.getByUserId.mockResolvedValueOnce(resident);
    categoriesService.getById.mockRejectedValueOnce(
      new NotFoundException('Maintenance category not found'),
    );
    await expect(
      service.create(
        {
          categoryId: category.id,
          title: 'Leak',
          description: 'A sufficiently long description',
          priority: MaintenancePriority.LOW,
        },
        residentUser,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('forces resident list ownership while admins can use filters', async () => {
    residentsService.getByUserId.mockResolvedValue(resident);
    repository.findMany.mockResolvedValue({
      data: [request],
      meta: { page: 1, limit: 20, total: 1 },
    });
    const query = {
      search: ' leak ',
      page: 1,
      limit: 20,
      sortBy: 'createdAt' as const,
      sortOrder: 'desc' as const,
      residentId: '77777777-7777-4777-8777-777777777777',
    };
    await service.list(query, residentUser);
    expect(repository.findMany).toHaveBeenLastCalledWith({
      ...query,
      search: 'leak',
      residentId: resident.id,
    });
    await service.list(query, admin);
    expect(repository.findMany).toHaveBeenLastCalledWith({
      ...query,
      search: 'leak',
    });
  });

  it('returns visible requests and rejects missing or non-owned requests', async () => {
    repository.findById.mockResolvedValueOnce(request);
    await expect(service.getById(request.id, residentUser)).resolves.toEqual(
      request,
    );
    repository.findById.mockResolvedValueOnce(null);
    await expect(service.getById(request.id, admin)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    repository.findById.mockResolvedValueOnce({
      ...request,
      resident: { ...request.resident, userId: 'another-user' },
    });
    await expect(
      service.getById(request.id, residentUser),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('updates only open requests and validates a changed category', async () => {
    repository.findById.mockResolvedValue(request);
    categoriesService.getById.mockResolvedValue(category);
    repository.update.mockResolvedValue(request);
    await service.update(
      request.id,
      { categoryId: category.id, title: ' Updated leak ' },
      residentUser,
    );
    expect(repository.update).toHaveBeenCalledWith(request.id, {
      category: { connect: { id: category.id } },
      title: 'Updated leak',
    });
    repository.findById.mockResolvedValue({
      ...request,
      status: MaintenanceStatus.IN_PROGRESS,
    });
    await expect(
      service.update(request.id, { title: 'Nope' }, admin),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lets an owner cancel an open request', async () => {
    repository.findById.mockResolvedValue(request);
    repository.update.mockResolvedValue({
      ...request,
      status: MaintenanceStatus.CANCELLED,
    });
    await service.updateStatus(
      request.id,
      MaintenanceStatus.CANCELLED,
      residentUser,
    );
    expect(repository.update).toHaveBeenCalledWith(request.id, {
      status: MaintenanceStatus.CANCELLED,
    });
  });

  it('sets resolution and closure timestamps on valid transitions', async () => {
    repository.findById.mockResolvedValueOnce({
      ...request,
      status: MaintenanceStatus.IN_PROGRESS,
    });
    repository.update.mockResolvedValue(request);
    await service.updateStatus(request.id, MaintenanceStatus.RESOLVED, admin);
    expect(repository.update).toHaveBeenLastCalledWith(request.id, {
      status: MaintenanceStatus.RESOLVED,
      resolvedAt: expect.any(Date),
    });
    repository.findById.mockResolvedValueOnce({
      ...request,
      status: MaintenanceStatus.RESOLVED,
    });
    await service.updateStatus(
      request.id,
      MaintenanceStatus.CLOSED,
      residentUser,
    );
    expect(repository.update).toHaveBeenLastCalledWith(request.id, {
      status: MaintenanceStatus.CLOSED,
      closedAt: expect.any(Date),
    });
  });

  it('rejects invalid, assignment-owned, and technician transitions', async () => {
    repository.findById.mockResolvedValue(request);
    await expect(
      service.updateStatus(request.id, MaintenanceStatus.CLOSED, admin),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.updateStatus(request.id, MaintenanceStatus.ASSIGNED, admin),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.getById(request.id, {
        ...residentUser,
        role: UserRole.TECHNICIAN,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
