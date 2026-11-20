/**
 * Chaves i18n adicionais do Bloco 8 (perfis no admin e relatórios PDF).
 *
 * Textos visíveis em pt-PT com a variante `en` correspondente, no mesmo
 * formato dos blocos anteriores. Nenhum texto destas funcionalidades é
 * escrito directamente nos templates.
 */

export const BLOCK8_KEYS_PT = {
  'route.admin.reports': 'Conto Contigo · Administração · Relatórios',

  'admin.nav.reports': 'Relatórios',

  'admin.users.detail.cover': 'Capa do perfil',
  'admin.users.detail.phone': 'Telefone',
  'admin.users.detail.locale': 'Idioma',
  'admin.users.detail.timezone': 'Fuso horário',
  'admin.users.detail.verified': 'Email verificado',
  'admin.users.detail.eventsSection': 'Eventos',
  'admin.users.detail.teamsSection': 'Equipas associadas',
  'admin.users.detail.noTeams': 'Este utilizador não tem equipas associadas.',
  'admin.users.detail.guestCount': '{count} convidados',
  'admin.users.detail.members': '{count} membros',
  'admin.users.detail.teamsStat': 'Equipas',
  'admin.users.detail.exportPdf': 'Exportar PDF',
  'admin.users.detail.exporting': 'A gerar PDF…',
  'admin.users.detail.exported': 'Relatório descarregado.',
  'admin.users.exportError': 'Não foi possível gerar o relatório.',

  'admin.reports.title': 'Relatórios',
  'admin.reports.subtitle': 'Descarrega relatórios PDF dos perfis e da plataforma.',
  'admin.reports.exportAll': 'Exportar todos os perfis',
  'admin.reports.exporting': 'A gerar relatório…',
  'admin.reports.exported': 'Relatório descarregado.',
  'admin.reports.exportError': 'Não foi possível gerar o relatório global.',
  'admin.reports.weeklyTitle': 'Relatórios semanais',
  'admin.reports.week': 'Semana',
  'admin.reports.generatedAt': 'Gerado em',
  'admin.reports.size': 'Tamanho',
  'admin.reports.sizeKb': '{count} KB',
  'admin.reports.hosts': 'Perfis',
  'admin.reports.download': 'Descarregar',
  'admin.reports.empty': 'Ainda não há relatórios semanais disponíveis.',
  'admin.reports.error': 'Não foi possível carregar os relatórios.',
  'admin.reports.weeklyHint': 'Gerado todas as segundas-feiras para descarrega no painel.',
} as const;

export const BLOCK8_KEYS_EN = {
  'route.admin.reports': 'Conto Contigo · Administration · Reports',

  'admin.nav.reports': 'Reports',

  'admin.users.detail.cover': 'Profile cover',
  'admin.users.detail.phone': 'Phone',
  'admin.users.detail.locale': 'Language',
  'admin.users.detail.timezone': 'Time zone',
  'admin.users.detail.verified': 'Email verified',
  'admin.users.detail.eventsSection': 'Events',
  'admin.users.detail.teamsSection': 'Associated teams',
  'admin.users.detail.noTeams': 'This user has no associated teams.',
  'admin.users.detail.guestCount': '{count} guests',
  'admin.users.detail.members': '{count} members',
  'admin.users.detail.teamsStat': 'Teams',
  'admin.users.detail.exportPdf': 'Export PDF',
  'admin.users.detail.exporting': 'Generating PDF…',
  'admin.users.detail.exported': 'Report downloaded.',
  'admin.users.exportError': 'The report could not be generated.',

  'admin.reports.title': 'Reports',
  'admin.reports.subtitle': 'Download PDF reports for profiles and for the whole platform.',
  'admin.reports.exportAll': 'Export all profiles',
  'admin.reports.exporting': 'Generating report…',
  'admin.reports.exported': 'Report downloaded.',
  'admin.reports.exportError': 'The global report could not be generated.',
  'admin.reports.weeklyTitle': 'Weekly reports',
  'admin.reports.week': 'Week',
  'admin.reports.generatedAt': 'Generated at',
  'admin.reports.size': 'Size',
  'admin.reports.sizeKb': '{count} KB',
  'admin.reports.hosts': 'Profiles',
  'admin.reports.download': 'Download',
  'admin.reports.empty': 'No weekly reports are available yet.',
  'admin.reports.error': 'The reports could not be loaded.',
  'admin.reports.weeklyHint': 'Generated every Monday for download in the admin panel.',
} as const;
