import { crimeLabel } from '../../../core/data/crime-labels';
import { Component, computed, inject } from '@angular/core';
import { CrimeAnalysisService } from '../../../core/services/crime-analysis.service';
import { StatsChartComponent } from '../../../shared/components/stats-chart/stats-chart.component';
@Component({
 selector:'app-zone-view', standalone:true, imports:[StatsChartComponent],
 template:`<section role="tabpanel" id="pane-zona" aria-labelledby="tab-zona">
   <label for="division-picker">Consultar división</label>
   <select id="division-picker" [value]="zone().code" (change)="select($event)">@for(z of divisions();track z.code){<option [value]="z.code">{{ z.name }}</option>}</select>
   <div class="heading"><span class="lbl">División seleccionada</span><h2>{{ zone().name }}</h2><p>El grupo de delitos más frecuente es <strong>{{ zone().profileName }}</strong>.</p></div>
   @if(zone().analytics;as a){
     <div class="numbers"><div><strong>{{ a.total.toLocaleString('es-PE') }}</strong><span>denuncias registradas</span></div><div><strong>{{ zone().night }} %</strong><span>entre las 20:00 y las 05:59</span></div></div>
     <h3>Delitos más denunciados</h3><app-stats-chart [data]="top()"></app-stats-chart>
     <p class="note">{{ month(a.startMonth) }} – {{ month(a.endMonth) }}. Los nombres se simplifican en español; la fuente conserva las tipificaciones originales.</p>
     <a href="#division-analysis">Ver gráficos y detalle de {{ zone().name }} ↓</a>
   } @else {<p>La fuente cargada no incluye el detalle estadístico. Procesa un CSV para obtenerlo.</p>}
 </section>`,
 styles:[`label{display:block;font-size:12px;font-weight:600;margin-bottom:8px}select{width:100%;padding:10px;border:1px solid var(--border-strong);border-radius:8px;background:var(--surface);color:var(--fg);font:inherit}.heading{margin:24px 0 18px}h2{font-size:28px;margin:5px 0}p{font-size:13px;color:var(--muted);line-height:1.6}.numbers{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:26px}.numbers>div{padding:14px;background:var(--surface-2);border-radius:8px}.numbers strong{display:block;font-size:24px}.numbers span{font-size:11px;color:var(--muted)}h3{font-size:15px;margin-bottom:18px}.note{font-size:11px;margin-top:12px}a{display:block;color:var(--accent-ink);font-size:13px;font-weight:600;margin-top:22px}`]
})
export class ZoneViewComponent {
 readonly crimeService=inject(CrimeAnalysisService);
 readonly zone=this.crimeService.selectedDivision;
 readonly divisions=computed(()=>this.crimeService.zones().filter(z=>z.name.toLowerCase().includes(this.crimeService.searchQuery().trim().toLowerCase())).sort((a,b)=>a.name.localeCompare(b.name)));
 readonly top=computed(()=>this.zone().analytics?.topCrimes.slice(0,5).map(p=>({label:crimeLabel(p.label),value:p.count,color:'#2563eb'})) || []);
 select(event:Event):void{this.crimeService.selectDivision((event.target as HTMLSelectElement).value);}
 month(value:string):string{return new Date(value+'-02').toLocaleDateString('es-PE',{month:'short',year:'numeric'});}
}
