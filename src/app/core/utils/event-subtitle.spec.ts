import { FormControl, Validators } from '@angular/forms';
import { buildEventCreateRequest } from '../data/events.repository';
import type { CreateEventInput } from '../models/models';
import { SUBTITLE_MAX_LENGTH, subtitleValue } from './event-subtitle';

function eventInput(
  overrides: Partial<Omit<CreateEventInput, 'type'>> = {},
): CreateEventInput {
  return {
    type: 'wedding',
    title: 'Festa de formatura',
    hostName: 'Ana',
    hostEmail: 'ana@example.com',
    startsAt: '2026-12-20T18:00:00.000Z',
    timezone: 'Africa/Luanda',
    venue: 'Talatona',
    city: 'Luanda',
    onlineLink: null,
    message: 'Convite',
    rules: '',
    dressCode: '',
    rsvpDeadline: null,
    templateId: null,
    coverUrl: null,
    contributionEnabled: false,
    bankDetails: null,
    guests: [],
    ...overrides,
  };
}

describe('Bloco 16 · subtítulo do evento', () => {
  it('é opcional e normaliza texto vazio para null', () => {
    expect(subtitleValue(undefined)).toBeNull();
    expect(subtitleValue('')).toBeNull();
    expect(subtitleValue('   ')).toBeNull();
    expect(subtitleValue('  Uma noite inesquecível  ')).toBe('Uma noite inesquecível');
  });

  it('aceita até 150 caracteres e rejeita mais no formulário', () => {
    expect(SUBTITLE_MAX_LENGTH).toBe(150);
    const control = new FormControl('', [Validators.maxLength(SUBTITLE_MAX_LENGTH)]);
    control.setValue('a'.repeat(150));
    expect(control.valid).toBe(true);
    control.setValue('a'.repeat(151));
    expect(control.invalid).toBe(true);
  });

  it('envia o subtítulo aparado no payload de criação', () => {
    const request = buildEventCreateRequest(eventInput({ subtitle: '  Festa de formatura  ' }));
    expect(request.event.subtitle).toBe('Festa de formatura');
  });

  it('envia null quando o subtítulo é limpo ou omitido', () => {
    expect(buildEventCreateRequest(eventInput({ subtitle: '   ' })).event.subtitle).toBeNull();
    expect(buildEventCreateRequest(eventInput()).event.subtitle).toBeNull();
  });
});
