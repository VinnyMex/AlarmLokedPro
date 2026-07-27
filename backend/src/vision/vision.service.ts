import { Injectable } from '@nestjs/common';
import { getItem } from './item-catalog';
import { OnDeviceDetectionInput, ValidationResult } from './vision.types';
import { GoogleCloudVisionProvider } from './cloud-vision.provider';

const CLOUD_FALLBACK_LOWER_BOUND = 0.4;
const MIN_BOUNDING_BOX_AREA_RATIO = 0.08;

@Injectable()
export class VisionService {
  constructor(private readonly cloudVision: GoogleCloudVisionProvider) {}

  /**
   * Implements the hybrid pipeline from PRD sections 6.1/6.3/6.4:
   * on-device detection is trusted above the confidence threshold; results in
   * the ambiguous band fall back to Cloud Vision; anything below that is
   * rejected without spending a cloud call.
   */
  async validate(
    itemType: string,
    confidenceThreshold: number,
    detection: OnDeviceDetectionInput,
  ): Promise<ValidationResult> {
    const catalogItem = getItem(itemType);
    if (!catalogItem) {
      return { isMatch: false, confidence: 0, source: 'ON_DEVICE', reason: 'unknown_item_type' };
    }

    if (detection.boundingBoxAreaRatio < MIN_BOUNDING_BOX_AREA_RATIO) {
      return { isMatch: false, confidence: detection.confidence, source: 'ON_DEVICE', reason: 'object_too_small' };
    }

    const labelMatches = catalogItem.mlKitLabels.some(
      (label) => label.toLowerCase() === detection.detectedLabel.toLowerCase(),
    );

    if (labelMatches && detection.confidence >= confidenceThreshold) {
      return { isMatch: true, confidence: detection.confidence, source: 'ON_DEVICE' };
    }

    if (labelMatches && detection.confidence >= CLOUD_FALLBACK_LOWER_BOUND && detection.frameBase64) {
      const cloudResult = await this.cloudVision.detect(detection.frameBase64, catalogItem.mlKitLabels);
      const cloudMatches = catalogItem.mlKitLabels.some(
        (label) => label.toLowerCase() === cloudResult.label.toLowerCase(),
      );
      return {
        isMatch: cloudMatches && cloudResult.confidence >= confidenceThreshold,
        confidence: cloudResult.confidence,
        source: 'CLOUD_VISION',
      };
    }

    return { isMatch: false, confidence: detection.confidence, source: 'ON_DEVICE', reason: 'below_threshold' };
  }
}
