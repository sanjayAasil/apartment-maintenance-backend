import { PrismaService } from '../../prisma/prisma.service.js';
import { DashboardRepository } from './dashboard.repository.js';

describe('DashboardRepository', () => {
  const prisma = {
    $queryRaw: vi.fn(),
    maintenanceRequest: { groupBy: vi.fn() },
    maintenanceCategory: { findMany: vi.fn() },
    feedback: { groupBy: vi.fn() },
  };
  const repository = new DashboardRepository(
    prisma as unknown as PrismaService,
  );
  const range = { from: new Date('2026-09-01'), to: new Date('2026-10-01') };
  beforeEach(() => vi.resetAllMocks());
  it('aggregates historical usage prices and recorded costs in PostgreSQL', async () => {
    prisma.$queryRaw.mockResolvedValue([
      { partsCost: 100.25, laborCost: 50, otherCost: 10.1 },
    ]);
    expect(await repository.calculateCost(range)).toEqual({
      partsCost: 100.25,
      laborCost: 50,
      otherCost: 10.1,
      totalCost: 160.35,
    });
    const sql = prisma.$queryRaw.mock.calls[0][0];
    expect(sql.sql).toContain('SUM(quantity * "unitPrice")');
    expect(sql.sql).toContain('SUM("laborCost")');
    expect(sql.values).toContain(range.from);
    expect(sql.values).toContain(range.to);
  });
  it('averages only resolved/closed records and preserves null for empty periods', async () => {
    prisma.$queryRaw.mockResolvedValue([
      { averageMinutes: 420, resolvedRequests: 2 },
    ]);
    expect(await repository.calculateAverageResolutionTime(range)).toEqual({
      averageMinutes: 420,
      averageHours: 7,
      resolvedRequests: 2,
    });
    expect(prisma.$queryRaw.mock.calls[0][0].sql).toContain(
      "status IN ('RESOLVED', 'CLOSED')",
    );
    prisma.$queryRaw.mockResolvedValue([
      { averageMinutes: null, resolvedRequests: 0 },
    ]);
    expect(
      (await repository.calculateAverageResolutionTime(range)).averageHours,
    ).toBeNull();
  });
  it('counts active workload separately from final-assignment resolutions', async () => {
    const result = [
      {
        technicianId: 't',
        name: 'Ravi',
        activeAssignments: 3,
        inProgressRequests: 2,
        resolvedCount: 5,
        isAvailable: true,
        isActive: true,
      },
    ];
    prisma.$queryRaw.mockResolvedValue(result);
    expect(await repository.getTechnicianWorkload(range)).toEqual(result);
    const sql = prisma.$queryRaw.mock.calls[0][0].sql;
    expect(sql).toContain("r.status IN ('ASSIGNED', 'IN_PROGRESS')");
    expect(sql).toContain(
      "a.\"isActive\" AND r.status IN ('RESOLVED', 'CLOSED')",
    );
    expect(sql).toContain('LEFT JOIN');
  });
  it('groups categories in the database and resolves names without loading requests', async () => {
    prisma.maintenanceRequest.groupBy.mockResolvedValue([
      { categoryId: 'a', _count: { _all: 2 } },
      { categoryId: 'b', _count: { _all: 5 } },
    ]);
    prisma.maintenanceCategory.findMany.mockResolvedValue([
      { id: 'a', name: 'Plumbing' },
      { id: 'b', name: 'Electrical' },
    ]);
    expect(await repository.countRequestsByCategory(range)).toEqual([
      { categoryId: 'b', categoryName: 'Electrical', count: 5 },
      { categoryId: 'a', categoryName: 'Plumbing', count: 2 },
    ]);
    expect(prisma.maintenanceRequest.groupBy).toHaveBeenCalledWith({
      by: ['categoryId'],
      where: { createdAt: { gte: range.from, lt: range.to } },
      _count: { _all: true },
    });
  });
});
