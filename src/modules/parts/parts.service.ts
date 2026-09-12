import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import type { CreatePartDto } from './dto/create-part.dto.js';
import type { ListPartsQueryDto } from './dto/list-parts-query.dto.js';
import type { UpdatePartDto } from './dto/update-part.dto.js';
import { PartsRepository } from './parts.repository.js';
import type { PaginatedParts, PartRecord } from './parts.types.js';

@Injectable()
export class PartsService {
  constructor(private readonly repository: PartsRepository) {}

  async create(input: CreatePartDto): Promise<PartRecord> {
    const name = input.name.trim();
    await this.ensureNameAvailable(name);
    try {
      return await this.repository.create({
        name,
        description: this.description(input.description),
        quantity: input.quantity,
        unitPrice: new Prisma.Decimal(input.unitPrice),
        minimumStock: input.minimumStock,
        isActive: true,
      });
    } catch (error) {
      this.translateDatabaseError(error);
      throw error;
    }
  }

  list(query: ListPartsQueryDto): Promise<PaginatedParts> {
    return this.repository.findMany({
      ...query,
      search: query.search?.trim() || undefined,
    });
  }

  lowStock(page = 1, limit = 100): Promise<PaginatedParts> {
    return this.repository.findMany({
      page,
      limit,
      isActive: true,
      lowStock: true,
    });
  }

  async getById(id: string): Promise<PartRecord> {
    const part = await this.repository.findById(id);
    if (!part) throw new NotFoundException('Part not found');
    return part;
  }

  async update(id: string, input: UpdatePartDto): Promise<PartRecord> {
    if (Object.keys(input).length === 0) {
      throw new BadRequestException('At least one field must be provided');
    }
    await this.getById(id);
    if (input.name !== undefined) {
      await this.ensureNameAvailable(input.name.trim(), id);
    }
    try {
      return await this.repository.update(id, {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.description !== undefined
          ? { description: this.description(input.description) }
          : {}),
        ...(input.unitPrice !== undefined
          ? { unitPrice: new Prisma.Decimal(input.unitPrice) }
          : {}),
        ...(input.minimumStock !== undefined
          ? { minimumStock: input.minimumStock }
          : {}),
      });
    } catch (error) {
      this.translateDatabaseError(error);
      throw error;
    }
  }

  async updateStatus(id: string, isActive: boolean): Promise<PartRecord> {
    await this.getById(id);
    return this.repository.update(id, { isActive });
  }

  async setStock(id: string, quantity: number): Promise<PartRecord> {
    await this.getById(id);
    if (quantity < 0) throw new BadRequestException('Stock cannot be negative');
    return this.repository.update(id, { quantity });
  }

  private async ensureNameAvailable(name: string, currentId?: string) {
    const existing = await this.repository.findByName(name);
    if (existing && existing.id !== currentId) {
      throw new ConflictException('Part already exists');
    }
  }

  private description(value: string | null | undefined): string | null {
    return value?.trim() || null;
  }

  private translateDatabaseError(error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Part already exists');
    }
  }
}
