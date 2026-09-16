import type { MaintenanceStatus } from '../../generated/prisma/enums.js';

export interface DashboardRange {
  from: Date;
  to: Date;
}
export interface RequestStatusCount {
  status: MaintenanceStatus;
  count: number;
}
export interface RequestCategoryCount {
  categoryId: string;
  categoryName: string;
  count: number;
}
export interface TechnicianWorkload {
  technicianId: string;
  name: string;
  activeAssignments: number;
  inProgressRequests: number;
  resolvedCount: number;
  isAvailable: boolean;
  isActive: boolean;
}
export interface MaintenanceCostSummary {
  partsCost: number;
  laborCost: number;
  otherCost: number;
  totalCost: number;
}
export interface ResolutionTimeSummary {
  averageMinutes: number | null;
  averageHours: number | null;
  resolvedRequests: number;
}
export interface FeedbackSummary {
  totalFeedback: number;
  averageRating: number | null;
  ratings: Record<string, number>;
}
