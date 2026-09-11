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
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CreateMaintenanceCategoryDto } from './dto/create-maintenance-category.dto.js';
import { ListMaintenanceCategoriesQueryDto } from './dto/list-maintenance-categories-query.dto.js';
import { UpdateMaintenanceCategoryStatusDto } from './dto/update-maintenance-category-status.dto.js';
import { UpdateMaintenanceCategoryDto } from './dto/update-maintenance-category.dto.js';
import { MaintenanceCategoriesService } from './maintenance-categories.service.js';

@ApiTags('maintenance-categories')
@ApiBearerAuth()
@Controller('maintenance-categories')
export class MaintenanceCategoriesController {
  constructor(private readonly service: MaintenanceCategoriesService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a maintenance category' })
  @ApiCreatedResponse({ description: 'Maintenance category created' })
  @ApiConflictResponse({ description: 'Maintenance category already exists' })
  create(@Body() input: CreateMaintenanceCategoryDto) {
    return this.service.create(input);
  }

  @Get()
  @ApiOperation({ summary: 'List maintenance categories' })
  @ApiOkResponse({ description: 'Paginated maintenance category list' })
  list(@Query() query: ListMaintenanceCategoriesQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a maintenance category' })
  @ApiOkResponse({ description: 'Maintenance category details' })
  @ApiNotFoundResponse({ description: 'Maintenance category not found' })
  getById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.getById(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a maintenance category' })
  @ApiConflictResponse({ description: 'Maintenance category already exists' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateMaintenanceCategoryDto,
  ) {
    return this.service.update(id, input);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Activate or deactivate a maintenance category' })
  updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateMaintenanceCategoryStatusDto,
  ) {
    return this.service.updateStatus(id, input.isActive);
  }
}
