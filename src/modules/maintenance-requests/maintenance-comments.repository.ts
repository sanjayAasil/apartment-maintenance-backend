import { Injectable } from '@nestjs/common';
import { MaintenanceHistoryAction } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  maintenanceCommentSelect,
  type MaintenanceCommentWithAuthor,
} from './maintenance-requests.types.js';

@Injectable()
export class MaintenanceCommentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    maintenanceRequestId: string,
    userId: string,
    message: string,
  ): Promise<MaintenanceCommentWithAuthor> {
    return this.prisma.$transaction(async (transaction) => {
      const comment = await transaction.maintenanceComment.create({
        data: { maintenanceRequestId, userId, message },
        select: maintenanceCommentSelect,
      });
      await transaction.maintenanceHistory.create({
        data: {
          maintenanceRequestId,
          userId,
          action: MaintenanceHistoryAction.COMMENT_ADDED,
          newValue: comment.id,
        },
      });
      return comment;
    });
  }

  findByRequestId(
    maintenanceRequestId: string,
  ): Promise<MaintenanceCommentWithAuthor[]> {
    return this.prisma.maintenanceComment.findMany({
      where: { maintenanceRequestId },
      select: maintenanceCommentSelect,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  }
}
