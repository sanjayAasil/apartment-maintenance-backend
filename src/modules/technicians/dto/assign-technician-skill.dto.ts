import { IsUUID } from 'class-validator';

export class AssignTechnicianSkillDto {
  @IsUUID()
  categoryId!: string;
}
