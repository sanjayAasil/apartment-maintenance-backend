import { Injectable } from '@nestjs/common';
import { MaintenanceStatus } from '../../generated/prisma/enums.js';
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
      return assignment;
    });
  }

  reassign(
    activeAssignmentId: string,
    maintenanceRequestId: string,
    technicianId: string,
    assignedByUserId: string,
    unassignedAt: Date,
  ): Promise<MaintenanceAssignmentWithRelations> {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.maintenanceAssignment.update({
        where: { id: activeAssignmentId },
        data: { isActive: false, unassignedAt },
      });
      return transaction.maintenanceAssignment.create({
        data: { maintenanceRequestId, technicianId, assignedByUserId },
        select: maintenanceAssignmentSelect,
      });
    });
  }

  async unassign(
    activeAssignmentId: string,
    maintenanceRequestId: string,
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
    });
  }
}
