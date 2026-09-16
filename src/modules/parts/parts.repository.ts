import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  partSelect,
  type PaginatedParts,
  type PartFilters,
  type PartRecord,
} from './parts.types.js';

@Injectable()
export class PartsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.PartCreateInput): Promise<PartRecord> {
    return this.prisma.part.create({ data, select: partSelect });
  }

  findById(id: string): Promise<PartRecord | null> {
    return this.prisma.part.findUnique({ where: { id }, select: partSelect });
  }

  findByName(name: string): Promise<PartRecord | null> {
    return this.prisma.part.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
      select: partSelect,
    });
  }

  async findMany(filters: PartFilters): Promise<PaginatedParts> {
    const where: Prisma.PartWhereInput = {
      isActive: filters.isActive,
      ...(filters.lowStock === undefined
        ? {}
        : {
            quantity: filters.lowStock
              ? { lte: this.prisma.part.fields.minimumStock }
              : { gt: this.prisma.part.fields.minimumStock },
          }),
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: 'insensitive' } },
              {
                description: {
                  contains: filters.search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.part.findMany({
        where,
        select: partSelect,
        orderBy: { name: 'asc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      this.prisma.part.count({ where }),
    ]);
    return {
      data,
      meta: { page: filters.page, limit: filters.limit, total },
    };
  }

  update(id: string, data: Prisma.PartUpdateInput): Promise<PartRecord> {
    return this.prisma.part.update({ where: { id }, data, select: partSelect });
  }
}
