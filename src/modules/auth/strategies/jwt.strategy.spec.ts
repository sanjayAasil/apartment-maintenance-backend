import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { UserRole } from '../../../generated/prisma/enums.js';
import type { PublicUser } from '../../users/users.types.js';
import type { UsersService } from '../../users/users.service.js';
import { JwtStrategy } from './jwt.strategy.js';

describe('JwtStrategy', () => {
  const user: PublicUser = {
    id: '30ef9323-decf-4159-b31d-e649cefa2fd8',
    name: 'Alex Kumar',
    email: 'alex@example.com',
    role: UserRole.RESIDENT,
    isActive: true,
    createdAt: new Date('2026-09-09T00:00:00.000Z'),
    updatedAt: new Date('2026-09-09T00:00:00.000Z'),
  };
  const configService = {
    getOrThrow: vi.fn().mockReturnValue('test-secret'),
  };
  const usersService = {
    getUserById: vi.fn(),
  };
  const strategy = new JwtStrategy(
    configService as unknown as ConfigService,
    usersService as unknown as UsersService,
  );
  const payload = { sub: user.id, email: user.email, role: user.role };

  beforeEach(() => vi.clearAllMocks());

  it('resolves an active token owner', async () => {
    usersService.getUserById.mockResolvedValue(user);

    await expect(strategy.validate(payload)).resolves.toEqual(user);
  });

  it('rejects tokens for deleted users', async () => {
    usersService.getUserById.mockRejectedValue(
      new NotFoundException('User not found'),
    );

    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects tokens for inactive users', async () => {
    usersService.getUserById.mockResolvedValue({ ...user, isActive: false });

    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
