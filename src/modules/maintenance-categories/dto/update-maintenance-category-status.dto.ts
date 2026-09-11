import { IsBoolean } from 'class-validator';

export class UpdateMaintenanceCategoryStatusDto {
  @IsBoolean()
  isActive!: boolean;
}
