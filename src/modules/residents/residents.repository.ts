import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type {
  PaginatedResidents,
  ResidentFilters,
  ResidentWithRelations,
} from './residents.types.js';
import { residentSelect } from './residents.types.js';

@Injectable()
export class ResidentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    data: Prisma.ResidentUncheckedCreateInput,
  ): Promise<ResidentWithRelations> {
    return this.prisma.resident.create({ data, select: residentSelect });
  }

  findById(id: string): Promise<ResidentWithRelations | null> {
    return this.prisma.resident.findUnique({
      where: { id },
      select: residentSelect,
    });
  }

  findByUserId(userId: string): Promise<ResidentWithRelations | null> {
    return this.prisma.resident.findUnique({
      where: { userId },
      select: residentSelect,
    });
  }

  async findMany(filters: ResidentFilters): Promise<PaginatedResidents> {
    const { search, apartmentId, isActive, page, limit } = filters;
    const where: Prisma.ResidentWhereInput = {
      apartmentId,
      isActive,
      ...(search
        ? {
            user: {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.resident.findMany({
        where,
        select: residentSelect,
        orderBy: [{ user: { name: 'asc' } }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.resident.count({ where }),
    ]);

    return { data, meta: { page, limit, total } };
  }

  update(
    id: string,
    data: Prisma.ResidentUpdateInput,
  ): Promise<ResidentWithRelations> {
    return this.prisma.resident.update({
      where: { id },
      data,
      select: residentSelect,
    });
  }

  updateApartment(
    id: string,
    apartmentId: string,
  ): Promise<ResidentWithRelations> {
    return this.prisma.resident.update({
      where: { id },
      data: { apartment: { connect: { id: apartmentId } } },
      select: residentSelect,
    });
  }

  updateStatus(id: string, isActive: boolean): Promise<ResidentWithRelations> {
    return this.prisma.resident.update({
      where: { id },
      data: { isActive },
      select: residentSelect,
    });
  }
}
