import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { UserRole, type User } from '../../generated/prisma/client.js';
import type { PublicUser } from '../users/users.types.js';
import { UsersService } from '../users/users.service.js';
import type { AuthResponse, JwtPayload } from './auth.types.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(input: RegisterDto): Promise<AuthResponse> {
    const existingUser = await this.usersService.findByEmailForAuthentication(
      input.email,
    );

    if (existingUser) {
      throw new ConflictException('Email is already in use');
    }

    const passwordHash = await argon2.hash(input.password);
    const user = await this.usersService.createUser({
      name: input.name,
      email: input.email,
      passwordHash,
      role: UserRole.RESIDENT,
      isActive: true,
    });

    return this.createAuthResponse(user);
  }

  async login(input: LoginDto): Promise<AuthResponse> {
    const user = await this.usersService.findByEmailForAuthentication(
      input.email,
    );

    if (
      !user ||
      !(await this.passwordMatches(user.passwordHash, input.password))
    ) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new ForbiddenException('User account is inactive');
    }

    return this.createAuthResponse(this.toPublicUser(user));
  }

  private async createAuthResponse(user: PublicUser): Promise<AuthResponse> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      user,
    };
  }

  private async passwordMatches(
    passwordHash: string,
    password: string,
  ): Promise<boolean> {
    try {
      return await argon2.verify(passwordHash, password);
    } catch {
      return false;
    }
  }

  private toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
