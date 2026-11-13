export interface CategoryShare {
  k: string;
  v: number;
}

export interface PremiseShare {
  k: string;
  v: number;
}

export type LapdBureau = 'Central' | 'South' | 'West' | 'Valley';

export type ProfileCode = 'P01' | 'P02' | 'P03' | 'P04' | 'P05' | 'P06';

export interface DivisionZone {
  code: string;
  name: string;
  bureau: LapdBureau;
  profile: ProfileCode;
  profileName: string;
  profileShare: number;
  profileShares: Record<string, number>;
  priorityProfile: ProfileCode;
  priorityScore: number;
  x: number;
  y: number;
  lat: number;
  lng: number;
  inc12: number;
  prev: number;
  forecast: number;
  deltaPct: number;
  mae: number;
  night: number;
  weekend: number;
  weapon: number;
  mix: CategoryShare[];
  premises: PremiseShare[];
  spark: number[];
}

export interface ModelMetric {
  name: string;
  mae: number;
  rmse: number;
  r2: number;
  isBest?: boolean;
}

export interface ProfileSummary {
  code: ProfileCode;
  name: string;
  description: string;
  principalZones: number;
  priorityZones: number;
  incidents: number;
  sharePct: number;
  nightPct: number;
  weaponPct: number;
  mae: number;
  priorityAvg: number;
}

export interface ProfileDefinition {
  code: ProfileCode;
  name: string;
  description: string;
  submodalities: string;
  severity: number;
}

export interface TypificationStat {
  code: string;
  percentage: number;
}

export interface ScopeItem {
  concept: string;
  value: string;
}

export interface ModelRun {
  jobId: string | null;
  datasetName: string;
  generatedAt: string;
  rawRows: number;
  usableRows: number;
  testRows: number;
  panelRows: number | null;
  trainRows: number | null;
  validRows: number | null;
  profileZones: number;
  coveragePct: number;
}

export interface DashboardPayload {
  zones: DivisionZone[];
  profiles: ProfileSummary[];
  profileCatalog: ProfileDefinition[];
  models: ModelMetric[];
  typifications: TypificationStat[];
  scope: ScopeItem[];
  globalMix: Record<string, number>;
  premiseLabels: Record<string, string>;
  modelRun: ModelRun;
}

export type ViewTab = 'zona' | 'modelo' | 'datos';
export type SortCriterion = 'forecast' | 'delta' | 'name';
export type MapThematicMode = 'forecast' | 'profile';
export type BasemapStyle = 'positron' | 'dark' | 'osm';

export interface MapLayerConfig {
  showPolygons: boolean;
  showLabels: boolean;
  showMarkers: boolean;
  thematicMode: MapThematicMode;
  basemap: BasemapStyle;
}
