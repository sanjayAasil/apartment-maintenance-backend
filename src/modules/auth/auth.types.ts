import type { UserRole } from '../../generated/prisma/client.js';
import type { PublicUser } from '../users/users.types.js';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export interface AuthResponse {
  accessToken: string;
  user: PublicUser;
}
