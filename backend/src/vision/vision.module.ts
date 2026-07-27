import { Module } from '@nestjs/common';
import { VisionService } from './vision.service';
import { GoogleCloudVisionProvider } from './cloud-vision.provider';

@Module({
  providers: [VisionService, GoogleCloudVisionProvider],
  exports: [VisionService],
})
export class VisionModule {}
