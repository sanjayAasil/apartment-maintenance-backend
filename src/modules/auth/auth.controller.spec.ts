import type { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { UserRole } from '../../generated/prisma/enums.js';
import type { PublicUser } from '../users/users.types.js';

describe('AuthController', () => {
  it('/auth/me returns the authenticated public user', () => {
    const controller = new AuthController({} as AuthService);
    const user: PublicUser = {
      id: '30ef9323-decf-4159-b31d-e649cefa2fd8',
      name: 'Alex Kumar',
      email: 'alex@example.com',
      role: UserRole.RESIDENT,
      isActive: true,
      createdAt: new Date('2026-09-09T00:00:00.000Z'),
      updatedAt: new Date('2026-09-09T00:00:00.000Z'),
    };

    expect(controller.getCurrentUser(user)).toBe(user);
    expect(controller.getCurrentUser(user)).not.toHaveProperty('passwordHash');
  });
});
