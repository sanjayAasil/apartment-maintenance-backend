import { IsBoolean } from 'class-validator';

export class UpdateTechnicianAvailabilityDto {
  @IsBoolean()
  isAvailable!: boolean;
}
