import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  maintenanceRequestSelect,
  type MaintenanceRequestFilters,
  type MaintenanceRequestWithRelations,
  type PaginatedMaintenanceRequests,
} from './maintenance-requests.types.js';

@Injectable()
export class MaintenanceRequestsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    data: Prisma.MaintenanceRequestUncheckedCreateInput,
  ): Promise<MaintenanceRequestWithRelations> {
    return this.prisma.maintenanceRequest.create({
      data,
      select: maintenanceRequestSelect,
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
  ): Promise<MaintenanceRequestWithRelations> {
    return this.prisma.maintenanceRequest.update({
      where: { id },
      data,
      select: maintenanceRequestSelect,
    });
  }
}
