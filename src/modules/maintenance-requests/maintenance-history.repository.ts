import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  maintenanceHistorySelect,
  type MaintenanceHistoryWithActor,
} from './maintenance-requests.types.js';

@Injectable()
export class MaintenanceHistoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    data: Prisma.MaintenanceHistoryUncheckedCreateInput,
  ): Promise<MaintenanceHistoryWithActor> {
    return this.prisma.maintenanceHistory.create({
      data,
      select: maintenanceHistorySelect,
    });
  }

  findByRequestId(
    maintenanceRequestId: string,
  ): Promise<MaintenanceHistoryWithActor[]> {
    return this.prisma.maintenanceHistory.findMany({
      where: { maintenanceRequestId },
      select: maintenanceHistorySelect,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  }
}
