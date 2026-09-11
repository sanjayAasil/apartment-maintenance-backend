import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';

export class CreateTechnicianDto {
  @IsUUID()
  userId!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[0-9]{7,15}$/, {
    message: 'phone must contain 7 to 15 digits with an optional leading +',
  })
  phone!: string;

  @IsInt()
  @Min(0)
  experienceYears!: number;
}
