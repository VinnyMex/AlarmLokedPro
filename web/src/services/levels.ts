// Mirrors backend/src/progress/progress.constants.ts so the client can
// render level-progress bars without an extra round trip.
export function xpRequiredForLevel(level: number): number {
  return 100 + (level - 1) * 25;
}
