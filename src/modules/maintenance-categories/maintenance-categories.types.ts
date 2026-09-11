import { Prisma } from '../../generated/prisma/client.js';

export const maintenanceCategorySelect = {
  id: true,
  name: true,
  description: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.MaintenanceCategorySelect;

export type MaintenanceCategoryRecord = Prisma.MaintenanceCategoryGetPayload<{
  select: typeof maintenanceCategorySelect;
}>;

export interface MaintenanceCategoryFilters {
  search?: string;
  isActive?: boolean;
  page: number;
  limit: number;
}

export interface PaginatedMaintenanceCategories {
  data: MaintenanceCategoryRecord[];
  meta: { page: number; limit: number; total: number };
}
