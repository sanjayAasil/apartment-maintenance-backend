import { IsEnum } from 'class-validator';
import { MaintenanceStatus } from '../../../generated/prisma/enums.js';

export class UpdateMaintenanceRequestStatusDto {
  @IsEnum(MaintenanceStatus)
  status!: MaintenanceStatus;
}
