import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { Locale } from '../models/models';
import { LOCALES, TRANSLATIONS, TranslationKey } from './translations';

const LOCALE_STORAGE_KEY = 'contacomigo.locale';
const DEFAULT_LOCALE: Locale = 'pt-AO';

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(this.platformId);

  readonly locale = signal<Locale>(this.readStoredLocale());
  readonly availableLocales = LOCALES;
  readonly dictionary = computed(() => TRANSLATIONS[this.locale()]);
  readonly localeTag = computed(() => (this.locale() === 'pt-AO' ? 'pt-AO' : 'en-GB'));

  setLocale(locale: Locale): void {
    this.locale.set(locale);
    if (this.browser) {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    }
    this.document.documentElement.lang = locale;
  }

  t(key: TranslationKey, params?: Record<string, string | number>): string {
    const template = this.dictionary()[key] ?? key;
    if (!params) {
      return template;
    }
    return template.replace(/\{(\w+)\}/g, (match, name: string) => {
      const value = params[name];
      return value === undefined ? match : String(value);
    });
  }

  formatDate(
    value: string | Date,
    timeZone: string,
    options: Intl.DateTimeFormatOptions,
  ): string {
    const date = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) {
      return '—';
    }
    return new Intl.DateTimeFormat(this.localeTag(), {
      timeZone,
      ...options,
    }).format(date);
  }

  longDate(value: string | Date, timeZone: string): string {
    return this.formatDate(value, timeZone, {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    });
  }

  fullDate(value: string | Date, timeZone: string): string {
    return this.formatDate(value, timeZone, {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  shortDate(value: string | Date, timeZone: string): string {
    return this.formatDate(value, timeZone, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  dayNumber(value: string | Date, timeZone: string): string {
    return this.formatDate(value, timeZone, { day: '2-digit' });
  }

  monthShort(value: string | Date, timeZone: string): string {
    return this.formatDate(value, timeZone, { month: 'short' }).replace('.', '');
  }

  weekdayShort(value: string | Date, timeZone: string): string {
    return this.formatDate(value, timeZone, { weekday: 'short' }).replace('.', '');
  }

  time(value: string | Date, timeZone: string): string {
    return this.formatDate(value, timeZone, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  dateTime(value: string | Date, timeZone: string): string {
    return `${this.shortDate(value, timeZone)} · ${this.time(value, timeZone)}`;
  }

  number(value: number): string {
    return new Intl.NumberFormat(this.localeTag()).format(value);
  }

  relative(value: string | Date, now: Date = new Date()): string {
    const date = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    const diffMinutes = Math.round((now.getTime() - date.getTime()) / 60000);
    if (diffMinutes < 1) {
      return this.t('time.justNow');
    }
    if (diffMinutes < 60) {
      return this.t('time.minutes', { count: diffMinutes });
    }
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) {
      return this.t('time.hours', { count: diffHours });
    }
    const diffDays = Math.round(diffHours / 24);
    if (diffDays < 7) {
      return this.t('time.days', { count: diffDays });
    }
    return this.t('time.date', {
      date: this.formatDate(date, 'Africa/Luanda', { day: '2-digit', month: 'short' }),
    });
  }

  private readStoredLocale(): Locale {
    if (!isPlatformBrowser(this.platformId)) {
      return DEFAULT_LOCALE;
    }
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    return stored === 'en' ? 'en' : DEFAULT_LOCALE;
  }
}
