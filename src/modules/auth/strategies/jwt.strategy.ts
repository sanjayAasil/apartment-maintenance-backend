import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { PublicUser } from '../../users/users.types.js';
import { UsersService } from '../../users/users.service.js';
import type { JwtPayload } from '../auth.types.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<PublicUser> {
    try {
      const user = await this.usersService.getUserById(payload.sub);

      if (!user.isActive) {
        throw new UnauthorizedException('Invalid or expired access token');
      }

      return user;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}
