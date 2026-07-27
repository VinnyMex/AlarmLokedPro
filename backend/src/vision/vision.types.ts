export interface OnDeviceDetectionInput {
  /** Label returned by the on-device ML Kit object detector. */
  detectedLabel: string;
  /** Model confidence in [0, 1]. */
  confidence: number;
  /** Fraction of the frame occupied by the bounding box, in [0, 1]. */
  boundingBoxAreaRatio: number;
  /** Base64 JPEG frame, sent only when a cloud fallback check is required. */
  frameBase64?: string;
}

export interface ValidationResult {
  isMatch: boolean;
  confidence: number;
  source: 'ON_DEVICE' | 'CLOUD_VISION';
  reason?: string;
}

/** Cloud vision fallback used when on-device confidence is borderline (section 13.3). */
export interface CloudVisionProvider {
  detect(frameBase64: string, expectedMlKitLabels: string[]): Promise<{ label: string; confidence: number }>;
}
