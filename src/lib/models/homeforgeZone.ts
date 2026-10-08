export type ZoneScope = 'context' | 'focus';
export interface CaptureSession { id: string; startedAt: Date; endedAt?: Date; note?: string; }
export interface ZoneEvidence {
  id: string; sessionId: string; kind: 'photo' | 'plan' | 'sketch' | 'roomplan' | 'note';
  scope: ZoneScope; name: string; capturedAt: Date; featureIds: string[];
  category?: 'overview' | 'wall' | 'opening' | 'detail' | 'reference';
  mimeType?: string; sha256?: string; byteLength?: number;
}
export interface ZoneFeature {
  id: string; kind: 'wall' | 'door' | 'window' | 'stair' | 'landing' | 'opening' | 'other';
  label: string; description?: string; scope: ZoneScope;
  relations: { kind: 'replaces' | 'splitFrom' | 'mergedFrom'; featureId: string }[];
  bindings: { variantId: string; floorId: string; kind: 'walls' | 'doors' | 'windows' | 'stairs' | 'rooms'; elementId: string }[];
}
export interface ZoneMeasurement {
  id: string; featureId: string; property: string; enteredValue: number; unit: 'cm' | 'm' | 'in' | 'ft';
  valueCm: number; recordedAt: Date; source: 'approximate' | 'scan-derived' | 'manually measured' | 'calculated';
  evidenceIds: string[]; dependencies: string[];
  verified?: { valueCm: number; geometryFingerprint: string; verifiedAt: Date };
}
export interface HomeforgeZone {
  schemaVersion: 1; workspaceId: string; renovationId: string;
  sessions: CaptureSession[]; evidence: ZoneEvidence[]; features: ZoneFeature[]; measurements: ZoneMeasurement[];
  sufficientAt?: Date; createdAt: Date; updatedAt: Date;
}
