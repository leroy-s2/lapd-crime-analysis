import {
  Component,
  ElementRef,
  ViewChild,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CrimeAnalysisService } from '../../../core/services/crime-analysis.service';
import {
  DataJobService,
} from '../../../core/services/data-job.service';

@Component({
  selector: 'app-data-source-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <dialog #dialogElement (click)="onBackdropClick($event)">
      <div class="dlg-h">
        <div>
          <h3>Fuente de datos y ejecución del notebook</h3>
          <p class="dlg-sub">Carga un CSV LAPD y actualiza el tablero con los resultados del modelo.</p>
        </div>
        <button class="btn" type="button" (click)="close()" aria-label="Cerrar modal">
          Cerrar
        </button>
      </div>

      <div class="dlg-b">
        <p>
          El tablero parte de una ejecución del notebook de Unidad 3: seis perfiles
          delictivos consolidados (P01–P06), pronóstico con MLP, HistGradientBoosting,
          Random Forest y persistencia. No usa K-Means ni un número fijo de clústeres.
        </p>

        <section class="upload-card" aria-labelledby="upload-title">
          <div class="upload-head">
            <div>
              <div class="code-title" id="upload-title">Ejecutar notebook completo</div>
              <p class="upload-copy">
                El archivo se procesa en el servidor. La ejecución puede tardar varios minutos.
              </p>
            </div>
            <span class="lbl">CSV · LAPD</span>
          </div>

          <div
            class="dropzone"
            [class.dragging]="isDragging()"
            [class.disabled]="running()"
            [attr.aria-disabled]="running()"
            (click)="!running() && fileInput.click()"
            (dragover)="onDragOver($event)"
            (dragleave)="onDragLeave($event)"
            (drop)="onDrop($event)"
            role="button"
            tabindex="0"
            (keydown.enter)="!running() && fileInput.click()"
            (keydown.space)="$event.preventDefault(); !running() && fileInput.click()"
          >
            <input
              #fileInput
              type="file"
              accept=".csv,text/csv"
              hidden
              [disabled]="running()"
              (change)="onFileSelected($event)"
            />
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
              <path d="M12 16V4m0 0 4 4m-4-4-4 4" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke-linecap="round" />
            </svg>
            <strong>{{ selectedFile()?.name || 'Arrastra un CSV o haz clic para seleccionar' }}</strong>
            <span>
              {{ selectedFile() ? formatSize(selectedFile()!.size) : 'Máximo 512 MB · solo archivos .csv' }}
            </span>
          </div>

          <div class="upload-actions">
            <button
              class="btn"
              type="button"
              (click)="clearFile()"
              [disabled]="!selectedFile() || running()"
            >
              Limpiar
            </button>
            <button
              class="btn btn-primary"
              type="button"
              (click)="startUpload()"
              [disabled]="!selectedFile() || running()"
            >
              {{ running() ? jobService.label() : 'Subir y ejecutar notebook' }}
            </button>
          </div>

          @if (jobService.phase() !== 'idle') {
            <div class="job-status" [attr.data-phase]="jobService.phase()" aria-live="polite" aria-atomic="true">
              <div class="job-head">
                <span class="status-dot"></span>
                <strong>{{ jobService.label() }}</strong>
                @if (jobService.phase() !== 'failed') {
                  <span class="job-progress">{{ jobService.progress() === null ? 'En curso' : jobService.progress() + '%' }}</span>
                }
              </div>
              @if (jobService.phase() !== 'failed') {
                <div class="progress" [class.indeterminate]="jobService.progress() === null"
                  role="progressbar" [attr.aria-label]="jobService.label()"
                  [attr.aria-valuenow]="jobService.progress()" aria-valuemin="0" aria-valuemax="100">
                  <span [style.width.%]="jobService.progress() ?? 35"></span>
                </div>
              }
              @if (jobService.phase() === 'uploading') {
                <p class="job-message">{{ formatSize(jobService.uploadedBytes()) }} enviados@if(jobService.totalBytes(); as total) { de {{ formatSize(total) }} }</p>
              }
              @if (jobService.processing() || jobService.phase() === 'completed') {
                <span class="upload-done">✓ Subida completada · 100 %</span>
              }
              <p class="job-message">{{ jobService.message() }}</p>
              @if (running()) {
                <p class="job-message">El estado seguirá visible en el botón «Fuente de datos» aunque cierres esta ventana. Mantén esta pestaña abierta.</p>
              }
              @if (job(); as currentJob) {
                @if (currentJob.logs.length) {
                  <details>
                    <summary>Ver log de ejecución</summary>
                    <pre>{{ currentJob.logs.join('\n') }}</pre>
                  </details>
                }
              }
            </div>
          } @else if (selectedFile()) {
            <p class="job-message">Archivo listo. Pulsa «Subir y ejecutar notebook» para enviarlo.</p>
          }
          @if (error()) {
            <p class="error inline-error" role="alert">{{ error() }}</p>
          }

        </section>

        <p>
          Las capas espaciales provienen del GeoHub oficial de la Ciudad de Los Ángeles
          con los polígonos de las 21 divisiones policiales. El modelo trabaja con
          1.000 zonas de reporte con perfil principal y 1.102 zonas en el panel; la
          vista de mapa agrega el perfil dominante a nivel división.
        </p>

        <div class="code-title">Esquema canónico de división actualizado:</div>
        <pre>{{ jsonSchema }}</pre>
      </div>

      <div class="dlg-f">
        <button class="btn" type="button" (click)="copySchema()">
          {{ copied ? '¡Copiado!' : 'Copiar esquema JSON' }}
        </button>
        <button class="btn btn-primary" type="button" (click)="close()">
          {{ jobService.phase() === 'completed' ? 'Ver datos actualizados' : 'Cerrar' }}
        </button>
      </div>
    </dialog>
  `,
  styles: [
    `
      dialog {
        border: 1px solid var(--border-strong);
        border-radius: var(--radius-lg);
        padding: 0;
        max-width: 760px;
        width: calc(100% - 32px);
        background: var(--surface);
        color: var(--fg);
        box-shadow: 0 24px 60px oklch(0% 0 0 / 0.22);
      }
      dialog::backdrop {
        background: oklch(18% 0.012 250 / 0.4);
        backdrop-filter: blur(2px);
      }
      .dlg-h {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        padding: 16px 20px;
        border-bottom: 1px solid var(--border);
      }
      .dlg-h h3 {
        font-size: 16px;
      }
      .dlg-sub {
        margin-top: 4px;
        font-size: 11.5px;
        color: var(--muted);
      }
      .dlg-b {
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 14px;
        max-height: 68vh;
        overflow-y: auto;
      }
      .dlg-b p {
        font-size: 12.5px;
        color: var(--fg-soft);
        line-height: 1.6;
      }
      .upload-card {
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        padding: 16px;
        background: var(--surface-2);
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .upload-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }
      .upload-copy {
        font-size: 11px !important;
        color: var(--muted) !important;
        margin-top: 3px;
      }
      .dropzone {
        border: 1px dashed var(--border-strong);
        border-radius: var(--radius);
        padding: 20px 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 5px;
        text-align: center;
        cursor: pointer;
        background: var(--surface);
        transition: border-color 0.15s ease, background-color 0.15s ease;
      }
      .dropzone:hover,
      .dropzone.dragging {
        border-color: var(--accent);
        background: var(--accent-soft);
      }
      .dropzone svg {
        width: 28px;
        height: 28px;
        color: var(--accent-ink);
        margin-bottom: 4px;
      }
      .dropzone strong {
        font-size: 12.5px;
        color: var(--fg);
      }
      .dropzone span {
        font-size: 10.5px;
        color: var(--muted);
      }
      .upload-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }
      .job-status {
        border-top: 1px solid var(--border);
        padding-top: 12px;
        display: flex;
        flex-direction: column;
        gap: 7px;
      }
      .job-head {
        display: flex;
        align-items: center;
        gap: 7px;
        font-size: 11.5px;
      }
      .job-progress {
        margin-left: auto;
        font-family: var(--font-mono);
        color: var(--muted);
      }
      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--muted);
      }
      .job-status { --job-color: #15803d; }
      .job-status[data-phase='queued'], .job-status[data-phase='running'], .job-status[data-phase='applying'] { --job-color: #c2410c; }
      .job-status[data-phase='failed'] { --job-color: #b91c1c; }
      .job-status .status-dot, .job-status .progress span { background: var(--job-color); }
      .job-status[data-phase='running'] .status-dot, .job-status[data-phase='queued'] .status-dot { animation: pulse 1.2s ease-in-out infinite; }
      .job-status[data-phase='running'] .progress span, .job-status[data-phase='queued'] .progress span, .job-status[data-phase='applying'] .progress span {
        background-image: repeating-linear-gradient(115deg, transparent 0 8px, #ffffff55 8px 16px);
        background-size: 35px 100%; animation: processing 1s linear infinite;
      }
      .upload-done { color: #15803d; font-size: 11px; }
      .dropzone.disabled { cursor: default; opacity: .65; }
      .progress.indeterminate span { animation: transfer 1.2s ease-in-out infinite; }
      @keyframes transfer { from { transform: translateX(-100%); } to { transform: translateX(320%); } }
      @keyframes processing { to { background-position: 35px 0; } }
      @media (prefers-reduced-motion: reduce) { .job-status .progress span, .job-status .status-dot { animation: none !important; } }
      @keyframes pulse {
        50% {
          opacity: 0.35;
        }
      }
      .progress {
        height: 6px;
        border-radius: 999px;
        background: var(--border);
        overflow: hidden;
      }
      .progress span {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: var(--accent);
        transition: width 0.3s ease;
      }
      .job-message {
        font-size: 11px !important;
        color: var(--muted) !important;
      }
      .error {
        margin: 0;
        padding: 9px 10px;
        border-radius: var(--radius);
        border: 1px solid color-mix(in oklab, oklch(58% 0.2 25) 35%, transparent);
        background: color-mix(in oklab, oklch(58% 0.2 25) 8%, white);
        color: oklch(40% 0.18 25);
        font-family: var(--font-mono);
        font-size: 10.5px;
        line-height: 1.5;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }
      .inline-error {
        margin-top: 2px;
      }
      details {
        font-size: 11px;
        color: var(--fg-soft);
      }
      summary {
        cursor: pointer;
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.04em;
        color: var(--muted);
      }
      details pre {
        margin-top: 7px;
        max-height: 160px;
        overflow: auto;
      }
      .code-title {
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: var(--muted);
      }
      pre {
        margin: 0;
        padding: 12px;
        border-radius: var(--radius);
        background: var(--surface-2);
        border: 1px solid var(--border);
        font-family: var(--font-mono);
        font-size: 11px;
        line-height: 1.55;
        color: var(--fg-soft);
        overflow-x: auto;
        white-space: pre;
      }
      .dlg-f {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 10px;
        padding: 12px 20px;
        border-top: 1px solid var(--border);
        background: var(--surface-2);
      }
      .btn-primary {
        background: var(--accent);
        color: white;
        border-color: var(--accent);
      }
      .btn-primary:hover {
        background: var(--accent-ink);
        color: white;
      }
      .btn:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
    `,
  ],
})
export class DataSourceDialogComponent {
  readonly closed = output<void>();
  readonly crimeService = inject(CrimeAnalysisService);
  readonly jobService = inject(DataJobService);

  @ViewChild('dialogElement') dialogRef?: ElementRef<HTMLDialogElement>;
  @ViewChild('fileInput') fileInputRef?: ElementRef<HTMLInputElement>;

  readonly selectedFile = signal<File | null>(null);
  readonly job = this.jobService.job;
  readonly error = computed(() => this.validationError() ?? this.jobService.error());
  readonly validationError = signal<string | null>(null);
  readonly isDragging = signal(false);
  readonly running = this.jobService.busy;
  copied = false;

  readonly jsonSchema = `{
  "code": "D-01",
  "name": "Central",
  "profile": "P04",
  "profileName": "Delitos Contra la Vida y la Integridad",
  "profileShares": {
    "P01": 26.8, "P02": 20.7, "P03": 6.07,
    "P04": 29.82, "P05": 2.72, "P06": 13.89
  },
  "priorityProfile": "P04",
  "priorityScore": 0.749,
  "lat": 34.0466,
  "lng": -118.2437,
  "inc12": 15130,
  "prev": 1436,
  "forecast": 1127,
  "deltaPct": -21.5,
  "mae": 1.789,
  "night": 36.5,
  "weekend": 29.5,
  "weapon": 39.6,
  "mix": [{ "k": "Patrimonio", "v": 53.13 }],
  "premises": [{ "k": "Vía pública", "v": 44.63 }],
  "spark": [1514, 1542, 1332, 1351, 1365, 1297]
}`;

  open(): void {
    this.dialogRef?.nativeElement.showModal();
  }

  close(): void {
    this.dialogRef?.nativeElement.close();
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialogRef?.nativeElement) {
      this.close();
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (!this.running()) {
      this.isDragging.set(true);
    }
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    if (this.running()) return;
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.setFile(file);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.setFile(file);
    }
  }

  startUpload(): void {
    const file = this.selectedFile();
    if (!file || this.running()) return;
    this.validationError.set(null);
    this.jobService.upload(file);
  }

  clearFile(): void {
    if (this.running()) return;
    this.selectedFile.set(null);
    this.validationError.set(null);
    this.jobService.reset();
    if (this.fileInputRef?.nativeElement) this.fileInputRef.nativeElement.value = '';
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  copySchema(): void {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(this.jsonSchema).then(() => {
        this.copied = true;
        setTimeout(() => (this.copied = false), 2000);
      });
    }
  }

  private setFile(file: File): void {
    if (this.running()) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      this.validationError.set('Selecciona un archivo .csv exportado por LAPD.');
      return;
    }
    if (file.size > 512 * 1024 * 1024) {
      this.validationError.set('El archivo supera el límite de 512 MB.');
      return;
    }
    this.validationError.set(null);
    this.jobService.reset();
    this.selectedFile.set(file);
  }

}
