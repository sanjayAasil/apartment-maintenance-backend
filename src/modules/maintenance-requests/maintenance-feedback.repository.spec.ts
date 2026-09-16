import { MaintenanceHistoryAction } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { MaintenanceFeedbackRepository } from './maintenance-feedback.repository.js';

describe('MaintenanceFeedbackRepository', () => {
  it('creates feedback and its audit event in one transaction', async () => {
    const feedback = {
      id: 'feedback-id',
      maintenanceRequestId: 'request-id',
      residentId: 'resident-id',
      rating: 5,
      comment: 'Great service',
      createdAt: new Date(),
      updatedAt: new Date(),
      resident: {
        id: 'resident-id',
        user: { id: 'user-id', name: 'Riya Resident' },
      },
    };
    const transaction = {
      feedback: { create: vi.fn().mockResolvedValue(feedback) },
      maintenanceHistory: { create: vi.fn().mockResolvedValue({}) },
    };
    const prisma = {
      $transaction: vi.fn(
        (operation: (client: typeof transaction) => Promise<unknown>) =>
          operation(transaction),
      ),
    };
    const repository = new MaintenanceFeedbackRepository(
      prisma as unknown as PrismaService,
    );

    await expect(
      repository.create(
        'request-id',
        'resident-id',
        'user-id',
        5,
        'Great service',
      ),
    ).resolves.toEqual(feedback);
    expect(transaction.feedback.create).toHaveBeenCalledOnce();
    expect(transaction.maintenanceHistory.create).toHaveBeenCalledWith({
      data: {
        maintenanceRequestId: 'request-id',
        userId: 'user-id',
        action: MaintenanceHistoryAction.FEEDBACK_SUBMITTED,
        metadata: { rating: 5 },
      },
    });
  });
});
