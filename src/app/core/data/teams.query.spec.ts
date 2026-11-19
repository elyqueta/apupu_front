import { convertToParamMap } from '@angular/router';
import {
  DEFAULT_TEAM_FILTERS,
  hasActiveTeamFilters,
  sameTeamFilters,
  TeamFilters,
  teamFiltersFromParams,
  teamFiltersToParams,
  teamFiltersToQuery,
} from './teams.query';

const EVENT_ID = 'f1111111-1111-4111-8111-111111111111';

describe('team filters <-> URL', () => {
  it('reads every supported query param', () => {
    const filters = teamFiltersFromParams(
      convertToParamMap({
        q: '  cozinha ',
        papel: 'gestor',
        estado: 'em_curso',
        categoria: 'catering',
        evento: EVENT_ID,
        minhas: '1',
        pagina: '3',
      }),
    );

    expect(filters).toEqual({
      q: 'cozinha',
      role: 'gestor',
      eventStatus: 'em_curso',
      category: 'catering',
      eventId: EVENT_ID,
      mine: true,
      page: 3,
    });
  });

  it('falls back to defaults for missing or invalid params', () => {
    expect(teamFiltersFromParams(convertToParamMap({}))).toEqual(DEFAULT_TEAM_FILTERS);
    expect(
      teamFiltersFromParams(
        convertToParamMap({
          papel: 'inventado',
          estado: 'amanha',
          categoria: 'nenhuma',
          evento: 'não-é-um-id',
          pagina: '0',
        }),
      ),
    ).toEqual(DEFAULT_TEAM_FILTERS);
  });

  it('serializes only non-default filters', () => {
    expect(teamFiltersToParams(DEFAULT_TEAM_FILTERS)).toEqual({
      q: null,
      papel: null,
      estado: null,
      categoria: null,
      evento: null,
      minhas: null,
      pagina: null,
    });

    const filters: TeamFilters = {
      q: 'música',
      role: 'membro',
      eventStatus: 'agendado',
      category: 'musica',
      eventId: EVENT_ID,
      mine: true,
      page: 2,
    };
    expect(teamFiltersToParams(filters)).toEqual({
      q: 'música',
      papel: 'membro',
      estado: 'agendado',
      categoria: 'musica',
      evento: EVENT_ID,
      minhas: '1',
      pagina: '2',
    });
  });

  it('round-trips filters through the URL', () => {
    const filters: TeamFilters = {
      q: 'decoração',
      role: 'anfitriao',
      eventStatus: 'rascunho',
      category: 'decoracao',
      eventId: EVENT_ID,
      mine: false,
      page: 4,
    };
    const params = teamFiltersToParams(filters);
    const rebuilt = teamFiltersFromParams(
      convertToParamMap(
        Object.fromEntries(
          Object.entries(params).filter((entry): entry is [string, string] => entry[1] !== null),
        ),
      ),
    );
    expect(rebuilt).toEqual(filters);
  });

  it('maps filters to the API query, dropping "all"', () => {
    expect(teamFiltersToQuery(DEFAULT_TEAM_FILTERS, 12)).toEqual({
      q: undefined,
      role: undefined,
      eventStatus: undefined,
      category: undefined,
      eventId: undefined,
      mine: undefined,
      page: 1,
      pageSize: 12,
    });

    expect(
      teamFiltersToQuery(
        {
          q: ' catering ',
          role: 'gestor',
          eventStatus: 'concluido',
          category: 'catering',
          eventId: EVENT_ID,
          mine: true,
          page: 2,
        },
        20,
      ),
    ).toEqual({
      q: 'catering',
      role: 'gestor',
      eventStatus: 'concluido',
      category: 'catering',
      eventId: EVENT_ID,
      mine: true,
      page: 2,
      pageSize: 20,
    });
  });

  it('detects active filters and compares them', () => {
    expect(hasActiveTeamFilters(DEFAULT_TEAM_FILTERS)).toBe(false);
    expect(hasActiveTeamFilters({ ...DEFAULT_TEAM_FILTERS, mine: true })).toBe(true);
    expect(hasActiveTeamFilters({ ...DEFAULT_TEAM_FILTERS, eventId: EVENT_ID })).toBe(true);
    expect(
      sameTeamFilters(DEFAULT_TEAM_FILTERS, { ...DEFAULT_TEAM_FILTERS, q: '  ' }),
    ).toBe(true);
    expect(
      sameTeamFilters(DEFAULT_TEAM_FILTERS, { ...DEFAULT_TEAM_FILTERS, page: 2 }),
    ).toBe(false);
    expect(
      sameTeamFilters(DEFAULT_TEAM_FILTERS, {
        ...DEFAULT_TEAM_FILTERS,
        eventId: EVENT_ID,
      }),
    ).toBe(false);
  });
});
