import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { HealthModule } from './modules/health/health.module.js';
import { ConfigModule } from '@nestjs/config';
import { validate } from './config/env.validation.js';
import { ImagesModule } from './modules/images/images.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    HealthModule,
    ImagesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
