import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { ShellComponent } from './core/layout/shell.component';
import { authenticatedGuard } from './core/api/auth.guard';

export const routes: Routes = [
  {
    path: 'entrar',
    title: 'Conto Contigo · Entrar',
    loadComponent: () => import('./features/auth/auth.page').then((m) => m.AuthPage),
    data: { mode: 'login' },
  },
  {
    path: 'criar-conta',
    title: 'Conto Contigo · Criar conta',
    loadComponent: () => import('./features/auth/auth.page').then((m) => m.AuthPage),
    data: { mode: 'register' },
  },
  {
    path: 'registar',
    pathMatch: 'full',
    redirectTo: 'criar-conta',
  },
  {
    path: 'recuperar-senha',
    title: 'Conto Contigo · Recuperar senha',
    loadComponent: () => import('./features/auth/password.page').then((m) => m.PasswordPage),
    data: { mode: 'forgot' },
  },
  {
    path: 'redefinir-senha',
    title: 'Conto Contigo · Redefinir senha',
    loadComponent: () => import('./features/auth/password.page').then((m) => m.PasswordPage),
    data: { mode: 'reset' },
  },
  {
    path: 'repor-senha',
    pathMatch: 'full',
    redirectTo: 'redefinir-senha',
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
        title: 'Conto Contigo · Painel',
        loadComponent: () =>
          import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'eventos',
        title: 'Conto Contigo · Eventos',
        loadComponent: () => import('./features/events/events.page').then((m) => m.EventsPage),
      },
      {
        // Alias antigo: /eventos/:eventId/equipas?equipa=<uuid> → /equipas?evento=<uuid>
        path: 'eventos/:eventId/equipas',
        redirectTo: (data) => {
          const router = inject(Router);
          const queryParams = { ...data.queryParams };
          const eventId = queryParams['equipa'] ?? data.params['eventId'];
          delete queryParams['equipa'];
          if (eventId) {
            queryParams['evento'] = eventId;
          } else {
            delete queryParams['evento'];
          }
          return router.createUrlTree(['/equipas'], { queryParams });
        },
      },
      {
        // Alias das tarefas de um evento: /eventos/:eventId/tarefas?tarefa=<termo>
        path: 'eventos/:eventId/tarefas',
        redirectTo: (data) => {
          const router = inject(Router);
          const queryParams = { ...data.queryParams };
          const term = queryParams['tarefa'];
          delete queryParams['tarefa'];
          if (term !== undefined) {
            queryParams['q'] = term;
          } else {
            delete queryParams['q'];
          }
          queryParams['evento'] = data.params['eventId'];
          return router.createUrlTree(['/tarefas'], { queryParams });
        },
      },
      {
        path: 'eventos/:eventId',
        title: 'Conto Contigo · Evento',
        loadComponent: () =>
          import('./features/events/event-detail.page').then((m) => m.EventDetailPage),
      },
      {
        path: 'criar-evento',
        title: 'Conto Contigo · Criar evento',
        loadComponent: () =>
          import('./features/event-setup/create-event.page').then((m) => m.CreateEventPage),
      },
      {
        path: 'tarefas',
        title: 'Conto Contigo · Tarefas',
        loadComponent: () => import('./features/tasks/tasks.page').then((m) => m.TasksPage),
      },
      {
        path: 'notificacoes',
        title: 'Conto Contigo · Notificações',
        loadComponent: () =>
          import('./features/notifications/notifications.page').then((m) => m.NotificationsPage),
      },
      {
        path: 'convidados',
        title: 'Conto Contigo · Convidados',
        loadComponent: () => import('./features/guests/guests.page').then((m) => m.GuestsPage),
      },
      {
        path: 'equipas/:teamId',
        title: 'Conto Contigo · Equipa',
        loadComponent: () =>
          import('./features/team/team-detail.page').then((m) => m.TeamDetailPage),
      },
      {
        path: 'equipas',
        title: 'Conto Contigo · Equipas',
        loadComponent: () => import('./features/team/team.page').then((m) => m.TeamPage),
      },
      {
        path: 'convites',
        title: 'Conto Contigo · Meus convites',
        loadComponent: () =>
          import('./features/my-invitations/invitations.page').then((m) => m.InvitationsPage),
      },
      {
        path: 'templates',
        title: 'Conto Contigo · Modelos',
        loadComponent: () =>
          import('./features/templates/templates.page').then((m) => m.TemplatesPage),
      },
      {
        path: 'relatorios',
        title: 'Conto Contigo · Relatórios',
        loadComponent: () => import('./features/reports/reports.page').then((m) => m.ReportsPage),
      },
      {
        path: 'definicoes',
        title: 'Conto Contigo · Definições',
        loadComponent: () =>
          import('./features/settings/settings.page').then((m) => m.SettingsPage),
      },
      {
        path: 'perfil',
        title: 'Conto Contigo · Perfil',
        loadComponent: () => import('./features/profile/profile.page').then((m) => m.ProfilePage),
      },
    ],
  },
  {
    path: 'gestao',
    title: 'Conto Contigo · Gestão',
    loadComponent: () =>
      import('./features/host-management/management-entry.page').then((m) => m.ManagementEntryPage),
  },
  {
    path: 'gerir/:token',
    title: 'Conto Contigo · Gestão',
    loadComponent: () =>
      import('./features/host-management/management-entry.page').then((m) => m.ManagementEntryPage),
  },
  {
    path: 'gestao/evento/:eventId',
    title: 'Conto Contigo · Gestão do evento',
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
    title: 'Conto Contigo · Gestão',
    loadComponent: () =>
      import('./features/host-management/management-entry.page').then((m) => m.ManagementEntryPage),
  },
  {
    path: 'convite/:token',
    title: 'Conto Contigo · Convite',
    loadComponent: () =>
      import('./features/invitation/invitation.page').then((m) => m.InvitationPage),
  },
  {
    path: 'i/:token',
    title: 'Conto Contigo · Convite',
    loadComponent: () =>
      import('./features/invitation/invitation.page').then((m) => m.InvitationPage),
  },
  {
    path: 'isy',
    title: 'Convite · Isilda Manuel',
    loadComponent: () =>
      import('./features/isy-invite/isy-invite.component').then((m) => m.IsyInviteComponent),
  },
  {
    path: '**',
    title: 'Conto Contigo · Página não encontrada',
    loadComponent: () => import('./features/not-found/not-found.page').then((m) => m.NotFoundPage),
  },
];
