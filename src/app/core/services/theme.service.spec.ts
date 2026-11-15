import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { ThemeService, THEME_STORAGE_KEY } from './theme.service';

describe('ThemeService', () => {
  let stored: string | null;
  let unavailable: boolean;
  let color: string;
  let doc: any;
  beforeEach(() => {
    stored = null;
    unavailable = false;
    color = '';
    doc = {
      documentElement: { dataset: {}, style: {} },
      querySelector: () => ({ setAttribute: (_: string, value: string) => color = value }),
      defaultView: { localStorage: {
        getItem: () => { if (unavailable) throw new Error('Storage blocked'); return stored; },
        setItem: (key: string, value: string) => { if (unavailable) throw new Error('Storage blocked'); expect(key).toBe(THEME_STORAGE_KEY); stored = value; },
      } },
    };
    TestBed.configureTestingModule({ providers: [{ provide: DOCUMENT, useValue: doc }] });
  });
  it('starts in light mode and persists the switch in both directions', () => {
    const theme = TestBed.inject(ThemeService);
    expect(theme.theme()).toBe('light');
    theme.toggle();
    expect(theme.isDark()).toBeTrue();
    expect(stored).toBe('dark');
    expect(doc.documentElement.dataset.theme).toBe('dark');
    expect(doc.documentElement.style.colorScheme).toBe('dark');
    expect(color).toBe('#0b1220');
    theme.toggle();
    expect(theme.isDark()).toBeFalse();
    expect(stored).toBe('light');
    expect(color).toBe('#f9fafb');
  });
  it('restores a stored dark theme and ignores invalid values', () => {
    stored = 'dark';
    expect(TestBed.inject(ThemeService).isDark()).toBeTrue();
  });
  it('keeps the switch usable when browser storage is unavailable', () => {
    unavailable = true;
    const theme = TestBed.inject(ThemeService);
    expect(() => theme.toggle()).not.toThrow();
    expect(theme.isDark()).toBeTrue();
    expect(doc.documentElement.dataset.theme).toBe('dark');
  });
});
