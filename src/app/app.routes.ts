import { Routes } from '@angular/router';
import { ShellComponent } from './core/layout/shell.component';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'painel',
      },
      {
        path: 'painel',
        title: 'Apupu · Painel',
        loadComponent: () =>
          import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'eventos',
        title: 'Apupu · Eventos',
        loadComponent: () =>
          import('./features/events/events.page').then((m) => m.EventsPage),
      },
      {
        path: 'eventos/:eventId',
        title: 'Apupu · Evento',
        loadComponent: () =>
          import('./features/events/event-detail.page').then((m) => m.EventDetailPage),
      },
      {
        path: 'criar-evento',
        title: 'Apupu · Criar evento',
        loadComponent: () =>
          import('./features/event-setup/create-event.page').then((m) => m.CreateEventPage),
      },
      {
        path: 'convidados',
        title: 'Apupu · Convidados',
        loadComponent: () =>
          import('./features/guests/guests.page').then((m) => m.GuestsPage),
      },
      {
        path: 'templates',
        title: 'Apupu · Modelos',
        loadComponent: () =>
          import('./features/templates/templates.page').then((m) => m.TemplatesPage),
      },
      {
        path: 'relatorios',
        title: 'Apupu · Relatórios',
        loadComponent: () =>
          import('./features/reports/reports.page').then((m) => m.ReportsPage),
      },
      {
        path: 'definicoes',
        title: 'Apupu · Definições',
        loadComponent: () =>
          import('./features/settings/settings.page').then((m) => m.SettingsPage),
      },
    ],
  },
  {
    path: 'gestao',
    title: 'Apupu · Gestão',
    loadComponent: () =>
      import('./features/host-management/management-entry.page').then((m) => m.ManagementEntryPage),
  },
  {
    path: 'gestao/evento',
    title: 'Apupu · Gestão do evento',
    loadComponent: () =>
      import('./features/host-management/management-event.page').then((m) => m.ManagementEventPage),
  },
  {
    path: 'i/:token',
    title: 'Apupu · Convite',
    loadComponent: () =>
      import('./features/invitation/invitation.page').then((m) => m.InvitationPage),
  },
  {
    path: '**',
    title: 'Apupu · Página não encontrada',
    loadComponent: () =>
      import('./features/not-found/not-found.page').then((m) => m.NotFoundPage),
  },
];
