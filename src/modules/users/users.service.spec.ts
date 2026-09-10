import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { UserRole } from '../../generated/prisma/enums.js';
import type { PublicUser } from './users.types.js';
import { UsersRepository } from './users.repository.js';
import { UsersService } from './users.service.js';

describe('UsersService', () => {
  const user: PublicUser = {
    id: '30ef9323-decf-4159-b31d-e649cefa2fd8',
    name: 'Sanjay',
    email: 'sanjay@example.com',
    role: UserRole.ADMIN,
    isActive: true,
    createdAt: new Date('2026-09-09T00:00:00.000Z'),
    updatedAt: new Date('2026-09-09T00:00:00.000Z'),
  };

  const repository = {
    create: vi.fn(),
    findById: vi.fn(),
    findByEmail: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    setActiveStatus: vi.fn(),
  };
  const service = new UsersService(repository as unknown as UsersRepository);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws when a user does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.getUserById(user.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('normalizes email when creating a user', async () => {
    repository.findByEmail.mockResolvedValue(null);
    repository.create.mockResolvedValue(user);

    await service.createUser({
      name: '  Sanjay  ',
      email: '  SANJAY@EXAMPLE.COM ',
      passwordHash: 'already-hashed',
      role: UserRole.ADMIN,
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Sanjay',
        email: 'sanjay@example.com',
      }),
    );
  });

  it('maps a concurrent unique-email violation to conflict', async () => {
    repository.findByEmail.mockResolvedValue(null);
    repository.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '7.10.0',
        meta: { modelName: 'User', target: ['email'] },
      }),
    );

    await expect(
      service.createUser({
        name: 'Sanjay',
        email: 'sanjay@example.com',
        passwordHash: 'already-hashed',
        role: UserRole.ADMIN,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects an email already used by another user', async () => {
    repository.findById.mockResolvedValue(user);
    repository.findByEmail.mockResolvedValue({
      ...user,
      id: 'ee41418d-6663-48bd-8b26-1af638378786',
      passwordHash: 'hash',
    });

    await expect(
      service.updateUser(user.id, { email: 'taken@example.com' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects an empty update', async () => {
    await expect(service.updateUser(user.id, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('passes normalized filters to the repository', async () => {
    repository.findMany.mockResolvedValue({
      data: [],
      meta: { page: 2, limit: 10, total: 0 },
    });

    await service.listUsers({ page: 2, limit: 10, search: '  alex  ' });

    expect(repository.findMany).toHaveBeenCalledWith({
      page: 2,
      limit: 10,
      search: 'alex',
    });
  });
});
