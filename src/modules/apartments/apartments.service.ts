import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type Apartment } from '../../generated/prisma/client.js';
import type { CreateApartmentDto } from './dto/create-apartment.dto.js';
import type { ListApartmentsQueryDto } from './dto/list-apartments-query.dto.js';
import type { UpdateApartmentDto } from './dto/update-apartment.dto.js';
import { ApartmentsRepository } from './apartments.repository.js';
import type { PaginatedApartments } from './apartments.types.js';

@Injectable()
export class ApartmentsService {
  constructor(private readonly apartmentsRepository: ApartmentsRepository) {}

  async create(input: CreateApartmentDto): Promise<Apartment> {
    const data = this.normalize(input);
    await this.ensureIdentifierAvailable(data.block, data.unitNumber);

    try {
      return await this.apartmentsRepository.create(data);
    } catch (error) {
      this.throwIfDuplicate(error);
      throw error;
    }
  }

  list(query: ListApartmentsQueryDto): Promise<PaginatedApartments> {
    return this.apartmentsRepository.findMany({
      ...query,
      block: query.block?.trim() || undefined,
      search: query.search?.trim() || undefined,
    });
  }

  async getById(id: string): Promise<Apartment> {
    const apartment = await this.apartmentsRepository.findById(id);
    if (!apartment) throw new NotFoundException('Apartment not found');
    return apartment;
  }

  async update(id: string, input: UpdateApartmentDto): Promise<Apartment> {
    if (Object.keys(input).length === 0) {
      throw new BadRequestException('At least one field must be provided');
    }

    const current = await this.getById(id);
    const data = this.normalize(input);
    const block = data.block ?? current.block;
    const unitNumber = data.unitNumber ?? current.unitNumber;

    if (block !== current.block || unitNumber !== current.unitNumber) {
      await this.ensureIdentifierAvailable(block, unitNumber, id);
    }

    try {
      return await this.apartmentsRepository.update(id, data);
    } catch (error) {
      this.throwIfDuplicate(error);
      throw error;
    }
  }

  private normalize<T extends CreateApartmentDto | UpdateApartmentDto>(
    input: T,
  ): T {
    return {
      ...input,
      ...(input.block !== undefined
        ? { block: input.block.trim().toUpperCase() }
        : {}),
      ...(input.unitNumber !== undefined
        ? { unitNumber: input.unitNumber.trim() }
        : {}),
    };
  }

  private async ensureIdentifierAvailable(
    block: string,
    unitNumber: string,
    apartmentId?: string,
  ): Promise<void> {
    const existing = await this.apartmentsRepository.findByBlockAndUnitNumber(
      block,
      unitNumber,
    );
    if (existing && existing.id !== apartmentId) {
      throw new ConflictException(
        `Apartment ${block}-${unitNumber} already exists`,
      );
    }
  }

  private throwIfDuplicate(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'An apartment with this block and unit number already exists',
      );
    }
  }
}
