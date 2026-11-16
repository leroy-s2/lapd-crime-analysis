import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Injectable, OnDestroy, computed, inject, signal } from '@angular/core';
import { Observable, Subscription, switchMap, takeWhile, timer } from 'rxjs';
import { DashboardPayload } from '../models/crime-analysis.models';
import { CrimeAnalysisService } from './crime-analysis.service';

export type DataJobStatus = 'queued' | 'running' | 'completed' | 'failed';
export type TransferPhase = 'idle' | 'uploading' | 'uploaded' | 'queued' | 'running' | 'applying' | 'completed' | 'failed';

export interface DataJob {
  id: string;
  filename: string;
  size: number;
  status: DataJobStatus;
  progress: number;
  message: string;
  logs: string[];
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  resultAvailable: boolean;
}
interface ApiGlobal { __LAPD_API_BASE__?: string; }

/** Owns the whole transfer so closing the dialog cannot stop upload or polling. */
@Injectable({ providedIn: 'root' })
export class DataJobService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly crimeService = inject(CrimeAnalysisService);
  private readonly apiBase = (globalThis as ApiGlobal).__LAPD_API_BASE__ ??
    (typeof location !== 'undefined' && ['localhost', '127.0.0.1'].includes(location.hostname)
      ? 'http://localhost:8000' : '');

  readonly restoringLatest = signal(false);
  readonly restorationNotice = signal<string | null>(null);
  private latestSubscription?: Subscription;

  readonly phase = signal<TransferPhase>('idle');
  readonly job = signal<DataJob | null>(null);
  readonly error = signal<string | null>(null);
  readonly filename = signal('');
  readonly uploadedBytes = signal(0);
  readonly totalBytes = signal<number | null>(null);
  readonly uploadPercent = signal<number | null>(0);
  readonly busy = computed(() => !['idle', 'completed', 'failed'].includes(this.phase()));
  readonly processing = computed(() => ['queued', 'running', 'applying'].includes(this.phase()));
  readonly progress = computed(() => {
    if (this.phase() === 'uploading') return this.uploadPercent();
    if (['uploaded', 'applying', 'completed'].includes(this.phase())) return 100;
    return this.job() ? Math.max(0, Math.min(100, this.job()!.progress)) : 0;
  });
  readonly label = computed(() => {
    switch (this.phase()) {
      case 'uploading': return this.uploadPercent() === null ? 'Subiendo archivo…' : `Subiendo archivo · ${this.uploadPercent()} %`;
      case 'uploaded': return 'Archivo enviado · 100 %';
      case 'queued': return 'En cola de procesamiento';
      case 'running': return 'Ejecutando notebook…';
      case 'applying': return 'Actualizando gráficos…';
      case 'completed': return 'Datos actualizados';
      case 'failed': return 'Revisar error';
      default: return 'Fuente de datos';
    }
  });
  readonly message = computed(() => {
    if (this.error()) return this.error()!;
    switch (this.phase()) {
      case 'uploading': return 'Enviando el CSV al servidor. Puedes cerrar esta ventana; la subida continuará.';
      case 'uploaded': return 'Subida al 100 %. Esperando la confirmación del servidor para iniciar el procesamiento.';
      case 'applying': return 'El análisis terminó. Descargando los resultados y actualizando el tablero.';
      case 'completed': return 'Resultados aplicados al tablero.';
      default: return this.job()?.message ?? '';
    }
  });

  private uploadSubscription?: Subscription;
  private pollSubscription?: Subscription;
  private resultSubscription?: Subscription;

  restoreLatest(): void {
    this.latestSubscription?.unsubscribe();
    this.restoringLatest.set(true);
    this.restorationNotice.set(null);
    const initialRun = this.crimeService.modelRun();
    this.latestSubscription = this.http.get<DashboardPayload>(`${this.apiBase}/api/dashboard/latest`).subscribe({
      next: payload => {
        // An older startup request must never replace a newly uploaded result.
        if (this.phase() === 'idle' && this.crimeService.modelRun() === initialRun) {
          this.crimeService.applyDashboard(payload);
        }
        this.restoringLatest.set(false);
      },
      error: err => {
        this.restoringLatest.set(false);
        if (this.phase() !== 'idle' || this.crimeService.modelRun() !== initialRun) return;
        const status = (err as { status?: number })?.status;
        this.restorationNotice.set(status === 404
          ? 'No hay resultados procesados guardados disponibles; se muestran los resultados iniciales de referencia.'
          : 'No se pudo recuperar la última ejecución del servidor. Comprueba la conexión y vuelve a cargar la página.');
      },
    });
  }

  startJob(file: File): Observable<HttpEvent<DataJob>> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.post<DataJob>(`${this.apiBase}/api/jobs`, form, {
      observe: 'events', reportProgress: true,
    });
  }
  getJob(jobId: string): Observable<DataJob> {
    return this.http.get<DataJob>(`${this.apiBase}/api/jobs/${jobId}`);
  }
  getResult(jobId: string): Observable<DashboardPayload> {
    return this.http.get<DashboardPayload>(`${this.apiBase}/api/jobs/${jobId}/result`);
  }
  pollJob(jobId: string, intervalMs = 1500): Observable<DataJob> {
    return timer(0, intervalMs).pipe(
      switchMap(() => this.getJob(jobId)),
      takeWhile(job => job.status === 'queued' || job.status === 'running', true),
    );
  }

  upload(file: File): void {
    if (this.busy()) return;
    this.reset();
    this.filename.set(file.name);
    // Set synchronously, before even the first HTTP event, to prevent double submissions.
    this.phase.set('uploading');
    this.uploadSubscription = this.startJob(file).subscribe({
      next: event => {
        if (event.type === HttpEventType.UploadProgress) {
          this.uploadedBytes.set(event.loaded);
          this.totalBytes.set(event.total ?? null);
          const percent = event.total ? Math.min(100, Math.floor(event.loaded / event.total * 100)) : null;
          this.uploadPercent.set(percent);
          if (percent === 100) this.phase.set('uploaded');
        } else if (event.type === HttpEventType.Response) {
          if (!event.body) { this.fail('El servidor no devolvió el identificador del trabajo.'); return; }
          this.uploadPercent.set(100);
          this.acceptJob(event.body);
          if (event.body.status === 'queued' || event.body.status === 'running') this.poll(event.body.id);
        }
      },
      error: err => this.fail(this.describeError(err)),
    });
  }

  reset(): void {
    if (this.busy()) return;
    this.unsubscribe();
    this.job.set(null);
    this.error.set(null);
    this.filename.set('');
    this.uploadedBytes.set(0);
    this.totalBytes.set(null);
    this.uploadPercent.set(0);
    this.phase.set('idle');
  }

  ngOnDestroy(): void { this.unsubscribe(); this.latestSubscription?.unsubscribe(); }

  private poll(jobId: string): void {
    this.pollSubscription = this.pollJob(jobId).subscribe({
      next: job => this.acceptJob(job),
      error: err => this.fail(`No se pudo consultar el estado. El trabajo puede seguir ejecutándose en el servidor. ${this.describeError(err)}`),
    });
  }
  private acceptJob(job: DataJob): void {
    this.job.set(job);
    if (job.status === 'failed') { this.fail(job.error ?? 'La ejecución del notebook falló.'); return; }
    if (job.status === 'completed') {
      this.phase.set('applying');
      this.resultSubscription = this.getResult(job.id).subscribe({
        next: payload => {
          this.crimeService.applyDashboard(payload);
          this.restorationNotice.set(null);
          this.phase.set('completed');
        },
        error: err => this.fail(`El análisis terminó, pero no se pudieron aplicar los resultados. ${this.describeError(err)}`),
      });
      return;
    }
    this.phase.set(job.status);
  }
  private fail(message: string): void {
    this.error.set(message);
    this.phase.set('failed');
  }
  private unsubscribe(): void {
    this.uploadSubscription?.unsubscribe();
    this.pollSubscription?.unsubscribe();
    this.resultSubscription?.unsubscribe();
  }
  private describeError(err: unknown): string {
    if (typeof err === 'object' && err !== null) {
      const candidate = err as { status?: number; error?: { detail?: unknown; message?: string }; message?: string };
      if (candidate.status === 0) return 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
      const detail = candidate.error?.detail;
      return typeof detail === 'string' ? detail : candidate.error?.message ?? candidate.message ?? 'Error inesperado al procesar el archivo.';
    }
    return 'Error inesperado al procesar el archivo.';
  }
}
