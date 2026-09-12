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
import { AssignTechnicianDto } from './dto/assign-technician.dto.js';
import { CreateMaintenanceCommentDto } from './dto/create-maintenance-comment.dto.js';
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
  @Roles(UserRole.ADMIN, UserRole.RESIDENT, UserRole.TECHNICIAN)
  @ApiOperation({ summary: 'List visible maintenance requests' })
  @ApiOkResponse({ description: 'Paginated maintenance request list' })
  list(
    @Query() query: ListMaintenanceRequestsQueryDto,
    @CurrentUser() user: PublicUser,
  ) {
    return this.service.list(query, user);
  }

  @Post(':id/assign')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Assign a technician to an open request' })
  @ApiCreatedResponse({ description: 'Technician assigned' })
  assignTechnician(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: AssignTechnicianDto,
    @CurrentUser() user: PublicUser,
  ) {
    return this.service.assignTechnician(id, input.technicianId, user.id);
  }

  @Patch(':id/assignment')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Reassign a request before work starts' })
  reassignTechnician(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: AssignTechnicianDto,
    @CurrentUser() user: PublicUser,
  ) {
    return this.service.reassignTechnician(id, input.technicianId, user.id);
  }

  @Delete(':id/assignment')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Unassign a request before work starts' })
  unassignTechnician(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: PublicUser,
  ) {
    return this.service.unassignTechnician(id, user.id);
  }

  @Get(':id/assignment')
  @Roles(UserRole.ADMIN, UserRole.RESIDENT, UserRole.TECHNICIAN)
  @ApiOperation({ summary: 'Get the active request assignment' })
  getCurrentAssignment(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: PublicUser,
  ) {
    return this.service.getCurrentAssignment(id, user);
  }

  @Get(':id/assignment-history')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get request assignment history' })
  getAssignmentHistory(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.getAssignmentHistory(id);
  }

  @Post(':id/comments')
  @Roles(UserRole.ADMIN, UserRole.RESIDENT, UserRole.TECHNICIAN)
  @ApiOperation({ summary: 'Add a comment to an accessible request' })
  @ApiCreatedResponse({ description: 'Comment added' })
  addComment(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: CreateMaintenanceCommentDto,
    @CurrentUser() user: PublicUser,
  ) {
    return this.service.addComment(id, input.message, user);
  }

  @Get(':id/comments')
  @Roles(UserRole.ADMIN, UserRole.RESIDENT, UserRole.TECHNICIAN)
  @ApiOperation({ summary: 'List comments for an accessible request' })
  getComments(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: PublicUser,
  ) {
    return this.service.getComments(id, user);
  }

  @Get(':id/history')
  @Roles(UserRole.ADMIN, UserRole.RESIDENT, UserRole.TECHNICIAN)
  @ApiOperation({ summary: 'Get the audit history for an accessible request' })
  getHistory(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: PublicUser,
  ) {
    return this.service.getHistory(id, user);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.RESIDENT, UserRole.TECHNICIAN)
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
  @Roles(UserRole.ADMIN, UserRole.RESIDENT, UserRole.TECHNICIAN)
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
