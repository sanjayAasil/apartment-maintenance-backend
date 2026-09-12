import { IsBoolean } from 'class-validator';

export class UpdatePartStatusDto {
  @IsBoolean()
  isActive!: boolean;
}
