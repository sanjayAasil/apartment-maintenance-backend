import { UserRole } from '../../generated/prisma/enums.js';
import { ROLES_KEY } from '../auth/decorators/roles.decorator.js';
import { PartsController } from './parts.controller.js';

describe('PartsController authorization', () => {
  it.each([
    'create',
    'update',
    'updateStatus',
    'setStock',
    'lowStock',
  ] as const)('%s requires ADMIN', (method) => {
    expect(
      Reflect.getMetadata(ROLES_KEY, PartsController.prototype[method]),
    ).toEqual([UserRole.ADMIN]);
  });

  it.each(['list', 'getById'] as const)(
    '%s permits admins and technicians',
    (method) => {
      expect(
        Reflect.getMetadata(ROLES_KEY, PartsController.prototype[method]),
      ).toEqual([UserRole.ADMIN, UserRole.TECHNICIAN]);
    },
  );
});
