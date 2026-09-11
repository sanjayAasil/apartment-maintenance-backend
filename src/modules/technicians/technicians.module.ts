import { Module } from '@nestjs/common';
import { MaintenanceCategoriesModule } from '../maintenance-categories/maintenance-categories.module.js';
import { UsersModule } from '../users/users.module.js';
import { TechniciansController } from './technicians.controller.js';
import { TechniciansRepository } from './technicians.repository.js';
import { TechniciansService } from './technicians.service.js';

@Module({
  imports: [UsersModule, MaintenanceCategoriesModule],
  controllers: [TechniciansController],
  providers: [TechniciansService, TechniciansRepository],
  exports: [TechniciansService],
})
export class TechniciansModule {}
