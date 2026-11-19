import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
  });
  app.useGlobalFilters(new HttpExceptionFilter());
  const configService = app.get(ConfigService);

  const port = configService.get<number>('PORT', 3000);

  await app.listen(port);
}
await bootstrap();
