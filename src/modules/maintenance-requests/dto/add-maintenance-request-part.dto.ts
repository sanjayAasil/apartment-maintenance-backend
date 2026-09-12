import { Type } from 'class-transformer';
import { IsInt, IsUUID, Min } from 'class-validator';

export class AddMaintenanceRequestPartDto {
  @IsUUID()
  partId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}
