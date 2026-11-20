import { eventTabQuery, parseEventTab } from './detail.models';

describe('event detail tabs', () => {
  it('aceita apenas separadores conhecidos', () => {
    expect(parseEventTab(null)).toBe('resumo');
    expect(parseEventTab('')).toBe('resumo');
    expect(parseEventTab('desconhecido')).toBe('resumo');
    expect(parseEventTab('convidados')).toBe('convidados');
    expect(parseEventTab('equipas')).toBe('equipas');
    expect(parseEventTab('gestores')).toBe('gestores');
    expect(parseEventTab('atividade')).toBe('atividade');
  });

  it('omite o valor por defeito da URL', () => {
    expect(eventTabQuery('resumo')).toBeNull();
    expect(eventTabQuery('convidados')).toBe('convidados');
    expect(eventTabQuery('atividade')).toBe('atividade');
  });
});
