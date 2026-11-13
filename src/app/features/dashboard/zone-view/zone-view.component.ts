import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CrimeAnalysisService } from '../../../core/services/crime-analysis.service';
import { SparklineComponent } from '../../../shared/components/sparkline/sparkline.component';
import { BarChartComponent, BarItem } from '../../../shared/components/bar-chart/bar-chart.component';
import { SortCriterion } from '../../../core/models/crime-analysis.models';

@Component({
  selector: 'app-zone-view',
  standalone: true,
  imports: [CommonModule, SparklineComponent, BarChartComponent],
  template: `
    <section class="pane" id="pane-zona" role="tabpanel" aria-labelledby="tab-zona">
      <!-- Selected Division Details Card -->
      <div class="block" style="margin-top: 14px">
        <div class="sec-h">
          <h3>División seleccionada</h3>
          <span class="lbl">clic en el mapa o lista</span>
        </div>

        <article class="zone" aria-live="polite">
          <div class="zone-h">
            <span class="code">{{ selected().code }}</span>
            <h2>{{ selected().name }}</h2>
            <span class="bureau-pill">Buró {{ selected().bureau }}</span>
            <span class="priority-pill">
              Prioridad {{ selected().priorityProfile }} · {{ formatDecimal(selected().priorityScore) }}
            </span>
            <span class="pf-pill" [style.--pf]="crimeService.profileColor(selected().profile)">
              {{ selected().profile }} · {{ selected().profileName }}
            </span>
          </div>

          <div class="stage">
            <div>
              <div class="lbl">Pronóstico · dic 2023</div>
              <div class="big">{{ formatNumber(selected().forecast) }}</div>
              <div class="unit">
                denuncias previstas en la división
              </div>
            </div>
            <div class="stage-r">
              <span class="delta" [class.up]="selected().deltaPct >= 0" [class.down]="selected().deltaPct < 0">
                <svg viewBox="0 0 10 10" aria-hidden="true">
                  <path
                    [attr.d]="selected().deltaPct >= 0 ? 'M5 1 9 8H1z' : 'M5 9 1 2h8z'"
                    fill="currentColor"
                  />
                </svg>
                {{ formatDelta(selected().deltaPct) }} %
              </span>
              <span class="lbl">vs. nov 2023</span>
            </div>
          </div>

          <!-- 12-Month Sparkline -->
          <app-sparkline
            [data]="selected().spark"
            [divisionName]="selected().name"
          ></app-sparkline>

          <!-- Key Metrics Grid -->
          <dl class="mini">
            <div>
              <dt>Incidentes 12m</dt>
              <dd>{{ formatNumber(selected().inc12) }}</dd>
            </div>
            <div>
              <dt>MAE zona</dt>
              <dd>{{ formatDecimal(selected().mae) }}</dd>
            </div>
            <div>
              <dt>Nocturno</dt>
              <dd>{{ formatDecimal(selected().night) }} %</dd>
            </div>
            <div>
              <dt>Fin de semana</dt>
              <dd>{{ formatDecimal(selected().weekend) }} %</dd>
            </div>
          </dl>
        </article>
      </div>

      <!-- Category Mix Breakdown -->
      <div class="block">
        <div class="sec-h">
          <h3>Composición por categoría</h3>
          <span class="lbl">% del total</span>
        </div>
        <app-bar-chart
          [items]="categoryBars()"
          [ticks]="crimeService.globalMix()"
          [max]="62"
        ></app-bar-chart>
        <p class="note">
          La marca vertical gris indica la media del sector: sirve para leer si la zona sobrerrepresenta una categoría respecto del resto de la ciudad.
        </p>
      </div>

      <!-- Premises Breakdown -->
      <div class="block">
        <div class="sec-h">
          <h3>Lugar del hecho</h3>
          <span class="lbl">% del total</span>
        </div>
        <app-bar-chart
          [items]="premiseBars()"
          [isSmall]="true"
        ></app-bar-chart>
      </div>

      <!-- Districts Ranking Table -->
      <div class="block">
        <div class="sec-h">
          <h3>Distritos Policiales</h3>
          <div class="seg seg-xs" role="group" aria-label="Ordenar distritos">
            <button
              type="button"
              (click)="setSort('forecast')"
              [attr.aria-pressed]="crimeService.currentSort() === 'forecast'"
            >
              Pron.
            </button>
            <button
              type="button"
              (click)="setSort('delta')"
              [attr.aria-pressed]="crimeService.currentSort() === 'delta'"
            >
              Cambio
            </button>
            <button
              type="button"
              (click)="setSort('name')"
              [attr.aria-pressed]="crimeService.currentSort() === 'name'"
            >
              Nombre
            </button>
          </div>
        </div>

        <!-- Bureau Filter Chips -->
        <div class="bureau-filter" role="group" aria-label="Filtrar por buró policial">
          <button
            type="button"
            class="bureau-chip"
            [class.active]="crimeService.selectedBureau() === null"
            (click)="setBureau(null)"
          >
            Todos (21)
          </button>
          @for (b of crimeService.bureaus; track b) {
            <button
              type="button"
              class="bureau-chip"
              [class.active]="crimeService.selectedBureau() === b"
              (click)="setBureau(b)"
            >
              {{ b }}
            </button>
          }
        </div>

        <table class="rank">
          <thead>
            <tr>
              <th scope="col" class="rk">#</th>
              <th scope="col">División</th>
              <th scope="col" class="c">Perfil</th>
              <th scope="col" class="r">Δ</th>
              <th scope="col" class="r">Pron.</th>
            </tr>
          </thead>
          <tbody>
            @for (z of crimeService.filteredAndSortedDivisions(); track z.code) {
              <tr
                [class.is-sel]="z.code === crimeService.selectedDivisionCode()"
                (click)="onSelect(z.code)"
              >
                <td class="rk">{{ crimeService.rankMap().get(z.code) }}</td>
                <td class="nmm">
                  <button class="rowbtn" type="button">
                    {{ z.name }}
                    <span class="sub-bureau">{{ z.bureau }}</span>
                  </button>
                </td>
                <td class="pf">
                  <span
                    class="pfdot"
                    [style.background]="crimeService.profileColor(z.profile)"
                    [style.border-color]="crimeService.profileColor(z.profile)"
                  ></span>
                  {{ z.profile }}
                </td>
                <td class="dl" [class.up]="z.deltaPct >= 0" [class.down]="z.deltaPct < 0">
                  {{ formatDelta(z.deltaPct) }}
                </td>
                <td class="fcc">
                  <span
                    class="mb"
                    [style.width.px]="getBarWidth(z.forecast)"
                  ></span>
                  <span class="fcv">{{ formatNumber(z.forecast) }}</span>
                </td>
              </tr>
            } @empty {
              <tr>
                <td class="empty" colspan="5">
                  Sin coincidencias para los filtros aplicados.
                </td>
              </tr>
            }
          </tbody>
        </table>
        <p class="note">
          Δ es la variación porcentual prevista respecto del último mes observado. Al hacer clic en un distrito, el mapa enfoca y resalta su bloque geográfico.
        </p>
      </div>
    </section>
  `,
  styles: [
    `
      .pane {
        padding: 0 0 32px;
      }
      .block {
        margin-top: 26px;
      }
      .sec-h {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
      }
      .sec-h h3 {
        font-size: 13px;
        letter-spacing: -0.005em;
      }
      .sec-h .lbl {
        flex: none;
      }
      .note {
        font-size: 11px;
        color: var(--muted);
        line-height: 1.5;
        margin-top: 10px;
        max-width: 52ch;
      }
      .zone {
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        background: var(--surface);
        overflow: hidden;
      }
      .zone-h {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 14px;
        border-bottom: 1px solid var(--border);
        flex-wrap: wrap;
      }
      .code {
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.06em;
        color: var(--fg-soft);
        background: var(--surface-2);
        border: 1px solid var(--border);
        border-radius: 5px;
        padding: 2px 6px;
      }
      .zone-h h2 {
        font-size: 17px;
        letter-spacing: -0.015em;
        line-height: 1;
      }
      .bureau-pill {
        font-family: var(--font-mono);
        font-size: 9.5px;
        letter-spacing: 0.05em;
        padding: 2px 6px;
        border-radius: 4px;
        background: var(--surface-2);
        border: 1px solid var(--border);
        color: var(--muted);
      }
      .pf-pill {
        margin-left: auto;
        font-family: var(--font-mono);
        font-size: 9.5px;
        letter-spacing: 0.04em;
        padding: 3px 8px;
        border-radius: 999px;
        border: 1px solid color-mix(in oklab, var(--pf) 40%, transparent);
        color: var(--pf);
        background: color-mix(in oklab, var(--pf) 9%, white);
        white-space: nowrap;
        max-width: 48%;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .priority-pill {
        font-family: var(--font-mono);
        font-size: 9px;
        letter-spacing: 0.04em;
        padding: 2px 6px;
        border-radius: 4px;
        background: var(--warn-soft);
        border: 1px solid color-mix(in oklab, var(--warn) 25%, transparent);
        color: var(--warn);
        white-space: nowrap;
      }
      .stage {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 16px;
        padding: 14px 14px 4px;
      }
      .big {
        font-family: var(--font-display);
        font-size: 44px;
        line-height: 0.95;
        font-weight: 620;
        letter-spacing: -0.035em;
        font-variant-numeric: tabular-nums;
        margin: 3px 0 5px;
      }
      .unit {
        font-size: 11px;
        color: var(--muted);
        max-width: 28ch;
      }
      .stage-r {
        text-align: right;
        padding-bottom: 4px;
        flex: none;
      }
      .delta {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-family: var(--font-mono);
        font-size: 12px;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        padding: 3px 7px;
        border-radius: 5px;
        letter-spacing: -0.01em;
      }
      .delta.up {
        color: var(--warn);
        background: var(--warn-soft);
      }
      .delta.down {
        color: var(--muted);
        background: var(--surface-2);
      }
      .delta svg {
        width: 9px;
        height: 9px;
      }
      .stage-r .lbl {
        display: block;
        margin-top: 7px;
      }
      .mini {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        margin: 0;
        padding: 12px 14px 14px;
        border-top: 1px solid var(--border);
        background: var(--surface-2);
      }
      .mini > div {
        padding-right: 8px;
        border-right: 1px solid var(--border);
      }
      .mini > div:last-child {
        border-right: 0;
      }
      .mini dt {
        font-family: var(--font-mono);
        font-size: 8.5px;
        letter-spacing: 0.09em;
        text-transform: uppercase;
        color: var(--muted);
        margin-bottom: 3px;
        white-space: nowrap;
      }
      .mini dd {
        margin: 0;
        font-family: var(--font-mono);
        font-size: 13.5px;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
      }
      .seg {
        display: inline-flex;
        border: 1px solid var(--border-strong);
        border-radius: 7px;
        overflow: hidden;
        background: var(--surface);
      }
      .seg button {
        appearance: none;
        border: 0;
        background: none;
        padding: 4px 9px;
        font-size: 11px;
        color: var(--muted);
        cursor: pointer;
        border-right: 1px solid var(--border);
      }
      .seg button:last-child {
        border-right: 0;
      }
      .seg button:hover {
        color: var(--fg);
        background: var(--surface-2);
      }
      .seg button[aria-pressed='true'] {
        background: var(--accent-soft);
        color: var(--accent-ink);
        font-weight: 600;
      }
      .seg-xs button {
        padding: 3px 7px;
        font-size: 10.5px;
      }
      .bureau-filter {
        display: flex;
        gap: 6px;
        margin-bottom: 10px;
        overflow-x: auto;
        padding-bottom: 4px;
      }
      .bureau-chip {
        appearance: none;
        border: 1px solid var(--border);
        background: var(--surface-2);
        color: var(--fg-soft);
        border-radius: 999px;
        padding: 2px 10px;
        font-family: var(--font-mono);
        font-size: 10.5px;
        cursor: pointer;
        white-space: nowrap;
        transition: background 0.15s ease, border-color 0.15s ease;
      }
      .bureau-chip:hover {
        background: var(--border);
        color: var(--fg);
      }
      .bureau-chip.active {
        background: var(--accent);
        color: white;
        border-color: var(--accent);
        font-weight: 600;
      }
      table.rank {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }
      .rank thead th {
        font-family: var(--font-mono);
        font-size: 9px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--muted);
        font-weight: 500;
        text-align: left;
        padding: 0 0 6px;
        border-bottom: 1px solid var(--border);
      }
      .rank thead th.r {
        text-align: right;
      }
      .rank thead th.c {
        text-align: center;
      }
      .rank td {
        padding: 0;
        border-bottom: 1px solid var(--border);
        height: 31px;
        font-size: 12px;
        vertical-align: middle;
      }
      .rank tbody tr {
        cursor: pointer;
        transition: background-color 0.12s ease;
      }
      .rank tbody tr:hover {
        background: var(--surface-2);
      }
      .rank tbody tr.is-sel {
        background: var(--accent-soft);
      }
      .rank tbody tr.is-sel .rowbtn {
        font-weight: 600;
        color: var(--fg);
      }
      .rank .rk {
        width: 28px;
        font-family: var(--font-mono);
        font-size: 10px;
        color: var(--muted);
        padding-left: 2px;
      }
      .rank .nmm {
        width: auto;
      }
      .rank .rowbtn {
        appearance: none;
        border: 0;
        background: none;
        padding: 5px 0;
        margin: 0;
        width: 100%;
        text-align: left;
        font-family: var(--font-body);
        font-size: 12.5px;
        color: var(--fg-soft);
        cursor: pointer;
        display: flex;
        align-items: baseline;
        gap: 6px;
      }
      .sub-bureau {
        font-family: var(--font-mono);
        font-size: 9px;
        color: var(--muted);
        opacity: 0.8;
      }
      .rank .pf {
        width: 54px;
        text-align: center;
        font-family: var(--font-mono);
        font-size: 10.5px;
        color: var(--muted);
      }
      .pfdot {
        display: inline-block;
        width: 6px;
        height: 6px;
        border-radius: 1px;
        margin-right: 4px;
        vertical-align: 1px;
        border: 1px solid var(--fg-soft);
      }
      .rank .dl {
        width: 62px;
        text-align: right;
        font-family: var(--font-mono);
        font-size: 10.5px;
        font-variant-numeric: tabular-nums;
      }
      .rank .dl.up {
        color: var(--warn);
      }
      .rank .dl.down {
        color: var(--muted);
      }
      .rank .fcc {
        width: 76px;
        text-align: right;
        position: relative;
        padding-right: 2px;
      }
      .rank .mb {
        position: absolute;
        right: 2px;
        bottom: 4px;
        height: 2px;
        max-width: 64px;
        background: var(--accent);
        opacity: 0.45;
        border-radius: 2px;
      }
      .rank .fcv {
        font-family: var(--font-mono);
        font-size: 11.5px;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        position: relative;
      }
      .rank .empty {
        text-align: center;
        color: var(--muted);
        font-size: 12px;
        height: 60px;
      }

      @media (max-width: 560px) {
        .mini {
          grid-template-columns: 1fr 1fr;
          gap: 10px 0;
        }
        .mini > div:nth-child(2) {
          border-right: 0;
        }
      }
    `,
  ],
})
export class ZoneViewComponent {
  readonly crimeService = inject(CrimeAnalysisService);
  readonly selected = this.crimeService.selectedDivision;

  readonly categoryBars = computed<BarItem[]>(() => {
    return this.selected().mix.map((m) => ({ k: m.k, v: m.v }));
  });

  readonly premiseBars = computed<BarItem[]>(() => {
    return this.selected().premises.map((p) => ({
      k: this.crimeService.premiseLabels[p.k] || p.k,
      v: p.v,
    }));
  });

  private readonly nf0 = new Intl.NumberFormat('es-ES');
  private readonly nf1 = new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  formatNumber(val: number): string {
    return this.nf0.format(val);
  }

  formatDecimal(val: number): string {
    return this.nf1.format(val);
  }

  formatDelta(val: number): string {
    const prefix = val > 0 ? '+' : val < 0 ? '−' : '';
    return prefix + this.formatDecimal(Math.abs(val));
  }

  getBarWidth(forecast: number): number {
    const mx = this.crimeService.maxForecast();
    return Math.max(4, Math.min(64, (forecast / mx) * 62));
  }

  setSort(sort: SortCriterion): void {
    this.crimeService.setSort(sort);
  }

  setBureau(bureau: string | null): void {
    this.crimeService.setSelectedBureau(bureau);
  }

  onSelect(code: string): void {
    this.crimeService.selectDivision(code);
  }
}
