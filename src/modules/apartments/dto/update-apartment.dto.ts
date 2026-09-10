import { PartialType } from '@nestjs/swagger';
import { CreateApartmentDto } from './create-apartment.dto.js';

export class UpdateApartmentDto extends PartialType(CreateApartmentDto) {}
