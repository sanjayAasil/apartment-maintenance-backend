import { PartialType } from '@nestjs/swagger';
import { CreateMaintenanceWorkNoteDto } from './create-maintenance-work-note.dto.js';

export class UpdateMaintenanceWorkNoteDto extends PartialType(
  CreateMaintenanceWorkNoteDto,
) {}
