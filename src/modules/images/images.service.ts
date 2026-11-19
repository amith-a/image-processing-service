import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import sharp from 'sharp';
import { StorageService } from '../storage/storage.service.js';
import { v7 as uuidv7 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class ImagesService {
  constructor(
    private readonly storageService: StorageService,
    private readonly prisma: PrismaService,
  ) { }

  async processImage(input: Buffer) {
    const uploadedKeys: string[] = [];

    try {
      const id = uuidv7();

      const metadata = await sharp(input).metadata();

      const format = metadata.format;
      if (!format || !['jpeg', 'png', 'webp'].includes(format)) {
        throw new BadRequestException('Unsupported image format');
      }

      const contentType = `image/${format}`;
      const extension = format === 'jpeg' ? 'jpg' : format;
      const originalKey = `original/${id}.${extension}`;

      await this.storageService.upload(originalKey, input, contentType);
      uploadedKeys.push(originalKey);

      // 2. Process image
      const result = await sharp(input)
        .resize(800, 600, { fit: 'cover' })
        .toBuffer();

      const processedKey = `processed/${id}.${extension}`;
      await this.storageService.upload(processedKey, result, contentType);
      uploadedKeys.push(processedKey);

      const image = await this.prisma.image.create({
        data: {
          id,
          originalKey,
          processedKey,
          format,
        },
      });

      return image;
    } catch (error) {
      if (uploadedKeys.length > 0) {
        const cleanupResults = await Promise.allSettled(
          uploadedKeys.map((key) => this.storageService.delete(key)),
        );
        // Check if any deletion failed
        cleanupResults.forEach((result, index) => {
          if (result.status === 'rejected') {
            console.error(
              `Failed to clean up orphaned S3 key: ${uploadedKeys[index]}`,
              result.reason,
            );
          }
        });
      }

      if (error instanceof BadRequestException) {
        throw error;
      }

      console.error(error);
      throw error;
    }
  }

  async findById(id: string) {
    const result = await this.prisma.image.findUnique({
      where: {
        id,
      },
    });

    if (result === null) {
      throw new NotFoundException('Image not found');
    }
    const image = await this.storageService.download(result.processedKey);
    return {
      body: image.Body,
      contentType: image.ContentType,
      contentLength: image.ContentLength,
    };
  }
}
