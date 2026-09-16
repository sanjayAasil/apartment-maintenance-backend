import { BadRequestException } from '@nestjs/common';
import { MaintenanceStatus } from '../../generated/prisma/enums.js';
import { PartsService } from '../parts/parts.service.js';
import { DashboardRepository } from './dashboard.repository.js';
import { DashboardService } from './dashboard.service.js';

describe('DashboardService', () => {
  const repository = {
    summary: vi.fn(),
    countRequestsByStatus: vi.fn(),
    countRequestsByCategory: vi.fn(),
    getTechnicianWorkload: vi.fn(),
    calculateCost: vi.fn(),
    calculateAverageResolutionTime: vi.fn(),
    getFeedbackSummary: vi.fn(),
  };
  const parts = { lowStock: vi.fn() };
  const service = new DashboardService(
    repository as unknown as DashboardRepository,
    parts as unknown as PartsService,
  );
  const query = { from: '2026-09-01', to: '2026-09-30' };
  const range = {
    from: new Date('2026-09-01T00:00:00Z'),
    to: new Date('2026-10-01T00:00:00Z'),
  };
  beforeEach(() => vi.resetAllMocks());
  afterEach(() => vi.useRealTimers());

  it('defaults every period report to the current UTC month', () => {
    expect(
      service.normalizeRange({}, new Date('2026-09-16T23:30:00Z')),
    ).toEqual(range);
  });
  it('uses inclusive dates including single-day and leap-day ranges', () => {
    expect(service.normalizeRange(query)).toEqual(range);
    expect(
      service.normalizeRange({ from: '2024-02-29', to: '2024-02-29' }),
    ).toEqual({
      from: new Date('2024-02-29T00:00:00Z'),
      to: new Date('2024-03-01T00:00:00Z'),
    });
  });
  it.each([
    { from: '2026-09-01' },
    { to: '2026-09-01' },
    { from: '2026-09-30', to: '2026-09-01' },
    { from: '2026-02-30', to: '2026-03-01' },
    { from: 'bad', to: 'bad' },
  ])('rejects invalid ranges %j', (input) => {
    expect(() => service.normalizeRange(input)).toThrow(BadRequestException);
  });
  it('combines live request counts with reused low-stock totals', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-16T12:00:00Z'));
    repository.summary.mockResolvedValue({
      statuses: [
        { status: MaintenanceStatus.OPEN, _count: { _all: 3 } },
        { status: MaintenanceStatus.CLOSED, _count: { _all: 2 } },
      ],
      urgentRequests: 1,
      resolvedToday: 2,
      closedThisMonth: 2,
      activeTechnicians: 6,
      availableTechnicians: 4,
      activeResidents: 8,
    });
    parts.lowStock.mockResolvedValue({ data: [], meta: { total: 5 } });
    expect(await service.getDashboardSummary()).toEqual({
      totalRequests: 5,
      openRequests: 3,
      assignedRequests: 0,
      inProgressRequests: 0,
      urgentRequests: 1,
      resolvedToday: 2,
      closedThisMonth: 2,
      activeTechnicians: 6,
      availableTechnicians: 4,
      activeResidents: 8,
      lowStockParts: 5,
    });
    expect(repository.summary).toHaveBeenCalledWith(
      {
        from: new Date('2026-09-16T00:00:00Z'),
        to: new Date('2026-09-17T00:00:00Z'),
      },
      range,
    );
    expect(parts.lowStock).toHaveBeenCalledWith(1, 1);
  });
  it('fills missing statuses with zero', async () => {
    repository.countRequestsByStatus.mockResolvedValue([
      { status: MaintenanceStatus.OPEN, _count: { _all: 3 } },
    ]);
    const result = await service.getRequestsByStatus(query);
    expect(result).toHaveLength(Object.values(MaintenanceStatus).length);
    expect(
      result.find((item) => item.status === MaintenanceStatus.OPEN)?.count,
    ).toBe(3);
    expect(
      result.find((item) => item.status === MaintenanceStatus.CANCELLED)?.count,
    ).toBe(0);
    expect(repository.countRequestsByStatus).toHaveBeenCalledWith(range);
  });
  it('forwards the same normalized range to category, workload, cost and resolution', async () => {
    repository.countRequestsByCategory.mockResolvedValue([
      { categoryId: 'category', categoryName: 'Plumbing', count: 2 },
    ]);
    repository.getTechnicianWorkload.mockResolvedValue([
      { technicianId: 'technician', activeAssignments: 3 },
    ]);
    repository.calculateCost.mockResolvedValue({
      partsCost: 20,
      laborCost: 10,
      otherCost: 5,
      totalCost: 35,
    });
    repository.calculateAverageResolutionTime.mockResolvedValue({
      averageMinutes: null,
      averageHours: null,
      resolvedRequests: 0,
    });
    expect((await service.getRequestsByCategory(query))[0].count).toBe(2);
    expect(
      (await service.getTechnicianWorkload(query))[0].activeAssignments,
    ).toBe(3);
    expect((await service.getMaintenanceCostSummary(query)).totalCost).toBe(35);
    expect(await service.getAverageResolutionTime(query)).toEqual({
      averageMinutes: null,
      averageHours: null,
      resolvedRequests: 0,
    });
    for (const method of [
      repository.countRequestsByCategory,
      repository.getTechnicianWorkload,
      repository.calculateCost,
      repository.calculateAverageResolutionTime,
    ])
      expect(method).toHaveBeenCalledWith(range);
  });
  it('calculates weighted feedback average and distribution', async () => {
    repository.getFeedbackSummary.mockResolvedValue([
      { rating: 1, _count: { _all: 1 } },
      { rating: 5, _count: { _all: 3 } },
    ]);
    expect(await service.getFeedbackSummary(query)).toEqual({
      totalFeedback: 4,
      averageRating: 4,
      ratings: { '1': 1, '2': 0, '3': 0, '4': 0, '5': 3 },
    });
    expect(repository.getFeedbackSummary).toHaveBeenCalledWith(range);
    repository.getFeedbackSummary.mockResolvedValue([]);
    expect((await service.getFeedbackSummary(query)).averageRating).toBeNull();
  });
  it('reuses PartsService for the low-stock list', async () => {
    parts.lowStock.mockResolvedValue({ data: [], meta: { total: 0 } });
    await service.getLowStockParts();
    expect(parts.lowStock).toHaveBeenCalledWith(1, 100);
  });
});
