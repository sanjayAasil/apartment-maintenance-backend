import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { MaintenanceStatus, UserRole } from '../../generated/prisma/enums.js';
import { MaintenanceCategoriesService } from '../maintenance-categories/maintenance-categories.service.js';
import { ResidentsService } from '../residents/residents.service.js';
import { TechniciansService } from '../technicians/technicians.service.js';
import type { PublicUser } from '../users/users.types.js';
import type { CreateMaintenanceRequestDto } from './dto/create-maintenance-request.dto.js';
import type { ListMaintenanceRequestsQueryDto } from './dto/list-maintenance-requests-query.dto.js';
import type { UpdateMaintenanceRequestDto } from './dto/update-maintenance-request.dto.js';
import { MaintenanceAssignmentsRepository } from './maintenance-assignments.repository.js';
import { MaintenanceRequestsRepository } from './maintenance-requests.repository.js';
import type {
  MaintenanceRequestWithRelations,
  MaintenanceAssignmentWithRelations,
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
    private readonly techniciansService: TechniciansService,
    private readonly assignmentsRepository: MaintenanceAssignmentsRepository,
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
    let residentId = query.residentId;
    let technicianId: string | undefined;
    if (user.role === UserRole.RESIDENT) {
      residentId = (await this.residentsService.getByUserId(user.id)).id;
    } else if (user.role === UserRole.TECHNICIAN) {
      technicianId = (await this.techniciansService.getByUserId(user.id)).id;
      residentId = undefined;
    }
    return this.repository.findMany({
      ...query,
      search: query.search?.trim() || undefined,
      residentId,
      technicianId,
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

    if (user.role === UserRole.TECHNICIAN) {
      const allowed =
        (request.status === MaintenanceStatus.ASSIGNED &&
          nextStatus === MaintenanceStatus.IN_PROGRESS) ||
        (request.status === MaintenanceStatus.IN_PROGRESS &&
          nextStatus === MaintenanceStatus.RESOLVED);
      if (!allowed) {
        throw new ForbiddenException(
          'Technicians may only start or resolve actively assigned work',
        );
      }
    }

    if (
      user.role === UserRole.ADMIN &&
      (nextStatus === MaintenanceStatus.ASSIGNED ||
        nextStatus === MaintenanceStatus.IN_PROGRESS)
    ) {
      throw new BadRequestException(
        'This status is controlled by the assignment and technician workflow',
      );
    }

    const now = new Date();
    return this.repository.update(id, {
      status: nextStatus,
      ...(nextStatus === MaintenanceStatus.RESOLVED ? { resolvedAt: now } : {}),
      ...(nextStatus === MaintenanceStatus.CLOSED ? { closedAt: now } : {}),
    });
  }

  async assignTechnician(
    id: string,
    technicianId: string,
    assignedByUserId: string,
  ): Promise<MaintenanceAssignmentWithRelations> {
    const request = await this.findOrThrow(id);
    if (await this.assignmentsRepository.findActiveAssignment(id)) {
      throw new ConflictException(
        'Maintenance request already has an active assignment',
      );
    }
    if (request.status !== MaintenanceStatus.OPEN) {
      throw new BadRequestException('Only open requests can be assigned');
    }
    await this.validateTechnician(technicianId, request.categoryId);
    try {
      return await this.assignmentsRepository.assign(
        id,
        technicianId,
        assignedByUserId,
      );
    } catch (error) {
      this.throwKnownAssignmentDatabaseError(error);
      throw error;
    }
  }

  async reassignTechnician(
    id: string,
    technicianId: string,
    assignedByUserId: string,
  ): Promise<MaintenanceAssignmentWithRelations> {
    const request = await this.findOrThrow(id);
    if (request.status !== MaintenanceStatus.ASSIGNED) {
      throw new BadRequestException(
        'Requests can only be reassigned before work starts',
      );
    }
    const active = await this.assignmentsRepository.findActiveAssignment(id);
    if (!active) {
      throw new NotFoundException('Active maintenance assignment not found');
    }
    if (active.technicianId === technicianId) {
      throw new ConflictException(
        'This technician is already assigned to the request',
      );
    }
    await this.validateTechnician(technicianId, request.categoryId);
    try {
      return await this.assignmentsRepository.reassign(
        active.id,
        id,
        technicianId,
        assignedByUserId,
        new Date(),
      );
    } catch (error) {
      this.throwKnownAssignmentDatabaseError(error);
      throw error;
    }
  }

  async unassignTechnician(id: string): Promise<void> {
    const request = await this.findOrThrow(id);
    if (request.status !== MaintenanceStatus.ASSIGNED) {
      throw new BadRequestException('Only assigned requests can be unassigned');
    }
    const active = await this.assignmentsRepository.findActiveAssignment(id);
    if (!active) {
      throw new NotFoundException('Active maintenance assignment not found');
    }
    await this.assignmentsRepository.unassign(active.id, id, new Date());
  }

  async getCurrentAssignment(
    id: string,
    user: PublicUser,
  ): Promise<MaintenanceAssignmentWithRelations> {
    const request = await this.findOrThrow(id);
    this.assertCanAccess(request, user);
    const assignment =
      await this.assignmentsRepository.findActiveAssignment(id);
    if (!assignment) {
      throw new NotFoundException('Active maintenance assignment not found');
    }
    return assignment;
  }

  async getAssignmentHistory(
    id: string,
  ): Promise<MaintenanceAssignmentWithRelations[]> {
    await this.findOrThrow(id);
    return this.assignmentsRepository.findHistory(id);
  }

  private async findOrThrow(
    id: string,
  ): Promise<MaintenanceRequestWithRelations> {
    const request = await this.repository.findById(id);
    if (!request) throw new NotFoundException('Maintenance request not found');
    return request;
  }

  private assertCanAccess(
    request: MaintenanceRequestWithRelations,
    user: PublicUser,
  ): void {
    if (
      user.role === UserRole.RESIDENT &&
      request.resident.userId !== user.id
    ) {
      throw new ForbiddenException(
        'You cannot access this maintenance request',
      );
    }
    if (
      user.role === UserRole.TECHNICIAN &&
      !request.assignments.some(
        (assignment) => assignment.technician.userId === user.id,
      )
    ) {
      throw new ForbiddenException(
        'You can only access requests actively assigned to you',
      );
    }
  }

  private async validateTechnician(
    technicianId: string,
    categoryId: string,
  ): Promise<void> {
    const technician = await this.techniciansService.getById(technicianId);
    if (!technician.isActive) {
      throw new BadRequestException('Technician must be active');
    }
    if (!technician.isAvailable) {
      throw new BadRequestException('Technician must be available');
    }
    if (!technician.user.isActive) {
      throw new BadRequestException('Technician user account must be active');
    }
    if (!technician.skills.some((skill) => skill.categoryId === categoryId)) {
      throw new BadRequestException(
        'Technician does not have the required category skill',
      );
    }
  }

  private throwKnownAssignmentDatabaseError(error: unknown): void {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return;
    if (error.code === 'P2002') {
      throw new ConflictException(
        'Maintenance request already has an active assignment',
      );
    }
    if (error.code === 'P2003') {
      throw new BadRequestException(
        'Related request, technician, or assigning user no longer exists',
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
