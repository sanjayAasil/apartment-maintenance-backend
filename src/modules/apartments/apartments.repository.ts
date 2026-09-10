import { Injectable } from '@nestjs/common';
import { Prisma, type Apartment } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type {
  ApartmentFilters,
  PaginatedApartments,
} from './apartments.types.js';

@Injectable()
export class ApartmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.ApartmentCreateInput): Promise<Apartment> {
    return this.prisma.apartment.create({ data });
  }

  findById(id: string): Promise<Apartment | null> {
    return this.prisma.apartment.findUnique({ where: { id } });
  }

  findByBlockAndUnitNumber(
    block: string,
    unitNumber: string,
  ): Promise<Apartment | null> {
    return this.prisma.apartment.findUnique({
      where: { block_unitNumber: { block, unitNumber } },
    });
  }

  async findMany(filters: ApartmentFilters): Promise<PaginatedApartments> {
    const { block, floor, search, page, limit } = filters;
    const where: Prisma.ApartmentWhereInput = {
      ...(block ? { block: { equals: block, mode: 'insensitive' } } : {}),
      floor,
      ...(search
        ? {
            OR: [
              { block: { contains: search, mode: 'insensitive' } },
              { unitNumber: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.apartment.findMany({
        where,
        orderBy: [{ block: 'asc' }, { floor: 'asc' }, { unitNumber: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.apartment.count({ where }),
    ]);

    return { data, meta: { page, limit, total } };
  }

  update(id: string, data: Prisma.ApartmentUpdateInput): Promise<Apartment> {
    return this.prisma.apartment.update({ where: { id }, data });
  }
}
