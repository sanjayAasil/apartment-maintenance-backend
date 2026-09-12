import { Injectable } from '@nestjs/common';
import {
  MaintenanceHistoryAction,
  MaintenanceStatus,
} from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  maintenanceAssignmentSelect,
  type MaintenanceAssignmentWithRelations,
} from './maintenance-requests.types.js';

@Injectable()
export class MaintenanceAssignmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveAssignment(
    maintenanceRequestId: string,
  ): Promise<MaintenanceAssignmentWithRelations | null> {
    return this.prisma.maintenanceAssignment.findFirst({
      where: { maintenanceRequestId, isActive: true },
      select: maintenanceAssignmentSelect,
    });
  }

  findHistory(
    maintenanceRequestId: string,
  ): Promise<MaintenanceAssignmentWithRelations[]> {
    return this.prisma.maintenanceAssignment.findMany({
      where: { maintenanceRequestId },
      select: maintenanceAssignmentSelect,
      orderBy: [{ assignedAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  assign(
    maintenanceRequestId: string,
    technicianId: string,
    assignedByUserId: string,
    technicianName: string,
  ): Promise<MaintenanceAssignmentWithRelations> {
    return this.prisma.$transaction(async (transaction) => {
      const assignment = await transaction.maintenanceAssignment.create({
        data: { maintenanceRequestId, technicianId, assignedByUserId },
        select: maintenanceAssignmentSelect,
      });
      await transaction.maintenanceRequest.update({
        where: { id: maintenanceRequestId },
        data: { status: MaintenanceStatus.ASSIGNED },
      });
      await transaction.maintenanceHistory.createMany({
        data: [
          {
            maintenanceRequestId,
            userId: assignedByUserId,
            action: MaintenanceHistoryAction.TECHNICIAN_ASSIGNED,
            newValue: technicianId,
            metadata: { technicianName },
          },
          {
            maintenanceRequestId,
            userId: assignedByUserId,
            action: MaintenanceHistoryAction.STATUS_CHANGED,
            oldValue: MaintenanceStatus.OPEN,
            newValue: MaintenanceStatus.ASSIGNED,
          },
        ],
      });
      return assignment;
    });
  }

  reassign(
    activeAssignmentId: string,
    maintenanceRequestId: string,
    technicianId: string,
    assignedByUserId: string,
    unassignedAt: Date,
    previousTechnicianId: string,
    previousTechnicianName: string,
    technicianName: string,
  ): Promise<MaintenanceAssignmentWithRelations> {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.maintenanceAssignment.update({
        where: { id: activeAssignmentId },
        data: { isActive: false, unassignedAt },
      });
      const assignment = await transaction.maintenanceAssignment.create({
        data: { maintenanceRequestId, technicianId, assignedByUserId },
        select: maintenanceAssignmentSelect,
      });
      await transaction.maintenanceHistory.create({
        data: {
          maintenanceRequestId,
          userId: assignedByUserId,
          action: MaintenanceHistoryAction.TECHNICIAN_REASSIGNED,
          oldValue: previousTechnicianId,
          newValue: technicianId,
          metadata: { previousTechnicianName, technicianName },
        },
      });
      return assignment;
    });
  }

  async unassign(
    activeAssignmentId: string,
    maintenanceRequestId: string,
    actorUserId: string,
    technicianId: string,
    technicianName: string,
    unassignedAt: Date,
  ): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      await transaction.maintenanceAssignment.update({
        where: { id: activeAssignmentId },
        data: { isActive: false, unassignedAt },
      });
      await transaction.maintenanceRequest.update({
        where: { id: maintenanceRequestId },
        data: { status: MaintenanceStatus.OPEN },
      });
      await transaction.maintenanceHistory.createMany({
        data: [
          {
            maintenanceRequestId,
            userId: actorUserId,
            action: MaintenanceHistoryAction.TECHNICIAN_UNASSIGNED,
            oldValue: technicianId,
            metadata: { technicianName },
          },
          {
            maintenanceRequestId,
            userId: actorUserId,
            action: MaintenanceHistoryAction.STATUS_CHANGED,
            oldValue: MaintenanceStatus.ASSIGNED,
            newValue: MaintenanceStatus.OPEN,
          },
        ],
      });
    });
  }
}
