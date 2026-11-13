import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, switchMap, takeWhile, timer } from 'rxjs';
import { DashboardPayload } from '../models/crime-analysis.models';

export type DataJobStatus = 'queued' | 'running' | 'completed' | 'failed';

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

interface ApiGlobal {
  __LAPD_API_BASE__?: string;
}

@Injectable({
  providedIn: 'root',
})
export class DataJobService {
  private readonly http = inject(HttpClient);
  private readonly apiBase =
    (globalThis as ApiGlobal).__LAPD_API_BASE__ ?? 'http://localhost:8000';

  startJob(file: File): Observable<DataJob> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.post<DataJob>(`${this.apiBase}/api/jobs`, form);
  }

  getJob(jobId: string): Observable<DataJob> {
    return this.http.get<DataJob>(`${this.apiBase}/api/jobs/${jobId}`);
  }

  getResult(jobId: string): Observable<DashboardPayload> {
    return this.http.get<DashboardPayload>(
      `${this.apiBase}/api/jobs/${jobId}/result`
    );
  }

  pollJob(jobId: string, intervalMs = 1500): Observable<DataJob> {
    return timer(0, intervalMs).pipe(
      switchMap(() => this.getJob(jobId)),
      takeWhile(
        (job) => job.status === 'queued' || job.status === 'running',
        true
      )
    );
  }
}
