import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sparkline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sparkwrap">
      <svg
        class="spark"
        viewBox="0 0 320 64"
        role="img"
        [attr.aria-label]="ariaLabel()"
      >
        <line class="ax" x1="10" y1="58" x2="310" y2="58"></line>
        @if (computedPath().area) {
          <path class="ar" [attr.d]="computedPath().area"></path>
        }
        @if (computedPath().polyline) {
          <polyline class="ln" [attr.points]="computedPath().polyline"></polyline>
        }
        @if (computedPath().lastPoint) {
          <circle
            class="dot"
            [attr.cx]="computedPath().lastPoint?.x"
            [attr.cy]="computedPath().lastPoint?.y"
            r="3.2"
          ></circle>
        }
      </svg>
    </div>
  `,
  styles: [
    `
      .sparkwrap {
        margin: 0;
        padding: 6px 8px 0;
      }
      .spark {
        display: block;
        width: 100%;
        height: auto;
      }
      .spark .ax {
        stroke: var(--border);
        stroke-width: 1;
      }
      .spark .ar {
        fill: var(--accent-soft);
      }
      .spark .ln {
        fill: none;
        stroke: var(--accent);
        stroke-width: 1.8;
        stroke-linejoin: round;
        stroke-linecap: round;
      }
      .spark .dot {
        fill: var(--accent);
        stroke: var(--surface);
        stroke-width: 2;
      }
    `,
  ],
})
export class SparklineComponent {
  readonly data = input.required<number[]>();
  readonly divisionName = input<string>('');

  readonly ariaLabel = computed(() => {
    return `Serie de 12 meses de denuncias para ${this.divisionName()}`;
  });

  readonly computedPath = computed(() => {
    const d = this.data();
    if (!d || d.length === 0) return { area: '', polyline: '', lastPoint: null };
    const n = d.length;
    const mn = Math.min(...d);
    const mx = Math.max(...d);
    const span = mx - mn || 1;

    const getX = (i: number) => 10 + i * (300 / (n - 1));
    const getY = (v: number) => 54 - ((v - mn) / span) * 42;

    const points = d.map((v, i) => `${getX(i).toFixed(1)},${getY(v).toFixed(1)}`).join(' ');
    const area =
      'M' +
      d.map((v, i) => `${getX(i).toFixed(1)} ${getY(v).toFixed(1)}`).join(' L') +
      ` L${getX(n - 1).toFixed(1)} 58 L${getX(0).toFixed(1)} 58 Z`;

    const lastPoint = {
      x: getX(n - 1).toFixed(1),
      y: getY(d[n - 1]).toFixed(1),
    };

    return { area, polyline: points, lastPoint };
  });
}

