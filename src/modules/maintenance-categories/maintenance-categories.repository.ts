import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  maintenanceCategorySelect,
  type MaintenanceCategoryFilters,
  type MaintenanceCategoryRecord,
  type PaginatedMaintenanceCategories,
} from './maintenance-categories.types.js';

@Injectable()
export class MaintenanceCategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    data: Prisma.MaintenanceCategoryCreateInput,
  ): Promise<MaintenanceCategoryRecord> {
    return this.prisma.maintenanceCategory.create({
      data,
      select: maintenanceCategorySelect,
    });
  }

  findById(id: string): Promise<MaintenanceCategoryRecord | null> {
    return this.prisma.maintenanceCategory.findUnique({
      where: { id },
      select: maintenanceCategorySelect,
    });
  }

  findByName(name: string): Promise<MaintenanceCategoryRecord | null> {
    return this.prisma.maintenanceCategory.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
      select: maintenanceCategorySelect,
    });
  }

  async findMany(
    filters: MaintenanceCategoryFilters,
  ): Promise<PaginatedMaintenanceCategories> {
    const { search, isActive, page, limit } = filters;
    const where: Prisma.MaintenanceCategoryWhereInput = {
      isActive,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.maintenanceCategory.findMany({
        where,
        select: maintenanceCategorySelect,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.maintenanceCategory.count({ where }),
    ]);
    return { data, meta: { page, limit, total } };
  }

  update(
    id: string,
    data: Prisma.MaintenanceCategoryUpdateInput,
  ): Promise<MaintenanceCategoryRecord> {
    return this.prisma.maintenanceCategory.update({
      where: { id },
      data,
      select: maintenanceCategorySelect,
    });
  }

  setActiveStatus(
    id: string,
    isActive: boolean,
  ): Promise<MaintenanceCategoryRecord> {
    return this.update(id, { isActive });
  }
}
