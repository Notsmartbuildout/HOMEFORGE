/** HOMEFORGE metadata references upstream geometry by ID only. */
export interface DesignVariant {
  id: string;
  name: string;
  kind: 'existing' | 'option';
  projectId: string;
  createdFromVariantId?: string;
  /** Intent only in M1.1; editor mutation enforcement comes later. */
  baselineProtected: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RenovationProject {
  id: string;
  name: string;
  description?: string;
  existingVariantId: string;
  activeVariantId: string;
  variants: DesignVariant[];
  createdAt: Date;
  updatedAt: Date;
}

export interface HomeWorkspace {
  schemaVersion: 1;
  id: string;
  name: string;
  renovationProjects: RenovationProject[];
  createdAt: Date;
  updatedAt: Date;
}
