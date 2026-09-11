import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  technicianSelect,
  technicianSkillSelect,
  type PaginatedTechnicians,
  type TechnicianFilters,
  type TechnicianSkillWithCategory,
  type TechnicianWithRelations,
} from './technicians.types.js';

@Injectable()
export class TechniciansRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    data: Prisma.TechnicianUncheckedCreateInput,
  ): Promise<TechnicianWithRelations> {
    return this.prisma.technician.create({ data, select: technicianSelect });
  }

  findById(id: string): Promise<TechnicianWithRelations | null> {
    return this.prisma.technician.findUnique({
      where: { id },
      select: technicianSelect,
    });
  }

  findByUserId(userId: string): Promise<TechnicianWithRelations | null> {
    return this.prisma.technician.findUnique({
      where: { userId },
      select: technicianSelect,
    });
  }

  async findMany(filters: TechnicianFilters): Promise<PaginatedTechnicians> {
    const { search, isActive, isAvailable, categoryId, page, limit } = filters;
    const where: Prisma.TechnicianWhereInput = {
      isActive,
      isAvailable,
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
      ...(categoryId ? { skills: { some: { categoryId } } } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.technician.findMany({
        where,
        select: technicianSelect,
        orderBy: [{ user: { name: 'asc' } }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.technician.count({ where }),
    ]);
    return { data, meta: { page, limit, total } };
  }

  findAvailable(categoryId?: string): Promise<TechnicianWithRelations[]> {
    return this.prisma.technician.findMany({
      where: {
        isActive: true,
        isAvailable: true,
        user: { isActive: true },
        ...(categoryId ? { skills: { some: { categoryId } } } : {}),
      },
      select: technicianSelect,
      orderBy: [{ experienceYears: 'desc' }, { user: { name: 'asc' } }],
    });
  }

  update(
    id: string,
    data: Prisma.TechnicianUpdateInput,
  ): Promise<TechnicianWithRelations> {
    return this.prisma.technician.update({
      where: { id },
      data,
      select: technicianSelect,
    });
  }

  updateStatus(
    id: string,
    isActive: boolean,
  ): Promise<TechnicianWithRelations> {
    return this.update(id, { isActive });
  }

  updateAvailability(
    id: string,
    isAvailable: boolean,
  ): Promise<TechnicianWithRelations> {
    return this.update(id, { isAvailable });
  }

  findSkill(
    technicianId: string,
    categoryId: string,
  ): Promise<TechnicianSkillWithCategory | null> {
    return this.prisma.technicianSkill.findUnique({
      where: { technicianId_categoryId: { technicianId, categoryId } },
      select: technicianSkillSelect,
    });
  }

  listSkills(technicianId: string): Promise<TechnicianSkillWithCategory[]> {
    return this.prisma.technicianSkill.findMany({
      where: { technicianId },
      select: technicianSkillSelect,
      orderBy: { category: { name: 'asc' } },
    });
  }

  addSkill(
    technicianId: string,
    categoryId: string,
  ): Promise<TechnicianSkillWithCategory> {
    return this.prisma.technicianSkill.create({
      data: { technicianId, categoryId },
      select: technicianSkillSelect,
    });
  }

  async removeSkill(technicianId: string, categoryId: string): Promise<void> {
    await this.prisma.technicianSkill.delete({
      where: { technicianId_categoryId: { technicianId, categoryId } },
    });
  }
}
