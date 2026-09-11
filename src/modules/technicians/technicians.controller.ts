import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '../../generated/prisma/enums.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import type { PublicUser } from '../users/users.types.js';
import { AssignTechnicianSkillDto } from './dto/assign-technician-skill.dto.js';
import { CreateTechnicianDto } from './dto/create-technician.dto.js';
import { ListAvailableTechniciansQueryDto } from './dto/list-available-technicians-query.dto.js';
import { ListTechniciansQueryDto } from './dto/list-technicians-query.dto.js';
import { UpdateTechnicianAvailabilityDto } from './dto/update-technician-availability.dto.js';
import { UpdateTechnicianStatusDto } from './dto/update-technician-status.dto.js';
import { UpdateTechnicianDto } from './dto/update-technician.dto.js';
import { TechniciansService } from './technicians.service.js';

@ApiTags('technicians')
@ApiBearerAuth()
@Controller('technicians')
export class TechniciansController {
  constructor(private readonly service: TechniciansService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a technician profile' })
  create(@Body() input: CreateTechnicianDto) {
    return this.service.create(input);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List technician profiles' })
  list(@Query() query: ListTechniciansQueryDto) {
    return this.service.list(query);
  }

  @Get('available')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Find active and available technicians' })
  findAvailable(@Query() query: ListAvailableTechniciansQueryDto) {
    return this.service.findAvailable(query.categoryId);
  }

  @Get('me')
  @Roles(UserRole.TECHNICIAN)
  @ApiOperation({ summary: 'Get the current technician profile' })
  getCurrent(@CurrentUser() user: PublicUser) {
    return this.service.getByUserId(user.id);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get a technician profile' })
  getById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.getById(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a technician profile' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateTechnicianDto,
  ) {
    return this.service.update(id, input);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Activate or deactivate a technician profile' })
  updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateTechnicianStatusDto,
  ) {
    return this.service.updateStatus(id, input.isActive);
  }

  @Patch(':id/availability')
  @Roles(UserRole.ADMIN, UserRole.TECHNICIAN)
  @ApiOperation({ summary: 'Update technician availability' })
  updateAvailability(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateTechnicianAvailabilityDto,
    @CurrentUser() user: PublicUser,
  ) {
    return this.service.updateAvailability(id, input.isAvailable, user);
  }

  @Get(':id/skills')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List technician skills' })
  listSkills(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.listSkills(id);
  }

  @Post(':id/skills')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Assign a technician skill' })
  addSkill(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: AssignTechnicianSkillDto,
  ) {
    return this.service.addSkill(id, input.categoryId);
  }

  @Delete(':id/skills/:categoryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Remove a technician skill' })
  removeSkill(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('categoryId', new ParseUUIDPipe()) categoryId: string,
  ) {
    return this.service.removeSkill(id, categoryId);
  }
}
