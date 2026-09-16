import { BadRequestException, Injectable } from '@nestjs/common';
import { MaintenanceStatus } from '../../generated/prisma/enums.js';
import { PartsService } from '../parts/parts.service.js';
import type { DashboardQueryDto } from './dto/dashboard-query.dto.js';
import { DashboardRepository } from './dashboard.repository.js';
import type { DashboardRange, FeedbackSummary } from './dashboard.types.js';

@Injectable()
export class DashboardService {
  constructor(
    private readonly repository: DashboardRepository,
    private readonly parts: PartsService,
  ) {}

  normalizeRange(query: DashboardQueryDto, now = new Date()): DashboardRange {
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const monthEnd = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0),
    );
    const parse = (value: string): Date => {
      const date = new Date(`${value}T00:00:00.000Z`);
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== value
      ) {
        throw new BadRequestException(
          'Report dates must be valid YYYY-MM-DD values',
        );
      }
      return date;
    };
    if (Boolean(query.from) !== Boolean(query.to)) {
      throw new BadRequestException('Supply both from and to dates');
    }
    const from = query.from ? parse(query.from) : monthStart;
    const end = query.to ? parse(query.to) : monthEnd;
    if (from > end) throw new BadRequestException('from must not be after to');
    return { from, to: new Date(end.getTime() + 86400000) };
  }

  async getDashboardSummary() {
    const now = new Date();
    const today = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const [result, stock] = await Promise.all([
      this.repository.summary(
        { from: today, to: new Date(today.getTime() + 86400000) },
        this.normalizeRange({}, now),
      ),
      this.parts.lowStock(1, 1),
    ]);
    const counts = new Map(
      result.statuses.map((item) => [item.status, item._count._all]),
    );
    const { statuses: _statuses, ...metrics } = result;
    return {
      ...metrics,
      totalRequests: result.statuses.reduce(
        (sum, item) => sum + item._count._all,
        0,
      ),
      openRequests: counts.get(MaintenanceStatus.OPEN) ?? 0,
      assignedRequests: counts.get(MaintenanceStatus.ASSIGNED) ?? 0,
      inProgressRequests: counts.get(MaintenanceStatus.IN_PROGRESS) ?? 0,
      lowStockParts: stock.meta.total,
    };
  }

  async getRequestsByStatus(query: DashboardQueryDto) {
    const counts = await this.repository.countRequestsByStatus(
      this.normalizeRange(query),
    );
    return Object.values(MaintenanceStatus).map((status) => ({
      status,
      count: counts.find((item) => item.status === status)?._count._all ?? 0,
    }));
  }
  getRequestsByCategory(query: DashboardQueryDto) {
    return this.repository.countRequestsByCategory(this.normalizeRange(query));
  }
  getTechnicianWorkload(query: DashboardQueryDto) {
    return this.repository.getTechnicianWorkload(this.normalizeRange(query));
  }
  getMaintenanceCostSummary(query: DashboardQueryDto) {
    return this.repository.calculateCost(this.normalizeRange(query));
  }
  getAverageResolutionTime(query: DashboardQueryDto) {
    return this.repository.calculateAverageResolutionTime(
      this.normalizeRange(query),
    );
  }
  async getFeedbackSummary(query: DashboardQueryDto): Promise<FeedbackSummary> {
    const groups = await this.repository.getFeedbackSummary(
      this.normalizeRange(query),
    );
    const ratings: Record<string, number> = {
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0,
    };
    let totalFeedback = 0;
    let weightedRating = 0;
    for (const group of groups) {
      ratings[String(group.rating)] = group._count._all;
      totalFeedback += group._count._all;
      weightedRating += group.rating * group._count._all;
    }
    return {
      totalFeedback,
      averageRating:
        totalFeedback === 0
          ? null
          : Number((weightedRating / totalFeedback).toFixed(2)),
      ratings,
    };
  }
  getLowStockParts() {
    return this.parts.lowStock(1, 100);
  }
}
