import { DataJobService } from '../../../core/services/data-job.service';
import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CrimeAnalysisService } from '../../../core/services/crime-analysis.service';
import { BarChartComponent, BarItem } from '../../../shared/components/bar-chart/bar-chart.component';

@Component({
  selector: 'app-data-view',
  standalone: true,
  imports: [CommonModule, BarChartComponent],
  template: `
    <section class="pane" id="pane-datos" role="tabpanel" aria-labelledby="tab-datos">
      <div class="block" style="margin-top: 14px">
        <div class="sec-h">
          <h3>Resultados mostrados</h3>
          <span class="lbl">{{ run().datasetName }}</span>
        </div>
        @if (jobService.restoringLatest()) {
          <p class="note" role="status">Consultando la última ejecución guardada en el servidor…</p>
        }
        @if (jobService.restorationNotice()) {
          <p class="note" role="status">{{ jobService.restorationNotice() }}</p>
        }
        <table class="grid2">
          <tbody>
            <tr>
              <td>Origen de los datos</td>
              <td>{{ run().jobId ? 'Ejecución procesada en el servidor' : 'Resultados iniciales de referencia' }}</td>
            </tr>
            <tr>
              <td>Generado</td>
              <td>{{ formatDate(run().generatedAt) }}</td>
            </tr>
            <tr>
              <td>Filas crudas</td>
              <td>{{ formatNumber(run().rawRows) }}</td>
            </tr>
            <tr>
              <td>Incidentes utilizables</td>
              <td>{{ formatNumber(run().usableRows) }}</td>
            </tr>
            <tr>
              <td>Zonas con perfil</td>
              <td>{{ formatNumber(run().profileZones) }}</td>
            </tr>
            <tr>
              <td>Cobertura de perfil</td>
              <td>{{ formatDecimal(run().coveragePct) }} %</td>
            </tr>
            <tr>
              <td>Trabajo</td>
              <td>{{ run().jobId ?? 'Sin ejecución asociada' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="note">«Generado» indica cuándo se construyeron estos resultados, no cuándo se seleccionó o empezó a subir el archivo. Una carga nueva cambia la fecha al finalizar correctamente.</p>
      <div class="block">
        <div class="sec-h">
          <h3>Alcance del dataset</h3>
          <span class="lbl">2020-01 → 2023-11</span>
        </div>
        <table class="grid2">
          <thead>
            <tr>
              <th scope="col">Concepto</th>
              <th scope="col">Valor</th>
            </tr>
          </thead>
          <tbody>
            @for (s of crimeService.scope(); track s.concept) {
              <tr>
                <td>{{ s.concept }}</td>
                <td>{{ s.value }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <div class="block">
        <div class="sec-h">
          <h3>Tipificaciones más frecuentes</h3>
          <span class="lbl">% del total</span>
        </div>
        <app-bar-chart
          [items]="typificationBars()"
          [isSmall]="true"
          [max]="12"
        ></app-bar-chart>
      </div>

      <div class="block">
        <div class="sec-h">
          <h3>Archivos del análisis</h3>
          <span class="lbl">exportados por el notebook</span>
        </div>
        <div class="files">
          <code>resultados_modelos.csv</code>
          <code>catalogo_perfiles.csv</code>
          <code>matriz_zona_perfil.csv</code>
          <code>perfil_zona_resumen.csv</code>
          <code>perfil_zona_largo.csv</code>
          <code>ranking_zona_perfil.csv</code>
          <code>predicciones_test.csv</code>
          <code>predicciones_zona_perfil.csv</code>
          <code>hotspots_perfil.csv</code>
          <code>auditoria_tipificaciones.csv</code>
          <code>mlp_perfilamiento.keras</code>
        </div>
        <p class="note">
          TensorFlow 2.x · pandas 3.0.5 · scikit-learn. Los artefactos se regeneran en
          cada ejecución del notebook y alimentan el contrato del tablero.
        </p>
      </div>

      <div class="block">
        <div class="sec-h">
          <h3>Límites de lectura</h3>
          <span class="lbl">rigor metodológico</span>
        </div>
        <ul class="gaps">
          <li>
            Son denuncias registradas, no criminalidad real total: la cifra depende de la
            propensión institucional a denunciar de cada zona.
          </li>
          <li>
            No hay denominador poblacional dinámico en tiempo real, por lo que se modelan
            incidentes brutos y no tasas por 100.000 habitantes.
          </li>
          <li>
            Diciembre de 2023 se excluyó del corte analítico para evitar sesgos por
            reportes incompletos o pendientes de consolidación.
          </li>
          <li>
            El perfilamiento es asociativo y no causal: las reglas tipológicas describen
            patrones geográficos, no determinan causas unívocas.
          </li>
          <li>
            El modelo asigna perfil a 1.000 zonas de reporte; el panel contiene 1.102
            zonas y el mapa agrega 21 divisiones. Son tres granularidades distintas y no
            deben compararse como si fueran la misma unidad.
          </li>
          <li>
            Los puntos de concentración agrupan denuncias en celdas de aproximadamente 500 m.
            Su división se identifica por la zona de reporte principal de cada celda.
          </li>
          <li>
            Los polígonos del mapa corresponden a la delimitación geográfica oficial de
            las 21 Divisiones Policiales del Departamento de Policía de Los Ángeles
            (LAPD GeoHub).
          </li>
        </ul>
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
        max-width: 45%;
        text-align: right;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .note {
        font-size: 11px;
        color: var(--muted);
        line-height: 1.5;
        margin-top: 10px;
        max-width: 56ch;
      }
      table.grid2 {
        width: 100%;
        border-collapse: collapse;
        font-variant-numeric: tabular-nums;
      }
      .grid2 th {
        font-family: var(--font-mono);
        font-size: 9px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--muted);
        font-weight: 500;
        text-align: right;
        padding: 0 0 7px;
        border-bottom: 1px solid var(--border);
      }
      .grid2 th:first-child {
        text-align: left;
      }
      .grid2 td {
        padding: 7px 0;
        border-bottom: 1px solid var(--border);
        font-family: var(--font-mono);
        font-size: 11.5px;
        text-align: right;
        color: var(--fg-soft);
      }
      .grid2 td:first-child {
        text-align: left;
        font-family: var(--font-body);
        font-size: 12px;
        color: var(--fg);
      }
      .grid2 tbody tr:last-child td {
        border-bottom: 0;
      }
      .files {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
      }
      .files code {
        font-family: var(--font-mono);
        font-size: 10px;
        padding: 5px 7px;
        border-radius: 5px;
        background: var(--surface-2);
        border: 1px solid var(--border);
        color: var(--fg-soft);
        overflow-wrap: anywhere;
      }
      ul.gaps {
        margin: 0;
        padding: 0;
        list-style: none;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      ul.gaps li {
        position: relative;
        padding-left: 14px;
        font-size: 11.5px;
        color: var(--fg-soft);
        line-height: 1.55;
      }
      ul.gaps li::before {
        content: '';
        position: absolute;
        left: 0;
        top: 7px;
        width: 5px;
        height: 5px;
        border-radius: 1px;
        background: var(--border-strong);
      }
      @media (max-width: 560px) {
        .files {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class DataViewComponent {
  readonly crimeService = inject(CrimeAnalysisService);
  readonly jobService = inject(DataJobService);
  readonly run = this.crimeService.modelRun;

  private readonly nf0 = new Intl.NumberFormat('es-ES');
  private readonly nf1 = new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  private readonly dateFmt = new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  readonly typificationBars = computed<BarItem[]>(() => {
    return this.crimeService.typifications().map((t) => ({
      k: t.code,
      v: t.percentage,
    }));
  });

  formatNumber(value: number): string {
    return this.nf0.format(value);
  }

  formatDecimal(value: number): string {
    return this.nf1.format(value);
  }

  formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : this.dateFmt.format(date);
  }
}
