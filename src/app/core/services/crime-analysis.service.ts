import { Injectable, computed, signal } from '@angular/core';
import {
  BasemapStyle,
  DashboardPayload,
  DivisionZone,
  LapdBureau,
  MapLayerConfig,
  MapThematicMode,
  ModelMetric,
  ModelRun,
  ProfileCode,
  ProfileDefinition,
  ProfileSummary,
  ScopeItem,
  SortCriterion,
  TypificationStat,
  ViewTab,
} from '../models/crime-analysis.models';
import {
  DASHBOARD_SEED,
  GLOBAL_MIX,
  MODEL_RUN_DATA,
  MODELS_DATA,
  PREMISE_LABELS,
  PROFILE_CATALOG,
  PROFILES_DATA,
  SCOPE_DATA,
  TYPIFICATIONS_DATA,
  ZONES_DATA,
} from '../data/crime-analysis.data';

const STORAGE_KEY = 'lapd-analysis-preferences-v1';

const PROFILE_COLORS: Record<string, string> = {
  P01: '#0ea5e9',
  P02: '#14b8a6',
  P03: '#f59e0b',
  P04: '#6366f1',
  P05: '#ec4899',
  P06: '#64748b',
};

const PROFILE_SOFT_COLORS: Record<string, string> = {
  P01: '#e0f2fe',
  P02: '#ccfbf1',
  P03: '#fef3c7',
  P04: '#e0e7ff',
  P05: '#fce7f3',
  P06: '#e2e8f0',
};

interface StoredPreferences {
  selectedCode?: string;
  tab?: ViewTab;
  sort?: SortCriterion;
  bureau?: string | null;
  profile?: ProfileCode | null;
  showPolygons?: boolean;
  showLabels?: boolean;
  showMarkers?: boolean;
  thematicMode?: MapThematicMode;
  basemap?: BasemapStyle;
}

@Injectable({
  providedIn: 'root',
})
export class CrimeAnalysisService {
  readonly zones = signal<DivisionZone[]>(ZONES_DATA);
  readonly globalMix = signal<Record<string, number>>(GLOBAL_MIX);
  readonly premiseLabels = PREMISE_LABELS;
  readonly models = signal<ModelMetric[]>(MODELS_DATA);
  readonly profiles = signal<ProfileSummary[]>(PROFILES_DATA);
  readonly profileCatalog = signal<ProfileDefinition[]>(PROFILE_CATALOG);
  readonly typifications = signal<TypificationStat[]>(TYPIFICATIONS_DATA);
  readonly scope = signal<ScopeItem[]>(SCOPE_DATA);
  readonly modelRun = signal<ModelRun>(MODEL_RUN_DATA);

  readonly bureaus: LapdBureau[] = ['Central', 'South', 'West', 'Valley'];

  readonly selectedDivisionCode = signal<string>(ZONES_DATA[0]?.code ?? 'D-01');
  readonly currentTab = signal<ViewTab>('zona');
  readonly currentSort = signal<SortCriterion>('forecast');
  readonly selectedBureau = signal<string | null>(null);
  readonly selectedProfileFilter = signal<ProfileCode | null>(null);
  readonly searchQuery = signal<string>('');

  readonly mapLayers = signal<MapLayerConfig>({
    showPolygons: true,
    showLabels: true,
    showMarkers: true,
    thematicMode: 'forecast',
    basemap: 'positron',
  });

  readonly profileCodes = computed<ProfileCode[]>(() =>
    this.profileCatalog().map((profile) => profile.code)
  );

  readonly selectedDivision = computed(() => {
    const code = this.selectedDivisionCode();
    return this.zones().find((z) => z.code === code) ?? this.zones()[0];
  });

  readonly rankMap = computed(() => {
    const sorted = [...this.zones()].sort((a, b) => b.forecast - a.forecast);
    const map = new Map<string, number>();
    sorted.forEach((z, idx) => map.set(z.code, idx + 1));
    return map;
  });

  readonly maxForecast = computed(() => {
    return Math.max(...this.zones().map((z) => z.forecast));
  });

  readonly filteredAndSortedDivisions = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const sort = this.currentSort();
    const bureauFilter = this.selectedBureau();
    const profileFilter = this.selectedProfileFilter();

    let list = this.zones().filter((z) => {
      if (bureauFilter && z.bureau !== bureauFilter) {
        return false;
      }
      if (profileFilter !== null && !this.zoneMatchesProfile(z, profileFilter)) {
        return false;
      }
      if (!query) return true;
      return (
        z.name.toLowerCase().includes(query) ||
        z.code.toLowerCase().includes(query) ||
        z.bureau.toLowerCase().includes(query)
      );
    });

    if (sort === 'delta') {
      list = [...list].sort((a, b) => b.deltaPct - a.deltaPct);
    } else if (sort === 'name') {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'es'));
    } else {
      list = [...list].sort((a, b) => b.forecast - a.forecast);
    }

    return list;
  });

  constructor() {
    this.restorePreferences();
  }

  zoneMatchesProfile(zone: DivisionZone, code: ProfileCode): boolean {
    return zone.profile === code || zone.priorityProfile === code;
  }

  profileLabel(code: string): string {
    return (
      this.profileCatalog().find((profile) => profile.code === code)?.name ??
      code
    );
  }

  profileColor(code: string): string {
    return PROFILE_COLORS[code] ?? '#64748b';
  }

  profileSoftColor(code: string): string {
    return PROFILE_SOFT_COLORS[code] ?? '#e2e8f0';
  }

  profileSummary(code: string): ProfileSummary | undefined {
    return this.profiles().find((profile) => profile.code === code);
  }

  divisionsForProfile(code: string): string[] {
    return this.zones()
      .filter((zone) => this.zoneMatchesProfile(zone, code as ProfileCode))
      .map((zone) => zone.name);
  }

  applyDashboard(payload: DashboardPayload): void {
    this.zones.set(payload.zones);
    this.profiles.set(payload.profiles);
    this.profileCatalog.set(payload.profileCatalog);
    this.models.set(payload.models);
    this.typifications.set(payload.typifications);
    this.scope.set(payload.scope);
    this.globalMix.set(payload.globalMix);
    this.modelRun.set(payload.modelRun);

    const selected = this.selectedDivisionCode();
    if (!payload.zones.some((zone) => zone.code === selected)) {
      this.selectedDivisionCode.set(payload.zones[0]?.code ?? 'D-01');
    }

    const profileFilter = this.selectedProfileFilter();
    if (
      profileFilter !== null &&
      !payload.profileCatalog.some((profile) => profile.code === profileFilter)
    ) {
      this.selectedProfileFilter.set(null);
    }

    this.persistPreferences();
  }

  resetDashboard(): void {
    this.applyDashboard(DASHBOARD_SEED);
  }

  selectDivision(code: string): void {
    const exists = this.zones().some((z) => z.code === code);
    if (exists) {
      this.selectedDivisionCode.set(code);
      this.persistPreferences();
    }
  }

  setTab(tab: ViewTab): void {
    this.currentTab.set(tab);
    this.persistPreferences();
  }

  setSort(sort: SortCriterion): void {
    this.currentSort.set(sort);
    this.persistPreferences();
  }

  setSelectedBureau(bureau: string | null): void {
    this.selectedBureau.set(bureau);
    this.persistPreferences();
  }

  setSelectedProfileFilter(profile: ProfileCode | null): void {
    this.selectedProfileFilter.set(profile);
    this.persistPreferences();
  }

  setSearchQuery(q: string): void {
    this.searchQuery.set(q);
  }

  togglePolygonLayer(val?: boolean): void {
    this.mapLayers.update((l) => ({
      ...l,
      showPolygons: val !== undefined ? val : !l.showPolygons,
    }));
    this.persistPreferences();
  }

  toggleLabelLayer(val?: boolean): void {
    this.mapLayers.update((l) => ({
      ...l,
      showLabels: val !== undefined ? val : !l.showLabels,
    }));
    this.persistPreferences();
  }

  toggleMarkerLayer(val?: boolean): void {
    this.mapLayers.update((l) => ({
      ...l,
      showMarkers: val !== undefined ? val : !l.showMarkers,
    }));
    this.persistPreferences();
  }

  setThematicMode(mode: MapThematicMode): void {
    this.mapLayers.update((l) => ({ ...l, thematicMode: mode }));
    this.persistPreferences();
  }

  setBasemap(basemap: BasemapStyle): void {
    this.mapLayers.update((l) => ({ ...l, basemap }));
    this.persistPreferences();
  }

  private persistPreferences(): void {
    try {
      const data: StoredPreferences = {
        selectedCode: this.selectedDivisionCode(),
        tab: this.currentTab(),
        sort: this.currentSort(),
        bureau: this.selectedBureau(),
        profile: this.selectedProfileFilter(),
        showPolygons: this.mapLayers().showPolygons,
        showLabels: this.mapLayers().showLabels,
        showMarkers: this.mapLayers().showMarkers,
        thematicMode: this.mapLayers().thematicMode,
        basemap: this.mapLayers().basemap,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // LocalStorage unavailable in isolated context
    }
  }

  private restorePreferences(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as StoredPreferences;
      if (data.selectedCode && this.zones().some((z) => z.code === data.selectedCode)) {
        this.selectedDivisionCode.set(data.selectedCode);
      }
      if (data.tab) {
        this.currentTab.set(data.tab);
      }
      if (data.sort) {
        this.currentSort.set(data.sort);
      }
      if (data.bureau !== undefined) {
        this.selectedBureau.set(data.bureau);
      }
      if (
        data.profile &&
        this.profileCatalog().some((profile) => profile.code === data.profile)
      ) {
        this.selectedProfileFilter.set(data.profile);
      }
      if (data.thematicMode || data.showPolygons !== undefined || data.basemap) {
        this.mapLayers.update((l) => ({
          ...l,
          showPolygons: data.showPolygons ?? l.showPolygons,
          showLabels: data.showLabels ?? l.showLabels,
          showMarkers: data.showMarkers ?? l.showMarkers,
          thematicMode: data.thematicMode ?? l.thematicMode,
          basemap: data.basemap ?? l.basemap,
        }));
      }
    } catch {
      // Ignore corrupted data
    }
  }
}
