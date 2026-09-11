import { UserRole } from '../../generated/prisma/enums.js';
import { ROLES_KEY } from '../auth/decorators/roles.decorator.js';
import { ResidentsController } from './residents.controller.js';

describe('ResidentsController authorization', () => {
  const adminMethods = [
    'create',
    'list',
    'getById',
    'update',
    'changeApartment',
    'updateStatus',
  ] as const;

  it.each(adminMethods)('%s requires ADMIN', (method) => {
    expect(
      Reflect.getMetadata(ROLES_KEY, ResidentsController.prototype[method]),
    ).toEqual([UserRole.ADMIN]);
  });

  it('getCurrent requires RESIDENT', () => {
    expect(
      Reflect.getMetadata(ROLES_KEY, ResidentsController.prototype.getCurrent),
    ).toEqual([UserRole.RESIDENT]);
  });
});
