import { ParamMap } from '@angular/router';
import { TeamCategory, TeamEventStatus, TeamMyRole } from '../models/models';
import { TeamListQuery } from './teams.repository';

export type TeamRoleFilter = 'all' | TeamMyRole;
export type TeamEventStatusFilter = 'all' | TeamEventStatus;
export type TeamCategoryFilter = 'all' | TeamCategory;

/**
 * Estado dos filtros da lista de equipas. É a fonte de verdade da página
 * e o que é serializado para o URL.
 */
export interface TeamFilters {
  q: string;
  role: TeamRoleFilter;
  eventStatus: TeamEventStatusFilter;
  category: TeamCategoryFilter;
  /** Evento selecionado; vazio significa todos. */
  eventId: string;
  mine: boolean;
  page: number;
}

export const DEFAULT_TEAM_FILTERS: TeamFilters = {
  q: '',
  role: 'all',
  eventStatus: 'all',
  category: 'all',
  eventId: '',
  mine: false,
  page: 1,
};

const ROLES: readonly TeamMyRole[] = ['anfitriao', 'gestor', 'membro'];
const EVENT_STATUSES: readonly TeamEventStatus[] = [
  'agendado',
  'em_curso',
  'concluido',
  'cancelado',
  'rascunho',
];
const CATEGORIES: readonly TeamCategory[] = [
  'logistica',
  'decoracao',
  'musica',
  'catering',
  'rececao',
  'outra',
];

function pick<T extends string>(value: string | null, allowed: readonly T[], fallback: 'all' | T) {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function positivePage(value: string | null): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

/** Um id de evento inválido no URL é ignorado, para não gerar um 400. */
function eventId(value: string | null): string {
  const id = value?.trim() ?? '';
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : '';
}

/**
 * Lê os filtros do URL (`q`, `papel`, `estado`, `minhas`, `categoria`,
 * `evento`, `pagina`).
 */
export function teamFiltersFromParams(params: ParamMap): TeamFilters {
  const mine = params.get('minhas');
  return {
    q: params.get('q')?.trim() ?? '',
    role: pick(params.get('papel'), ROLES, 'all'),
    eventStatus: pick(params.get('estado'), EVENT_STATUSES, 'all'),
    category: pick(params.get('categoria'), CATEGORIES, 'all'),
    eventId: eventId(params.get('evento')),
    mine: mine === '1' || mine === 'true',
    page: positivePage(params.get('pagina')),
  };
}

/**
 * Serializa os filtros para o URL. Os valores por omissão ficam de fora
 * para manter as ligações partilháveis curtas.
 */
export function teamFiltersToParams(
  filters: TeamFilters,
): Record<string, string | null> {
  const q = filters.q.trim();
  return {
    q: q || null,
    papel: filters.role === 'all' ? null : filters.role,
    estado: filters.eventStatus === 'all' ? null : filters.eventStatus,
    categoria: filters.category === 'all' ? null : filters.category,
    evento: filters.eventId || null,
    minhas: filters.mine ? '1' : null,
    pagina: filters.page > 1 ? String(filters.page) : null,
  };
}

/** Converte os filtros no pedido à API (sem valores `all`). */
export function teamFiltersToQuery(filters: TeamFilters, pageSize: number): TeamListQuery {
  const q = filters.q.trim();
  return {
    q: q || undefined,
    role: filters.role === 'all' ? undefined : filters.role,
    eventStatus: filters.eventStatus === 'all' ? undefined : filters.eventStatus,
    category: filters.category === 'all' ? undefined : filters.category,
    eventId: filters.eventId || undefined,
    mine: filters.mine || undefined,
    page: filters.page,
    pageSize,
  };
}

export function hasActiveTeamFilters(filters: TeamFilters): boolean {
  return (
    filters.q.trim() !== '' ||
    filters.role !== 'all' ||
    filters.eventStatus !== 'all' ||
    filters.category !== 'all' ||
    filters.eventId !== '' ||
    filters.mine
  );
}

export function sameTeamFilters(a: TeamFilters, b: TeamFilters): boolean {
  return (
    a.q.trim() === b.q.trim() &&
    a.role === b.role &&
    a.eventStatus === b.eventStatus &&
    a.category === b.category &&
    a.eventId === b.eventId &&
    a.mine === b.mine &&
    a.page === b.page
  );
}
