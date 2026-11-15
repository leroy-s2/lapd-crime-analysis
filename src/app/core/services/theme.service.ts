import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';
export const THEME_STORAGE_KEY = 'lapd-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly mode = signal<ThemeMode>('light');
  readonly theme = this.mode.asReadonly();
  readonly isDark = computed(() => this.mode() === 'dark');

  constructor() {
    let stored: string | null = null;
    try { stored = this.document.defaultView?.localStorage.getItem(THEME_STORAGE_KEY) ?? null; }
    catch { /* The switch remains usable when storage is unavailable. */ }
    this.apply(stored === 'dark' ? 'dark' : 'light');
  }

  toggle(): void {
    const mode = this.isDark() ? 'light' : 'dark';
    this.apply(mode);
    try { this.document.defaultView?.localStorage.setItem(THEME_STORAGE_KEY, mode); }
    catch { /* Keep the current session's selection. */ }
  }

  private apply(mode: ThemeMode): void {
    this.mode.set(mode);
    this.document.documentElement.dataset['theme'] = mode;
    this.document.documentElement.style.colorScheme = mode;
    this.document.querySelector('meta[name="theme-color"]')?.setAttribute('content', mode === 'dark' ? '#0b1220' : '#f9fafb');
  }
}
