import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AppComponent } from './app.component';
import { CrimeAnalysisService } from './core/services/crime-analysis.service';

describe('AppComponent', () => {
  let service: CrimeAnalysisService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    service = TestBed.inject(CrimeAnalysisService);
  });

  it('should create the unified dashboard shell', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the operational dashboard and selected-division charts', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain(
      'Dónde y qué se denuncia en Los Ángeles'
    );
    expect(compiled.querySelector('.brand-name')?.textContent).toContain(
      'Consulta delictiva'
    );
    expect(compiled.querySelector('#division-analysis')).toBeTruthy();
  });

  it('should switch tabs between división, modelos y datos', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    expect(service.currentTab()).toBe('zona');
    app.setTab('modelo');
    expect(service.currentTab()).toBe('modelo');
    app.setTab('datos');
    expect(service.currentTab()).toBe('datos');
  });

  it('should update statistics when selecting a different division', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    service.selectDivision('D-06');
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('#analysis-title')?.textContent).toContain('Hollywood');
    expect(service.selectedDivision().analytics?.topCrimes.length).toBeGreaterThan(0);
    expect(page.querySelectorAll('app-stats-chart').length).toBeGreaterThan(5);
  });
});
