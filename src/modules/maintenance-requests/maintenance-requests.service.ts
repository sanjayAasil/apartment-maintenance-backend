import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import {
  MaintenanceHistoryAction,
  MaintenanceStatus,
  UserRole,
} from '../../generated/prisma/enums.js';
import { MaintenanceCategoriesService } from '../maintenance-categories/maintenance-categories.service.js';
import { PartsService } from '../parts/parts.service.js';
import { ResidentsService } from '../residents/residents.service.js';
import { TechniciansService } from '../technicians/technicians.service.js';
import type { TechnicianWithRelations } from '../technicians/technicians.types.js';
import type { PublicUser } from '../users/users.types.js';
import type { CreateMaintenanceRequestDto } from './dto/create-maintenance-request.dto.js';
import type { CreateFeedbackDto } from './dto/create-feedback.dto.js';
import type { CreateMaintenanceWorkNoteDto } from './dto/create-maintenance-work-note.dto.js';
import type { ListMaintenanceRequestsQueryDto } from './dto/list-maintenance-requests-query.dto.js';
import type { UpdateMaintenanceWorkNoteDto } from './dto/update-maintenance-work-note.dto.js';
import type { UpdateMaintenanceRequestDto } from './dto/update-maintenance-request.dto.js';
import { MaintenanceAssignmentsRepository } from './maintenance-assignments.repository.js';
import { MaintenanceCommentsRepository } from './maintenance-comments.repository.js';
import { MaintenanceFeedbackRepository } from './maintenance-feedback.repository.js';
import { MaintenanceHistoryRepository } from './maintenance-history.repository.js';
import { MaintenanceRequestsRepository } from './maintenance-requests.repository.js';
import {
  InsufficientStockError,
  MaintenanceWorkRepository,
} from './maintenance-work.repository.js';
import type {
  MaintenanceRequestWithRelations,
  MaintenanceAssignmentWithRelations,
  MaintenanceCommentWithAuthor,
  MaintenanceHistoryEvent,
  MaintenanceHistoryWithActor,
  MaintenanceFeedbackWithResident,
  MaintenanceRequestCost,
  MaintenanceRequestPartWithPart,
  MaintenanceWorkNoteWithTechnician,
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
    private readonly commentsRepository: MaintenanceCommentsRepository,
    private readonly historyRepository: MaintenanceHistoryRepository,
    private readonly feedbackRepository: MaintenanceFeedbackRepository,
    private readonly workRepository: MaintenanceWorkRepository,
    private readonly partsService: PartsService,
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
      return await this.repository.create(
        {
          residentId: resident.id,
          apartmentId: resident.apartmentId,
          categoryId: input.categoryId,
          title: input.title.trim(),
          description: input.description.trim(),
          priority: input.priority,
          status: MaintenanceStatus.OPEN,
        },
        user.id,
      );
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
    let nextCategoryName: string | undefined;
    if (input.categoryId !== undefined) {
      const category = await this.categoriesService.getById(input.categoryId);
      if (!category.isActive) {
        throw new BadRequestException('Maintenance category must be active');
      }
      nextCategoryName = category.name;
    }
    const events: MaintenanceHistoryEvent[] = [];
    if (input.categoryId && input.categoryId !== request.categoryId) {
      events.push({
        action: MaintenanceHistoryAction.CATEGORY_CHANGED,
        oldValue: request.categoryId,
        newValue: input.categoryId,
        metadata: {
          previousCategoryName: request.category.name,
          categoryName: nextCategoryName,
        },
      });
    }
    if (input.priority && input.priority !== request.priority) {
      events.push({
        action: MaintenanceHistoryAction.PRIORITY_CHANGED,
        oldValue: request.priority,
        newValue: input.priority,
      });
    }
    const updatedFields: string[] = [];
    if (input.title !== undefined && input.title.trim() !== request.title) {
      updatedFields.push('title');
    }
    if (
      input.description !== undefined &&
      input.description.trim() !== request.description
    ) {
      updatedFields.push('description');
    }
    if (updatedFields.length > 0) {
      events.push({
        action: MaintenanceHistoryAction.REQUEST_UPDATED,
        metadata: { fields: updatedFields },
      });
    }
    return this.repository.update(
      id,
      {
        ...(input.categoryId !== undefined
          ? { category: { connect: { id: input.categoryId } } }
          : {}),
        ...(input.title !== undefined ? { title: input.title.trim() } : {}),
        ...(input.description !== undefined
          ? { description: input.description.trim() }
          : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
      },
      { actorUserId: user.id, events },
    );
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
    return this.repository.update(
      id,
      {
        status: nextStatus,
        ...(nextStatus === MaintenanceStatus.RESOLVED
          ? { resolvedAt: now }
          : {}),
        ...(nextStatus === MaintenanceStatus.CLOSED ? { closedAt: now } : {}),
      },
      {
        actorUserId: user.id,
        events: [
          {
            action: MaintenanceHistoryAction.STATUS_CHANGED,
            oldValue: request.status,
            newValue: nextStatus,
          },
        ],
      },
    );
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
    const technician = await this.validateTechnician(
      technicianId,
      request.categoryId,
    );
    try {
      return await this.assignmentsRepository.assign(
        id,
        technicianId,
        assignedByUserId,
        technician.user.name,
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
    const technician = await this.validateTechnician(
      technicianId,
      request.categoryId,
    );
    try {
      return await this.assignmentsRepository.reassign(
        active.id,
        id,
        technicianId,
        assignedByUserId,
        new Date(),
        active.technicianId,
        active.technician.user.name,
        technician.user.name,
      );
    } catch (error) {
      this.throwKnownAssignmentDatabaseError(error);
      throw error;
    }
  }

  async unassignTechnician(id: string, actorUserId: string): Promise<void> {
    const request = await this.findOrThrow(id);
    if (request.status !== MaintenanceStatus.ASSIGNED) {
      throw new BadRequestException('Only assigned requests can be unassigned');
    }
    const active = await this.assignmentsRepository.findActiveAssignment(id);
    if (!active) {
      throw new NotFoundException('Active maintenance assignment not found');
    }
    await this.assignmentsRepository.unassign(
      active.id,
      id,
      actorUserId,
      active.technicianId,
      active.technician.user.name,
      new Date(),
    );
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

  async addComment(
    id: string,
    message: string,
    user: PublicUser,
  ): Promise<MaintenanceCommentWithAuthor> {
    const request = await this.findOrThrow(id);
    this.assertCanAccess(request, user);
    const normalizedMessage = message.trim();
    if (!normalizedMessage) {
      throw new BadRequestException('Comment message must not be empty');
    }
    if (normalizedMessage.length > 2000) {
      throw new BadRequestException(
        'Comment message must not exceed 2000 characters',
      );
    }
    try {
      return await this.commentsRepository.create(
        id,
        user.id,
        normalizedMessage,
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException(
          'Related maintenance request or user no longer exists',
        );
      }
      throw error;
    }
  }

  async getComments(
    id: string,
    user: PublicUser,
  ): Promise<MaintenanceCommentWithAuthor[]> {
    const request = await this.findOrThrow(id);
    this.assertCanAccess(request, user);
    return this.commentsRepository.findByRequestId(id);
  }

  async getHistory(
    id: string,
    user: PublicUser,
  ): Promise<MaintenanceHistoryWithActor[]> {
    const request = await this.findOrThrow(id);
    this.assertCanAccess(request, user);
    return this.historyRepository.findByRequestId(id);
  }

  async submitFeedback(
    id: string,
    input: CreateFeedbackDto,
    user: PublicUser,
  ): Promise<MaintenanceFeedbackWithResident> {
    if (user.role !== UserRole.RESIDENT) {
      throw new ForbiddenException('Only residents can submit feedback');
    }
    const request = await this.findOrThrow(id);
    const resident = await this.residentsService.getByUserId(user.id);
    if (request.residentId !== resident.id) {
      throw new ForbiddenException(
        'You can only submit feedback for your own maintenance request',
      );
    }
    if (request.status !== MaintenanceStatus.CLOSED) {
      throw new BadRequestException(
        'Feedback can only be submitted after the request is closed',
      );
    }
    if (
      !Number.isInteger(input.rating) ||
      input.rating < 1 ||
      input.rating > 5
    ) {
      throw new BadRequestException('Rating must be an integer from 1 to 5');
    }
    if (await this.feedbackRepository.findByRequestId(id)) {
      throw new ConflictException('Feedback has already been submitted');
    }
    const comment = input.comment?.trim() || null;
    if (comment !== null && comment.length > 1000) {
      throw new BadRequestException(
        'Feedback comment must not exceed 1000 characters',
      );
    }
    try {
      return await this.feedbackRepository.create(
        id,
        resident.id,
        user.id,
        input.rating,
        comment,
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Feedback has already been submitted');
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException(
          'Related maintenance request or resident no longer exists',
        );
      }
      throw error;
    }
  }

  async getFeedback(
    id: string,
    user: PublicUser,
  ): Promise<MaintenanceFeedbackWithResident | null> {
    const request = await this.findOrThrow(id);
    if (user.role === UserRole.RESIDENT) {
      if (request.resident.userId !== user.id) {
        throw new ForbiddenException(
          'You cannot access feedback for this maintenance request',
        );
      }
    } else if (user.role === UserRole.TECHNICIAN) {
      if (!(await this.assignmentsRepository.wasAssignedToUser(id, user.id))) {
        throw new ForbiddenException(
          'You can only access feedback for requests assigned to you',
        );
      }
    }
    return this.feedbackRepository.findByRequestId(id);
  }

  async getWorkNote(
    id: string,
    user: PublicUser,
  ): Promise<MaintenanceWorkNoteWithTechnician | null> {
    const request = await this.findOrThrow(id);
    this.assertCanAccess(request, user);
    this.assertCanReadRepairDetails(request, user);
    return this.workRepository.findWorkNote(id);
  }

  async createWorkNote(
    id: string,
    input: CreateMaintenanceWorkNoteDto,
    user: PublicUser,
  ): Promise<MaintenanceWorkNoteWithTechnician> {
    const request = await this.findOrThrow(id);
    const technicianId = this.assertTechnicianCanEditWork(request, user);
    if (await this.workRepository.findWorkNote(id)) {
      throw new ConflictException(
        'A work note already exists for this request',
      );
    }
    try {
      return await this.workRepository.createWorkNote(
        id,
        technicianId,
        user.id,
        {
          diagnosis: input.diagnosis.trim(),
          workPerformed: input.workPerformed.trim(),
          laborCost: new Prisma.Decimal(input.laborCost),
          otherCost: new Prisma.Decimal(input.otherCost),
        },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A work note already exists for this request',
        );
      }
      throw error;
    }
  }

  async updateWorkNote(
    id: string,
    noteId: string,
    input: UpdateMaintenanceWorkNoteDto,
    user: PublicUser,
  ): Promise<MaintenanceWorkNoteWithTechnician> {
    if (Object.keys(input).length === 0) {
      throw new BadRequestException('At least one field must be provided');
    }
    const request = await this.findOrThrow(id);
    this.assertTechnicianCanEditWork(request, user);
    const note = await this.workRepository.findWorkNote(id);
    if (!note || note.id !== noteId) {
      throw new NotFoundException('Maintenance work note not found');
    }
    return this.workRepository.updateWorkNote(noteId, id, user.id, {
      ...(input.diagnosis !== undefined
        ? { diagnosis: input.diagnosis.trim() }
        : {}),
      ...(input.workPerformed !== undefined
        ? { workPerformed: input.workPerformed.trim() }
        : {}),
      ...(input.laborCost !== undefined
        ? { laborCost: new Prisma.Decimal(input.laborCost) }
        : {}),
      ...(input.otherCost !== undefined
        ? { otherCost: new Prisma.Decimal(input.otherCost) }
        : {}),
    });
  }

  async getParts(
    id: string,
    user: PublicUser,
  ): Promise<MaintenanceRequestPartWithPart[]> {
    const request = await this.findOrThrow(id);
    this.assertCanAccess(request, user);
    this.assertCanReadRepairDetails(request, user);
    return this.workRepository.findParts(id);
  }

  async addPart(
    id: string,
    partId: string,
    quantity: number,
    user: PublicUser,
  ): Promise<MaintenanceRequestPartWithPart> {
    const request = await this.findOrThrow(id);
    this.assertTechnicianCanEditWork(request, user);
    const part = await this.partsService.getById(partId);
    if (!part.isActive) throw new BadRequestException('Part must be active');
    if (part.quantity < quantity) {
      throw new ConflictException(
        `Only ${part.quantity} units are currently available`,
      );
    }
    try {
      return await this.workRepository.addPart(
        id,
        partId,
        quantity,
        part.unitPrice,
        part.name,
        user.id,
      );
    } catch (error) {
      if (error instanceof InsufficientStockError) {
        const current = await this.partsService.getById(partId);
        throw new ConflictException(
          `Only ${current.quantity} units are currently available`,
        );
      }
      throw error;
    }
  }

  async removePart(
    id: string,
    usageId: string,
    user: PublicUser,
  ): Promise<void> {
    const request = await this.findOrThrow(id);
    if (request.status !== MaintenanceStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Parts can only be corrected while work is in progress',
      );
    }
    if (user.role === UserRole.TECHNICIAN) {
      this.assertTechnicianCanEditWork(request, user);
    } else if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You cannot remove part usage');
    }
    const usage = await this.workRepository.findPartUsage(usageId);
    if (!usage || usage.maintenanceRequestId !== id) {
      throw new NotFoundException('Maintenance part usage not found');
    }
    await this.workRepository.removePart(usage, user.id);
  }

  async getCost(id: string, user: PublicUser): Promise<MaintenanceRequestCost> {
    const request = await this.findOrThrow(id);
    this.assertCanAccess(request, user);
    this.assertCanReadRepairDetails(request, user);
    return this.workRepository.getCost(id);
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

  private assertTechnicianCanEditWork(
    request: MaintenanceRequestWithRelations,
    user: PublicUser,
  ): string {
    if (user.role !== UserRole.TECHNICIAN) {
      throw new ForbiddenException(
        'Only the assigned technician can modify repair work',
      );
    }
    if (request.status !== MaintenanceStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Repair work can only be modified while the request is in progress',
      );
    }
    const assignment = request.assignments.find(
      (item) => item.technician.userId === user.id,
    );
    if (!assignment) {
      throw new ForbiddenException(
        'You can only modify requests actively assigned to you',
      );
    }
    return assignment.technicianId;
  }

  private assertCanReadRepairDetails(
    request: MaintenanceRequestWithRelations,
    user: PublicUser,
  ): void {
    if (
      user.role === UserRole.RESIDENT &&
      request.status !== MaintenanceStatus.RESOLVED &&
      request.status !== MaintenanceStatus.CLOSED
    ) {
      throw new ForbiddenException(
        'Repair details are available after the request is resolved',
      );
    }
  }

  private async validateTechnician(
    technicianId: string,
    categoryId: string,
  ): Promise<TechnicianWithRelations> {
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
    return technician;
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
