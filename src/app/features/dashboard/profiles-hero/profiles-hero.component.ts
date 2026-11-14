import { crimeLabel } from '../../../core/data/crime-labels';
import { Component, computed, inject } from '@angular/core';
import { CrimeAnalysisService } from '../../../core/services/crime-analysis.service';
import { StatsChartComponent } from '../../../shared/components/stats-chart/stats-chart.component';
@Component({
 selector:'app-profiles-hero',standalone:true,imports:[StatsChartComponent],
 template:`
 <section id="division-analysis" class="analysis" aria-labelledby="analysis-title">
   <header><div><span class="lbl">Estadísticas de la división seleccionada</span><h2 id="analysis-title">¿Qué ocurre en {{ zone().name }}?</h2><p>Los gráficos cambian al seleccionar otra división en el mapa.</p></div>@if(a();as data){<span class="period">{{ month(data.startMonth) }} — {{ month(data.endMonth) }}</span>}</header>
   @if(a();as data){
   <div class="dashboard-grid">
     <article class="chart-card"><h3>¿Qué delitos se denuncian más?</h3><p>Las ocho tipificaciones más frecuentes. Número de denuncias registradas.</p><app-stats-chart [data]="crimes()"></app-stats-chart></article>
     <article class="chart-card"><h3>¿Cómo se distribuyen los delitos?</h3><p>Seis grupos para leer el tipo de hechos. Una división puede tener varios grupos a la vez.</p><app-stats-chart kind="donut" [data]="composition()"></app-stats-chart><p class="footnote">Agrupación de incidentes asignados a un perfil; puede excluir registros sin clasificar. No representa seis tipos de distritos.</p></article>
     <article class="chart-card"><h3>¿Aumentan o disminuyen las denuncias?</h3><p>Evolución mensual de los hechos registrados en esta división.</p><app-stats-chart kind="line" [data]="monthly()"></app-stats-chart></article>
     <article class="chart-card"><h3>¿Qué tan cerca estuvo la estimación?</h3><p>Comparación histórica: lo registrado y lo estimado para los mismos meses y zonas evaluadas.</p><app-stats-chart kind="line" [data]="comparison()"></app-stats-chart><p class="footnote">Promedio mensual del periodo evaluado: {{ data.averageObserved.toLocaleString('es-PE') }} registrados y {{ data.averageEstimated.toLocaleString('es-PE') }} estimados. Estos resultados no son un pronóstico nuevo.</p></article>
     <article class="chart-card"><h3>¿A qué hora ocurren los hechos?</h3><p>Hora de ocurrencia registrada en la denuncia.</p><app-stats-chart kind="line" [data]="hours()"></app-stats-chart></article>
     <article class="chart-card"><h3>¿Qué días concentran más denuncias?</h3><p>Distribución por día de ocurrencia durante todo el periodo.</p><app-stats-chart [data]="weekdays()"></app-stats-chart></article>
     <article class="chart-card"><h3>¿Dónde ocurren los hechos?</h3><p>Distribución por tipo de lugar, como porcentaje de la división.</p><app-stats-chart suffix=" %" [data]="premises()"></app-stats-chart></article>
     <article class="chart-card"><h3>Zonas con más denuncias en la calibración</h3><p>Una división contiene varias zonas de reporte. Aquí se muestran las ocho con más incidentes del periodo de calibración del perfil, anterior a la evaluación.</p><app-stats-chart [data]="reportZones()"></app-stats-chart></article>
     <article class="chart-card"><h3>Puntos de mayor concentración</h3><p>Celdas de aproximadamente 500 m vinculadas a esta división por su zona de reporte principal.</p>
       <div class="table-wrap"><table><thead><tr><th>Punto / coordenadas</th><th>Delito predominante</th><th>Denuncias</th></tr></thead><tbody>@for(h of data.hotspots;track h.id){<tr><td><strong>#{{ h.id }}</strong><small>{{ h.lat.toFixed(4) }}, {{ h.lng.toFixed(4) }}</small></td><td>{{ crimeService.profileLabel(h.profile) }}</td><td>{{ h.count.toLocaleString('es-PE') }}</td></tr>}@empty{<tr><td colspan="3">Sin puntos exportados para esta división.</td></tr>}</tbody></table></div>
     </article>
     <article class="chart-card"><h3>Zonas para revisar con mayor atención</h3><p>Ranking del periodo de calibración. La prioridad combina frecuencia, concentración, tendencia y gravedad. Puede diferir del delito más frecuente.</p>
       <div class="table-wrap"><table><thead><tr><th>Zona</th><th>Grupo de delitos a revisar</th><th>Registros</th></tr></thead><tbody>@for(r of data.priorities;track r.zone){<tr><td>{{ r.zone }}</td><td>{{ crimeService.profileLabel(r.profile) }}</td><td>{{ r.count.toLocaleString('es-PE') }}</td></tr>}@empty{<tr><td colspan="3">No hay prioridades disponibles.</td></tr>}</tbody></table></div>
       <p class="footnote">Orden del ranking exportado por el análisis. Es una ayuda para revisar los datos, no una instrucción automática de intervención.</p>
     </article>
   </div>
   <details class="sources"><summary>¿De dónde salen estos gráficos?</summary><p>El historial, los delitos, horarios y lugares se calculan con el CSV de denuncias. La composición actual usa los incidentes clasificados mediante el catálogo y la auditoría; la matriz zona-perfil conserva la composición del periodo de calibración; las zonas usan perfil_zona_resumen.csv. La comparación utiliza predicciones_test.csv y predicciones_zona_perfil.csv. La concentración usa hotspots_perfil.csv y la atención territorial usa ranking_zona_perfil.csv y perfil_zona_largo.csv. Las descripciones comunes se muestran en español para facilitar la lectura; son explicaciones del registro LAPD, no una equivalencia jurídica peruana.</p><p>El archivo mlp_perfilamiento.keras conserva la red entrenada. Sirve para ejecutar nuevas estimaciones con la misma preparación de datos; no se carga para dibujar estos gráficos.</p></details>
   } @else {<p>No hay estadísticas detalladas en esta fuente. Procesa el archivo de denuncias para generarlas.</p>}
 </section>`,
 styles:[`
 .analysis{scroll-margin-top:80px;margin-top:36px}header{display:flex;justify-content:space-between;align-items:center;gap:20px;margin-bottom:24px}h2{font-size:30px;margin:6px 0}header p{font-size:13px;color:var(--muted)}.period{font-size:12px;color:var(--muted);white-space:nowrap}.dashboard-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px}.chart-card{padding:26px;background:var(--surface);border:1px solid var(--border);border-radius:14px;min-width:0}.chart-card h3{font-size:18px}.chart-card>p{font-size:12px;line-height:1.6;color:var(--muted);margin:8px 0 24px}.chart-card .footnote{margin:16px 0 0;font-size:11px}.table-wrap{overflow:auto}table{border-collapse:collapse;width:100%;font-size:12px}th{text-align:left;font-size:11px;color:var(--muted);font-weight:500}td,th{padding:10px 8px;border-bottom:1px solid var(--border)}td:last-child,th:last-child{text-align:right;font-variant-numeric:tabular-nums}small{display:block;color:var(--muted);font-size:10px;margin-top:3px}.sources{margin-top:24px;padding:18px;border-top:1px solid var(--border);font-size:12px;color:var(--muted)}summary{cursor:pointer}.sources p{margin-top:12px;line-height:1.7}@media(max-width:850px){.dashboard-grid{grid-template-columns:1fr}header{align-items:start;flex-direction:column}h2{font-size:25px}.chart-card{padding:20px}}
 `]
})
export class ProfilesHeroComponent {
 readonly crimeService=inject(CrimeAnalysisService);
 readonly zone=this.crimeService.selectedDivision;
 readonly a=computed(()=>this.zone().analytics);
 readonly crimes=computed(()=>this.a()?.topCrimes.map(p=>({label:crimeLabel(p.label),value:p.count,color:'#2563eb'})) || []);
 readonly composition=computed(()=>Object.entries(this.a()?.profileCounts || {}).map(([code,value])=>({label:this.crimeService.profileLabel(code),value,color:this.crimeService.profileColor(code)})));
 readonly monthly=computed(()=>this.a()?.monthly.map(p=>({label:this.month(p.month),value:p.count})) || []);
 readonly comparison=computed(()=>this.a()?.comparison.map(p=>({label:this.month(p.month),value:p.observed,other:p.estimated})) || []);
 readonly hours=computed(()=>this.a()?.hours.map(p=>({label:crimeLabel(p.label),value:p.count})) || []);
 readonly weekdays=computed(()=>this.a()?.weekdays.map(p=>({label:crimeLabel(p.label),value:p.count,color:'#14b8a6'})) || []);
 readonly premises=computed(()=>this.zone().premises.map(p=>({label:p.k,value:p.v,color:'#6366f1'})));
 readonly reportZones=computed(()=>this.a()?.reportZones.map(p=>({label:'Zona '+p.zone,value:p.count,color:this.crimeService.profileColor(p.profile)})) || []);
 month(value:string):string{return new Date(value+'-02').toLocaleDateString('es-PE',{month:'short',year:'2-digit'});}
}
