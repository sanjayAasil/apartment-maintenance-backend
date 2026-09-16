import { Prisma } from '../../generated/prisma/client.js';
import type {
  MaintenanceHistoryAction,
  MaintenancePriority,
  MaintenanceStatus,
} from '../../generated/prisma/enums.js';
import { technicianSelect } from '../technicians/technicians.types.js';

export const maintenanceAssignmentSelect = {
  id: true,
  maintenanceRequestId: true,
  technicianId: true,
  assignedByUserId: true,
  assignedAt: true,
  unassignedAt: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  technician: {
    select: technicianSelect,
  },
  assignedBy: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.MaintenanceAssignmentSelect;

export const maintenanceCommentSelect = {
  id: true,
  maintenanceRequestId: true,
  userId: true,
  message: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: { id: true, name: true, role: true },
  },
} satisfies Prisma.MaintenanceCommentSelect;

export const maintenanceHistorySelect = {
  id: true,
  maintenanceRequestId: true,
  userId: true,
  action: true,
  oldValue: true,
  newValue: true,
  metadata: true,
  createdAt: true,
  user: {
    select: { id: true, name: true, role: true },
  },
} satisfies Prisma.MaintenanceHistorySelect;

export const maintenanceFeedbackSelect = {
  id: true,
  maintenanceRequestId: true,
  residentId: true,
  rating: true,
  comment: true,
  createdAt: true,
  updatedAt: true,
  resident: {
    select: {
      id: true,
      user: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.FeedbackSelect;

export const maintenanceWorkNoteSelect = {
  id: true,
  maintenanceRequestId: true,
  technicianId: true,
  diagnosis: true,
  workPerformed: true,
  laborCost: true,
  otherCost: true,
  createdAt: true,
  updatedAt: true,
  technician: {
    select: {
      id: true,
      userId: true,
      user: { select: { id: true, name: true, role: true } },
    },
  },
} satisfies Prisma.MaintenanceWorkNoteSelect;

export const maintenanceRequestPartSelect = {
  id: true,
  maintenanceRequestId: true,
  partId: true,
  quantity: true,
  unitPrice: true,
  createdAt: true,
  part: {
    select: {
      id: true,
      name: true,
      description: true,
      quantity: true,
      unitPrice: true,
      minimumStock: true,
      isActive: true,
    },
  },
} satisfies Prisma.MaintenanceRequestPartSelect;

export const maintenanceRequestSelect = {
  id: true,
  residentId: true,
  apartmentId: true,
  categoryId: true,
  title: true,
  description: true,
  priority: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
  closedAt: true,
  resident: {
    select: {
      id: true,
      userId: true,
      phone: true,
      isActive: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  },
  apartment: {
    select: {
      id: true,
      block: true,
      floor: true,
      unitNumber: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  category: {
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  assignments: {
    where: { isActive: true },
    select: maintenanceAssignmentSelect,
    take: 1,
  },
} satisfies Prisma.MaintenanceRequestSelect;

export type MaintenanceRequestWithRelations =
  Prisma.MaintenanceRequestGetPayload<{
    select: typeof maintenanceRequestSelect;
  }>;

export type MaintenanceAssignmentWithRelations =
  Prisma.MaintenanceAssignmentGetPayload<{
    select: typeof maintenanceAssignmentSelect;
  }>;

export type MaintenanceCommentWithAuthor = Prisma.MaintenanceCommentGetPayload<{
  select: typeof maintenanceCommentSelect;
}>;

export type MaintenanceHistoryWithActor = Prisma.MaintenanceHistoryGetPayload<{
  select: typeof maintenanceHistorySelect;
}>;

export type MaintenanceFeedbackWithResident = Prisma.FeedbackGetPayload<{
  select: typeof maintenanceFeedbackSelect;
}>;

export type MaintenanceWorkNoteWithTechnician =
  Prisma.MaintenanceWorkNoteGetPayload<{
    select: typeof maintenanceWorkNoteSelect;
  }>;

export type MaintenanceRequestPartWithPart =
  Prisma.MaintenanceRequestPartGetPayload<{
    select: typeof maintenanceRequestPartSelect;
  }>;

export interface MaintenanceRequestCost {
  partsCost: number;
  laborCost: number;
  otherCost: number;
  totalCost: number;
}

export interface MaintenanceHistoryEvent {
  action: MaintenanceHistoryAction;
  oldValue?: string | null;
  newValue?: string | null;
  metadata?: Prisma.InputJsonValue;
}

export interface MaintenanceRequestFilters {
  search?: string;
  status?: MaintenanceStatus;
  priority?: MaintenancePriority;
  categoryId?: string;
  apartmentId?: string;
  residentId?: string;
  technicianId?: string;
  page: number;
  limit: number;
  sortBy: 'createdAt' | 'updatedAt' | 'priority' | 'status';
  sortOrder: 'asc' | 'desc';
}

export interface PaginatedMaintenanceRequests {
  data: MaintenanceRequestWithRelations[];
  meta: { page: number; limit: number; total: number };
}
