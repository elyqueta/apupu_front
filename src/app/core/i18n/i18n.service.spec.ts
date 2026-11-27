import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { I18nService } from './i18n.service';

describe('I18nService · team dates', () => {
  let i18n: I18nService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
    });
    i18n = TestBed.inject(I18nService);
  });

  it('formats a task date as "sáb, 21 nov 2026 · 15:00" in Africa/Luanda', () => {
    // 14:00 UTC == 15:00 em Luanda (UTC+1, sem horário de verão).
    expect(i18n.weekdayDateTime('2026-11-21T14:00:00Z', 'Africa/Luanda')).toBe(
      'sáb, 21 nov 2026 · 15:00',
    );
  });

  it('formats a calendar day without shifting the day', () => {
    expect(i18n.calendarDate('2026-11-22')).toBe('22 nov 2026');
  });

  it('returns a dash for invalid dates', () => {
    expect(i18n.weekdayDateTime('não-é-data', 'Africa/Luanda')).toBe('—');
    expect(i18n.calendarDate('2026-13-40')).toBe('—');
  });
});

describe('I18nService · plural', () => {
  let i18n: I18nService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
    });
    i18n = TestBed.inject(I18nService);
  });

  it('usa o singular apenas para 1 e o plural para 0 e demais contagens', () => {
    expect(i18n.plural(1, 'plural.member.one', 'plural.member.many')).toBe('1 membro');
    expect(i18n.plural(0, 'plural.member.one', 'plural.member.many')).toBe('0 membros');
    expect(i18n.plural(2, 'plural.member.one', 'plural.member.many')).toBe('2 membros');
  });

  it('interpola contagens de amigos, comunidades e confirmados', () => {
    expect(i18n.plural(1, 'plural.friend.one', 'plural.friend.many')).toBe('1 amigo');
    expect(i18n.plural(2, 'plural.friend.one', 'plural.friend.many')).toBe('2 amigos');
    expect(i18n.plural(1, 'plural.community.one', 'plural.community.many')).toBe('1 comunidade');
    expect(i18n.plural(0, 'plural.community.one', 'plural.community.many')).toBe('0 comunidades');
    expect(i18n.plural(1, 'plural.confirmed.one', 'plural.confirmed.many')).toBe('1 confirmado');
  });

  it('mantém as mesmas chaves em inglês', () => {
    i18n.setLocale('en');
    expect(i18n.plural(1, 'plural.member.one', 'plural.member.many')).toBe('1 member');
    expect(i18n.plural(2, 'plural.member.one', 'plural.member.many')).toBe('2 members');
    expect(i18n.plural(1, 'plural.community.one', 'plural.community.many')).toBe('1 community');
  });
});
