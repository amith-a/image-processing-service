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
  ParseUUIDPipe,
  InternalServerErrorException,
} from '@nestjs/common';
import { ImagesService } from './images.service.js';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { Readable } from 'node:stream';

@Controller({ path: 'images', version: '1' })
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  @Get(':id')
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const imageData = await this.imagesService.findById(id);

    if (!imageData.body) {
      throw new InternalServerErrorException('Image data is missing');
    }

    if (!imageData.contentType) {
      throw new InternalServerErrorException('Image content type is missing');
    }

    res.setHeader('Content-Type', imageData.contentType);

    return new StreamableFile(imageData.body as Readable);
  }

  @Post('upload')
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
    const record = await this.imagesService.processImage(file.buffer);

    res.setHeader('Location', `/api/v1/images/${record.id}`);
    return record;
  }
}
