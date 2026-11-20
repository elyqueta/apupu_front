import { TranslationKey } from '../../../core/i18n/translations';
import { RsvpStatus } from '../../../core/models/models';

/** Separadores partilhados pelo painel do anfitrião e pelo painel do gestor. */
export type EventTab = 'resumo' | 'convidados' | 'equipas' | 'gestores' | 'atividade';

export interface EventTabDefinition {
  id: EventTab;
  labelKey: TranslationKey;
  icon: string;
}

export const EVENT_TABS: EventTabDefinition[] = [
  { id: 'resumo', labelKey: 'eventDetail.tabs.overview', icon: 'dashboardAlt' },
  { id: 'convidados', labelKey: 'eventDetail.tabs.guests', icon: 'guests' },
  { id: 'equipas', labelKey: 'eventDetail.tabs.teams', icon: 'guestGroup' },
  { id: 'gestores', labelKey: 'eventDetail.tabs.managers', icon: 'user' },
  { id: 'atividade', labelKey: 'eventDetail.tabs.activity', icon: 'clock' },
];

/** O valor ausente ou desconhecido cai sempre no Resumo. */
export function parseEventTab(value: string | null | undefined): EventTab {
  return EVENT_TABS.some((tab) => tab.id === value) ? (value as EventTab) : 'resumo';
}

/** `resumo` é o valor por defeito e não polui a URL. */
export function eventTabQuery(tab: EventTab): string | null {
  return tab === 'resumo' ? null : tab;
}

export type GuestFilter = 'all' | RsvpStatus;

export interface GuestFilterDefinition {
  id: GuestFilter;
  labelKey: TranslationKey;
}

export const GUEST_FILTERS: GuestFilterDefinition[] = [
  { id: 'all', labelKey: 'eventDetail.filterAll' },
  { id: 'confirmed', labelKey: 'status.confirmed' },
  { id: 'pending', labelKey: 'status.pending' },
  { id: 'declined', labelKey: 'status.declined' },
];
