import { Module } from '@nestjs/common';
import { ApartmentsModule } from '../apartments/apartments.module.js';
import { UsersModule } from '../users/users.module.js';
import { ResidentsController } from './residents.controller.js';
import { ResidentsRepository } from './residents.repository.js';
import { ResidentsService } from './residents.service.js';

@Module({
  imports: [UsersModule, ApartmentsModule],
  controllers: [ResidentsController],
  providers: [ResidentsService, ResidentsRepository],
})
export class ResidentsModule {}
