import { Transform } from 'class-transformer';
import { IsBoolean } from 'class-validator';

function toBoolean({ value }: { value: unknown }): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

export class UpdateUserStatusDto {
  @Transform(toBoolean)
  @IsBoolean()
  isActive: boolean;
}
