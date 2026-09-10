import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type User } from '../../generated/prisma/client.js';
import type { ListUsersQueryDto } from './dto/list-users-query.dto.js';
import type { UpdateUserDto } from './dto/update-user.dto.js';
import type {
  CreateUserInput,
  PaginatedUsers,
  PublicUser,
} from './users.types.js';
import { UsersRepository } from './users.repository.js';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async createUser(input: CreateUserInput): Promise<PublicUser> {
    const data = {
      ...input,
      name: input.name.trim(),
      email: this.normalizeEmail(input.email),
    };

    await this.ensureEmailAvailable(data.email);

    try {
      return await this.usersRepository.create(data);
    } catch (error) {
      this.throwIfDuplicateEmail(error);
      throw error;
    }
  }

  async getUserById(id: string): Promise<PublicUser> {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  findByEmailForAuthentication(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(this.normalizeEmail(email));
  }

  listUsers(query: ListUsersQueryDto): Promise<PaginatedUsers> {
    return this.usersRepository.findMany({
      ...query,
      search: query.search?.trim() || undefined,
    });
  }

  async updateUser(id: string, input: UpdateUserDto): Promise<PublicUser> {
    if (Object.keys(input).length === 0) {
      throw new BadRequestException('At least one field must be provided');
    }

    await this.getUserById(id);

    if (input.name !== undefined && input.name.trim().length === 0) {
      throw new BadRequestException('Name cannot be empty');
    }

    const data: Prisma.UserUpdateInput = {
      ...input,
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.email !== undefined
        ? { email: this.normalizeEmail(input.email) }
        : {}),
    };

    if (typeof data.email === 'string') {
      await this.ensureEmailAvailable(data.email, id);
    }

    try {
      return await this.usersRepository.update(id, data);
    } catch (error) {
      this.throwIfDuplicateEmail(error);
      throw error;
    }
  }

  async setActiveStatus(id: string, isActive: boolean): Promise<PublicUser> {
    await this.getUserById(id);
    return this.usersRepository.setActiveStatus(id, isActive);
  }

  private async ensureEmailAvailable(
    email: string,
    userId?: string,
  ): Promise<void> {
    const existingUser = await this.usersRepository.findByEmail(email);

    if (existingUser && existingUser.id !== userId) {
      throw new ConflictException('Email is already in use');
    }
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private throwIfDuplicateEmail(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Email is already in use');
    }
  }
}
