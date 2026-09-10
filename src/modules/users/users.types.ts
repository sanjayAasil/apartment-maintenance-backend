import type { User, UserRole } from '../../generated/prisma/client.js';

export type PublicUser = Omit<User, 'passwordHash'>;

export type CreateUserInput = Pick<
  User,
  'name' | 'email' | 'passwordHash' | 'role'
> &
  Partial<Pick<User, 'isActive'>>;

export interface UserFilters {
  role?: UserRole;
  isActive?: boolean;
  search?: string;
  page: number;
  limit: number;
}

export interface PaginatedUsers {
  data: PublicUser[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}
