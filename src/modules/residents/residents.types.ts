import { Prisma } from '../../generated/prisma/client.js';

export const residentSelect = {
  id: true,
  userId: true,
  apartmentId: true,
  phone: true,
  moveInDate: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
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
} satisfies Prisma.ResidentSelect;

export type ResidentWithRelations = Prisma.ResidentGetPayload<{
  select: typeof residentSelect;
}>;

export interface ResidentFilters {
  search?: string;
  apartmentId?: string;
  isActive?: boolean;
  page: number;
  limit: number;
}

export interface PaginatedResidents {
  data: ResidentWithRelations[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}
