import { Module } from '@nestjs/common';
import { MaintenanceCategoriesModule } from '../maintenance-categories/maintenance-categories.module.js';
import { PartsModule } from '../parts/parts.module.js';
import { ResidentsModule } from '../residents/residents.module.js';
import { TechniciansModule } from '../technicians/technicians.module.js';
import { MaintenanceAssignmentsRepository } from './maintenance-assignments.repository.js';
import { MaintenanceCommentsRepository } from './maintenance-comments.repository.js';
import { MaintenanceHistoryRepository } from './maintenance-history.repository.js';
import { MaintenanceRequestsController } from './maintenance-requests.controller.js';
import { MaintenanceRequestsRepository } from './maintenance-requests.repository.js';
import { MaintenanceRequestsService } from './maintenance-requests.service.js';
import { MaintenanceWorkRepository } from './maintenance-work.repository.js';

@Module({
  imports: [
    ResidentsModule,
    MaintenanceCategoriesModule,
    TechniciansModule,
    PartsModule,
  ],
  controllers: [MaintenanceRequestsController],
  providers: [
    MaintenanceRequestsService,
    MaintenanceRequestsRepository,
    MaintenanceAssignmentsRepository,
    MaintenanceCommentsRepository,
    MaintenanceHistoryRepository,
    MaintenanceWorkRepository,
  ],
  exports: [MaintenanceRequestsService],
})
export class MaintenanceRequestsModule {}
