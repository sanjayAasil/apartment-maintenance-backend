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
import { CreateMaintenanceRequestDto } from './dto/create-maintenance-request.dto.js';
import { ListMaintenanceRequestsQueryDto } from './dto/list-maintenance-requests-query.dto.js';
import { UpdateMaintenanceRequestStatusDto } from './dto/update-maintenance-request-status.dto.js';
import { UpdateMaintenanceRequestDto } from './dto/update-maintenance-request.dto.js';
import { MaintenanceRequestsService } from './maintenance-requests.service.js';

@ApiTags('maintenance-requests')
@ApiBearerAuth()
@Controller('maintenance-requests')
export class MaintenanceRequestsController {
  constructor(private readonly service: MaintenanceRequestsService) {}

  @Post()
  @Roles(UserRole.RESIDENT)
  @ApiOperation({
    summary: 'Create a maintenance request for the current resident',
  })
  @ApiCreatedResponse({ description: 'Maintenance request created' })
  create(
    @Body() input: CreateMaintenanceRequestDto,
    @CurrentUser() user: PublicUser,
  ) {
    return this.service.create(input, user);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.RESIDENT)
  @ApiOperation({ summary: 'List visible maintenance requests' })
  @ApiOkResponse({ description: 'Paginated maintenance request list' })
  list(
    @Query() query: ListMaintenanceRequestsQueryDto,
    @CurrentUser() user: PublicUser,
  ) {
    return this.service.list(query, user);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.RESIDENT)
  @ApiOperation({ summary: 'Get a visible maintenance request' })
  @ApiNotFoundResponse({ description: 'Maintenance request not found' })
  getById(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: PublicUser,
  ) {
    return this.service.getById(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.RESIDENT)
  @ApiOperation({ summary: 'Update an open maintenance request' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateMaintenanceRequestDto,
    @CurrentUser() user: PublicUser,
  ) {
    return this.service.update(id, input, user);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.RESIDENT)
  @ApiOperation({
    summary: 'Apply an allowed maintenance request status transition',
  })
  updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateMaintenanceRequestStatusDto,
    @CurrentUser() user: PublicUser,
  ) {
    return this.service.updateStatus(id, input.status, user);
  }
}
