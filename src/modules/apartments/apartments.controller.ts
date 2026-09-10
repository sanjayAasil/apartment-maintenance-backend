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
import { ApartmentsService } from './apartments.service.js';
import { CreateApartmentDto } from './dto/create-apartment.dto.js';
import { ListApartmentsQueryDto } from './dto/list-apartments-query.dto.js';
import { UpdateApartmentDto } from './dto/update-apartment.dto.js';

@ApiTags('apartments')
@ApiBearerAuth()
@Controller('apartments')
export class ApartmentsController {
  constructor(private readonly apartmentsService: ApartmentsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create an apartment' })
  @ApiCreatedResponse({ description: 'Apartment created successfully' })
  @ApiConflictResponse({ description: 'Apartment identifier already exists' })
  create(@Body() input: CreateApartmentDto) {
    return this.apartmentsService.create(input);
  }

  @Get()
  @ApiOperation({ summary: 'List apartments' })
  @ApiOkResponse({ description: 'Paginated apartment list' })
  list(@Query() query: ListApartmentsQueryDto) {
    return this.apartmentsService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an apartment' })
  @ApiOkResponse({ description: 'Apartment details' })
  @ApiNotFoundResponse({ description: 'Apartment not found' })
  getById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.apartmentsService.getById(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update an apartment' })
  @ApiOkResponse({ description: 'Apartment updated successfully' })
  @ApiNotFoundResponse({ description: 'Apartment not found' })
  @ApiConflictResponse({ description: 'Apartment identifier already exists' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateApartmentDto,
  ) {
    return this.apartmentsService.update(id, input);
  }
}
