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

  it('restricts feedback submission to residents', () => {
    expect(
      Reflect.getMetadata(
        ROLES_KEY,
        MaintenanceRequestsController.prototype.submitFeedback,
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
    'getWorkNote',
    'getParts',
    'getCost',
    'getFeedback',
  ] as const)('allows admins, residents, and technicians on %s', (method) => {
    expect(
      Reflect.getMetadata(
        ROLES_KEY,
        MaintenanceRequestsController.prototype[method],
      ),
    ).toEqual([UserRole.ADMIN, UserRole.RESIDENT, UserRole.TECHNICIAN]);
  });

  it.each(['createWorkNote', 'updateWorkNote', 'addPart'] as const)(
    'restricts %s to technicians',
    (method) => {
      expect(
        Reflect.getMetadata(
          ROLES_KEY,
          MaintenanceRequestsController.prototype[method],
        ),
      ).toEqual([UserRole.TECHNICIAN]);
    },
  );

  it('allows admins and technicians to correct part usage', () => {
    expect(
      Reflect.getMetadata(
        ROLES_KEY,
        MaintenanceRequestsController.prototype.removePart,
      ),
    ).toEqual([UserRole.ADMIN, UserRole.TECHNICIAN]);
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
