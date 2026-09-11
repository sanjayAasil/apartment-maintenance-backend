import { Module } from '@nestjs/common';
import { MaintenanceCategoriesModule } from '../maintenance-categories/maintenance-categories.module.js';
import { ResidentsModule } from '../residents/residents.module.js';
import { MaintenanceRequestsController } from './maintenance-requests.controller.js';
import { MaintenanceRequestsRepository } from './maintenance-requests.repository.js';
import { MaintenanceRequestsService } from './maintenance-requests.service.js';

@Module({
  imports: [ResidentsModule, MaintenanceCategoriesModule],
  controllers: [MaintenanceRequestsController],
  providers: [MaintenanceRequestsService, MaintenanceRequestsRepository],
  exports: [MaintenanceRequestsService],
})
export class MaintenanceRequestsModule {}
