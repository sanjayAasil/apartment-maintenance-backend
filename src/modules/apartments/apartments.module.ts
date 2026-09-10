import { Module } from '@nestjs/common';
import { ApartmentsController } from './apartments.controller.js';
import { ApartmentsRepository } from './apartments.repository.js';
import { ApartmentsService } from './apartments.service.js';

@Module({
  controllers: [ApartmentsController],
  providers: [ApartmentsService, ApartmentsRepository],
})
export class ApartmentsModule {}
