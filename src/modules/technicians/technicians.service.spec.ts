import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../../generated/prisma/enums.js';
import { MaintenanceCategoriesService } from '../maintenance-categories/maintenance-categories.service.js';
import type { MaintenanceCategoryRecord } from '../maintenance-categories/maintenance-categories.types.js';
import type { PublicUser } from '../users/users.types.js';
import { UsersService } from '../users/users.service.js';
import { TechniciansRepository } from './technicians.repository.js';
import { TechniciansService } from './technicians.service.js';
import type { TechnicianWithRelations } from './technicians.types.js';

describe('TechniciansService', () => {
  const user: PublicUser = {
    id: '30ef9323-decf-4159-b31d-e649cefa2fd8',
    name: 'Tara Technician',
    email: 'tara@example.com',
    role: UserRole.TECHNICIAN,
    isActive: true,
    createdAt: new Date('2026-09-01'),
    updatedAt: new Date('2026-09-01'),
  };
  const technician: TechnicianWithRelations = {
    id: 'c1db90c7-dda7-4212-8876-b1a7ed2d0c67',
    userId: user.id,
    phone: '9876543210',
    experienceYears: 3,
    isAvailable: true,
    isActive: true,
    createdAt: new Date('2026-09-01'),
    updatedAt: new Date('2026-09-01'),
    user,
    skills: [],
  };
  const category: MaintenanceCategoryRecord = {
    id: 'ee41418d-6663-48bd-8b26-1af638378786',
    name: 'Plumbing',
    description: null,
    isActive: true,
    createdAt: new Date('2026-09-01'),
    updatedAt: new Date('2026-09-01'),
  };
  const skill = {
    id: '769d0109-a2fc-4172-9803-9ddf0510ea47',
    technicianId: technician.id,
    categoryId: category.id,
    createdAt: new Date('2026-09-01'),
    category: {
      id: category.id,
      name: category.name,
      description: category.description,
      isActive: category.isActive,
    },
  };
  const repository = {
    create: vi.fn(),
    findById: vi.fn(),
    findByUserId: vi.fn(),
    findMany: vi.fn(),
    findAvailable: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    updateAvailability: vi.fn(),
    findSkill: vi.fn(),
    listSkills: vi.fn(),
    addSkill: vi.fn(),
    removeSkill: vi.fn(),
  };
  const usersService = { getUserById: vi.fn() };
  const categoriesService = { getById: vi.fn() };
  const service = new TechniciansService(
    repository as unknown as TechniciansRepository,
    usersService as unknown as UsersService,
    categoriesService as unknown as MaintenanceCategoriesService,
  );

  beforeEach(() => vi.clearAllMocks());

  it('creates a technician profile', async () => {
    usersService.getUserById.mockResolvedValue(user);
    repository.findByUserId.mockResolvedValue(null);
    repository.create.mockResolvedValue(technician);
    await service.create({
      userId: user.id,
      phone: ' 9876543210 ',
      experienceYears: 3,
    });
    expect(repository.create).toHaveBeenCalledWith({
      userId: user.id,
      phone: '9876543210',
      experienceYears: 3,
    });
  });

  it('propagates missing users', async () => {
    usersService.getUserById.mockRejectedValue(new NotFoundException());
    await expect(
      service.create({
        userId: user.id,
        phone: '9876543210',
        experienceYears: 3,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects users with the wrong role', async () => {
    usersService.getUserById.mockResolvedValue({
      ...user,
      role: UserRole.RESIDENT,
    });
    await expect(
      service.create({
        userId: user.id,
        phone: '9876543210',
        experienceYears: 3,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects duplicate technician profiles', async () => {
    usersService.getUserById.mockResolvedValue(user);
    repository.findByUserId.mockResolvedValue(technician);
    await expect(
      service.create({
        userId: user.id,
        phone: '9876543210',
        experienceYears: 3,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('gets technicians by profile and user id', async () => {
    repository.findById.mockResolvedValue(technician);
    repository.findByUserId.mockResolvedValue(technician);
    await expect(service.getById(technician.id)).resolves.toEqual(technician);
    await expect(service.getByUserId(user.id)).resolves.toEqual(technician);
  });

  it('throws when a technician is missing', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(service.getById(technician.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updates profile and status independently of the User', async () => {
    repository.findById.mockResolvedValue(technician);
    repository.update.mockResolvedValue(technician);
    repository.updateStatus.mockResolvedValue({
      ...technician,
      isActive: false,
    });
    await service.update(technician.id, {
      phone: ' 9999999999 ',
      experienceYears: 4,
    });
    expect(repository.update).toHaveBeenCalledWith(technician.id, {
      phone: '9999999999',
      experienceYears: 4,
    });
    await service.updateStatus(technician.id, false);
    expect(repository.updateStatus).toHaveBeenCalledWith(technician.id, false);
    expect(usersService.getUserById).not.toHaveBeenCalled();
  });

  it('allows admin and owner availability updates', async () => {
    repository.findById.mockResolvedValue(technician);
    repository.updateAvailability.mockResolvedValue(technician);
    await service.updateAvailability(technician.id, false, user);
    await service.updateAvailability(technician.id, true, {
      ...user,
      role: UserRole.ADMIN,
    });
    expect(repository.updateAvailability).toHaveBeenCalledTimes(2);
  });

  it('rejects another technician availability update', async () => {
    repository.findById.mockResolvedValue(technician);
    await expect(
      service.updateAvailability(technician.id, false, {
        ...user,
        id: 'another-id',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('assigns an active category as a skill', async () => {
    repository.findById.mockResolvedValue(technician);
    categoriesService.getById.mockResolvedValue(category);
    repository.findSkill.mockResolvedValue(null);
    repository.addSkill.mockResolvedValue(skill);
    await expect(service.addSkill(technician.id, category.id)).resolves.toEqual(
      skill,
    );
  });

  it('propagates a missing category and rejects inactive categories', async () => {
    repository.findById.mockResolvedValue(technician);
    categoriesService.getById.mockRejectedValueOnce(new NotFoundException());
    await expect(
      service.addSkill(technician.id, category.id),
    ).rejects.toBeInstanceOf(NotFoundException);
    categoriesService.getById.mockResolvedValue({
      ...category,
      isActive: false,
    });
    await expect(
      service.addSkill(technician.id, category.id),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects duplicate skills', async () => {
    repository.findById.mockResolvedValue(technician);
    categoriesService.getById.mockResolvedValue(category);
    repository.findSkill.mockResolvedValue(skill);
    await expect(
      service.addSkill(technician.id, category.id),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('lists and removes skills', async () => {
    repository.findById.mockResolvedValue(technician);
    repository.listSkills.mockResolvedValue([skill]);
    repository.findSkill.mockResolvedValue(skill);
    await expect(service.listSkills(technician.id)).resolves.toEqual([skill]);
    await service.removeSkill(technician.id, category.id);
    expect(repository.removeSkill).toHaveBeenCalledWith(
      technician.id,
      category.id,
    );
  });

  it('returns available technicians with an optional category', async () => {
    repository.findAvailable.mockResolvedValue([technician]);
    await service.findAvailable(category.id);
    expect(repository.findAvailable).toHaveBeenCalledWith(category.id);
  });

  it('forwards normalized list filters', async () => {
    repository.findMany.mockResolvedValue({
      data: [technician],
      meta: { page: 1, limit: 20, total: 1 },
    });
    await service.list({
      search: ' Tara ',
      isAvailable: true,
      page: 1,
      limit: 20,
    });
    expect(repository.findMany).toHaveBeenCalledWith({
      search: 'Tara',
      isAvailable: true,
      page: 1,
      limit: 20,
    });
  });
});
