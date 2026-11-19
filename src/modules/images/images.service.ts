import { BadRequestException, Injectable } from '@nestjs/common';
import sharp from 'sharp';

@Injectable()
export class ImagesService {
  async processImage(input: Buffer) {
    try {
      const result = await sharp(input)
        .resize(800, 600, {
          fit: 'cover',
        })
        .toBuffer();

      return result;
    } catch (error) {
      console.error(error);
      throw new BadRequestException('Invalid or unsupported image');
    }
  }
}
