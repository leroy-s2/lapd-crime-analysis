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

  it('should render header and high-impact profiles section', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain(
      'Dónde y qué se denuncia en Los Ángeles'
    );
    expect(compiled.querySelector('.brand-name')?.textContent).toContain(
      'Perfilamiento territorial'
    );
    expect(compiled.querySelector('.profiles-hero')).toBeTruthy();
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

  it('should filter divisions by profile and bureau', () => {
    expect(service.zones().length).toBe(21);
    service.setSelectedProfileFilter(0);
    expect(service.filteredAndSortedDivisions().length).toBe(8);
    expect(service.filteredAndSortedDivisions().every((d) => d.profile === 0)).toBeTrue();

    service.setSelectedProfileFilter(1);
    expect(service.filteredAndSortedDivisions().length).toBe(13);
    expect(service.filteredAndSortedDivisions().every((d) => d.profile === 1)).toBeTrue();
  });
});
