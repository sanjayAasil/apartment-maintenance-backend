import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import {
  MaintenancePriority,
  MaintenanceStatus,
} from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type {
  DashboardRange,
  MaintenanceCostSummary,
  ResolutionTimeSummary,
  TechnicianWorkload,
} from './dashboard.types.js';

const activeStatuses = [
  MaintenanceStatus.OPEN,
  MaintenanceStatus.ASSIGNED,
  MaintenanceStatus.IN_PROGRESS,
];

@Injectable()
export class DashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async summary(today: DashboardRange, month: DashboardRange) {
    const [
      statuses,
      urgentRequests,
      resolvedToday,
      closedThisMonth,
      activeTechnicians,
      availableTechnicians,
      activeResidents,
    ] = await this.prisma.$transaction([
      this.prisma.maintenanceRequest.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.maintenanceRequest.count({
        where: {
          priority: MaintenancePriority.URGENT,
          status: { in: activeStatuses },
        },
      }),
      this.prisma.maintenanceRequest.count({
        where: {
          resolvedAt: { gte: today.from, lt: today.to },
          status: {
            in: [MaintenanceStatus.RESOLVED, MaintenanceStatus.CLOSED],
          },
        },
      }),
      this.prisma.maintenanceRequest.count({
        where: {
          status: MaintenanceStatus.CLOSED,
          closedAt: { gte: month.from, lt: month.to },
        },
      }),
      this.prisma.technician.count({
        where: { isActive: true, user: { isActive: true } },
      }),
      this.prisma.technician.count({
        where: { isActive: true, isAvailable: true, user: { isActive: true } },
      }),
      this.prisma.resident.count({
        where: { isActive: true, user: { isActive: true } },
      }),
    ]);
    return {
      statuses,
      urgentRequests,
      resolvedToday,
      closedThisMonth,
      activeTechnicians,
      availableTechnicians,
      activeResidents,
    };
  }

  countRequestsByStatus(range: DashboardRange) {
    return this.prisma.maintenanceRequest.groupBy({
      by: ['status'],
      where: { createdAt: { gte: range.from, lt: range.to } },
      _count: { _all: true },
    });
  }

  async countRequestsByCategory(range: DashboardRange) {
    const counts = await this.prisma.maintenanceRequest.groupBy({
      by: ['categoryId'],
      where: { createdAt: { gte: range.from, lt: range.to } },
      _count: { _all: true },
    });
    const categories = await this.prisma.maintenanceCategory.findMany({
      where: { id: { in: counts.map((item) => item.categoryId) } },
      select: { id: true, name: true },
    });
    const names = new Map(categories.map((item) => [item.id, item.name]));
    return counts
      .map((item) => ({
        categoryId: item.categoryId,
        categoryName: names.get(item.categoryId)!,
        count: item._count._all,
      }))
      .sort(
        (a, b) =>
          b.count - a.count || a.categoryName.localeCompare(b.categoryName),
      );
  }

  getTechnicianWorkload(range: DashboardRange): Promise<TechnicianWorkload[]> {
    return this.prisma.$queryRaw<TechnicianWorkload[]>(Prisma.sql`
      SELECT t.id AS "technicianId", u.name,
        (COUNT(a.id) FILTER (WHERE a."isActive" AND r.status IN ('ASSIGNED', 'IN_PROGRESS')))::int AS "activeAssignments",
        (COUNT(a.id) FILTER (WHERE a."isActive" AND r.status = 'IN_PROGRESS'))::int AS "inProgressRequests",
        (COUNT(a.id) FILTER (WHERE a."isActive" AND r.status IN ('RESOLVED', 'CLOSED') AND r."resolvedAt" >= ${range.from} AND r."resolvedAt" < ${range.to}))::int AS "resolvedCount",
        t."isAvailable", t."isActive"
      FROM "Technician" t JOIN "User" u ON u.id = t."userId"
      LEFT JOIN "MaintenanceAssignment" a ON a."technicianId" = t.id
      LEFT JOIN "MaintenanceRequest" r ON r.id = a."maintenanceRequestId"
      GROUP BY t.id, u.name ORDER BY "activeAssignments" DESC, u.name, t.id
    `);
  }

  async calculateCost(range: DashboardRange): Promise<MaintenanceCostSummary> {
    const [cost] = await this.prisma.$queryRaw<
      MaintenanceCostSummary[]
    >(Prisma.sql`
      SELECT
        COALESCE((SELECT SUM(quantity * "unitPrice") FROM "MaintenanceRequestPart" WHERE "createdAt" >= ${range.from} AND "createdAt" < ${range.to}), 0)::float8 AS "partsCost",
        COALESCE(SUM("laborCost"), 0)::float8 AS "laborCost",
        COALESCE(SUM("otherCost"), 0)::float8 AS "otherCost"
      FROM "MaintenanceWorkNote" WHERE "createdAt" >= ${range.from} AND "createdAt" < ${range.to}
    `);
    return {
      ...cost,
      totalCost: Number(
        (cost.partsCost + cost.laborCost + cost.otherCost).toFixed(2),
      ),
    };
  }

  async calculateAverageResolutionTime(
    range: DashboardRange,
  ): Promise<ResolutionTimeSummary> {
    const [result] = await this.prisma.$queryRaw<
      { averageMinutes: number | null; resolvedRequests: number }[]
    >(Prisma.sql`
      SELECT AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")) / 60)::float8 AS "averageMinutes", COUNT(*)::int AS "resolvedRequests"
      FROM "MaintenanceRequest" WHERE status IN ('RESOLVED', 'CLOSED')
        AND "resolvedAt" >= ${range.from} AND "resolvedAt" < ${range.to} AND "resolvedAt" >= "createdAt"
    `);
    return {
      ...result,
      averageHours:
        result.averageMinutes === null ? null : result.averageMinutes / 60,
    };
  }

  getFeedbackSummary(range: DashboardRange) {
    return this.prisma.feedback.groupBy({
      by: ['rating'],
      where: { createdAt: { gte: range.from, lt: range.to } },
      _count: { _all: true },
    });
  }
}
