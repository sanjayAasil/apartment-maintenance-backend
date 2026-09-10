import { ROLES_KEY } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { ApartmentsController } from './apartments.controller.js';

describe('ApartmentsController authorization', () => {
  it('allows authenticated users to list and get apartments', () => {
    expect(
      Reflect.getMetadata(ROLES_KEY, ApartmentsController.prototype.list),
    ).toBeUndefined();
    expect(
      Reflect.getMetadata(ROLES_KEY, ApartmentsController.prototype.getById),
    ).toBeUndefined();
  });

  it('restricts create and update to admins', () => {
    expect(
      Reflect.getMetadata(ROLES_KEY, ApartmentsController.prototype.create),
    ).toEqual([UserRole.ADMIN]);
    expect(
      Reflect.getMetadata(ROLES_KEY, ApartmentsController.prototype.update),
    ).toEqual([UserRole.ADMIN]);
  });
});
