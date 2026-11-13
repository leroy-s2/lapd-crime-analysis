import { Component, computed, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GeoDataService } from '../../../core/services/geo-data.service';
import { CrimeAnalysisService } from '../../../core/services/crime-analysis.service';
import { DivisionZone, MapThematicMode } from '../../../core/models/crime-analysis.models';

interface Territory {
  name: string;
  path: string;
  x: number;
  y: number;
  labelX: number;
  labelY: number;
}

@Component({
  selector: 'app-map-container',
  standalone: true,
  template: `
    <section class="territory" aria-label="Mapa territorial de las 21 divisiones del LAPD">
      <header>
        <div>
          <span class="lbl">Los Ángeles · Territorio LAPD</span>
          <h2>21 divisiones, un territorio</h2>
          <p>Selecciona una división para explorar su perfil.</p>
        </div>
        <div class="modes" aria-label="Color del mapa">
          <button type="button" [attr.aria-pressed]="mode() === 'profile'" (click)="setMode('profile')">Perfiles</button>
          <button type="button" [attr.aria-pressed]="mode() === 'forecast'" (click)="setMode('forecast')">Pronóstico</button>
        </div>
      </header>
      <div class="legend" aria-label="Leyenda de colores">
        @if (mode() === 'profile') {
          @for (p of crimeService.profiles(); track p.code) {
            <span [title]="p.name"><i [style.background]="crimeService.profileColor(p.code)"></i>{{ p.code }} <span class="legend-name">{{ p.name }}</span></span>
          }
        } @else {
          <span>Menos denuncias</span>
          @for (color of forecastColors; track color) { <i class="heat" [style.background]="color"></i> }
          <span>Más denuncias</span>
        }
      </div>
      @if (loading()) {
        <p class="status" role="status">Cargando límites territoriales…</p>
      } @else if (error()) {
        <div class="status" role="alert">No se pudieron cargar las divisiones. <button class="btn" (click)="load()">Reintentar</button></div>
      } @else {
        <svg class="territory-map" viewBox="0 0 720 880" aria-label="Divisiones policiales de Los Ángeles; cada división permite consultar sus datos">
          @for (item of territories(); track item.name) {
            <path [attr.d]="item.path" fill-rule="evenodd" [attr.fill]="color(item)"
              [class.selected]="isSelected(item)" [class.filtered]="isFiltered(item)"
              tabindex="0" role="button" [attr.aria-label]="label(item)" [attr.aria-pressed]="isSelected(item)"
              (click)="select(item)" (keydown.enter)="select(item)" (keydown.space)="$event.preventDefault(); select(item)">
              <title>{{ label(item) }}</title>
            </path>
          }
          @for (item of territories(); track item.name) {
            @if (item.x !== item.labelX || item.y !== item.labelY) {
              <line [attr.x1]="item.x" [attr.y1]="item.y" [attr.x2]="item.labelX" [attr.y2]="item.labelY" class="label-leader" aria-hidden="true" />
            }
            <text [attr.x]="item.labelX" [attr.y]="item.labelY" [class.active-label]="isSelected(item)" aria-hidden="true">
              @for (line of lines(item.name); track $index) {
                <tspan [attr.x]="item.labelX" [attr.dy]="$index === 0 ? 0 : 12">{{ line }}</tspan>
              }
            </text>
          }
        </svg>
      }
      <footer>
        <span>Límites oficiales LAPD · Encuadre fijo</span>
        <span class="active"><i [style.background]="crimeService.profileColor(selected().profile)"></i>{{ selected().name }} · {{ selected().profile }}</span>
      </footer>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .territory { position: relative; padding: 24px 0 0; }
    header { display: flex; justify-content: space-between; align-items: start; gap: 16px; }
    h2 { font-size: 22px; margin: 5px 0; }
    header p { font-size: 12px; color: var(--muted); }
    .modes { display: flex; border-bottom: 1px solid var(--border); flex-shrink: 0; }
    .modes button { background: none; border: 0; border-bottom: 2px solid transparent; padding: 9px 10px; color: var(--muted); cursor: pointer; font-size: 12px; }
    .modes button[aria-pressed=true] { color: var(--fg); border-color: var(--accent); font-weight: 600; }
    .legend { display: flex; flex-wrap: wrap; gap: 8px 14px; padding: 16px 0 4px; font-size: 10px; color: var(--fg-soft); align-items: center; }
    .legend > span { display: inline-flex; gap: 5px; align-items: center; }
    i { display: inline-block; width: 9px; height: 9px; border-radius: 2px; flex-shrink: 0; }
    .legend-name { max-width: 160px; }
    .heat { width: 22px; }
    .territory-map { display: block; width: 100%; height: auto; max-height: 1050px; overflow: visible; }
    path { stroke: var(--bg); stroke-width: 1.6; stroke-linejoin: round; cursor: pointer; transition: fill .15s, filter .15s; }
    path.filtered { fill: #cbd5e1; }
    path:hover, path:focus-visible { filter: brightness(1.12); stroke: #0f172a; stroke-width: 2.5; outline: none; }
    path.selected { stroke: #0f172a; stroke-width: 3; }
    .label-leader { stroke: #64748b; stroke-width: .8; pointer-events: none; }
    text { text-anchor: middle; font-family: var(--font-body); font-size: 10px; font-weight: 600; fill: #172033; stroke: #ffffff; stroke-width: 3px; paint-order: stroke; stroke-linejoin: round; pointer-events: none; }
    text.active-label { font-weight: 800; }
    footer { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; font-size: 10px; color: var(--muted); padding: 12px 0 20px; }
    .active { display: inline-flex; align-items: center; gap: 6px; color: var(--fg); font-weight: 600; }
    .status { min-height: 400px; display: flex; align-items: center; justify-content: center; gap: 12px; color: var(--muted); }
    @media(max-width: 600px) { header { flex-direction: column; } .territory { padding-top: 8px; } .legend-name { display: none; } h2 { font-size: 20px; } }
  `],
})
export class MapContainerComponent implements OnInit {
  readonly crimeService = inject(CrimeAnalysisService);
  private readonly geo = inject(GeoDataService);
  private readonly destroyRef = inject(DestroyRef);
  readonly selected = this.crimeService.selectedDivision;
  readonly mode = computed(() => this.crimeService.mapLayers().thematicMode);
  readonly territories = signal<Territory[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly forecastColors = ['#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#1d4ed8'];

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.geo.getLapdDivisionsGeoJson().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: data => {
        // A local Mercator projection preserves the territory's proportions without a tile map.
        const project = (point: number[]): number[] => [point[0] * Math.PI / 180, -Math.log(Math.tan(Math.PI / 4 + point[1] * Math.PI / 360))];
        const shapes = data.features.flatMap(f => {
          const g = f.geometry;
          const polygons = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
          return polygons.length ? [{ name: f.properties.APREC, polygons: polygons.map(p => p.map(r => r.map(project))) }] : [];
        });
        const points = shapes.flatMap(s => s.polygons.flat(2));
        const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
        const minX = Math.min(...xs), minY = Math.min(...ys);
        const width = Math.max(...xs) - minX, height = Math.max(...ys) - minY;
        const scale = Math.min(660 / width, 820 / height);
        const tx = (720 - width * scale) / 2, ty = (880 - height * scale) / 2;
        const xy = (p: number[]) => [(p[0] - minX) * scale + tx, (p[1] - minY) * scale + ty];
        this.territories.set(shapes.map(s => {
          const zone = this.zone(s);
          const ring = s.polygons[0][0];
          const center = zone ? project([zone.lng, zone.lat]) : ring[0];
          const [x, y] = xy(center);
          // Callouts keep the compact central divisions readable at the fixed citywide scale.
          const callouts: Record<string, [number, number]> = {
            CENTRAL: [630, 385], RAMPART: [600, 320], OLYMPIC: [630, 465],
            HOLLENBECK: [640, 425], NEWTON: [620, 510],
          };
          const [labelX, labelY] = callouts[s.name] || [x, y];
          return { name: s.name, x, y, labelX, labelY, path: s.polygons.map(p => p.map(r => r.map((point, i) => `${i ? 'L' : 'M'}${xy(point).map(n => n.toFixed(2)).join(',')}`).join(' ') + ' Z').join(' ')).join(' ') };
        }));
        this.loading.set(false);
      },
      error: () => { this.error.set(true); this.loading.set(false); },
    });
  }

  zone(item: { name: string }): DivisionZone | undefined {
    return this.crimeService.zones().find(z => z.name.toUpperCase() === item.name || (item.name === 'WEST LOS ANGELES' && z.code === 'D-08'));
  }
  isSelected(item: Territory): boolean { return this.zone(item)?.code === this.selected().code; }
  isFiltered(item: Territory): boolean {
    const z = this.zone(item), bureau = this.crimeService.selectedBureau(), profile = this.crimeService.selectedProfileFilter();
    return !!z && (!!bureau && z.bureau !== bureau || !!profile && !this.crimeService.zoneMatchesProfile(z, profile));
  }
  color(item: Territory): string {
    const z = this.zone(item);
    if (!z) return '#cbd5e1';
    if (this.mode() === 'profile') return this.crimeService.profileColor(z.profile);
    const values = this.crimeService.zones().map(z => z.forecast);
    const min = Math.min(...values), span = Math.max(...values) - min || 1;
    return this.forecastColors[Math.min(4, Math.floor((z.forecast - min) / span * 5))];
  }
  label(item: Territory): string {
    const z = this.zone(item);
    return z ? `${z.name} · ${z.profile} ${z.profileName} · ${z.forecast.toLocaleString('es-PE')} denuncias previstas` : item.name;
  }
  lines(name: string): string[] {
    const nameText = this.zone({ name })?.name || name;
    const words = nameText.split(' ');
    return words.length > 1 ? [words.slice(0, -1).join(' '), words[words.length - 1]] : [nameText];
  }
  select(item: Territory): void { const z = this.zone(item); if (z) this.crimeService.selectDivision(z.code); }
  setMode(mode: MapThematicMode): void { this.crimeService.setThematicMode(mode); }
}
