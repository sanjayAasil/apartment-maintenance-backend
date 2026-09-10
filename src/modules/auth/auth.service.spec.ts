import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { UserRole, type User } from '../../generated/prisma/client.js';
import type { PublicUser } from '../users/users.types.js';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  const publicUser: PublicUser = {
    id: '30ef9323-decf-4159-b31d-e649cefa2fd8',
    name: 'Alex Kumar',
    email: 'alex@example.com',
    role: UserRole.RESIDENT,
    isActive: true,
    createdAt: new Date('2026-09-09T00:00:00.000Z'),
    updatedAt: new Date('2026-09-09T00:00:00.000Z'),
  };

  const usersService = {
    createUser: vi.fn(),
    findByEmailForAuthentication: vi.fn(),
  };
  const jwtService = {
    signAsync: vi.fn().mockResolvedValue('test-access-token'),
  };
  const service = new AuthService(
    usersService as unknown as UsersService,
    jwtService as unknown as JwtService,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    jwtService.signAsync.mockResolvedValue('test-access-token');
  });

  it('hashes the password and always registers a resident', async () => {
    usersService.findByEmailForAuthentication.mockResolvedValue(null);
    usersService.createUser.mockResolvedValue(publicUser);

    const result = await service.register({
      name: 'Alex Kumar',
      email: 'alex@example.com',
      password: 'secure-password',
    });

    const createInput = usersService.createUser.mock.calls[0][0] as {
      passwordHash: string;
      role: UserRole;
      isActive: boolean;
    };
    expect(createInput.passwordHash).not.toBe('secure-password');
    await expect(
      argon2.verify(createInput.passwordHash, 'secure-password'),
    ).resolves.toBe(true);
    expect(createInput.role).toBe(UserRole.RESIDENT);
    expect(createInput.isActive).toBe(true);
    expect(result.user).toEqual(publicUser);
  });

  it('returns conflict for duplicate registration', async () => {
    usersService.findByEmailForAuthentication.mockResolvedValue({
      ...publicUser,
      passwordHash: 'existing-hash',
    });

    await expect(
      service.register({
        name: 'Alex Kumar',
        email: 'alex@example.com',
        password: 'secure-password',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(usersService.createUser).not.toHaveBeenCalled();
  });

  it('logs in with valid credentials', async () => {
    const user = await credentialUser('secure-password');
    usersService.findByEmailForAuthentication.mockResolvedValue(user);

    const result = await service.login({
      email: user.email,
      password: 'secure-password',
    });

    expect(result).toEqual({
      accessToken: 'test-access-token',
      user: publicUser,
    });
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  });

  it.each([
    ['unknown email', null, 'secure-password'],
    ['wrong password', 'user', 'incorrect-password'],
  ])(
    'returns the same unauthorized error for %s',
    async (_case, value, password) => {
      usersService.findByEmailForAuthentication.mockResolvedValue(
        value === null ? null : await credentialUser('secure-password'),
      );

      const request = service.login({ email: 'alex@example.com', password });
      await expect(request).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(request).rejects.toMatchObject({
        message: 'Invalid email or password',
      });
    },
  );

  it('rejects an inactive user with forbidden', async () => {
    const user = {
      ...(await credentialUser('secure-password')),
      isActive: false,
    };
    usersService.findByEmailForAuthentication.mockResolvedValue(user);

    await expect(
      service.login({
        email: user.email,
        password: 'secure-password',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('never includes a password hash in login responses', async () => {
    const user = await credentialUser('secure-password');
    usersService.findByEmailForAuthentication.mockResolvedValue(user);

    const result = await service.login({
      email: user.email,
      password: 'secure-password',
    });

    expect(result.user).not.toHaveProperty('passwordHash');
    expect(JSON.stringify(result)).not.toContain(user.passwordHash);
  });

  async function credentialUser(password: string): Promise<User> {
    return {
      ...publicUser,
      passwordHash: await argon2.hash(password),
    };
  }
});
