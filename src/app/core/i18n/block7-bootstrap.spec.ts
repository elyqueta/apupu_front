import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { I18nService } from './i18n.service';

const LOCALE_KEY = 'contacomigo.locale';

describe('I18nService · bootstrap do Bloco 7', () => {
  afterEach(() => {
    localStorage.removeItem(LOCALE_KEY);
    document.documentElement.lang = 'pt-AO';
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  it('aplica o locale guardado ao documentElement e às chaves do bloco 7', () => {
    localStorage.setItem(LOCALE_KEY, 'en');
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
    });

    const i18n = TestBed.inject(I18nService);
    expect(i18n.locale()).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    expect(i18n.t('support.title')).toBe('Talk to our support team');
    expect(i18n.t('admin.newsletter.title')).toBe('Newsletter subscriptions');

    i18n.setLocale('pt-AO');
    expect(document.documentElement.lang).toBe('pt-AO');
    expect(localStorage.getItem(LOCALE_KEY)).toBe('pt-AO');
    expect(i18n.t('support.title')).toBe('Falar com a equipa de apoio');
  });

  it('substitui parâmetros das mensagens e mantém o locale por omissão se storage falhar', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Armazenamento indisponível');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Armazenamento indisponível');
    });
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
    });

    const i18n = TestBed.inject(I18nService);
    expect(i18n.locale()).toBe('pt-AO');
    expect(document.documentElement.lang).toBe('pt-AO');

    i18n.setLocale('en');
    expect(i18n.locale()).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    expect(i18n.t('auth.codeSentLead', { email: 'ana@exemplo.pt' })).toContain('ana@exemplo.pt');
  });
});
