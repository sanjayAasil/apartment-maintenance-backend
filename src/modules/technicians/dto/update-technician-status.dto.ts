import { IsBoolean } from 'class-validator';

export class UpdateTechnicianStatusDto {
  @IsBoolean()
  isActive!: boolean;
}
