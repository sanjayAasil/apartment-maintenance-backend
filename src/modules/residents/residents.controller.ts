import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '../../generated/prisma/enums.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import type { PublicUser } from '../users/users.types.js';
import { CreateResidentDto } from './dto/create-resident.dto.js';
import { ListResidentsQueryDto } from './dto/list-residents-query.dto.js';
import { UpdateResidentApartmentDto } from './dto/update-resident-apartment.dto.js';
import { UpdateResidentStatusDto } from './dto/update-resident-status.dto.js';
import { UpdateResidentDto } from './dto/update-resident.dto.js';
import { ResidentsService } from './residents.service.js';

@ApiTags('residents')
@ApiBearerAuth()
@Controller('residents')
export class ResidentsController {
  constructor(private readonly residentsService: ResidentsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a resident profile' })
  @ApiCreatedResponse({ description: 'Resident profile created' })
  @ApiConflictResponse({ description: 'Resident profile already exists' })
  create(@Body() input: CreateResidentDto) {
    return this.residentsService.create(input);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List resident profiles' })
  @ApiOkResponse({ description: 'Paginated resident list' })
  list(@Query() query: ListResidentsQueryDto) {
    return this.residentsService.list(query);
  }

  @Get('me')
  @Roles(UserRole.RESIDENT)
  @ApiOperation({ summary: 'Get the current resident profile' })
  @ApiOkResponse({ description: 'Current resident profile' })
  @ApiNotFoundResponse({ description: 'Resident profile not found' })
  getCurrent(@CurrentUser() user: PublicUser) {
    return this.residentsService.getByUserId(user.id);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get a resident profile' })
  @ApiOkResponse({ description: 'Resident profile' })
  @ApiNotFoundResponse({ description: 'Resident not found' })
  getById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.residentsService.getById(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a resident profile' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateResidentDto,
  ) {
    return this.residentsService.update(id, input);
  }

  @Patch(':id/apartment')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Change a resident apartment' })
  changeApartment(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateResidentApartmentDto,
  ) {
    return this.residentsService.changeApartment(id, input.apartmentId);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Activate or deactivate a resident profile' })
  updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateResidentStatusDto,
  ) {
    return this.residentsService.updateStatus(id, input.isActive);
  }
}
