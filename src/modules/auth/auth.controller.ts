import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { PublicUser } from '../users/users.types.js';
import { AuthService } from './auth.service.js';
import type { AuthResponse } from './auth.types.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { Public } from './decorators/public.decorator.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a resident account' })
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse({ description: 'Resident registered successfully' })
  @ApiConflictResponse({ description: 'Email is already in use' })
  register(@Body() input: RegisterDto): Promise<AuthResponse> {
    return this.authService.register(input);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ description: 'Login successful' })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password' })
  @ApiForbiddenResponse({ description: 'User account is inactive' })
  login(@Body() input: LoginDto): Promise<AuthResponse> {
    return this.authService.login(input);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the authenticated user' })
  @ApiOkResponse({ description: 'Current public user profile' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired access token' })
  getCurrentUser(@CurrentUser() user: PublicUser): PublicUser {
    return user;
  }
}
