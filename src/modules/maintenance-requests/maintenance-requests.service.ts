import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { MaintenanceStatus, UserRole } from '../../generated/prisma/enums.js';
import { MaintenanceCategoriesService } from '../maintenance-categories/maintenance-categories.service.js';
import { ResidentsService } from '../residents/residents.service.js';
import type { PublicUser } from '../users/users.types.js';
import type { CreateMaintenanceRequestDto } from './dto/create-maintenance-request.dto.js';
import type { ListMaintenanceRequestsQueryDto } from './dto/list-maintenance-requests-query.dto.js';
import type { UpdateMaintenanceRequestDto } from './dto/update-maintenance-request.dto.js';
import { MaintenanceRequestsRepository } from './maintenance-requests.repository.js';
import type {
  MaintenanceRequestWithRelations,
  PaginatedMaintenanceRequests,
} from './maintenance-requests.types.js';

const allowedTransitions: Record<MaintenanceStatus, MaintenanceStatus[]> = {
  [MaintenanceStatus.OPEN]: [
    MaintenanceStatus.ASSIGNED,
    MaintenanceStatus.CANCELLED,
  ],
  [MaintenanceStatus.ASSIGNED]: [
    MaintenanceStatus.IN_PROGRESS,
    MaintenanceStatus.CANCELLED,
  ],
  [MaintenanceStatus.IN_PROGRESS]: [MaintenanceStatus.RESOLVED],
  [MaintenanceStatus.RESOLVED]: [MaintenanceStatus.CLOSED],
  [MaintenanceStatus.CLOSED]: [],
  [MaintenanceStatus.CANCELLED]: [],
};

@Injectable()
export class MaintenanceRequestsService {
  constructor(
    private readonly repository: MaintenanceRequestsRepository,
    private readonly residentsService: ResidentsService,
    private readonly categoriesService: MaintenanceCategoriesService,
  ) {}

  async create(
    input: CreateMaintenanceRequestDto,
    user: PublicUser,
  ): Promise<MaintenanceRequestWithRelations> {
    const resident = await this.residentsService.getByUserId(user.id);
    if (!resident.isActive) {
      throw new BadRequestException('Resident profile must be active');
    }
    const category = await this.categoriesService.getById(input.categoryId);
    if (!category.isActive) {
      throw new BadRequestException('Maintenance category must be active');
    }

    try {
      return await this.repository.create({
        residentId: resident.id,
        apartmentId: resident.apartmentId,
        categoryId: input.categoryId,
        title: input.title.trim(),
        description: input.description.trim(),
        priority: input.priority,
        status: MaintenanceStatus.OPEN,
      });
    } catch (error) {
      this.throwKnownDatabaseError(error);
      throw error;
    }
  }

  async list(
    query: ListMaintenanceRequestsQueryDto,
    user: PublicUser,
  ): Promise<PaginatedMaintenanceRequests> {
    this.assertSupportedRole(user);
    let residentId = query.residentId;
    if (user.role === UserRole.RESIDENT) {
      residentId = (await this.residentsService.getByUserId(user.id)).id;
    }
    return this.repository.findMany({
      ...query,
      search: query.search?.trim() || undefined,
      residentId,
    });
  }

  async getById(
    id: string,
    user: PublicUser,
  ): Promise<MaintenanceRequestWithRelations> {
    const request = await this.findOrThrow(id);
    this.assertCanAccess(request, user);
    return request;
  }

  async update(
    id: string,
    input: UpdateMaintenanceRequestDto,
    user: PublicUser,
  ): Promise<MaintenanceRequestWithRelations> {
    if (Object.keys(input).length === 0) {
      throw new BadRequestException('At least one field must be provided');
    }
    const request = await this.findOrThrow(id);
    this.assertCanAccess(request, user);
    if (request.status !== MaintenanceStatus.OPEN) {
      throw new BadRequestException('Only open requests can be edited');
    }
    if (input.categoryId !== undefined) {
      const category = await this.categoriesService.getById(input.categoryId);
      if (!category.isActive) {
        throw new BadRequestException('Maintenance category must be active');
      }
    }
    return this.repository.update(id, {
      ...(input.categoryId !== undefined
        ? { category: { connect: { id: input.categoryId } } }
        : {}),
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.description !== undefined
        ? { description: input.description.trim() }
        : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
    });
  }

  async updateStatus(
    id: string,
    nextStatus: MaintenanceStatus,
    user: PublicUser,
  ): Promise<MaintenanceRequestWithRelations> {
    const request = await this.findOrThrow(id);
    this.assertCanAccess(request, user);
    if (!allowedTransitions[request.status].includes(nextStatus)) {
      throw new BadRequestException(
        `Cannot change maintenance request from ${request.status} to ${nextStatus}`,
      );
    }

    if (user.role === UserRole.RESIDENT) {
      const allowed =
        (request.status === MaintenanceStatus.OPEN &&
          nextStatus === MaintenanceStatus.CANCELLED) ||
        (request.status === MaintenanceStatus.RESOLVED &&
          nextStatus === MaintenanceStatus.CLOSED);
      if (!allowed) {
        throw new ForbiddenException(
          'Residents may only cancel open requests or close resolved requests',
        );
      }
    }

    if (
      user.role === UserRole.ADMIN &&
      (nextStatus === MaintenanceStatus.ASSIGNED ||
        nextStatus === MaintenanceStatus.IN_PROGRESS)
    ) {
      throw new BadRequestException(
        'This status is controlled by the future assignment workflow',
      );
    }

    const now = new Date();
    return this.repository.update(id, {
      status: nextStatus,
      ...(nextStatus === MaintenanceStatus.RESOLVED ? { resolvedAt: now } : {}),
      ...(nextStatus === MaintenanceStatus.CLOSED ? { closedAt: now } : {}),
    });
  }

  private async findOrThrow(
    id: string,
  ): Promise<MaintenanceRequestWithRelations> {
    const request = await this.repository.findById(id);
    if (!request) throw new NotFoundException('Maintenance request not found');
    return request;
  }

  private assertSupportedRole(user: PublicUser): void {
    if (user.role === UserRole.TECHNICIAN) {
      throw new ForbiddenException(
        'Maintenance requests are unavailable until assignments are implemented',
      );
    }
  }

  private assertCanAccess(
    request: MaintenanceRequestWithRelations,
    user: PublicUser,
  ): void {
    this.assertSupportedRole(user);
    if (
      user.role === UserRole.RESIDENT &&
      request.resident.userId !== user.id
    ) {
      throw new ForbiddenException(
        'You cannot access this maintenance request',
      );
    }
  }

  private throwKnownDatabaseError(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2003'
    ) {
      throw new BadRequestException(
        'Related resident, apartment, or category no longer exists',
      );
    }
  }
}
