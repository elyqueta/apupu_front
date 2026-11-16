import { Routes } from '@angular/router';
import { ShellComponent } from './core/layout/shell.component';
import { authenticatedGuard } from './core/api/auth.guard';

export const routes: Routes = [
  {
    path: 'entrar',
    title: 'Conta Comigo · Entrar',
    loadComponent: () => import('./features/auth/auth.page').then((m) => m.AuthPage),
    data: { mode: 'login' },
  },
  {
    path: 'registar',
    title: 'Conta Comigo · Criar conta',
    loadComponent: () => import('./features/auth/auth.page').then((m) => m.AuthPage),
    data: { mode: 'register' },
  },
  {
    path: 'recuperar-senha',
    title: 'Conta Comigo · Recuperar senha',
    loadComponent: () => import('./features/auth/password.page').then((m) => m.PasswordPage),
    data: { mode: 'forgot' },
  },
  {
    path: 'repor-senha',
    title: 'Conta Comigo · Repor senha',
    loadComponent: () => import('./features/auth/password.page').then((m) => m.PasswordPage),
    data: { mode: 'reset' },
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authenticatedGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'painel',
      },
      {
        path: 'painel',
        title: 'Conta Comigo · Painel',
        loadComponent: () =>
          import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'eventos',
        title: 'Conta Comigo · Eventos',
        loadComponent: () =>
          import('./features/events/events.page').then((m) => m.EventsPage),
      },
      {
        path: 'eventos/:eventId',
        title: 'Conta Comigo · Evento',
        loadComponent: () =>
          import('./features/events/event-detail.page').then((m) => m.EventDetailPage),
      },
      {
        path: 'criar-evento',
        title: 'Conta Comigo · Criar evento',
        loadComponent: () =>
          import('./features/event-setup/create-event.page').then((m) => m.CreateEventPage),
      },
      {
        path: 'convidados',
        title: 'Conta Comigo · Convidados',
        loadComponent: () =>
          import('./features/guests/guests.page').then((m) => m.GuestsPage),
      },
      {
        path: 'templates',
        title: 'Conta Comigo · Modelos',
        loadComponent: () =>
          import('./features/templates/templates.page').then((m) => m.TemplatesPage),
      },
      {
        path: 'relatorios',
        title: 'Conta Comigo · Relatórios',
        loadComponent: () =>
          import('./features/reports/reports.page').then((m) => m.ReportsPage),
      },
      {
        path: 'definicoes',
        title: 'Conta Comigo · Definições',
        loadComponent: () =>
          import('./features/settings/settings.page').then((m) => m.SettingsPage),
      },
    ],
  },
  {
    path: 'gestao',
    title: 'Conta Comigo · Gestão',
    loadComponent: () =>
      import('./features/host-management/management-entry.page').then((m) => m.ManagementEntryPage),
  },
  {
    path: 'gerir/:token',
    title: 'Conta Comigo · Gestão',
    loadComponent: () =>
      import('./features/host-management/management-entry.page').then((m) => m.ManagementEntryPage),
  },
  {
    path: 'gestao/evento/:eventId',
    title: 'Conta Comigo · Gestão do evento',
    loadComponent: () =>
      import('./features/host-management/management-event.page').then((m) => m.ManagementEventPage),
  },
  {
    path: 'gestao/evento',
    pathMatch: 'full',
    redirectTo: 'gestao',
  },
  {
    path: 'gestao/:token',
    title: 'Conta Comigo · Gestão',
    loadComponent: () =>
      import('./features/host-management/management-entry.page').then((m) => m.ManagementEntryPage),
  },
  {
    path: 'convite/:token',
    title: 'Conta Comigo · Convite',
    loadComponent: () =>
      import('./features/invitation/invitation.page').then((m) => m.InvitationPage),
  },
  {
    path: 'i/:token',
    title: 'Conta Comigo · Convite',
    loadComponent: () =>
      import('./features/invitation/invitation.page').then((m) => m.InvitationPage),
  },
  {
    path: '**',
    title: 'Conta Comigo · Página não encontrada',
    loadComponent: () =>
      import('./features/not-found/not-found.page').then((m) => m.NotFoundPage),
  },
];
