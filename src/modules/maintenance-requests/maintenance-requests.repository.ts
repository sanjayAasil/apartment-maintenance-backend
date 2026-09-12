import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { MaintenanceHistoryAction } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  maintenanceRequestSelect,
  type MaintenanceHistoryEvent,
  type MaintenanceRequestFilters,
  type MaintenanceRequestWithRelations,
  type PaginatedMaintenanceRequests,
} from './maintenance-requests.types.js';

@Injectable()
export class MaintenanceRequestsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    data: Prisma.MaintenanceRequestUncheckedCreateInput,
    actorUserId: string,
  ): Promise<MaintenanceRequestWithRelations> {
    return this.prisma.$transaction(async (transaction) => {
      const request = await transaction.maintenanceRequest.create({
        data,
        select: maintenanceRequestSelect,
      });
      await transaction.maintenanceHistory.create({
        data: {
          maintenanceRequestId: request.id,
          userId: actorUserId,
          action: MaintenanceHistoryAction.REQUEST_CREATED,
        },
      });
      return request;
    });
  }

  findById(id: string): Promise<MaintenanceRequestWithRelations | null> {
    return this.prisma.maintenanceRequest.findUnique({
      where: { id },
      select: maintenanceRequestSelect,
    });
  }

  async findMany(
    filters: MaintenanceRequestFilters,
  ): Promise<PaginatedMaintenanceRequests> {
    const {
      search,
      status,
      priority,
      categoryId,
      apartmentId,
      residentId,
      technicianId,
      page,
      limit,
      sortBy,
      sortOrder,
    } = filters;
    const where: Prisma.MaintenanceRequestWhereInput = {
      status,
      priority,
      categoryId,
      apartmentId,
      residentId,
      ...(technicianId
        ? { assignments: { some: { technicianId, isActive: true } } }
        : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              {
                resident: {
                  user: { name: { contains: search, mode: 'insensitive' } },
                },
              },
              {
                resident: {
                  user: { email: { contains: search, mode: 'insensitive' } },
                },
              },
            ],
          }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.maintenanceRequest.findMany({
        where,
        select: maintenanceRequestSelect,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.maintenanceRequest.count({ where }),
    ]);
    return { data, meta: { page, limit, total } };
  }

  update(
    id: string,
    data: Prisma.MaintenanceRequestUpdateInput,
    audit?: { actorUserId: string; events: MaintenanceHistoryEvent[] },
  ): Promise<MaintenanceRequestWithRelations> {
    if (!audit?.events.length) {
      return this.prisma.maintenanceRequest.update({
        where: { id },
        data,
        select: maintenanceRequestSelect,
      });
    }
    return this.prisma.$transaction(async (transaction) => {
      const request = await transaction.maintenanceRequest.update({
        where: { id },
        data,
        select: maintenanceRequestSelect,
      });
      await transaction.maintenanceHistory.createMany({
        data: audit.events.map((event) => ({
          maintenanceRequestId: id,
          userId: audit.actorUserId,
          action: event.action,
          oldValue: event.oldValue,
          newValue: event.newValue,
          metadata: event.metadata,
        })),
      });
      return request;
    });
  }
}
