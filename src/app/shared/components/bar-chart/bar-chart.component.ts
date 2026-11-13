import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface BarItem {
  k: string;
  v: number;
}

@Component({
  selector: 'app-bar-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bars" [class.bars-sm]="isSmall()">
      @for (item of processedItems(); track item.label) {
        <div class="bar">
          <span class="bk">{{ item.label }}</span>
          <span class="bt">
            <span class="bf" [style.width.%]="item.widthPct"></span>
            @if (item.tickPct !== null) {
              <span class="bm" [style.left.%]="item.tickPct"></span>
            }
          </span>
          <span class="bv">{{ item.valueFormatted }}</span>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .bars {
        display: flex;
        flex-direction: column;
        gap: 7px;
      }
      .bar {
        display: grid;
        grid-template-columns: 104px minmax(0, 1fr) 42px;
        align-items: center;
        gap: 9px;
      }
      .bk {
        font-size: 11.5px;
        color: var(--fg-soft);
        text-align: right;
        line-height: 1.2;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .bt {
        position: relative;
        height: 6px;
        border-radius: 3px;
        background: var(--surface-2);
        border: 1px solid var(--border);
      }
      .bf {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        border-radius: 3px;
        background: var(--accent);
        min-width: 2px;
        transition: width 0.2s ease-out;
      }
      .bm {
        position: absolute;
        top: -3px;
        bottom: -3px;
        width: 1.5px;
        background: var(--fg-soft);
        opacity: 0.6;
      }
      .bv {
        font-family: var(--font-mono);
        font-size: 11px;
        text-align: right;
        font-variant-numeric: tabular-nums;
        color: var(--fg-soft);
      }
      .bars-sm .bk {
        font-size: 11px;
      }
      @media (max-width: 560px) {
        .bar {
          grid-template-columns: 84px minmax(0, 1fr) 34px;
        }
      }
    `,
  ],
})
export class BarChartComponent {
  readonly items = input.required<BarItem[]>();
  readonly ticks = input<Record<string, number> | null>(null);
  readonly max = input<number | null>(null);
  readonly isSmall = input<boolean>(false);

  readonly processedItems = computed(() => {
    const raw = this.items();
    if (!raw || raw.length === 0) return [];
    const ticksMap = this.ticks() || {};

    const explicitMax = this.max();
    const calculatedMax =
      explicitMax ??
      Math.max(...raw.map((i) => i.v), 1) * 1.06;

    const formatter = new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });

    return raw.map((it) => {
      const w = Math.max(1.5, Math.min(100, (it.v / calculatedMax) * 100));
      const tick = ticksMap[it.k];
      const tickPct =
        tick !== undefined ? Math.min(99, (tick / calculatedMax) * 100) : null;

      return {
        label: it.k,
        widthPct: w,
        tickPct: tickPct,
        valueFormatted: formatter.format(it.v),
      };
    });
  });
}
