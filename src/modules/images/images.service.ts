import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import sharp from 'sharp';
import { StorageService } from '../storage/storage.service.js';
import { v7 as uuidv7 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { TransformImageDTO } from './dto/process-image.schema.js';

@Injectable()
export class ImagesService {
  constructor(
    private readonly storageService: StorageService,
    private readonly prisma: PrismaService,
  ) {}

  async uploadImage(input: Buffer) {
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

      try {
        const image = await this.prisma.image.create({
          data: {
            id,
            originalKey,
            format,
          },
        });

        return image;
      } catch (dbError) {
        // Rollback uploaded original image if database write fails
        await this.storageService.delete(originalKey).catch((err) => {
          console.error(`Failed to delete orphaned S3 key: ${originalKey}`, err);
        });
        throw dbError;
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      console.error(error);
      throw error;
    }
  }

  async transformImage(id: string, options: TransformImageDTO) {
    const image = await this.prisma.image.findUnique({
      where: { id },
    });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    // 1. Download original image from S3
    const originalObject = await this.storageService.download(image.originalKey);
    const byteArray = await originalObject.Body?.transformToByteArray();

    if (!byteArray) {
      throw new InternalServerErrorException(
        'Failed to retrieve original image from storage',
      );
    }

    const originalBuffer = Buffer.from(byteArray);

    // 2. Build and execute Sharp transformation pipeline (Client/Input error boundary)
    let processedBuffer: Buffer;
    const targetFormat =
      options.format ?? (image.format as 'jpeg' | 'png' | 'webp');

    try {
      let pipeline = sharp(originalBuffer);

      if (options.rotate !== undefined) {
        pipeline = pipeline.rotate(options.rotate);
      }

      if (options.flip) {
        pipeline = pipeline.flip();
      }

      if (options.flop) {
        pipeline = pipeline.flop();
      }

      if (options.width || options.height) {
        pipeline = pipeline.resize({
          width: options.width,
          height: options.height,
          fit: options.fit ?? 'cover',
        });
      }

      if (options.grayscale) {
        pipeline = pipeline.grayscale();
      }

      if (options.sepia) {
        // Sepia recomb matrix
        pipeline = pipeline.recomb([
          [0.393, 0.769, 0.189],
          [0.349, 0.686, 0.168],
          [0.272, 0.534, 0.131],
        ]);
      }

      const quality = options.quality ?? 80;

      if (targetFormat === 'jpeg') {
        pipeline = pipeline.jpeg({ quality });
      } else if (targetFormat === 'png') {
        pipeline = pipeline.png({ quality });
      } else if (targetFormat === 'webp') {
        pipeline = pipeline.webp({ quality });
      }

      processedBuffer = await pipeline.toBuffer();
    } catch (sharpError) {
      console.error(`Sharp transformation failed for image ${id}`, sharpError);
      throw new BadRequestException('Image transformation failed');
    }

    // 3. Upload processed image to S3 (Infrastructure boundary)
    const targetExtension = targetFormat === 'jpeg' ? 'jpg' : targetFormat;
    const processedKey = `processed/${id}.${targetExtension}`;
    const contentType = `image/${targetFormat}`;

    await this.storageService.upload(
      processedKey,
      processedBuffer,
      contentType,
    );

    // 4. Update image record in PostgreSQL with rollback on failure
    try {
      const updatedImage = await this.prisma.image.update({
        where: { id },
        data: {
          processedKey,
          format: targetFormat,
        },
      });

      return updatedImage;
    } catch (dbError) {
      // Clean up orphaned processed S3 object if database update fails
      await this.storageService.delete(processedKey).catch((cleanupErr) => {
        console.error(
          `Failed to delete orphaned S3 key: ${processedKey}`,
          cleanupErr,
        );
      });
      throw dbError;
    }
  }

  /**
   * Retrieve an image by ID:
   * Returns processed image if available, otherwise original image.
   */
  async findById(id: string, type?: 'original' | 'processed') {
    const image = await this.prisma.image.findUnique({
      where: { id },
    });

    if (image === null) {
      throw new NotFoundException('Image not found');
    }

    const keyToDownload =
      type === 'original'
        ? image.originalKey
        : (image.processedKey ?? image.originalKey);

    const downloaded = await this.storageService.download(keyToDownload);

    return {
      body: downloaded.Body,
      contentType: downloaded.ContentType ?? `image/${image.format}`,
      contentLength: downloaded.ContentLength,
    };
  }
}
