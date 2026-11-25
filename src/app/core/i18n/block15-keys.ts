/** Chaves i18n do Bloco 15 (templates, Gratitude, convidados, feed, eventos passados). */
export const BLOCK15_KEYS_PT = {
  'block15.event.completedBanner': 'Evento terminado. O conteúdo está em modo de leitura, exceto a galeria.',
  'block15.status.active': 'Ativo',
  'block15.status.completed': 'Terminado',
  'block15.status.cancelled': 'Cancelado',
  'block15.location.saveTitle': 'Guardar localização',
  'block15.location.saveBody': 'Quer guardar esta localização no seu perfil para usar noutros eventos?',
  'block15.location.saveConfirm': 'Guardar no perfil',
  'block15.location.saveDismiss': 'Agora não',
  'block15.gratitude.organization': 'ORGANIZAÇÃO',
  'block15.gratitude.subtitle': 'FESTIVAL DE ADOLESCENTES',
  'block15.gratitude.info': 'Informação',
  'block15.gratitude.location': 'LOCAL',
  'block15.gratitude.dressCode': 'DRESS-CODE',
  'block15.gratitude.defaultDress': 'TRAJE AFRICANO',
  'block15.invitation.completedText': 'Este evento já terminou. As respostas RSVP já não estão disponíveis.',
  'block15.templates.search': 'Pesquisar modelos',
  'block15.templates.filterAll': 'Todos',
  'block15.templates.filterSystem': 'Sistema',
  'block15.templates.filterUser': 'Meus modelos',
  'block15.templates.preview': 'Pré-visualizar modelo',
  'block15.templates.previewTitle': 'Pré-visualização',
  'block15.templates.useModel': 'Usar este modelo',
  'block15.templates.closePreview': 'Fechar',
  'block15.templates.emptyFiltered': 'Nenhum modelo encontrado',
  'block15.templates.emptyFilteredText': 'Tenta ajustar a pesquisa ou o filtro de categoria.',
  'block15.templates.loading': 'A carregar modelos…',
  'block15.templates.error': 'Não foi possível carregar os modelos.',
  'block15.templates.retry': 'Tentar novamente',
  'block15.templates.animate': 'Ver animação',
  'block15.greeting.morning': 'Bom dia, {name}',
  'block15.greeting.afternoon': 'Boa tarde, {name}',
  'block15.greeting.evening': 'Boa noite, {name}',
  'block15.guest.kind': 'Tipo de convidado',
  'block15.guest.kind.male': 'Homem',
  'block15.guest.kind.female': 'Mulher',
  'block15.guest.kind.couple': 'Casal',
  'block15.guest.kind.family': 'Família',
  'block15.guest.kind.neutral': 'Prefiro não indicar',
  'block15.guest.companionName': 'Nome do cônjuge',
  'block15.guest.companionPlaceholder': 'Ex.: Maria Silva',
  'block15.guest.partySize': 'Número de pessoas',
  'block15.guest.partySizeHint': 'Opcional. Casal conta 2 por defeito.',
  'block15.invitation.welcomeTitlePlural': 'Têm um convite especial',
  'block15.invitation.welcomeMessagePlural': 'Olá, {name}! Têm um convite especial.',
  'block15.invitation.shareMessagePlural': 'Olá! Têm um convite especial: {url}',
  'block15.guests.whatsappMessagePlural': 'Olá {name}! Aqui está o vosso convite para {event}.',
  'block15.guests.whatsappMessageWithLinkPlural': 'Olá {name}! Aqui está o vosso convite para {event}: {url}',
  'block15.teams.lastActivity': 'Última atividade',
  'block15.teams.chat': 'Conversar',
  'block15.teams.chatSoon': 'O chat da equipa estará disponível em breve.',
} as const;

export const BLOCK15_KEYS_EN: Record<keyof typeof BLOCK15_KEYS_PT, string> = {
  'block15.event.completedBanner': 'This event has finished. Content is read-only, except the gallery.',
  'block15.status.active': 'Active',
  'block15.status.completed': 'Finished',
  'block15.status.cancelled': 'Cancelled',
  'block15.location.saveTitle': 'Save location',
  'block15.location.saveBody': 'Do you want to save this location to your profile for other events?',
  'block15.location.saveConfirm': 'Save to profile',
  'block15.location.saveDismiss': 'Not now',
  'block15.gratitude.organization': 'ORGANIZATION',
  'block15.gratitude.subtitle': 'YOUTH FESTIVAL',
  'block15.gratitude.info': 'Information',
  'block15.gratitude.location': 'LOCATION',
  'block15.gratitude.dressCode': 'DRESS CODE',
  'block15.gratitude.defaultDress': 'AFRICAN ATTIRE',
  'block15.invitation.completedText': 'This event has finished. RSVP responses are no longer available.',
  'block15.templates.search': 'Search templates',
  'block15.templates.filterAll': 'All',
  'block15.templates.filterSystem': 'System',
  'block15.templates.filterUser': 'My templates',
  'block15.templates.preview': 'Preview template',
  'block15.templates.previewTitle': 'Preview',
  'block15.templates.useModel': 'Use this template',
  'block15.templates.closePreview': 'Close',
  'block15.templates.emptyFiltered': 'No templates found',
  'block15.templates.emptyFilteredText': 'Try adjusting your search or category filter.',
  'block15.templates.loading': 'Loading templates…',
  'block15.templates.error': 'Could not load templates.',
  'block15.templates.retry': 'Try again',
  'block15.templates.animate': 'Play animation',
  'block15.greeting.morning': 'Good morning, {name}',
  'block15.greeting.afternoon': 'Good afternoon, {name}',
  'block15.greeting.evening': 'Good evening, {name}',
  'block15.guest.kind': 'Guest type',
  'block15.guest.kind.male': 'Man',
  'block15.guest.kind.female': 'Woman',
  'block15.guest.kind.couple': 'Couple',
  'block15.guest.kind.family': 'Family',
  'block15.guest.kind.neutral': 'Prefer not to say',
  'block15.guest.companionName': 'Spouse name',
  'block15.guest.companionPlaceholder': 'E.g. Maria Silva',
  'block15.guest.partySize': 'Number of people',
  'block15.guest.partySizeHint': 'Optional. Couples count as 2 by default.',
  'block15.invitation.welcomeTitlePlural': 'You have a special invitation',
  'block15.invitation.welcomeMessagePlural': 'Hello, {name}! You have a special invitation.',
  'block15.invitation.shareMessagePlural': 'Hello! You have a special invitation: {url}',
  'block15.guests.whatsappMessagePlural': 'Hi {name}! Here is your invitation for {event}.',
  'block15.guests.whatsappMessageWithLinkPlural': 'Hi {name}! Here is your invitation for {event}: {url}',
  'block15.teams.lastActivity': 'Last activity',
  'block15.teams.chat': 'Chat',
  'block15.teams.chatSoon': 'Team chat will be available soon.',
};

export type GuestKindValue = 'male' | 'female' | 'couple' | 'family' | null | undefined;

export function guestAddress(
  kind: GuestKindValue,
  name: string,
  locale: 'pt-PT' | 'en' = 'pt-PT',
): string {
  const n = name.trim();
  if (locale === 'en') {
    if (kind === 'couple') return n ? `Dear ${n}` : 'Dear guests';
    if (kind === 'family') return n ? `Dear ${n}` : 'Dear family';
    if (kind === 'female') return n ? `Dear ${n}` : 'Dear guest';
    if (kind === 'male') return n ? `Dear ${n}` : 'Dear guest';
    return n ? `Dear ${n}` : 'Dear guest';
  }
  if (kind === 'couple') return n || 'Convidados especiais';
  if (kind === 'family') return n || 'Família convidada';
  if (kind === 'female') return n || 'Convidada';
  if (kind === 'male') return n || 'Convidado';
  return n || 'Convidado(a)';
}

export function guestPlural(kind: GuestKindValue): boolean {
  return kind === 'couple' || kind === 'family';
}
