import { HttpEventType } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Subject } from 'rxjs';
import { DataJob, DataJobService } from './data-job.service';
import { CrimeAnalysisService } from './crime-analysis.service';
import { DASHBOARD_SEED } from '../data/crime-analysis.data';
import { DataSourceDialogComponent } from '../../shared/components/data-source-dialog/data-source-dialog.component';
import { HeaderComponent } from '../../shared/components/header/header.component';

const queued: DataJob = {
  id: 'upload-test', filename: 'data.csv', size: 100, status: 'queued', progress: 0,
  message: 'En cola', logs: [], error: null, createdAt: '', startedAt: null,
  finishedAt: null, resultAvailable: false,
};

describe('DataJobService upload lifecycle', () => {
  let service: DataJobService;
  let http: HttpTestingController;
  let jobs: Subject<DataJob>;
  let applyDashboard: jasmine.Spy;

  beforeEach(() => {
    applyDashboard = jasmine.createSpy('applyDashboard');
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(),
      { provide: CrimeAnalysisService, useValue: { applyDashboard } },
    ] });
    service = TestBed.inject(DataJobService);
    http = TestBed.inject(HttpTestingController);
    jobs = new Subject<DataJob>();
    spyOn(service, 'pollJob').and.returnValue(jobs.asObservable());
  });
  afterEach(() => { service.ngOnDestroy(); http.verify(); });

  it('reports real upload bytes, survives closing the dialog and updates the header through processing', () => {
    const dialog = TestBed.runInInjectionContext(() => new DataSourceDialogComponent());
    const header = TestBed.runInInjectionContext(() => new HeaderComponent());
    service.upload(new File(['csv'], 'data.csv'));
    expect(service.busy()).toBeTrue();
    expect(header.jobService.phase()).toBe('uploading');
    service.upload(new File(['second'], 'second.csv'));
    const request = http.expectOne(req => req.method === 'POST');
    expect(request.request.reportProgress).toBeTrue();
    request.event({ type: HttpEventType.UploadProgress, loaded: 40, total: 100 });
    expect(service.progress()).toBe(40);
    dialog.close();
    expect(request.cancelled).toBeFalse();
    expect(header.jobService.progress()).toBe(40);
    request.event({ type: HttpEventType.UploadProgress, loaded: 100, total: 100 });
    expect(service.phase()).toBe('uploaded');
    expect(service.progress()).toBe(100);
    request.flush(queued, { status: 202, statusText: 'Accepted' });
    expect(service.phase()).toBe('queued');
    jobs.next({ ...queued, status: 'running', progress: 10 });
    expect(header.jobService.processing()).toBeTrue();
    jobs.next({ ...queued, status: 'completed', progress: 100, resultAvailable: true });
    expect(service.phase()).toBe('applying');
    expect(service.busy()).toBeTrue();
    expect(applyDashboard).not.toHaveBeenCalled();
    http.expectOne(req => req.url.endsWith('/result')).flush(DASHBOARD_SEED);
    expect(applyDashboard).toHaveBeenCalledWith(DASHBOARD_SEED);
    expect(header.jobService.phase()).toBe('completed');
    expect(service.busy()).toBeFalse();
  });

  it('uses an indeterminate indicator when total upload bytes are unavailable', () => {
    service.upload(new File(['csv'], 'data.csv'));
    const request = http.expectOne(req => req.method === 'POST');
    request.event({ type: HttpEventType.UploadProgress, loaded: 42 });
    expect(service.progress()).toBeNull();
    expect(service.uploadedBytes()).toBe(42);
    expect(service.label()).toBe('Subiendo archivo…');
    request.flush(queued, { status: 202, statusText: 'Accepted' });
    expect(service.uploadPercent()).toBe(100);
  });

  it('shows upload and result failures without falsely marking the dashboard updated', () => {
    service.upload(new File(['csv'], 'data.csv'));
    http.expectOne(req => req.method === 'POST').flush({ detail: 'CSV inválido' }, { status: 400, statusText: 'Bad Request' });
    expect(service.phase()).toBe('failed');
    expect(service.error()).toBe('CSV inválido');
    service.upload(new File(['csv'], 'data.csv'));
    http.expectOne(req => req.method === 'POST').flush(queued, { status: 202, statusText: 'Accepted' });
    jobs.next({ ...queued, status: 'completed', progress: 100 });
    http.expectOne(req => req.url.endsWith('/result')).flush({}, { status: 500, statusText: 'Error' });
    expect(service.phase()).toBe('failed');
    expect(service.busy()).toBeFalse();
    expect(applyDashboard).not.toHaveBeenCalled();
  });

  it('surfaces notebook and polling failures in the persistent status', () => {
    service.upload(new File(['csv'], 'data.csv'));
    http.expectOne(req => req.method === 'POST').flush(queued, { status: 202, statusText: 'Accepted' });
    jobs.next({ ...queued, status: 'failed', error: 'Error de entrenamiento' });
    expect(service.error()).toBe('Error de entrenamiento');
    expect(service.phase()).toBe('failed');
    service.upload(new File(['csv'], 'data.csv'));
    http.expectOne(req => req.method === 'POST').flush(queued, { status: 202, statusText: 'Accepted' });
    jobs.error({ status: 0 });
    expect(service.phase()).toBe('failed');
    expect(service.error()).toContain('puede seguir ejecutándose');
  });
});
