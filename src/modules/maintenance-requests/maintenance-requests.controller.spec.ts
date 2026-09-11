import { ROLES_KEY } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { MaintenanceRequestsController } from './maintenance-requests.controller.js';

describe('MaintenanceRequestsController authorization', () => {
  it('restricts create to residents', () => {
    expect(
      Reflect.getMetadata(
        ROLES_KEY,
        MaintenanceRequestsController.prototype.create,
      ),
    ).toEqual([UserRole.RESIDENT]);
  });

  it.each(['list', 'getById', 'update', 'updateStatus'] as const)(
    'allows admins and residents on %s while excluding technicians',
    (method) => {
      expect(
        Reflect.getMetadata(
          ROLES_KEY,
          MaintenanceRequestsController.prototype[method],
        ),
      ).toEqual([UserRole.ADMIN, UserRole.RESIDENT]);
    },
  );
});
