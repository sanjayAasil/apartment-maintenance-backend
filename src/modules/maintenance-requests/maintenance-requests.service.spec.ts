import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  MaintenanceHistoryAction,
  MaintenancePriority,
  MaintenanceStatus,
  UserRole,
} from '../../generated/prisma/enums.js';
import { Prisma } from '../../generated/prisma/client.js';
import { MaintenanceCategoriesService } from '../maintenance-categories/maintenance-categories.service.js';
import { PartsService } from '../parts/parts.service.js';
import { ResidentsService } from '../residents/residents.service.js';
import { TechniciansService } from '../technicians/technicians.service.js';
import type { PublicUser } from '../users/users.types.js';
import { MaintenanceAssignmentsRepository } from './maintenance-assignments.repository.js';
import { MaintenanceCommentsRepository } from './maintenance-comments.repository.js';
import { MaintenanceFeedbackRepository } from './maintenance-feedback.repository.js';
import { MaintenanceHistoryRepository } from './maintenance-history.repository.js';
import { MaintenanceRequestsRepository } from './maintenance-requests.repository.js';
import { MaintenanceRequestsService } from './maintenance-requests.service.js';
import { MaintenanceWorkRepository } from './maintenance-work.repository.js';
import type { MaintenanceRequestWithRelations } from './maintenance-requests.types.js';

describe('MaintenanceRequestsService', () => {
  const residentUser: PublicUser = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Riya Resident',
    email: 'riya@example.com',
    role: UserRole.RESIDENT,
    isActive: true,
    createdAt: new Date('2026-09-01'),
    updatedAt: new Date('2026-09-01'),
  };
  const admin: PublicUser = {
    ...residentUser,
    id: '22222222-2222-4222-8222-222222222222',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
  };
  const technicianUser: PublicUser = {
    ...residentUser,
    id: '88888888-8888-4888-8888-888888888888',
    name: 'Tara Technician',
    email: 'tara@example.com',
    role: UserRole.TECHNICIAN,
  };
  const resident = {
    id: '33333333-3333-4333-8333-333333333333',
    userId: residentUser.id,
    apartmentId: '44444444-4444-4444-8444-444444444444',
    phone: '9876543210',
    moveInDate: new Date('2026-01-01'),
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    user: residentUser,
    apartment: {
      id: '44444444-4444-4444-8444-444444444444',
      block: 'A',
      floor: 2,
      unitNumber: '204',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
  };
  const category = {
    id: '55555555-5555-4555-8555-555555555555',
    name: 'Plumbing',
    description: 'Water issues',
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };
  const request: MaintenanceRequestWithRelations = {
    id: '66666666-6666-4666-8666-666666666666',
    residentId: resident.id,
    apartmentId: resident.apartmentId,
    categoryId: category.id,
    title: 'Leaking tap',
    description: 'The kitchen tap is leaking continuously.',
    priority: MaintenancePriority.MEDIUM,
    status: MaintenanceStatus.OPEN,
    createdAt: new Date('2026-09-01'),
    updatedAt: new Date('2026-09-01'),
    resolvedAt: null,
    closedAt: null,
    resident: {
      id: resident.id,
      userId: resident.userId,
      phone: resident.phone,
      isActive: resident.isActive,
      user: residentUser,
    },
    apartment: resident.apartment,
    category,
    assignments: [],
  };
  const technician = {
    id: '99999999-9999-4999-8999-999999999999',
    userId: technicianUser.id,
    phone: '9000000000',
    experienceYears: 4,
    isAvailable: true,
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    user: technicianUser,
    skills: [
      {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        technicianId: '99999999-9999-4999-8999-999999999999',
        categoryId: category.id,
        createdAt: new Date('2026-01-01'),
        category: {
          id: category.id,
          name: category.name,
          description: category.description,
          isActive: true,
        },
      },
    ],
  };
  const assignment = {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    maintenanceRequestId: request.id,
    technicianId: technician.id,
    assignedByUserId: admin.id,
    assignedAt: new Date('2026-09-02'),
    unassignedAt: null,
    isActive: true,
    createdAt: new Date('2026-09-02'),
    updatedAt: new Date('2026-09-02'),
    technician,
    assignedBy: admin,
  };
  const repository = {
    create: vi.fn(),
    findById: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  };
  const residentsService = { getByUserId: vi.fn() };
  const categoriesService = { getById: vi.fn() };
  const techniciansService = { getById: vi.fn(), getByUserId: vi.fn() };
  const assignmentsRepository = {
    findActiveAssignment: vi.fn(),
    findHistory: vi.fn(),
    assign: vi.fn(),
    reassign: vi.fn(),
    unassign: vi.fn(),
    wasAssignedToUser: vi.fn(),
  };
  const commentsRepository = {
    create: vi.fn(),
    findByRequestId: vi.fn(),
  };
  const historyRepository = {
    create: vi.fn(),
    findByRequestId: vi.fn(),
  };
  const feedbackRepository = {
    findByRequestId: vi.fn(),
    create: vi.fn(),
  };
  const workRepository = {
    findWorkNote: vi.fn(),
    createWorkNote: vi.fn(),
    updateWorkNote: vi.fn(),
    findParts: vi.fn(),
    findPartUsage: vi.fn(),
    addPart: vi.fn(),
    removePart: vi.fn(),
    getCost: vi.fn(),
  };
  const partsService = { getById: vi.fn() };
  const service = new MaintenanceRequestsService(
    repository as unknown as MaintenanceRequestsRepository,
    residentsService as unknown as ResidentsService,
    categoriesService as unknown as MaintenanceCategoriesService,
    techniciansService as unknown as TechniciansService,
    assignmentsRepository as unknown as MaintenanceAssignmentsRepository,
    commentsRepository as unknown as MaintenanceCommentsRepository,
    historyRepository as unknown as MaintenanceHistoryRepository,
    feedbackRepository as unknown as MaintenanceFeedbackRepository,
    workRepository as unknown as MaintenanceWorkRepository,
    partsService as unknown as PartsService,
  );

  beforeEach(() => vi.clearAllMocks());

  it('creates from the authenticated resident and snapshots their apartment', async () => {
    residentsService.getByUserId.mockResolvedValue(resident);
    categoriesService.getById.mockResolvedValue(category);
    repository.create.mockResolvedValue(request);
    await service.create(
      {
        categoryId: category.id,
        title: ' Leaking tap ',
        description: ' The kitchen tap is leaking continuously. ',
        priority: MaintenancePriority.MEDIUM,
      },
      residentUser,
    );
    expect(repository.create).toHaveBeenCalledWith(
      {
        residentId: resident.id,
        apartmentId: resident.apartmentId,
        categoryId: category.id,
        title: 'Leaking tap',
        description: 'The kitchen tap is leaking continuously.',
        priority: MaintenancePriority.MEDIUM,
        status: MaintenanceStatus.OPEN,
      },
      residentUser.id,
    );
  });

  it('rejects inactive residents and categories', async () => {
    residentsService.getByUserId.mockResolvedValue({
      ...resident,
      isActive: false,
    });
    await expect(
      service.create(
        {
          categoryId: category.id,
          title: 'Leak',
          description: 'A sufficiently long description',
          priority: MaintenancePriority.LOW,
        },
        residentUser,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    residentsService.getByUserId.mockResolvedValue(resident);
    categoriesService.getById.mockResolvedValue({
      ...category,
      isActive: false,
    });
    await expect(
      service.create(
        {
          categoryId: category.id,
          title: 'Leak',
          description: 'A sufficiently long description',
          priority: MaintenancePriority.LOW,
        },
        residentUser,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('propagates missing resident profiles and categories', async () => {
    residentsService.getByUserId.mockRejectedValueOnce(
      new NotFoundException('Resident profile not found'),
    );
    await expect(
      service.create(
        {
          categoryId: category.id,
          title: 'Leak',
          description: 'A sufficiently long description',
          priority: MaintenancePriority.LOW,
        },
        residentUser,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    residentsService.getByUserId.mockResolvedValueOnce(resident);
    categoriesService.getById.mockRejectedValueOnce(
      new NotFoundException('Maintenance category not found'),
    );
    await expect(
      service.create(
        {
          categoryId: category.id,
          title: 'Leak',
          description: 'A sufficiently long description',
          priority: MaintenancePriority.LOW,
        },
        residentUser,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('forces resident list ownership while admins can use filters', async () => {
    residentsService.getByUserId.mockResolvedValue(resident);
    repository.findMany.mockResolvedValue({
      data: [request],
      meta: { page: 1, limit: 20, total: 1 },
    });
    const query = {
      search: ' leak ',
      page: 1,
      limit: 20,
      sortBy: 'createdAt' as const,
      sortOrder: 'desc' as const,
      residentId: '77777777-7777-4777-8777-777777777777',
    };
    await service.list(query, residentUser);
    expect(repository.findMany).toHaveBeenLastCalledWith({
      ...query,
      search: 'leak',
      residentId: resident.id,
    });
    await service.list(query, admin);
    expect(repository.findMany).toHaveBeenLastCalledWith({
      ...query,
      search: 'leak',
    });
  });

  it('returns visible requests and rejects missing or non-owned requests', async () => {
    repository.findById.mockResolvedValueOnce(request);
    await expect(service.getById(request.id, residentUser)).resolves.toEqual(
      request,
    );
    repository.findById.mockResolvedValueOnce(null);
    await expect(service.getById(request.id, admin)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    repository.findById.mockResolvedValueOnce({
      ...request,
      resident: { ...request.resident, userId: 'another-user' },
    });
    await expect(
      service.getById(request.id, residentUser),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('updates only open requests and validates a changed category', async () => {
    repository.findById.mockResolvedValue(request);
    categoriesService.getById.mockResolvedValue(category);
    repository.update.mockResolvedValue(request);
    await service.update(
      request.id,
      { categoryId: category.id, title: ' Updated leak ' },
      residentUser,
    );
    expect(repository.update).toHaveBeenCalledWith(
      request.id,
      {
        category: { connect: { id: category.id } },
        title: 'Updated leak',
      },
      {
        actorUserId: residentUser.id,
        events: [
          {
            action: MaintenanceHistoryAction.REQUEST_UPDATED,
            metadata: { fields: ['title'] },
          },
        ],
      },
    );
    repository.findById.mockResolvedValue({
      ...request,
      status: MaintenanceStatus.IN_PROGRESS,
    });
    await expect(
      service.update(request.id, { title: 'Nope' }, admin),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lets an owner cancel an open request', async () => {
    repository.findById.mockResolvedValue(request);
    repository.update.mockResolvedValue({
      ...request,
      status: MaintenanceStatus.CANCELLED,
    });
    await service.updateStatus(
      request.id,
      MaintenanceStatus.CANCELLED,
      residentUser,
    );
    expect(repository.update).toHaveBeenCalledWith(
      request.id,
      { status: MaintenanceStatus.CANCELLED },
      {
        actorUserId: residentUser.id,
        events: [
          {
            action: MaintenanceHistoryAction.STATUS_CHANGED,
            oldValue: MaintenanceStatus.OPEN,
            newValue: MaintenanceStatus.CANCELLED,
          },
        ],
      },
    );
  });

  it('sets resolution and closure timestamps on valid transitions', async () => {
    repository.findById.mockResolvedValueOnce({
      ...request,
      status: MaintenanceStatus.IN_PROGRESS,
    });
    repository.update.mockResolvedValue(request);
    await service.updateStatus(request.id, MaintenanceStatus.RESOLVED, admin);
    expect(repository.update).toHaveBeenLastCalledWith(
      request.id,
      {
        status: MaintenanceStatus.RESOLVED,
        resolvedAt: expect.any(Date),
      },
      expect.objectContaining({
        events: [
          expect.objectContaining({
            action: MaintenanceHistoryAction.STATUS_CHANGED,
            oldValue: MaintenanceStatus.IN_PROGRESS,
            newValue: MaintenanceStatus.RESOLVED,
          }),
        ],
      }),
    );
    repository.findById.mockResolvedValueOnce({
      ...request,
      status: MaintenanceStatus.RESOLVED,
    });
    await service.updateStatus(
      request.id,
      MaintenanceStatus.CLOSED,
      residentUser,
    );
    expect(repository.update).toHaveBeenLastCalledWith(
      request.id,
      {
        status: MaintenanceStatus.CLOSED,
        closedAt: expect.any(Date),
      },
      expect.objectContaining({
        events: [
          expect.objectContaining({
            oldValue: MaintenanceStatus.RESOLVED,
            newValue: MaintenanceStatus.CLOSED,
          }),
        ],
      }),
    );
  });

  it('assigns a matching active and available technician', async () => {
    repository.findById.mockResolvedValue(request);
    assignmentsRepository.findActiveAssignment.mockResolvedValue(null);
    techniciansService.getById.mockResolvedValue(technician);
    assignmentsRepository.assign.mockResolvedValue(assignment);
    await expect(
      service.assignTechnician(request.id, technician.id, admin.id),
    ).resolves.toEqual(assignment);
    expect(assignmentsRepository.assign).toHaveBeenCalledWith(
      request.id,
      technician.id,
      admin.id,
      technician.user.name,
    );
  });

  it('rejects duplicate assignments and invalid technician eligibility', async () => {
    repository.findById.mockResolvedValue(request);
    assignmentsRepository.findActiveAssignment.mockResolvedValueOnce(
      assignment,
    );
    await expect(
      service.assignTechnician(request.id, technician.id, admin.id),
    ).rejects.toBeInstanceOf(ConflictException);

    for (const invalid of [
      { ...technician, isActive: false },
      { ...technician, isAvailable: false },
      { ...technician, user: { ...technician.user, isActive: false } },
      { ...technician, skills: [] },
    ]) {
      assignmentsRepository.findActiveAssignment.mockResolvedValueOnce(null);
      techniciansService.getById.mockResolvedValueOnce(invalid);
      await expect(
        service.assignTechnician(request.id, technician.id, admin.id),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
  });

  it('reassigns before work starts and preserves assignment history', async () => {
    const assignedRequest = {
      ...request,
      status: MaintenanceStatus.ASSIGNED,
      assignments: [assignment],
    };
    const newTechnician = { ...technician, id: 'new-technician-id' };
    const newAssignment = {
      ...assignment,
      id: 'new-assignment-id',
      technicianId: newTechnician.id,
    };
    repository.findById.mockResolvedValue(assignedRequest);
    assignmentsRepository.findActiveAssignment.mockResolvedValue(assignment);
    techniciansService.getById.mockResolvedValue(newTechnician);
    assignmentsRepository.reassign.mockResolvedValue(newAssignment);
    await expect(
      service.reassignTechnician(request.id, newTechnician.id, admin.id),
    ).resolves.toEqual(newAssignment);
    expect(assignmentsRepository.reassign).toHaveBeenCalledWith(
      assignment.id,
      request.id,
      newTechnician.id,
      admin.id,
      expect.any(Date),
      assignment.technicianId,
      assignment.technician.user.name,
      newTechnician.user.name,
    );
    assignmentsRepository.findHistory.mockResolvedValue([
      newAssignment,
      { ...assignment, isActive: false, unassignedAt: new Date() },
    ]);
    await expect(
      service.getAssignmentHistory(request.id),
    ).resolves.toHaveLength(2);
  });

  it('unassigns an assigned request through the transactional repository', async () => {
    repository.findById.mockResolvedValue({
      ...request,
      status: MaintenanceStatus.ASSIGNED,
      assignments: [assignment],
    });
    assignmentsRepository.findActiveAssignment.mockResolvedValue(assignment);
    await service.unassignTechnician(request.id, admin.id);
    expect(assignmentsRepository.unassign).toHaveBeenCalledWith(
      assignment.id,
      request.id,
      admin.id,
      assignment.technicianId,
      assignment.technician.user.name,
      expect.any(Date),
    );
  });

  it('scopes technician lists and lets only the active assignee start and resolve', async () => {
    techniciansService.getByUserId.mockResolvedValue(technician);
    repository.findMany.mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0 },
    });
    await service.list(
      {
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      },
      technicianUser,
    );
    expect(repository.findMany).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      residentId: undefined,
      technicianId: technician.id,
      search: undefined,
    });

    repository.findById.mockResolvedValueOnce({
      ...request,
      status: MaintenanceStatus.ASSIGNED,
      assignments: [assignment],
    });
    repository.update.mockResolvedValue(request);
    await service.updateStatus(
      request.id,
      MaintenanceStatus.IN_PROGRESS,
      technicianUser,
    );
    expect(repository.update).toHaveBeenLastCalledWith(
      request.id,
      { status: MaintenanceStatus.IN_PROGRESS },
      expect.objectContaining({
        actorUserId: technicianUser.id,
        events: [
          expect.objectContaining({
            oldValue: MaintenanceStatus.ASSIGNED,
            newValue: MaintenanceStatus.IN_PROGRESS,
          }),
        ],
      }),
    );

    repository.findById.mockResolvedValueOnce({
      ...request,
      status: MaintenanceStatus.IN_PROGRESS,
      assignments: [assignment],
    });
    await service.updateStatus(
      request.id,
      MaintenanceStatus.RESOLVED,
      technicianUser,
    );
    expect(repository.update).toHaveBeenLastCalledWith(
      request.id,
      {
        status: MaintenanceStatus.RESOLVED,
        resolvedAt: expect.any(Date),
      },
      expect.objectContaining({
        actorUserId: technicianUser.id,
        events: [
          expect.objectContaining({
            oldValue: MaintenanceStatus.IN_PROGRESS,
            newValue: MaintenanceStatus.RESOLVED,
          }),
        ],
      }),
    );
  });

  it('rejects invalid, assignment-owned, and technician transitions', async () => {
    repository.findById.mockResolvedValue(request);
    await expect(
      service.updateStatus(request.id, MaintenanceStatus.CLOSED, admin),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.updateStatus(request.id, MaintenanceStatus.ASSIGNED, admin),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.getById(request.id, {
        ...residentUser,
        role: UserRole.TECHNICIAN,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows involved users to add and read chronological comments', async () => {
    const comment = {
      id: 'comment-id',
      maintenanceRequestId: request.id,
      userId: residentUser.id,
      message: 'The leak is getting worse.',
      createdAt: new Date(),
      updatedAt: new Date(),
      user: {
        id: residentUser.id,
        name: residentUser.name,
        role: residentUser.role,
      },
    };
    repository.findById.mockResolvedValue(request);
    commentsRepository.create.mockResolvedValue(comment);
    commentsRepository.findByRequestId.mockResolvedValue([comment]);

    await expect(
      service.addComment(
        request.id,
        ' The leak is getting worse. ',
        residentUser,
      ),
    ).resolves.toEqual(comment);
    expect(commentsRepository.create).toHaveBeenCalledWith(
      request.id,
      residentUser.id,
      'The leak is getting worse.',
    );
    await expect(service.getComments(request.id, admin)).resolves.toEqual([
      comment,
    ]);

    repository.findById.mockResolvedValueOnce({
      ...request,
      status: MaintenanceStatus.ASSIGNED,
      assignments: [assignment],
    });
    commentsRepository.create.mockResolvedValue({
      ...comment,
      userId: technicianUser.id,
    });
    await expect(
      service.addComment(request.id, 'Valve inspected.', technicianUser),
    ).resolves.toBeDefined();
  });

  it('rejects comments and history access from unrelated users', async () => {
    repository.findById.mockResolvedValue(request);
    const unrelatedResident = { ...residentUser, id: 'another-user' };
    await expect(
      service.addComment(request.id, 'Not my request', unrelatedResident),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.getHistory(request.id, {
        ...technicianUser,
        id: 'unassigned-technician',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.addComment(request.id, '   ', admin),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns audit history to the owner, active technician, and admin', async () => {
    const entry = {
      id: 'history-id',
      maintenanceRequestId: request.id,
      userId: residentUser.id,
      action: MaintenanceHistoryAction.REQUEST_CREATED,
      oldValue: null,
      newValue: null,
      metadata: null,
      createdAt: new Date(),
      user: {
        id: residentUser.id,
        name: residentUser.name,
        role: residentUser.role,
      },
    };
    historyRepository.findByRequestId.mockResolvedValue([entry]);
    repository.findById.mockResolvedValueOnce(request);
    await expect(service.getHistory(request.id, residentUser)).resolves.toEqual(
      [entry],
    );
    repository.findById.mockResolvedValueOnce({
      ...request,
      status: MaintenanceStatus.ASSIGNED,
      assignments: [assignment],
    });
    await expect(
      service.getHistory(request.id, technicianUser),
    ).resolves.toEqual([entry]);
    repository.findById.mockResolvedValueOnce(request);
    await expect(service.getHistory(request.id, admin)).resolves.toEqual([
      entry,
    ]);
  });

  it('lets the active technician create and update the work note in progress', async () => {
    const inProgress = {
      ...request,
      status: MaintenanceStatus.IN_PROGRESS,
      assignments: [assignment],
    };
    const note = {
      id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      maintenanceRequestId: request.id,
      technicianId: technician.id,
      diagnosis: 'Damaged valve',
      workPerformed: 'Replaced valve',
      laborCost: new Prisma.Decimal(300),
      otherCost: new Prisma.Decimal(100),
      createdAt: new Date(),
      updatedAt: new Date(),
      technician: {
        id: technician.id,
        userId: technicianUser.id,
        user: {
          id: technicianUser.id,
          name: technicianUser.name,
          role: technicianUser.role,
        },
      },
    };
    repository.findById.mockResolvedValue(inProgress);
    workRepository.findWorkNote.mockResolvedValueOnce(null);
    workRepository.createWorkNote.mockResolvedValue(note);
    await expect(
      service.createWorkNote(
        request.id,
        {
          diagnosis: ' Damaged valve ',
          workPerformed: ' Replaced valve ',
          laborCost: 300,
          otherCost: 100,
        },
        technicianUser,
      ),
    ).resolves.toEqual(note);
    expect(workRepository.createWorkNote).toHaveBeenCalledWith(
      request.id,
      technician.id,
      technicianUser.id,
      expect.objectContaining({
        diagnosis: 'Damaged valve',
        workPerformed: 'Replaced valve',
      }),
    );

    workRepository.findWorkNote.mockResolvedValueOnce(note);
    workRepository.updateWorkNote.mockResolvedValue(note);
    await service.updateWorkNote(
      request.id,
      note.id,
      { diagnosis: 'Updated diagnosis' },
      technicianUser,
    );
    expect(workRepository.updateWorkNote).toHaveBeenCalled();
  });

  it('rejects work changes by unassigned technicians or wrong statuses', async () => {
    repository.findById.mockResolvedValue(request);
    await expect(
      service.createWorkNote(
        request.id,
        {
          diagnosis: 'Diagnosis',
          workPerformed: 'Repair',
          laborCost: 0,
          otherCost: 0,
        },
        technicianUser,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    repository.findById.mockResolvedValue({
      ...request,
      status: MaintenanceStatus.IN_PROGRESS,
      assignments: [],
    });
    await expect(
      service.addPart(request.id, 'part-id', 1, technicianUser),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('adds a priced part and returns the calculated request cost', async () => {
    repository.findById.mockResolvedValue({
      ...request,
      status: MaintenanceStatus.IN_PROGRESS,
      assignments: [assignment],
    });
    const part = {
      id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      name: 'Water Valve',
      description: null,
      quantity: 3,
      unitPrice: new Prisma.Decimal(250),
      minimumStock: 1,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    partsService.getById.mockResolvedValue(part);
    workRepository.addPart.mockResolvedValue({ id: 'usage-id' });
    await service.addPart(request.id, part.id, 2, technicianUser);
    expect(workRepository.addPart).toHaveBeenCalledWith(
      request.id,
      part.id,
      2,
      part.unitPrice,
      part.name,
      technicianUser.id,
    );
    workRepository.getCost.mockResolvedValue({
      partsCost: 500,
      laborCost: 300,
      otherCost: 100,
      totalCost: 900,
    });
    repository.findById.mockResolvedValue(request);
    await expect(service.getCost(request.id, admin)).resolves.toEqual({
      partsCost: 500,
      laborCost: 300,
      otherCost: 100,
      totalCost: 900,
    });
  });

  it('rejects insufficient or inactive stock', async () => {
    repository.findById.mockResolvedValue({
      ...request,
      status: MaintenanceStatus.IN_PROGRESS,
      assignments: [assignment],
    });
    partsService.getById.mockResolvedValue({
      id: 'part-id',
      name: 'Valve',
      isActive: true,
      quantity: 1,
      unitPrice: new Prisma.Decimal(10),
    });
    await expect(
      service.addPart(request.id, 'part-id', 2, technicianUser),
    ).rejects.toBeInstanceOf(ConflictException);
    partsService.getById.mockResolvedValue({
      id: 'part-id',
      name: 'Valve',
      isActive: false,
      quantity: 10,
      unitPrice: new Prisma.Decimal(10),
    });
    await expect(
      service.addPart(request.id, 'part-id', 1, technicianUser),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  describe('feedback', () => {
    const closedRequest = {
      ...request,
      status: MaintenanceStatus.CLOSED,
      closedAt: new Date('2026-09-05'),
    };
    const feedback = {
      id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      maintenanceRequestId: request.id,
      residentId: resident.id,
      rating: 5,
      comment: 'Issue fixed properly.',
      createdAt: new Date('2026-09-06'),
      updatedAt: new Date('2026-09-06'),
      resident: {
        id: resident.id,
        user: { id: residentUser.id, name: residentUser.name },
      },
    };

    it('lets the owning resident submit feedback and creates it once', async () => {
      repository.findById.mockResolvedValue(closedRequest);
      residentsService.getByUserId.mockResolvedValue(resident);
      feedbackRepository.findByRequestId.mockResolvedValue(null);
      feedbackRepository.create.mockResolvedValue(feedback);

      await expect(
        service.submitFeedback(
          request.id,
          { rating: 5, comment: ' Issue fixed properly. ' },
          residentUser,
        ),
      ).resolves.toEqual(feedback);
      expect(feedbackRepository.create).toHaveBeenCalledWith(
        request.id,
        resident.id,
        residentUser.id,
        5,
        'Issue fixed properly.',
      );
    });

    it.each([1, 5])('accepts boundary rating %s', async (rating) => {
      repository.findById.mockResolvedValue(closedRequest);
      residentsService.getByUserId.mockResolvedValue(resident);
      feedbackRepository.findByRequestId.mockResolvedValue(null);
      feedbackRepository.create.mockResolvedValue({ ...feedback, rating });
      await expect(
        service.submitFeedback(request.id, { rating }, residentUser),
      ).resolves.toMatchObject({ rating });
    });

    it.each([0, 6])('rejects out-of-range rating %s', async (rating) => {
      repository.findById.mockResolvedValue(closedRequest);
      residentsService.getByUserId.mockResolvedValue(resident);
      await expect(
        service.submitFeedback(request.id, { rating }, residentUser),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects non-closed, cancelled, unowned, and duplicate feedback', async () => {
      residentsService.getByUserId.mockResolvedValue(resident);
      repository.findById.mockResolvedValue(request);
      await expect(
        service.submitFeedback(request.id, { rating: 4 }, residentUser),
      ).rejects.toBeInstanceOf(BadRequestException);
      repository.findById.mockResolvedValue({
        ...request,
        status: MaintenanceStatus.CANCELLED,
      });
      await expect(
        service.submitFeedback(request.id, { rating: 4 }, residentUser),
      ).rejects.toBeInstanceOf(BadRequestException);
      repository.findById.mockResolvedValue({
        ...closedRequest,
        residentId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
      });
      await expect(
        service.submitFeedback(request.id, { rating: 4 }, residentUser),
      ).rejects.toBeInstanceOf(ForbiddenException);
      repository.findById.mockResolvedValue(closedRequest);
      feedbackRepository.findByRequestId.mockResolvedValue(feedback);
      await expect(
        service.submitFeedback(request.id, { rating: 4 }, residentUser),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('allows admin, owner and previously assigned technician to read', async () => {
      repository.findById.mockResolvedValue(closedRequest);
      feedbackRepository.findByRequestId.mockResolvedValue(feedback);
      await expect(service.getFeedback(request.id, admin)).resolves.toEqual(
        feedback,
      );
      await expect(
        service.getFeedback(request.id, residentUser),
      ).resolves.toEqual(feedback);
      assignmentsRepository.wasAssignedToUser.mockResolvedValue(true);
      await expect(
        service.getFeedback(request.id, technicianUser),
      ).resolves.toEqual(feedback);
    });

    it('denies unrelated residents and technicians', async () => {
      repository.findById.mockResolvedValue(closedRequest);
      await expect(
        service.getFeedback(request.id, {
          ...residentUser,
          id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      assignmentsRepository.wasAssignedToUser.mockResolvedValue(false);
      await expect(
        service.getFeedback(request.id, technicianUser),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
