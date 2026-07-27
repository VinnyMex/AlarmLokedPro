import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CloudVisionProvider } from './vision.types';

/**
 * Stub for Google Cloud Vision API integration (PRD section 6.2/13.3).
 * Swap the body of `detect` for a real Cloud Vision `annotateImage` call once
 * CLOUD_VISION_API_KEY is provisioned — the interface is what the rest of the
 * app depends on, so no other code needs to change.
 */
@Injectable()
export class GoogleCloudVisionProvider implements CloudVisionProvider {
  private readonly logger = new Logger(GoogleCloudVisionProvider.name);

  constructor(private readonly config: ConfigService) {}

  async detect(
    _frameBase64: string,
    expectedMlKitLabels: string[],
  ): Promise<{ label: string; confidence: number }> {
    const apiKey = this.config.get<string>('CLOUD_VISION_API_KEY');
    if (!apiKey) {
      this.logger.warn('CLOUD_VISION_API_KEY not configured; cloud fallback unavailable');
      return { label: 'UNKNOWN', confidence: 0 };
    }

    // TODO: call https://vision.googleapis.com/v1/images:annotate with
    // features=[{type: 'OBJECT_LOCALIZATION'}] and map the response back to
    // the catalog's mlKitLabels.
    return { label: expectedMlKitLabels[0] ?? 'UNKNOWN', confidence: 0 };
  }
}
