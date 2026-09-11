import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { Apartment } from '../../generated/prisma/client.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { ApartmentsService } from '../apartments/apartments.service.js';
import type { PublicUser } from '../users/users.types.js';
import { UsersService } from '../users/users.service.js';
import { ResidentsRepository } from './residents.repository.js';
import { ResidentsService } from './residents.service.js';
import type { ResidentWithRelations } from './residents.types.js';

describe('ResidentsService', () => {
  const user: PublicUser = {
    id: '30ef9323-decf-4159-b31d-e649cefa2fd8',
    name: 'Ravi Resident',
    email: 'ravi@example.com',
    role: UserRole.RESIDENT,
    isActive: true,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
  };
  const apartment: Apartment = {
    id: 'ee41418d-6663-48bd-8b26-1af638378786',
    block: 'A',
    floor: 2,
    unitNumber: '204',
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
  };
  const resident: ResidentWithRelations = {
    id: 'c1db90c7-dda7-4212-8876-b1a7ed2d0c67',
    userId: user.id,
    apartmentId: apartment.id,
    phone: '9876543210',
    moveInDate: new Date('2026-09-01T00:00:00.000Z'),
    isActive: true,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
    user,
    apartment,
  };
  const repository = {
    create: vi.fn(),
    findById: vi.fn(),
    findByUserId: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    updateApartment: vi.fn(),
    updateStatus: vi.fn(),
  };
  const usersService = { getUserById: vi.fn() };
  const apartmentsService = { getById: vi.fn() };
  const service = new ResidentsService(
    repository as unknown as ResidentsRepository,
    usersService as unknown as UsersService,
    apartmentsService as unknown as ApartmentsService,
  );

  beforeEach(() => vi.clearAllMocks());

  it('creates a resident profile', async () => {
    usersService.getUserById.mockResolvedValue(user);
    repository.findByUserId.mockResolvedValue(null);
    apartmentsService.getById.mockResolvedValue(apartment);
    repository.create.mockResolvedValue(resident);

    await service.create({
      userId: user.id,
      apartmentId: apartment.id,
      phone: ' 9876543210 ',
      moveInDate: '2026-09-01',
    });

    expect(repository.create).toHaveBeenCalledWith({
      userId: user.id,
      apartmentId: apartment.id,
      phone: '9876543210',
      moveInDate: new Date('2026-09-01'),
    });
  });

  it('propagates user not found', async () => {
    usersService.getUserById.mockRejectedValue(
      new NotFoundException('User not found'),
    );
    await expect(
      service.create({
        userId: user.id,
        apartmentId: apartment.id,
        phone: '9876543210',
        moveInDate: '2026-09-01',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects an inactive user', async () => {
    usersService.getUserById.mockResolvedValue({ ...user, isActive: false });
    await expect(
      service.create({
        userId: user.id,
        apartmentId: apartment.id,
        phone: '9876543210',
        moveInDate: '2026-09-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a user without the RESIDENT role', async () => {
    usersService.getUserById.mockResolvedValue({
      ...user,
      role: UserRole.TECHNICIAN,
    });
    await expect(
      service.create({
        userId: user.id,
        apartmentId: apartment.id,
        phone: '9876543210',
        moveInDate: '2026-09-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a duplicate resident profile', async () => {
    usersService.getUserById.mockResolvedValue(user);
    repository.findByUserId.mockResolvedValue(resident);
    await expect(
      service.create({
        userId: user.id,
        apartmentId: apartment.id,
        phone: '9876543210',
        moveInDate: '2026-09-01',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('propagates apartment not found', async () => {
    usersService.getUserById.mockResolvedValue(user);
    repository.findByUserId.mockResolvedValue(null);
    apartmentsService.getById.mockRejectedValue(
      new NotFoundException('Apartment not found'),
    );
    await expect(
      service.create({
        userId: user.id,
        apartmentId: apartment.id,
        phone: '9876543210',
        moveInDate: '2026-09-01',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('gets a resident by id and user id', async () => {
    repository.findById.mockResolvedValue(resident);
    repository.findByUserId.mockResolvedValue(resident);
    await expect(service.getById(resident.id)).resolves.toEqual(resident);
    await expect(service.getByUserId(user.id)).resolves.toEqual(resident);
  });

  it('throws when a resident does not exist', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(service.getById(resident.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws when the current user has no resident profile', async () => {
    repository.findByUserId.mockResolvedValue(null);
    await expect(service.getByUserId(user.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updates resident profile fields', async () => {
    repository.findById.mockResolvedValue(resident);
    repository.update.mockResolvedValue({ ...resident, phone: '9999999999' });
    await service.update(resident.id, {
      phone: ' 9999999999 ',
      moveInDate: '2026-09-02',
    });
    expect(repository.update).toHaveBeenCalledWith(resident.id, {
      phone: '9999999999',
      moveInDate: new Date('2026-09-02'),
    });
  });

  it('changes apartment after validating it', async () => {
    const target = { ...apartment, id: '769d0109-a2fc-4172-9803-9ddf0510ea47' };
    repository.findById.mockResolvedValue(resident);
    apartmentsService.getById.mockResolvedValue(target);
    repository.updateApartment.mockResolvedValue({
      ...resident,
      apartmentId: target.id,
      apartment: target,
    });
    await service.changeApartment(resident.id, target.id);
    expect(apartmentsService.getById).toHaveBeenCalledWith(target.id);
    expect(repository.updateApartment).toHaveBeenCalledWith(
      resident.id,
      target.id,
    );
  });

  it('updates resident status without changing the user', async () => {
    repository.findById.mockResolvedValue(resident);
    repository.updateStatus.mockResolvedValue({ ...resident, isActive: false });
    await service.updateStatus(resident.id, false);
    expect(repository.updateStatus).toHaveBeenCalledWith(resident.id, false);
    expect(usersService.getUserById).not.toHaveBeenCalled();
  });

  it('forwards normalized pagination and filters', async () => {
    repository.findMany.mockResolvedValue({
      data: [resident],
      meta: { page: 2, limit: 10, total: 1 },
    });
    await service.list({
      search: ' Ravi ',
      apartmentId: apartment.id,
      isActive: true,
      page: 2,
      limit: 10,
    });
    expect(repository.findMany).toHaveBeenCalledWith({
      search: 'Ravi',
      apartmentId: apartment.id,
      isActive: true,
      page: 2,
      limit: 10,
    });
  });
});
