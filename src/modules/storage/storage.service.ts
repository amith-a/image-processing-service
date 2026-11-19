import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StorageService {
  constructor(
    private readonly s3: S3Client,
    private readonly config: ConfigService,
  ) {}

  async upload(key: string, image: Buffer, contentType: string) {
    const command = new PutObjectCommand({
      Bucket: this.config.getOrThrow<string>('S3_BUCKET_NAME'),
      Key: key,
      Body: image,
      ContentType: contentType,
    });

    await this.s3.send(command);
  }

  async download(key: string) {
    const command = new GetObjectCommand({
      Bucket: this.config.getOrThrow<string>('S3_BUCKET_NAME'),
      Key: key,
    });

    const data = await this.s3.send(command);

    return data;
  }

  async delete(key: string) {
    const command = new DeleteObjectCommand({
      Bucket: this.config.getOrThrow<string>('S3_BUCKET_NAME'),
      Key: key,
    });

    await this.s3.send(command);
  }
}
