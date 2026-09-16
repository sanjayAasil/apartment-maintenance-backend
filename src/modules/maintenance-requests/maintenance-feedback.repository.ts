import { Injectable } from '@nestjs/common';
import { MaintenanceHistoryAction } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  maintenanceFeedbackSelect,
  type MaintenanceFeedbackWithResident,
} from './maintenance-requests.types.js';

@Injectable()
export class MaintenanceFeedbackRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByRequestId(
    maintenanceRequestId: string,
  ): Promise<MaintenanceFeedbackWithResident | null> {
    return this.prisma.feedback.findUnique({
      where: { maintenanceRequestId },
      select: maintenanceFeedbackSelect,
    });
  }

  create(
    maintenanceRequestId: string,
    residentId: string,
    actorUserId: string,
    rating: number,
    comment: string | null,
  ): Promise<MaintenanceFeedbackWithResident> {
    return this.prisma.$transaction(async (transaction) => {
      const feedback = await transaction.feedback.create({
        data: { maintenanceRequestId, residentId, rating, comment },
        select: maintenanceFeedbackSelect,
      });
      await transaction.maintenanceHistory.create({
        data: {
          maintenanceRequestId,
          userId: actorUserId,
          action: MaintenanceHistoryAction.FEEDBACK_SUBMITTED,
          metadata: { rating },
        },
      });
      return feedback;
    });
  }
}
