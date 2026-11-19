import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';

import { StorageService } from './storage.service.js';

@Module({
  providers: [
    {
      provide: S3Client, // class as token, no string constant or circular import
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const endpoint = config.get<string>('S3_ENDPOINT'); // set only for local/MinIO
        const accessKeyId = config.get<string>('S3_ACCESS_KEY_ID');
        const secretAccessKey = config.get<string>('S3_SECRET_ACCESS_KEY');

        return new S3Client({
          region: config.getOrThrow<string>('S3_REGION'),
          ...(endpoint && { endpoint, forcePathStyle: true }),
          // omit credentials entirely in AWS so the default provider chain (IAM role) is used
          ...(accessKeyId && secretAccessKey && {
            credentials: { accessKeyId, secretAccessKey },
          }),
        });
      },
    },
    StorageService,
  ],
  exports: [StorageService],
})
export class StorageModule {}