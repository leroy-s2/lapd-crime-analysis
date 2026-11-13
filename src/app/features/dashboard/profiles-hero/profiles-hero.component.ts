import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CrimeAnalysisService } from '../../../core/services/crime-analysis.service';
import { ProfileCode } from '../../../core/models/crime-analysis.models';

@Component({
  selector: 'app-profiles-hero',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="profiles-hero" aria-label="Sección de perfiles territoriales">
      <div class="hero-header">
        <div>
          <div class="eyebrow-accent">Modelo de perfilamiento territorial · P01–P06</div>
          <h2>Perfiles Delictivos y Segmentación Territorial</h2>
          <p class="hero-desc">
            Seis perfiles construidos con reglas tipológicas explícitas sobre 1.000 zonas
            policiales con perfil principal. El tablero agrega el perfil dominante o
            prioritario a las 21 divisiones para la lectura operativa del mapa.
          </p>
        </div>

        <div class="profile-chips" role="group" aria-label="Filtrar por perfil">
          <button
            type="button"
            class="filter-chip"
            [class.active]="crimeService.selectedProfileFilter() === null"
            (click)="selectProfile(null)"
          >
            Todos los distritos (21)
          </button>
          @for (p of crimeService.profiles(); track p.code) {
            <button
              type="button"
              class="filter-chip profile-chip"
              [class.active]="crimeService.selectedProfileFilter() === p.code"
              [style.--pf]="crimeService.profileColor(p.code)"
              (click)="selectProfile(p.code)"
            >
              <span class="dot" [style.background]="crimeService.profileColor(p.code)"></span>
              {{ p.code }} · {{ p.name }}
            </button>
          }
        </div>
      </div>

      <div class="profile-cards-grid">
        @for (p of crimeService.profiles(); track p.code) {
          <article
            class="p-card"
            [class.card-selected]="crimeService.selectedProfileFilter() === p.code"
            [style.--pf]="crimeService.profileColor(p.code)"
            [style.--pf-soft]="crimeService.profileSoftColor(p.code)"
            (click)="selectProfile(p.code)"
          >
            <div class="p-card-header">
              <div class="p-badge">{{ p.code }}</div>
              <div class="p-title-wrap">
                <h3>{{ p.name }}</h3>
                <span class="p-sub">
                  {{ formatNumber(p.principalZones) }} zonas principales ·
                  {{ formatNumber(p.priorityZones) }} prioritarias
                </span>
              </div>
            </div>

            <p class="p-desc">{{ p.description }}</p>

            <div class="p-stats-row">
              <div class="p-stat">
                <span class="lbl">Volumen</span>
                <div class="val">{{ formatNumber(p.incidents) }} <small>inc.</small></div>
              </div>
              <div class="p-stat">
                <span class="lbl">Participación</span>
                <div class="val">{{ formatDecimal(p.sharePct) }}%</div>
              </div>
              <div class="p-stat">
                <span class="lbl">Nocturnidad</span>
                <div class="val">{{ formatDecimal(p.nightPct) }}%</div>
              </div>
              <div class="p-stat">
                <span class="lbl">Armas</span>
                <div class="val" [class.highlight-warn]="p.weaponPct >= 50">
                  {{ formatDecimal(p.weaponPct) }}%
                </div>
              </div>
            </div>

            <div class="p-traits">
              <div class="trait">
                <span class="trait-key">MAE del perfil:</span>
                <span class="trait-val">{{ formatDecimal(p.mae) }} incidentes</span>
              </div>
              <div class="trait">
                <span class="trait-key">Prioridad media:</span>
                <span class="trait-val">{{ formatDecimal(p.priorityAvg) }} / 1,00</span>
              </div>
              <div class="trait">
                <span class="trait-key">Cobertura:</span>
                <span class="trait-val">
                  @if (p.code === 'P05') {
                    0 zonas principales; {{ formatNumber(p.priorityZones) }} prioritarias
                  } @else {
                    Perfil principal y prioritario en zonas de reporte
                  }
                </span>
              </div>
            </div>

            <div class="p-divisions">
              <span class="lbl">Divisiones donde domina o prioriza:</span>
              <div class="div-chips">
                @for (name of divisionsForProfile(p.code); track name) {
                  <span class="div-tag">{{ name }}</span>
                } @empty {
                  <span class="div-tag empty-tag">Sin divisiones dominantes; aparece en zonas de reporte</span>
                }
              </div>
            </div>

            <div class="p-card-footer">
              <button
                class="btn btn-card"
                type="button"
                (click)="selectProfile(p.code); $event.stopPropagation()"
              >
                {{ crimeService.selectedProfileFilter() === p.code ? 'Filtro activo' : 'Aislar ' + p.code + ' en mapa' }}
              </button>
            </div>
          </article>
        }
      </div>

      <p class="hero-note">
        El filtro usa perfil dominante o prioritario por división. P05 no es dominante en
        ninguna de las 21 divisiones, pero sí prioritario en 22 zonas de reporte; por eso
        puede devolver 0 divisiones en el mapa sin dejar de existir en el modelo.
      </p>
    </section>
  `,
  styles: [
    `
      .profiles-hero {
        position: relative;
        background:
          linear-gradient(135deg, var(--surface) 0%, var(--surface) 68%, var(--accent-soft) 100%);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        padding: 26px 26px 24px;
        margin-bottom: 24px;
        box-shadow: 0 2px 10px oklch(0% 0 0 / 0.03);
        overflow: hidden;
      }
      .profiles-hero::before {
        content: '';
        position: absolute;
        inset: 0 auto 0 0;
        width: 4px;
        background: linear-gradient(#0ea5e9, #6366f1, #ec4899);
      }
      .hero-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 20px;
        margin-bottom: 22px;
        flex-wrap: wrap;
      }
      .eyebrow-accent {
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--accent-ink);
        font-weight: 600;
        margin-bottom: 4px;
      }
      h2 {
        font-size: 24px;
        letter-spacing: -0.02em;
        color: var(--fg);
        margin-bottom: 6px;
      }
      .hero-desc {
        font-size: 12.5px;
        color: var(--muted);
        max-width: 68ch;
        line-height: 1.55;
      }
      .profile-chips {
        display: flex;
        gap: 8px;
        align-items: center;
        flex-wrap: wrap;
        justify-content: flex-end;
        max-width: 560px;
      }
      .filter-chip {
        appearance: none;
        border: 1px solid var(--border-strong);
        background: var(--surface-2);
        color: var(--fg-soft);
        border-radius: 999px;
        padding: 5px 12px;
        font-family: var(--font-mono);
        font-size: 10.5px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        transition: all 0.15s ease;
      }
      .filter-chip:hover {
        background: var(--border);
        color: var(--fg);
      }
      .filter-chip.active {
        background: var(--fg);
        color: var(--surface);
        border-color: var(--fg);
        font-weight: 600;
      }
      .profile-chip.active {
        background: var(--pf);
        border-color: var(--pf);
        color: white;
      }
      .dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        display: inline-block;
        flex: none;
      }
      .profile-cards-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 14px;
      }
      .p-card {
        border-radius: var(--radius-lg);
        border: 1px solid var(--border);
        border-top: 3px solid var(--pf);
        background: var(--surface);
        padding: 16px 16px 14px;
        display: flex;
        flex-direction: column;
        gap: 11px;
        cursor: pointer;
        transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease;
      }
      .p-card:hover {
        box-shadow: 0 6px 18px oklch(0% 0 0 / 0.06);
        transform: translateY(-1px);
      }
      .p-card.card-selected {
        border-color: var(--pf);
        background: var(--pf-soft);
        box-shadow: 0 0 0 2px var(--pf);
      }
      .p-card-header {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .p-badge {
        font-family: var(--font-mono);
        font-size: 11px;
        font-weight: 700;
        padding: 4px 8px;
        border-radius: 6px;
        letter-spacing: 0.04em;
        background: var(--pf-soft);
        color: var(--pf);
        border: 1px solid color-mix(in oklab, var(--pf) 30%, transparent);
        flex: none;
      }
      .p-title-wrap h3 {
        font-size: 13px;
        line-height: 1.25;
      }
      .p-sub {
        font-family: var(--font-mono);
        font-size: 9px;
        color: var(--muted);
        display: block;
        margin-top: 2px;
      }
      .p-desc {
        font-size: 11px;
        color: var(--muted);
        line-height: 1.5;
        min-height: 49px;
      }
      .p-stats-row {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        background: var(--surface-2);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 8px 10px;
        gap: 7px 10px;
      }
      .p-stat .lbl {
        display: block;
        font-size: 8px;
        margin-bottom: 2px;
      }
      .p-stat .val {
        font-family: var(--font-mono);
        font-size: 12px;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        color: var(--fg);
      }
      .p-stat .val small {
        font-size: 8.5px;
        font-weight: 400;
        color: var(--muted);
      }
      .highlight-warn {
        color: var(--warn) !important;
      }
      .p-traits {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 10.5px;
      }
      .trait {
        display: flex;
        gap: 5px;
        line-height: 1.4;
      }
      .trait-key {
        font-weight: 600;
        color: var(--fg-soft);
        white-space: nowrap;
      }
      .trait-val {
        color: var(--muted);
      }
      .p-divisions {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .div-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }
      .div-tag {
        font-family: var(--font-mono);
        font-size: 8.5px;
        padding: 2px 6px;
        border-radius: 4px;
        background: var(--surface-2);
        border: 1px solid var(--border);
        color: var(--fg-soft);
      }
      .empty-tag {
        color: var(--muted);
        font-style: italic;
      }
      .p-card-footer {
        margin-top: auto;
        display: flex;
        justify-content: flex-end;
      }
      .btn-card {
        height: 26px;
        font-size: 10.5px;
        padding: 0 9px;
        font-weight: 600;
        border-color: var(--pf);
        color: var(--pf);
      }
      .btn-card:hover {
        background: var(--pf);
        color: white;
      }
      .hero-note {
        margin-top: 16px;
        padding-top: 12px;
        border-top: 1px solid var(--border);
        font-size: 10.5px;
        color: var(--muted);
        line-height: 1.55;
        max-width: 92ch;
      }
      @media (max-width: 1080px) {
        .profile-cards-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }
      @media (max-width: 900px) {
        .profile-chips {
          justify-content: flex-start;
          max-width: none;
        }
      }
      @media (max-width: 640px) {
        .profile-cards-grid {
          grid-template-columns: 1fr;
        }
        .p-desc {
          min-height: 0;
        }
      }
    `,
  ],
})
export class ProfilesHeroComponent {
  readonly crimeService = inject(CrimeAnalysisService);

  private readonly nf0 = new Intl.NumberFormat('es-ES');
  private readonly nf1 = new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  divisionsForProfile(code: ProfileCode): string[] {
    return this.crimeService.divisionsForProfile(code);
  }

  formatNumber(value: number): string {
    return this.nf0.format(value);
  }

  formatDecimal(value: number): string {
    return this.nf1.format(value);
  }

  selectProfile(profile: ProfileCode | null): void {
    if (this.crimeService.selectedProfileFilter() === profile) {
      this.crimeService.setSelectedProfileFilter(null);
    } else {
      this.crimeService.setSelectedProfileFilter(profile);
      if (profile !== null) {
        this.crimeService.setThematicMode('profile');
      }
    }
  }
}
