import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

export class CreateResidentDto {
  @IsUUID()
  userId!: string;

  @IsUUID()
  apartmentId!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[0-9]{7,15}$/, {
    message: 'phone must contain 7 to 15 digits with an optional leading +',
  })
  phone!: string;

  @IsDateString({ strict: true })
  moveInDate!: string;
}
