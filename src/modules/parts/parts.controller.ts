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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '../../generated/prisma/enums.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CreatePartDto } from './dto/create-part.dto.js';
import { ListPartsQueryDto } from './dto/list-parts-query.dto.js';
import { UpdatePartStatusDto } from './dto/update-part-status.dto.js';
import { UpdatePartStockDto } from './dto/update-part-stock.dto.js';
import { UpdatePartDto } from './dto/update-part.dto.js';
import { PartsService } from './parts.service.js';

@ApiTags('parts')
@ApiBearerAuth()
@Controller('parts')
export class PartsController {
  constructor(private readonly service: PartsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() input: CreatePartDto) {
    return this.service.create(input);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TECHNICIAN)
  list(@Query() query: ListPartsQueryDto) {
    return this.service.list(query);
  }

  @Get('low-stock')
  @Roles(UserRole.ADMIN)
  lowStock() {
    return this.service.lowStock();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.TECHNICIAN)
  getById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.getById(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdatePartDto,
  ) {
    return this.service.update(id, input);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdatePartStatusDto,
  ) {
    return this.service.updateStatus(id, input.isActive);
  }

  @Patch(':id/stock')
  @Roles(UserRole.ADMIN)
  setStock(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdatePartStockDto,
  ) {
    return this.service.setStock(id, input.quantity);
  }
}
