import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../generated/prisma/enums.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { DashboardController } from './dashboard.controller.js';

describe('DashboardController authorization', () => {
  const guard = new RolesGuard(new Reflector());
  const methods = [
    'summary',
    'requestsByStatus',
    'requestsByCategory',
    'technicianWorkload',
    'monthlyCost',
    'averageResolutionTime',
    'feedbackSummary',
    'lowStockParts',
  ] as const;
  it.each(methods)('allows only an authenticated admin for %s', (method) => {
    for (const role of [
      UserRole.ADMIN,
      UserRole.RESIDENT,
      UserRole.TECHNICIAN,
      undefined,
    ]) {
      const context = {
        getHandler: () => DashboardController.prototype[method],
        getClass: () => DashboardController,
        switchToHttp: () => ({
          getRequest: () => ({ user: role ? { role } : undefined }),
        }),
      } as unknown as ExecutionContext;
      expect(guard.canActivate(context)).toBe(role === UserRole.ADMIN);
    }
  });
});
