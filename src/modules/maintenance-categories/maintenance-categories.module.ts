import { Module } from '@nestjs/common';
import { MaintenanceCategoriesController } from './maintenance-categories.controller.js';
import { MaintenanceCategoriesRepository } from './maintenance-categories.repository.js';
import { MaintenanceCategoriesService } from './maintenance-categories.service.js';

@Module({
  controllers: [MaintenanceCategoriesController],
  providers: [MaintenanceCategoriesService, MaintenanceCategoriesRepository],
  exports: [MaintenanceCategoriesService],
})
export class MaintenanceCategoriesModule {}
