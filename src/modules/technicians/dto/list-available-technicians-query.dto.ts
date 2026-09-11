import { IsOptional, IsUUID } from 'class-validator';

export class ListAvailableTechniciansQueryDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
