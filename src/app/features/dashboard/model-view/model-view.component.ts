import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CrimeAnalysisService } from '../../../core/services/crime-analysis.service';

@Component({
  selector: 'app-model-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="pane" id="pane-modelo" role="tabpanel" aria-labelledby="tab-modelo">
      <div class="block" style="margin-top: 14px">
        <div class="sec-h">
          <h3>Comparación de modelos</h3>
          <span class="lbl">test · jul–nov 2023</span>
        </div>
        <table class="grid2">
          <thead>
            <tr>
              <th scope="col">Modelo</th>
              <th scope="col">MAE</th>
              <th scope="col">RMSE</th>
              <th scope="col">R²</th>
            </tr>
          </thead>
          <tbody>
            @for (m of crimeService.models(); track m.name) {
              <tr [class.best]="m.isBest">
                <td>{{ m.name }}</td>
                <td>{{ format4(m.mae) }}</td>
                <td>{{ format4(m.rmse) }}</td>
                <td>{{ format4(m.r2) }}</td>
              </tr>
            }
          </tbody>
        </table>
        <p class="note">
          {{ formatNumber(run().testRows) }} filas de test sobre
          {{ formatNumber(run().panelRows ?? 0) }} filas del panel de modelado.
          La fila destacada es el menor MAE; Random Forest obtiene el mejor RMSE y R².
        </p>
      </div>

      <div class="block">
        <div class="sec-h">
          <h3>Particiones del panel</h3>
          <span class="lbl">corte temporal</span>
        </div>
        <table class="grid2">
          <thead>
            <tr>
              <th scope="col">Partición</th>
              <th scope="col">Filas</th>
              <th scope="col">Uso</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Entrenamiento</td>
              <td>{{ formatNumber(run().trainRows ?? 0) }}</td>
              <td>Ajuste de pesos</td>
            </tr>
            <tr>
              <td>Validación</td>
              <td>{{ formatNumber(run().validRows ?? 0) }}</td>
              <td>Selección y early stopping</td>
            </tr>
            <tr class="best">
              <td>Test</td>
              <td>{{ formatNumber(run().testRows) }}</td>
              <td>Evaluación final</td>
            </tr>
            <tr>
              <td>Total del panel</td>
              <td>{{ formatNumber(run().panelRows ?? 0) }}</td>
              <td>Zonas × meses</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="block">
        <div class="sec-h">
          <h3>Arquitectura de la red neuronal</h3>
          <span class="lbl">MLP · TensorFlow</span>
        </div>
        <div class="arch-grid">
          <div class="arch-item">
            <span class="lbl">Entrada</span>
            <strong>21 features</strong>
          </div>
          <div class="arch-item">
            <span class="lbl">Capas ocultas</span>
            <strong>128 → 64 → 32</strong>
          </div>
          <div class="arch-item">
            <span class="lbl">Salida</span>
            <strong>1 incidencia</strong>
          </div>
          <div class="arch-item">
            <span class="lbl">Parámetros</span>
            <strong>14.081</strong>
          </div>
          <div class="arch-item">
            <span class="lbl">Épocas</span>
            <strong>17</strong>
          </div>
          <div class="arch-item">
            <span class="lbl">val_loss / val_mae</span>
            <strong>0,105 / 0,400</strong>
          </div>
        </div>
        <p class="note">
          Activación ReLU, salida lineal, early stopping sobre validación y semilla fija.
          El pronóstico se agrega por área para el último mes del corte y se compara con
          el mes observado anterior.
        </p>
      </div>

      <div class="block">
        <div class="sec-h">
          <h3>Los seis perfiles territoriales</h3>
          <span class="lbl">{{ formatNumber(run().profileZones) }} zonas con perfil</span>
        </div>
        <table class="grid2">
          <thead>
            <tr>
              <th scope="col">Perfil</th>
              <th scope="col">Princ.</th>
              <th scope="col">Prior.</th>
              <th scope="col">Incid.</th>
              <th scope="col">Part.</th>
              <th scope="col">Armas</th>
              <th scope="col">MAE</th>
            </tr>
          </thead>
          <tbody>
            @for (p of crimeService.profiles(); track p.code) {
              <tr>
                <td>{{ p.code }} · {{ p.name }}</td>
                <td>{{ formatNumber(p.principalZones) }}</td>
                <td>{{ formatNumber(p.priorityZones) }}</td>
                <td>{{ formatNumber(p.incidents) }}</td>
                <td>{{ formatDecimal(p.sharePct) }} %</td>
                <td>{{ formatDecimal(p.weaponPct) }} %</td>
                <td>{{ formatDecimal(p.mae) }}</td>
              </tr>
            }
          </tbody>
        </table>
        <p class="note">
          P05 no es perfil dominante en las 21 divisiones, pero aparece como prioritario
          en 22 zonas de reporte. La cobertura de perfil principal es
          {{ formatDecimal(run().coveragePct) }} %.
        </p>
      </div>

      <div class="block">
        <div class="sec-h">
          <h3>Criterios de prioridad</h3>
          <span class="lbl">multi-criterio</span>
        </div>
        <table class="grid2">
          <thead>
            <tr>
              <th scope="col">Criterio</th>
              <th scope="col">Peso</th>
              <th scope="col">Lectura</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Participación del perfil</td>
              <td>0,40</td>
              <td>Peso relativo en la zona</td>
            </tr>
            <tr>
              <td>Lift frente a la ciudad</td>
              <td>0,25</td>
              <td>Sobrerrepresentación territorial</td>
            </tr>
            <tr>
              <td>Tendencia reciente</td>
              <td>0,15</td>
              <td>Cambio en los últimos meses</td>
            </tr>
            <tr>
              <td>Severidad del perfil</td>
              <td>0,10</td>
              <td>Daño potencial del hecho</td>
            </tr>
            <tr>
              <td>Evidencia disponible</td>
              <td>0,10</td>
              <td>Volumen mínimo para decidir</td>
            </tr>
          </tbody>
        </table>
        <div class="callout">
          <div class="ct">Lectura honesta</div>
          <p>
            La prioridad no es solo frecuencia: combina participación, lift, tendencia,
            severidad y evidencia. El pronóstico MLP es una señal de demanda esperada,
            no una predicción causal ni una orden de despliegue automático.
          </p>
        </div>
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
      .grid2 td:nth-child(3) {
        font-family: var(--font-body);
        font-size: 11px;
      }
      .grid2 tr.best td {
        background: var(--accent-soft);
      }
      .grid2 tr.best td:first-child {
        color: var(--accent-ink);
        font-weight: 600;
      }
      .grid2 tbody tr:last-child td {
        border-bottom: 0;
      }
      .arch-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
      }
      .arch-item {
        border: 1px solid var(--border);
        border-radius: var(--radius);
        background: var(--surface-2);
        padding: 9px 10px;
      }
      .arch-item .lbl {
        display: block;
        margin-bottom: 3px;
      }
      .arch-item strong {
        font-family: var(--font-mono);
        font-size: 12px;
        color: var(--fg);
      }
      .callout {
        margin-top: 14px;
        padding: 12px 13px;
        border-radius: var(--radius);
        border: 1px solid var(--border);
        border-left: 2px solid var(--warn);
        background: var(--warn-soft);
      }
      .callout .ct {
        font-family: var(--font-mono);
        font-size: 9px;
        letter-spacing: 0.11em;
        text-transform: uppercase;
        color: var(--warn);
        margin-bottom: 4px;
      }
      .callout p {
        font-size: 11.5px;
        color: var(--fg-soft);
        line-height: 1.6;
      }
      @media (max-width: 560px) {
        .arch-grid {
          grid-template-columns: 1fr 1fr;
        }
      }
    `,
  ],
})
export class ModelViewComponent {
  readonly crimeService = inject(CrimeAnalysisService);
  readonly run = this.crimeService.modelRun;

  private readonly nf0 = new Intl.NumberFormat('es-ES');
  private readonly nf1 = new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  private readonly nf4 = new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });

  formatNumber(value: number): string {
    return this.nf0.format(value);
  }

  formatDecimal(value: number): string {
    return this.nf1.format(value);
  }

  format4(value: number): string {
    return this.nf4.format(value);
  }
}
