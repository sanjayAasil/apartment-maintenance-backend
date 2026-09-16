import type { Prisma } from '../../src/generated/prisma/client.js';

export interface SeedData {
  users: Prisma.UserCreateManyInput[];
  apartments: Prisma.ApartmentCreateManyInput[];
  residents: Prisma.ResidentCreateManyInput[];
  categories: Prisma.MaintenanceCategoryCreateManyInput[];
  technicians: Prisma.TechnicianCreateManyInput[];
  skills: Prisma.TechnicianSkillCreateManyInput[];
  parts: Prisma.PartCreateManyInput[];
  requests: Prisma.MaintenanceRequestCreateManyInput[];
  assignments: Prisma.MaintenanceAssignmentCreateManyInput[];
  comments: Prisma.MaintenanceCommentCreateManyInput[];
  history: Prisma.MaintenanceHistoryCreateManyInput[];
  notes: Prisma.MaintenanceWorkNoteCreateManyInput[];
  usages: Prisma.MaintenanceRequestPartCreateManyInput[];
  feedback: Prisma.FeedbackCreateManyInput[];
}

export interface SeedPlan {
  data: SeedData;
  start: Date;
  end: Date;
  openingStock: Record<string, number>;
}
