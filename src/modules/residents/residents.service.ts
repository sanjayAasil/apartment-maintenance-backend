import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { ApartmentsService } from '../apartments/apartments.service.js';
import { UsersService } from '../users/users.service.js';
import type { CreateResidentDto } from './dto/create-resident.dto.js';
import type { ListResidentsQueryDto } from './dto/list-residents-query.dto.js';
import type { UpdateResidentDto } from './dto/update-resident.dto.js';
import { ResidentsRepository } from './residents.repository.js';
import type {
  PaginatedResidents,
  ResidentWithRelations,
} from './residents.types.js';

@Injectable()
export class ResidentsService {
  constructor(
    private readonly residentsRepository: ResidentsRepository,
    private readonly usersService: UsersService,
    private readonly apartmentsService: ApartmentsService,
  ) {}

  async create(input: CreateResidentDto): Promise<ResidentWithRelations> {
    const user = await this.usersService.getUserById(input.userId);
    if (!user.isActive) {
      throw new BadRequestException('User must be active');
    }
    if (user.role !== UserRole.RESIDENT) {
      throw new BadRequestException('User must have the RESIDENT role');
    }

    const existing = await this.residentsRepository.findByUserId(input.userId);
    if (existing) {
      throw new ConflictException(
        'Resident profile already exists for this user',
      );
    }

    await this.apartmentsService.getById(input.apartmentId);

    try {
      return await this.residentsRepository.create({
        userId: input.userId,
        apartmentId: input.apartmentId,
        phone: input.phone.trim(),
        moveInDate: new Date(input.moveInDate),
      });
    } catch (error) {
      this.throwKnownDatabaseError(error);
      throw error;
    }
  }

  list(query: ListResidentsQueryDto): Promise<PaginatedResidents> {
    return this.residentsRepository.findMany({
      ...query,
      search: query.search?.trim() || undefined,
    });
  }

  async getById(id: string): Promise<ResidentWithRelations> {
    const resident = await this.residentsRepository.findById(id);
    if (!resident) throw new NotFoundException('Resident not found');
    return resident;
  }

  async getByUserId(userId: string): Promise<ResidentWithRelations> {
    const resident = await this.residentsRepository.findByUserId(userId);
    if (!resident) throw new NotFoundException('Resident profile not found');
    return resident;
  }

  async update(
    id: string,
    input: UpdateResidentDto,
  ): Promise<ResidentWithRelations> {
    if (Object.keys(input).length === 0) {
      throw new BadRequestException('At least one field must be provided');
    }
    await this.getById(id);
    return this.residentsRepository.update(id, {
      ...(input.phone !== undefined ? { phone: input.phone.trim() } : {}),
      ...(input.moveInDate !== undefined
        ? { moveInDate: new Date(input.moveInDate) }
        : {}),
    });
  }

  async changeApartment(
    id: string,
    apartmentId: string,
  ): Promise<ResidentWithRelations> {
    const resident = await this.getById(id);
    if (resident.apartmentId === apartmentId) return resident;
    await this.apartmentsService.getById(apartmentId);

    try {
      return await this.residentsRepository.updateApartment(id, apartmentId);
    } catch (error) {
      this.throwKnownDatabaseError(error);
      throw error;
    }
  }

  async updateStatus(
    id: string,
    isActive: boolean,
  ): Promise<ResidentWithRelations> {
    await this.getById(id);
    return this.residentsRepository.updateStatus(id, isActive);
  }

  private throwKnownDatabaseError(error: unknown): void {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return;
    if (error.code === 'P2002') {
      throw new ConflictException(
        'Resident profile already exists for this user',
      );
    }
    if (error.code === 'P2003') {
      throw new BadRequestException(
        'Related user or apartment no longer exists',
      );
    }
  }
}
