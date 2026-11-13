import { DashboardPayload } from '../models/crime-analysis.models';
import seed from './dashboard.seed.json';

/**
 * Snapshot generated from the final Unit 3 notebook run.
 *
 * The live dashboard replaces this payload after a successful upload job.
 * Regenerate it with `python3 server/build_seed.py`.
 */
export const DASHBOARD_SEED = seed as unknown as DashboardPayload;

export const ZONES_DATA = DASHBOARD_SEED.zones;
export const MODELS_DATA = DASHBOARD_SEED.models;
export const PROFILES_DATA = DASHBOARD_SEED.profiles;
export const PROFILE_CATALOG = DASHBOARD_SEED.profileCatalog;
export const TYPIFICATIONS_DATA = DASHBOARD_SEED.typifications;
export const SCOPE_DATA = DASHBOARD_SEED.scope;
export const MODEL_RUN_DATA = DASHBOARD_SEED.modelRun;
export const GLOBAL_MIX = DASHBOARD_SEED.globalMix;
export const PREMISE_LABELS = DASHBOARD_SEED.premiseLabels;
