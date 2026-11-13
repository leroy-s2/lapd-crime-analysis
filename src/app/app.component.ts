import { Component, ViewChild, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CrimeAnalysisService } from './core/services/crime-analysis.service';
import { HeaderComponent } from './shared/components/header/header.component';
import { DataSourceDialogComponent } from './shared/components/data-source-dialog/data-source-dialog.component';
import { ProfilesHeroComponent } from './features/dashboard/profiles-hero/profiles-hero.component';
import { ZoneViewComponent } from './features/dashboard/zone-view/zone-view.component';
import { ModelViewComponent } from './features/dashboard/model-view/model-view.component';
import { DataViewComponent } from './features/dashboard/data-view/data-view.component';
import { MapContainerComponent } from './features/map/map-container/map-container.component';
import { ViewTab } from './core/models/crime-analysis.models';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    DataSourceDialogComponent,
    ProfilesHeroComponent,
    ZoneViewComponent,
    ModelViewComponent,
    DataViewComponent,
    MapContainerComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  readonly crimeService = inject(CrimeAnalysisService);

  @ViewChild('dataSourceDialog') dataSourceDialog?: DataSourceDialogComponent;

  readonly bestMae = computed(() => {
    const models = this.crimeService.models();
    return models.length ? Math.min(...models.map((model) => model.mae)) : 0;
  });

  private readonly nf0 = new Intl.NumberFormat('es-ES');
  private readonly nf2 = new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });

  formatNumber(value: number): string {
    return this.nf0.format(value);
  }

  formatDecimal(value: number): string {
    return this.nf2.format(value);
  }

  openDataSourceModal(): void {
    this.dataSourceDialog?.open();
  }

  setTab(tab: ViewTab): void {
    this.crimeService.setTab(tab);
  }
}
