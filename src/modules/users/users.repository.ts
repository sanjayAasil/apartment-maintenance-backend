import { Injectable } from '@nestjs/common';
import { Prisma, type User } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type {
  CreateUserInput,
  PaginatedUsers,
  PublicUser,
  UserFilters,
} from './users.types.js';

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateUserInput): Promise<PublicUser> {
    return this.prisma.user.create({ data, select: publicUserSelect });
  }

  findById(id: string): Promise<PublicUser | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: publicUserSelect,
    });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findMany(filters: UserFilters): Promise<PaginatedUsers> {
    const { role, isActive, search, page, limit } = filters;
    const where: Prisma.UserWhereInput = {
      role,
      isActive,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: publicUserSelect,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, meta: { page, limit, total } };
  }

  update(id: string, data: Prisma.UserUpdateInput): Promise<PublicUser> {
    return this.prisma.user.update({
      where: { id },
      data,
      select: publicUserSelect,
    });
  }

  setActiveStatus(id: string, isActive: boolean): Promise<PublicUser> {
    return this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: publicUserSelect,
    });
  }
}
