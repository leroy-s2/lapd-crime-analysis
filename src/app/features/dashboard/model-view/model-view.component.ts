import { Component, computed, inject } from '@angular/core';
import { CrimeAnalysisService } from '../../../core/services/crime-analysis.service';
import { StatsChartComponent } from '../../../shared/components/stats-chart/stats-chart.component';
@Component({
 selector:'app-model-view', standalone:true,imports:[StatsChartComponent],
 template:`<section id="pane-modelo" role="tabpanel" aria-labelledby="tab-modelo">
 <h2>¿Qué tan precisas son las estimaciones?</h2><p>Comparamos distintos métodos con denuncias que no se usaron para entrenarlos. Las barras muestran cuánto se equivocó cada método, en promedio.</p>
 <div class="explanation"><strong>Una barra más corta indica menor error.</strong><span>El error corresponde a una zona de reporte, un grupo de delitos y un mes. No es el error del total de toda una división.</span></div>
 <app-stats-chart [data]="bars()"></app-stats-chart>
 <p>El método con menor error medio es <strong>{{ methodName(best().name) }}</strong>. Los resultados de denuncias estimadas que muestra el tablero corresponden a la red neuronal.</p>
 <p class="note">La referencia «Repetir el mes anterior» estima que el siguiente mes tendrá tantas denuncias como el anterior.</p>
 <details><summary>Ver métricas técnicas</summary><div class="table-wrap"><table><thead><tr><th>Método</th><th>MAE</th><th>RMSE</th><th>R²</th></tr></thead><tbody>@for(m of crimeService.models();track m.name){<tr><td>{{ m.name }}</td><td>{{ m.mae.toFixed(3) }}</td><td>{{ m.rmse.toFixed(3) }}</td><td>{{ m.r2.toFixed(3) }}</td></tr>}</tbody></table></div><p>MAE: error absoluto medio. RMSE: da más peso a errores grandes. R²: ajuste respecto a la variación observada; un valor mayor indica mejor ajuste.</p><p>{{ crimeService.modelRun().testRows.toLocaleString('es-PE') }} registros de evaluación. Los métodos pueden destacar en métricas diferentes.</p></details>
 </section>`,
 styles:[`h2{font-size:20px;margin-bottom:12px}p{font-size:12px;color:var(--muted);line-height:1.7;margin:14px 0}.explanation{background:var(--accent-soft);padding:14px;border-radius:8px;margin:18px 0}.explanation strong,.explanation span{display:block;font-size:12px}.explanation span{margin-top:6px;color:var(--muted)}details{margin-top:24px;font-size:12px}summary{cursor:pointer;font-weight:600}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;margin-top:14px}th,td{padding:8px 5px;border-bottom:1px solid var(--border);text-align:right}th:first-child,td:first-child{text-align:left}`]
})
export class ModelViewComponent {
 readonly crimeService=inject(CrimeAnalysisService);
 readonly best=computed(()=>[...this.crimeService.models()].sort((a,b)=>a.mae-b.mae)[0]);
 methodName(name:string):string {return ({'MLP':'Red neuronal','HGB':'Gradiente de árboles','RF':'Bosque de árboles','Persistencia':'Repetir el mes anterior'} as Record<string,string>)[name] || name;}
 readonly bars=computed(()=>[...this.crimeService.models()].sort((a,b)=>a.mae-b.mae).map(m=>({label:this.methodName(m.name),value:m.mae,color:m.isBest ? '#14b8a6':'#94a3b8'})));
}
