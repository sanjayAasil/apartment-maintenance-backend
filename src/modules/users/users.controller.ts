import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '../../generated/prisma/enums.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { ListUsersQueryDto } from './dto/list-users-query.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import type { PaginatedUsers, PublicUser } from './users.types.js';
import { UsersService } from './users.service.js';

@ApiTags('users')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  listUsers(@Query() query: ListUsersQueryDto): Promise<PaginatedUsers> {
    return this.usersService.listUsers(query);
  }

  @Get(':id')
  getUserById(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<PublicUser> {
    return this.usersService.getUserById(id);
  }

  @Patch(':id')
  updateUser(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateUserDto,
  ): Promise<PublicUser> {
    return this.usersService.updateUser(id, input);
  }

  @Patch(':id/status')
  setActiveStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateUserStatusDto,
  ): Promise<PublicUser> {
    return this.usersService.setActiveStatus(id, input.isActive);
  }
}
