import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { HealthModule } from './modules/health/health.module.js';
import { ConfigModule } from '@nestjs/config';
import { validate } from './config/env.validation.js';
import { ImagesModule } from './modules/images/images.module.js';
import { StorageModule } from './modules/storage/storage.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    HealthModule,
    ImagesModule,
    StorageModule,
    PrismaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
