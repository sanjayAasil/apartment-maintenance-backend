import { UserRole } from '../../generated/prisma/enums.js';
import { ROLES_KEY } from '../auth/decorators/roles.decorator.js';
import { MaintenanceCategoriesController } from './maintenance-categories.controller.js';

describe('MaintenanceCategoriesController authorization', () => {
  it.each(['create', 'update', 'updateStatus'] as const)(
    '%s requires ADMIN',
    (method) => {
      expect(
        Reflect.getMetadata(
          ROLES_KEY,
          MaintenanceCategoriesController.prototype[method],
        ),
      ).toEqual([UserRole.ADMIN]);
    },
  );

  it.each(['list', 'getById'] as const)(
    '%s is available to authenticated roles',
    (method) => {
      expect(
        Reflect.getMetadata(
          ROLES_KEY,
          MaintenanceCategoriesController.prototype[method],
        ),
      ).toBeUndefined();
    },
  );
});
