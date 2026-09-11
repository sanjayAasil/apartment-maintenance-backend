import { Prisma } from '../../generated/prisma/client.js';

export const technicianSelect = {
  id: true,
  userId: true,
  phone: true,
  experienceYears: true,
  isAvailable: true,
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
  skills: {
    select: {
      id: true,
      technicianId: true,
      categoryId: true,
      createdAt: true,
      category: {
        select: {
          id: true,
          name: true,
          description: true,
          isActive: true,
        },
      },
    },
    orderBy: { category: { name: 'asc' } },
  },
} satisfies Prisma.TechnicianSelect;

export const technicianSkillSelect = technicianSelect.skills.select;

export type TechnicianWithRelations = Prisma.TechnicianGetPayload<{
  select: typeof technicianSelect;
}>;
export type TechnicianSkillWithCategory = Prisma.TechnicianSkillGetPayload<{
  select: typeof technicianSkillSelect;
}>;

export interface TechnicianFilters {
  search?: string;
  isActive?: boolean;
  isAvailable?: boolean;
  categoryId?: string;
  page: number;
  limit: number;
}

export interface PaginatedTechnicians {
  data: TechnicianWithRelations[];
  meta: { page: number; limit: number; total: number };
}
