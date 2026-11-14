import { Component, computed, input } from '@angular/core';
export interface ChartPoint { label: string; value: number; other?: number; color?: string; }
@Component({
  selector: 'app-stats-chart', standalone: true,
  template: `
    @if (data().length) {
      @switch (kind()) {
        @case ('donut') {
          <div class="donut-layout">
            <div class="donut" [style.background]="gradient()" role="img" [attr.aria-label]="description()"><div><strong>{{ total().toLocaleString('es-PE') }}</strong><span>denuncias</span></div></div>
            <div class="donut-legend">@for (p of data(); track $index) {
              <div><i [style.background]="color(p, $index)"></i><span>{{ p.label }}</span><strong>{{ (p.value / (total() || 1) * 100).toFixed(1) }} %</strong></div>
            }</div>
          </div>
        }
        @case ('line') {
          <svg viewBox="0 0 640 230" role="img" [attr.aria-label]="description()">
            @for (t of [0, 0.5, 1]; track t) {
              <line x1="52" x2="615" [attr.y1]="185 - t * 160" [attr.y2]="185 - t * 160" stroke="var(--border)" />
              <text x="44" [attr.y]="189 - t * 160" text-anchor="end">{{ (ceiling() * t).toLocaleString('es-PE', {maximumFractionDigits: 0}) }}</text>
            }
            <polyline [attr.points]="points(false)" fill="none" stroke="#2563eb" stroke-width="2.5" />
            @if (hasOther()) { <polyline [attr.points]="points(true)" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-dasharray="6 4" /> }
            @for (p of data(); track $index) {
              <circle [attr.cx]="x($index)" [attr.cy]="y(p.value)" r="3" fill="#2563eb"><title>{{ p.label }}: {{ p.value }}</title></circle>
              @if (hasOther()) { <circle [attr.cx]="x($index)" [attr.cy]="y(p.other || 0)" r="3" fill="#f59e0b"><title>{{ p.label }} · estimado: {{ p.other }}</title></circle> }
              @if ($index === 0 || $index === data().length - 1 || $index % labelStep() === 0) { <text [attr.x]="x($index)" y="213" text-anchor="middle">{{ p.label }}</text> }
            }
          </svg>
          @if (hasOther()) { <div class="series-key"><span>● Registrado</span><span>● Estimado</span></div> }
        }
        @default {
          <div class="bars">@for (p of data(); track $index) {
            <div class="bar-row"><span class="bar-label">{{ p.label }}</span><div class="track"><span [style.width.%]="p.value / ceiling() * 100" [style.background]="color(p, $index)"></span></div><strong>{{ p.value.toLocaleString('es-PE', {maximumFractionDigits: 2}) }}{{ suffix() }}</strong></div>
          }</div>
        }
      }
      <details class="chart-data"><summary>Ver datos del gráfico</summary><table><thead><tr><th>Dato</th><th>{{ hasOther() ? 'Registrado' : 'Valor' }}</th>@if(hasOther()){<th>Estimado</th>}</tr></thead><tbody>@for(p of data(); track $index){<tr><td>{{ p.label }}</td><td>{{ p.value.toLocaleString('es-PE') }}{{ suffix() }}</td>@if(hasOther()){<td>{{ p.other?.toLocaleString('es-PE') }}</td>}</tr>}</tbody></table></details>
    } @else { <p class="empty">No hay datos disponibles para esta selección.</p> }
  `,
  styles: [`
    :host {display:block;min-width:0} svg {width:100%;display:block} text {font-size:10px;fill:var(--muted);font-family:var(--font-body)}
    .bars {display:grid;gap:12px}.bar-row {display:grid;grid-template-columns:minmax(100px,1fr) minmax(60px,1.5fr) auto;gap:12px;align-items:center;font-size:12px}.bar-label {overflow-wrap:anywhere;line-height:1.4}.track {height:10px;background:var(--surface-2);border-radius:3px;overflow:hidden}.track span {display:block;height:100%;border-radius:3px}.bar-row strong {font-size:12px;font-variant-numeric:tabular-nums}
    .donut-layout {display:flex;gap:28px;align-items:center;flex-wrap:wrap}.donut {width:190px;height:190px;border-radius:50%;padding:26px;flex-shrink:0}.donut>div {background:var(--surface);border-radius:50%;height:100%;display:flex;flex-direction:column;justify-content:center;align-items:center}.donut strong {font-size:23px}.donut span {font-size:11px;color:var(--muted)}.donut-legend {flex:1;min-width:180px;display:grid;gap:12px;font-size:12px}.donut-legend>div {display:flex;gap:8px;align-items:center}.donut-legend span {flex:1}.donut-legend i {width:9px;height:9px;border-radius:2px;flex-shrink:0}
    .series-key {display:flex;gap:18px;justify-content:center;font-size:11px;color:#2563eb}.series-key span:last-child {color:#a16207}
    .chart-data {margin-top:16px;font-size:11px;color:var(--muted)}summary {cursor:pointer}table {width:100%;border-collapse:collapse;margin-top:10px}td,th {padding:5px;text-align:left;border-bottom:1px solid var(--border)}.empty {font-size:12px;color:var(--muted)}
  `]
})
export class StatsChartComponent {
  readonly data = input.required<ChartPoint[]>();
  readonly kind = input<'bars'|'line'|'donut'>('bars');
  readonly suffix = input('');
  readonly palette = ['#0ea5e9','#14b8a6','#f59e0b','#6366f1','#ec4899','#64748b','#94a3b8'];
  readonly total = computed(() => this.data().reduce((s,p)=>s+p.value,0));
  readonly ceiling = computed(()=>Math.max(1,...this.data().flatMap(p=>[p.value,p.other || 0])) * 1.08);
  readonly hasOther = computed(()=>this.data().some(p=>p.other !== undefined));
  readonly labelStep = computed(()=>Math.max(1,Math.ceil(this.data().length/6)));
  readonly description = computed(()=>this.data().map(p=>`${p.label}: ${p.value}${p.other !== undefined ? ', estimado '+p.other : ''}`).join('; '));
  color(p: ChartPoint, i:number):string {return p.color || this.palette[i % this.palette.length];}
  readonly gradient = computed(()=> {let start=0;return 'conic-gradient('+this.data().map((p,i)=>{const end=start+p.value/(this.total() || 1)*100;const part=`${this.color(p,i)} ${start}% ${end}%`;start=end;return part;}).join(',')+')';});
  x(i:number):number {return 52+i/Math.max(1,this.data().length-1)*563;}
  y(v:number):number {return 185-v/this.ceiling()*160;}
  points(other:boolean):string {return this.data().map((p,i)=>`${this.x(i)},${this.y(other ? p.other || 0 : p.value)}`).join(' ');}
}
