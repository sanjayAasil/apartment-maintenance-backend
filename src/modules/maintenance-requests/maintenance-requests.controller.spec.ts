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

  it.each([
    'list',
    'getById',
    'updateStatus',
    'getCurrentAssignment',
    'addComment',
    'getComments',
    'getHistory',
  ] as const)('allows admins, residents, and technicians on %s', (method) => {
    expect(
      Reflect.getMetadata(
        ROLES_KEY,
        MaintenanceRequestsController.prototype[method],
      ),
    ).toEqual([UserRole.ADMIN, UserRole.RESIDENT, UserRole.TECHNICIAN]);
  });

  it('keeps detail editing restricted to admins and residents', () => {
    expect(
      Reflect.getMetadata(
        ROLES_KEY,
        MaintenanceRequestsController.prototype.update,
      ),
    ).toEqual([UserRole.ADMIN, UserRole.RESIDENT]);
  });

  it.each([
    'assignTechnician',
    'reassignTechnician',
    'unassignTechnician',
    'getAssignmentHistory',
  ] as const)('restricts %s to admins', (method) => {
    expect(
      Reflect.getMetadata(
        ROLES_KEY,
        MaintenanceRequestsController.prototype[method],
      ),
    ).toEqual([UserRole.ADMIN]);
  });
});
