import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import type { CreateMaintenanceCategoryDto } from './dto/create-maintenance-category.dto.js';
import type { ListMaintenanceCategoriesQueryDto } from './dto/list-maintenance-categories-query.dto.js';
import type { UpdateMaintenanceCategoryDto } from './dto/update-maintenance-category.dto.js';
import { MaintenanceCategoriesRepository } from './maintenance-categories.repository.js';
import type {
  MaintenanceCategoryRecord,
  PaginatedMaintenanceCategories,
} from './maintenance-categories.types.js';

@Injectable()
export class MaintenanceCategoriesService {
  constructor(private readonly repository: MaintenanceCategoriesRepository) {}

  async create(
    input: CreateMaintenanceCategoryDto,
  ): Promise<MaintenanceCategoryRecord> {
    const name = input.name.trim();
    await this.ensureNameAvailable(name);
    try {
      return await this.repository.create({
        name,
        description: this.normalizeDescription(input.description),
      });
    } catch (error) {
      this.throwKnownDatabaseError(error);
      throw error;
    }
  }

  list(
    query: ListMaintenanceCategoriesQueryDto,
  ): Promise<PaginatedMaintenanceCategories> {
    return this.repository.findMany({
      ...query,
      search: query.search?.trim() || undefined,
    });
  }

  async getById(id: string): Promise<MaintenanceCategoryRecord> {
    const category = await this.repository.findById(id);
    if (!category)
      throw new NotFoundException('Maintenance category not found');
    return category;
  }

  async update(
    id: string,
    input: UpdateMaintenanceCategoryDto,
  ): Promise<MaintenanceCategoryRecord> {
    if (Object.keys(input).length === 0) {
      throw new BadRequestException('At least one field must be provided');
    }
    await this.getById(id);
    if (input.name !== undefined)
      await this.ensureNameAvailable(input.name.trim(), id);

    try {
      return await this.repository.update(id, {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.description !== undefined
          ? { description: this.normalizeDescription(input.description) }
          : {}),
      });
    } catch (error) {
      this.throwKnownDatabaseError(error);
      throw error;
    }
  }

  async updateStatus(
    id: string,
    isActive: boolean,
  ): Promise<MaintenanceCategoryRecord> {
    await this.getById(id);
    return this.repository.setActiveStatus(id, isActive);
  }

  private async ensureNameAvailable(
    name: string,
    currentId?: string,
  ): Promise<void> {
    const existing = await this.repository.findByName(name);
    if (existing && existing.id !== currentId) {
      throw new ConflictException('Maintenance category already exists');
    }
  }

  private normalizeDescription(
    value: string | null | undefined,
  ): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private throwKnownDatabaseError(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Maintenance category already exists');
    }
  }
}
