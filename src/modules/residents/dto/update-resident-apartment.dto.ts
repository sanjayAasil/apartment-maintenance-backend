import { IsUUID } from 'class-validator';

export class UpdateResidentApartmentDto {
  @IsUUID()
  apartmentId!: string;
}
