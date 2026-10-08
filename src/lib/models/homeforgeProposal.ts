import type { ZoneMeasurement } from './homeforgeZone';

/** A review draft. Creating one never edits or saves upstream geometry. */
export interface HomeforgeProposal {
  workspaceId: string;
  renovationId: string;
  variantId: string;
  targetKind: 'existing' | 'option';
  projectId: string;
  featureId: string;
  featureLabel: string;
  measurementId: string | null;
  evidenceIds: string[];
  source: ZoneMeasurement['source'] | 'numeric command';
  commandText?: string;
  property: string;
  floorId: string;
  kind: 'walls' | 'doors' | 'windows' | 'stairs';
  elementId: string;
  beforeCm: number;
  afterCm: number;
  projectSnapshot: string;
  zoneSnapshot: string;
}
