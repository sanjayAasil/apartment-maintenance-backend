import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { UserRole } from '../../generated/prisma/enums.js';
import type { PublicUser } from '../users/users.types.js';
import { UsersService } from '../users/users.service.js';
import { MaintenanceCategoriesService } from '../maintenance-categories/maintenance-categories.service.js';
import type { CreateTechnicianDto } from './dto/create-technician.dto.js';
import type { ListTechniciansQueryDto } from './dto/list-technicians-query.dto.js';
import type { UpdateTechnicianDto } from './dto/update-technician.dto.js';
import { TechniciansRepository } from './technicians.repository.js';
import type {
  PaginatedTechnicians,
  TechnicianSkillWithCategory,
  TechnicianWithRelations,
} from './technicians.types.js';

@Injectable()
export class TechniciansService {
  constructor(
    private readonly repository: TechniciansRepository,
    private readonly usersService: UsersService,
    private readonly categoriesService: MaintenanceCategoriesService,
  ) {}

  async create(input: CreateTechnicianDto): Promise<TechnicianWithRelations> {
    const user = await this.usersService.getUserById(input.userId);
    if (!user.isActive) throw new BadRequestException('User must be active');
    if (user.role !== UserRole.TECHNICIAN) {
      throw new BadRequestException('User must have the TECHNICIAN role');
    }
    if (await this.repository.findByUserId(input.userId)) {
      throw new ConflictException(
        'Technician profile already exists for this user',
      );
    }
    try {
      return await this.repository.create({
        userId: input.userId,
        phone: input.phone.trim(),
        experienceYears: input.experienceYears,
      });
    } catch (error) {
      this.throwKnownDatabaseError(
        error,
        'Technician profile already exists for this user',
      );
      throw error;
    }
  }

  list(query: ListTechniciansQueryDto): Promise<PaginatedTechnicians> {
    return this.repository.findMany({
      ...query,
      search: query.search?.trim() || undefined,
    });
  }

  findAvailable(categoryId?: string): Promise<TechnicianWithRelations[]> {
    return this.repository.findAvailable(categoryId);
  }

  async getById(id: string): Promise<TechnicianWithRelations> {
    const technician = await this.repository.findById(id);
    if (!technician) throw new NotFoundException('Technician not found');
    return technician;
  }

  async getByUserId(userId: string): Promise<TechnicianWithRelations> {
    const technician = await this.repository.findByUserId(userId);
    if (!technician)
      throw new NotFoundException('Technician profile not found');
    return technician;
  }

  async update(
    id: string,
    input: UpdateTechnicianDto,
  ): Promise<TechnicianWithRelations> {
    if (Object.keys(input).length === 0) {
      throw new BadRequestException('At least one field must be provided');
    }
    await this.getById(id);
    return this.repository.update(id, {
      ...(input.phone !== undefined ? { phone: input.phone.trim() } : {}),
      ...(input.experienceYears !== undefined
        ? { experienceYears: input.experienceYears }
        : {}),
    });
  }

  async updateStatus(
    id: string,
    isActive: boolean,
  ): Promise<TechnicianWithRelations> {
    await this.getById(id);
    return this.repository.updateStatus(id, isActive);
  }

  async updateAvailability(
    id: string,
    isAvailable: boolean,
    actor: PublicUser,
  ): Promise<TechnicianWithRelations> {
    const technician = await this.getById(id);
    if (actor.role !== UserRole.ADMIN && technician.userId !== actor.id) {
      throw new ForbiddenException('You can only update your own availability');
    }
    return this.repository.updateAvailability(id, isAvailable);
  }

  async listSkills(id: string): Promise<TechnicianSkillWithCategory[]> {
    await this.getById(id);
    return this.repository.listSkills(id);
  }

  async addSkill(
    id: string,
    categoryId: string,
  ): Promise<TechnicianSkillWithCategory> {
    const technician = await this.getById(id);
    if (!technician.isActive) {
      throw new BadRequestException(
        'Technician must be active to assign skills',
      );
    }
    const category = await this.categoriesService.getById(categoryId);
    if (!category.isActive) {
      throw new BadRequestException(
        'Inactive categories cannot be assigned as skills',
      );
    }
    if (await this.repository.findSkill(id, categoryId)) {
      throw new ConflictException('Technician skill already exists');
    }
    try {
      return await this.repository.addSkill(id, categoryId);
    } catch (error) {
      this.throwKnownDatabaseError(error, 'Technician skill already exists');
      throw error;
    }
  }

  async removeSkill(id: string, categoryId: string): Promise<void> {
    await this.getById(id);
    if (!(await this.repository.findSkill(id, categoryId))) {
      throw new NotFoundException('Technician skill not found');
    }
    await this.repository.removeSkill(id, categoryId);
  }

  private throwKnownDatabaseError(
    error: unknown,
    duplicateMessage: string,
  ): void {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return;
    if (error.code === 'P2002') throw new ConflictException(duplicateMessage);
    if (error.code === 'P2003') {
      throw new BadRequestException(
        'Related user or category no longer exists',
      );
    }
  }
}
