import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('Apartment Maintenance API')
    .setDescription('API documentation for Apartment Maintenance backend')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/docs', app, document);
  const configService = app.get(ConfigService);
  const configuredCorsOrigins = configService
    .get<string>('CORS_ORIGINS', '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowLocalDevelopmentOrigins =
    configService.get<string>('NODE_ENV', 'development') !== 'production';
  const localDevelopmentOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      const isAllowed =
        !origin ||
        configuredCorsOrigins.includes(origin) ||
        (allowLocalDevelopmentOrigins && localDevelopmentOrigin.test(origin));

      callback(
        isAllowed ? null : new Error(`Origin ${origin} is not allowed by CORS`),
        isAllowed,
      );
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'ngrok-skip-browser-warning',
    ],
    optionsSuccessStatus: 204,
  });

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
}
await bootstrap();
