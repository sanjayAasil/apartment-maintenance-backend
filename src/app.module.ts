import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module.js';
import { ApartmentsModule } from './modules/apartments/apartments.module.js';
import { MaintenanceCategoriesModule } from './modules/maintenance-categories/maintenance-categories.module.js';
import { ResidentsModule } from './modules/residents/residents.module.js';
import { TechniciansModule } from './modules/technicians/technicians.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: (config: Record<string, unknown>) => {
        if (!config.DATABASE_URL) {
          throw new Error('DATABASE_URL is required');
        }

        if (!config.JWT_SECRET) {
          throw new Error('JWT_SECRET is required');
        }

        return config;
      },
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    ApartmentsModule,
    ResidentsModule,
    MaintenanceCategoriesModule,
    TechniciansModule,
  ],
})
export class AppModule {}
