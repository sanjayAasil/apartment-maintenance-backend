import { Module } from '@nestjs/common';
import { PartsController } from './parts.controller.js';
import { PartsRepository } from './parts.repository.js';
import { PartsService } from './parts.service.js';

@Module({
  controllers: [PartsController],
  providers: [PartsService, PartsRepository],
  exports: [PartsService, PartsRepository],
})
export class PartsModule {}
