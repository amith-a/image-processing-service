import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Res,
  HttpStatus,
  ParseFilePipeBuilder,
  StreamableFile,
} from '@nestjs/common';
import { ImagesService } from './images.service.js';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';

@Controller({ path: 'images', version: '1' })
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  @Post('upload')
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
    const result = await this.imagesService.processImage(file.buffer);

    res.setHeader('Content-Type', file.mimetype);
    return new StreamableFile(result);
  }
}
