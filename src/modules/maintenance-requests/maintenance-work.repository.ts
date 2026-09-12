import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { MaintenanceHistoryAction } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  maintenanceRequestPartSelect,
  maintenanceWorkNoteSelect,
  type MaintenanceRequestCost,
  type MaintenanceRequestPartWithPart,
  type MaintenanceWorkNoteWithTechnician,
} from './maintenance-requests.types.js';

export class InsufficientStockError extends Error {}

@Injectable()
export class MaintenanceWorkRepository {
  constructor(private readonly prisma: PrismaService) {}

  findWorkNote(
    maintenanceRequestId: string,
  ): Promise<MaintenanceWorkNoteWithTechnician | null> {
    return this.prisma.maintenanceWorkNote.findUnique({
      where: { maintenanceRequestId },
      select: maintenanceWorkNoteSelect,
    });
  }

  createWorkNote(
    maintenanceRequestId: string,
    technicianId: string,
    actorUserId: string,
    data: {
      diagnosis: string;
      workPerformed: string;
      laborCost: Prisma.Decimal;
      otherCost: Prisma.Decimal;
    },
  ): Promise<MaintenanceWorkNoteWithTechnician> {
    return this.prisma.$transaction(async (transaction) => {
      const note = await transaction.maintenanceWorkNote.create({
        data: { maintenanceRequestId, technicianId, ...data },
        select: maintenanceWorkNoteSelect,
      });
      await transaction.maintenanceHistory.create({
        data: {
          maintenanceRequestId,
          userId: actorUserId,
          action: MaintenanceHistoryAction.WORK_NOTE_CREATED,
          newValue: note.id,
        },
      });
      return note;
    });
  }

  updateWorkNote(
    id: string,
    maintenanceRequestId: string,
    actorUserId: string,
    data: Prisma.MaintenanceWorkNoteUpdateInput,
  ): Promise<MaintenanceWorkNoteWithTechnician> {
    return this.prisma.$transaction(async (transaction) => {
      const note = await transaction.maintenanceWorkNote.update({
        where: { id },
        data,
        select: maintenanceWorkNoteSelect,
      });
      await transaction.maintenanceHistory.create({
        data: {
          maintenanceRequestId,
          userId: actorUserId,
          action: MaintenanceHistoryAction.WORK_NOTE_UPDATED,
          newValue: note.id,
        },
      });
      return note;
    });
  }

  findParts(
    maintenanceRequestId: string,
  ): Promise<MaintenanceRequestPartWithPart[]> {
    return this.prisma.maintenanceRequestPart.findMany({
      where: { maintenanceRequestId },
      select: maintenanceRequestPartSelect,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  }

  findPartUsage(id: string): Promise<MaintenanceRequestPartWithPart | null> {
    return this.prisma.maintenanceRequestPart.findUnique({
      where: { id },
      select: maintenanceRequestPartSelect,
    });
  }

  addPart(
    maintenanceRequestId: string,
    partId: string,
    quantity: number,
    unitPrice: Prisma.Decimal,
    partName: string,
    actorUserId: string,
  ): Promise<MaintenanceRequestPartWithPart> {
    return this.prisma.$transaction(async (transaction) => {
      const changed = await transaction.part.updateMany({
        where: { id: partId, isActive: true, quantity: { gte: quantity } },
        data: { quantity: { decrement: quantity } },
      });
      if (changed.count !== 1) throw new InsufficientStockError();
      const usage = await transaction.maintenanceRequestPart.create({
        data: { maintenanceRequestId, partId, quantity, unitPrice },
        select: maintenanceRequestPartSelect,
      });
      await transaction.maintenanceHistory.create({
        data: {
          maintenanceRequestId,
          userId: actorUserId,
          action: MaintenanceHistoryAction.PART_ADDED,
          newValue: usage.id,
          metadata: { partId, partName, quantity },
        },
      });
      return usage;
    });
  }

  async removePart(
    usage: MaintenanceRequestPartWithPart,
    actorUserId: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      await transaction.part.update({
        where: { id: usage.partId },
        data: { quantity: { increment: usage.quantity } },
      });
      await transaction.maintenanceRequestPart.delete({
        where: { id: usage.id },
      });
      await transaction.maintenanceHistory.create({
        data: {
          maintenanceRequestId: usage.maintenanceRequestId,
          userId: actorUserId,
          action: MaintenanceHistoryAction.PART_REMOVED,
          oldValue: usage.id,
          metadata: {
            partId: usage.partId,
            partName: usage.part.name,
            quantity: usage.quantity,
          },
        },
      });
    });
  }

  async getCost(maintenanceRequestId: string): Promise<MaintenanceRequestCost> {
    const [note, usages] = await Promise.all([
      this.prisma.maintenanceWorkNote.findUnique({
        where: { maintenanceRequestId },
        select: { laborCost: true, otherCost: true },
      }),
      this.prisma.maintenanceRequestPart.findMany({
        where: { maintenanceRequestId },
        select: { quantity: true, unitPrice: true },
      }),
    ]);
    const partsCost = usages.reduce(
      (total, usage) => total + usage.quantity * Number(usage.unitPrice),
      0,
    );
    const laborCost = Number(note?.laborCost ?? 0);
    const otherCost = Number(note?.otherCost ?? 0);
    return {
      partsCost,
      laborCost,
      otherCost,
      totalCost: partsCost + laborCost + otherCost,
    };
  }
}
