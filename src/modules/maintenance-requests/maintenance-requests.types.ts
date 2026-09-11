import { Prisma } from '../../generated/prisma/client.js';
import type {
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
