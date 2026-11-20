import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Res,
  HttpStatus,
  HttpCode,
  ParseFilePipeBuilder,
  StreamableFile,
  Get,
  Param,
  Query,
  Body,
  ParseUUIDPipe,
  InternalServerErrorException,
} from '@nestjs/common';
import { ImagesService } from './images.service.js';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { Readable } from 'node:stream';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import {
  transformImageSchema,
  type TransformImageDTO,
} from './dto/process-image.schema.js';

@Controller({ path: 'images', version: '1' })
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  /**
   * GET /api/v1/images/:id
   * Stream original or processed image back to client.
   * Query param: ?type=original | processed (defaults to processed if available)
   */
  @Get(':id')
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('type') type: 'original' | 'processed' | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const imageData = await this.imagesService.findById(id, type);

    if (!imageData.body) {
      throw new InternalServerErrorException('Image data is missing');
    }

    if (!imageData.contentType) {
      throw new InternalServerErrorException('Image content type is missing');
    }

    res.setHeader('Content-Type', imageData.contentType);

    return new StreamableFile(imageData.body as Readable);
  }

  /**
   * POST /api/v1/images/upload (and POST /api/v1/images)
   * Upload an original image, validate format, and store in S3 + PostgreSQL.
   * No transformations during upload.
   */
  @Post(['', 'upload'])
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /^image\/(jpeg|png|webp)$/i,
        })
        .addMaxSizeValidator({
          maxSize: 5 * 1024 * 1024, // 5MB
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    file: Express.Multer.File,
    @Res({ passthrough: true }) res: Response,
  ) {
    const record = await this.imagesService.uploadImage(file.buffer);

    res.setHeader('Location', `/api/v1/images/${record.id}`);
    return record;
  }

  /**
   * POST /api/v1/images/:id/transform
   * Accept dynamic transformation options (resize, rotate, flip, format, quality, effects),
   * process the original image via Sharp, save to S3, and update PostgreSQL metadata.
   */
  @Post(':id/transform')
  async transformImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(transformImageSchema))
    options: TransformImageDTO,
  ) {
    return await this.imagesService.transformImage(id, options);
  }
}
