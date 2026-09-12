import { Prisma } from '../../generated/prisma/client.js';

export const partSelect = {
  id: true,
  name: true,
  description: true,
  quantity: true,
  unitPrice: true,
  minimumStock: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PartSelect;

export type PartRecord = Prisma.PartGetPayload<{ select: typeof partSelect }>;

export interface PartFilters {
  search?: string;
  isActive?: boolean;
  lowStock?: boolean;
  page: number;
  limit: number;
}

export interface PaginatedParts {
  data: PartRecord[];
  meta: { page: number; limit: number; total: number };
}
