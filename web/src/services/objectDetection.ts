export interface DetectionResult {
  label: string;
  confidence: number;
  boundingBoxAreaRatio: number;
}

// Mirrors backend/src/vision/item-catalog.ts's mlKitLabels so the stub below
// resolves to a label the backend's VisionService will actually accept.
const ITEM_TYPE_TO_LABEL: Record<string, string> = {
  pen: 'Pen',
  cup: 'Cup',
  key: 'Key',
  remote_control: 'Remote control',
  toothbrush: 'Toothbrush',
  book: 'Book',
  sock: 'Sock',
  spoon: 'Spoon',
  bottle: 'Bottle',
  charger: 'Charger',
};

/**
 * On-device object detection (PRD section 6.1/13.3).
 *
 * A real implementation would run a TensorFlow.js / MediaPipe object
 * detector against the captured frame in-browser (no native ML Kit
 * available on the web). This stub keeps the challenge flow fully wireable
 * against the backend today; swap the body for a real model call once one
 * is integrated, keeping the same `DetectionResult` shape so
 * `AlarmChallengeScreen` and the backend `/alarms/:id/validate` contract
 * don't need to change.
 */
export async function detectObject(_frameDataUrl: string, expectedItemType: string): Promise<DetectionResult> {
  return {
    label: ITEM_TYPE_TO_LABEL[expectedItemType] ?? expectedItemType,
    confidence: 0.85,
    boundingBoxAreaRatio: 0.25,
  };
}
