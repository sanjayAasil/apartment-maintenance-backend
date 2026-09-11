import { UserRole } from '../../generated/prisma/enums.js';
import { ROLES_KEY } from '../auth/decorators/roles.decorator.js';
import { TechniciansController } from './technicians.controller.js';

describe('TechniciansController authorization', () => {
  it.each([
    'create',
    'list',
    'findAvailable',
    'getById',
    'update',
    'updateStatus',
    'listSkills',
    'addSkill',
    'removeSkill',
  ] as const)('%s requires ADMIN', (method) => {
    expect(
      Reflect.getMetadata(ROLES_KEY, TechniciansController.prototype[method]),
    ).toEqual([UserRole.ADMIN]);
  });

  it('getCurrent requires TECHNICIAN', () => {
    expect(
      Reflect.getMetadata(
        ROLES_KEY,
        TechniciansController.prototype.getCurrent,
      ),
    ).toEqual([UserRole.TECHNICIAN]);
  });

  it('availability permits ADMIN and TECHNICIAN before service ownership checks', () => {
    expect(
      Reflect.getMetadata(
        ROLES_KEY,
        TechniciansController.prototype.updateAvailability,
      ),
    ).toEqual([UserRole.ADMIN, UserRole.TECHNICIAN]);
  });
});
