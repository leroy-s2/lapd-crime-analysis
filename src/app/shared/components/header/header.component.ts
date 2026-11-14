import {
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  inject,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CrimeAnalysisService } from '../../../core/services/crime-analysis.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <header class="top" role="banner">
      <div class="brand">
        <svg
          class="mark"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          aria-hidden="true"
        >
          <path
            d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z"
            stroke-linejoin="round"
          />
          <circle cx="12" cy="10" r="2.6" />
        </svg>
        <span class="brand-name">Consulta delictiva</span>
        <span class="brand-sep" aria-hidden="true"></span>
        <span class="brand-sub">LAPD · Los Ángeles</span>
      </div>

      <div class="search" role="search">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <label class="sr" for="q">Buscar división</label>
        <input
          #searchInput
          id="q"
          type="search"
          [ngModel]="crimeService.searchQuery()"
          (ngModelChange)="onSearchChange($event)"
          placeholder="Buscar división…"
          autocomplete="off"
          spellcheck="false"
        />
        <kbd>/</kbd>
      </div>

      <div class="top-actions">
        <span class="chip-demo">
          <span class="dot" aria-hidden="true"></span>
          21 divisiones policiales
        </span>
        <span class="topcut">Corte · nov 2023</span>
        <button
          class="btn"
          type="button"
          (click)="openDataSource.emit()"
          aria-haspopup="dialog"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            aria-hidden="true"
          >
            <ellipse cx="12" cy="6" rx="8" ry="3" />
            <path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6" />
            <path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
          </svg>
          Fuente de datos
        </button>
      </div>
    </header>
  `,
  styles: [
    `
      .top {
        display: flex;
        align-items: center;
        gap: 18px;
        padding: 0 18px;
        background: var(--surface);
        border-bottom: 1px solid var(--border);
        position: relative;
        z-index: 30;
        height: 56px;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }
      .mark {
        width: 22px;
        height: 22px;
        color: var(--accent-ink);
        flex: none;
      }
      .brand-name {
        font-family: var(--font-display);
        font-size: 15px;
        font-weight: 620;
        letter-spacing: -0.01em;
        white-space: nowrap;
      }
      .brand-sep {
        width: 1px;
        height: 16px;
        background: var(--border-strong);
        flex: none;
      }
      .brand-sub {
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.09em;
        text-transform: uppercase;
        color: var(--muted);
        white-space: nowrap;
      }
      .search {
        position: relative;
        margin-left: auto;
        flex: 0 1 300px;
        min-width: 0;
      }
      .search svg {
        position: absolute;
        left: 9px;
        top: 50%;
        transform: translateY(-50%);
        width: 14px;
        height: 14px;
        color: var(--muted);
        pointer-events: none;
      }
      .search input {
        width: 100%;
        height: 32px;
        padding: 0 34px 0 30px;
        border-radius: var(--radius);
        border: 1px solid var(--border-strong);
        background: var(--surface);
        color: var(--fg);
        font-family: var(--font-body);
        font-size: 12.5px;
      }
      .search input::placeholder {
        color: var(--muted);
      }
      .search input:focus {
        border-color: var(--accent);
        outline: none;
        box-shadow: 0 0 0 3px var(--accent-soft);
      }
      .search kbd {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        font-family: var(--font-mono);
        font-size: 10px;
        color: var(--muted);
        border: 1px solid var(--border);
        border-radius: 4px;
        padding: 1px 5px;
        background: var(--surface-2);
      }
      .top-actions {
        display: flex;
        align-items: center;
        gap: 14px;
        flex: none;
      }
      .chip-demo {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        height: 24px;
        padding: 0 9px;
        border-radius: 999px;
        background: var(--accent-soft);
        color: var(--accent-ink);
        border: 1px solid color-mix(in oklab, var(--accent) 25%, transparent);
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        font-weight: 600;
      }
      .chip-demo .dot {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: currentColor;
      }
      .topcut {
        font-family: var(--font-mono);
        font-size: 10.5px;
        color: var(--muted);
        letter-spacing: 0.04em;
        white-space: nowrap;
      }

      @media (max-width: 900px) {
        .top {
          padding: 0 12px;
          gap: 10px;
        }
        .brand-sub,
        .topcut {
          display: none;
        }
        .search {
          flex: 1 1 auto;
        }
        .search kbd {
          display: none;
        }
      }

      @media (max-width: 560px) {
        .chip-demo {
          display: none;
        }
      }
    `,
  ],
})
export class HeaderComponent {
  readonly crimeService = inject(CrimeAnalysisService);
  readonly openDataSource = output<void>();

  @ViewChild('searchInput') searchInputElement?: ElementRef<HTMLInputElement>;

  onSearchChange(value: string): void {
    this.crimeService.setSearchQuery(value);
  }

  @HostListener('window:keydown', ['$event'])
  handleGlobalKeydown(e: KeyboardEvent): void {
    if (e.key === '/' && document.activeElement !== this.searchInputElement?.nativeElement) {
      const activeTag = (document.activeElement as HTMLElement)?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;
      e.preventDefault();
      this.searchInputElement?.nativeElement.focus();
    } else if (e.key === 'Escape' && document.activeElement === this.searchInputElement?.nativeElement) {
      this.crimeService.setSearchQuery('');
      this.searchInputElement?.nativeElement.blur();
    }
  }
}

