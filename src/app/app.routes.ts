import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { ShellComponent } from './core/layout/shell.component';
import { authenticatedGuard } from './core/api/auth.guard';
import { I18nService } from './core/i18n/i18n.service';
import { TranslationKey } from './core/i18n/translations';
import { superAdminGuard } from './features/admin/admin.guard';
import { PublicShellComponent } from './features/landing/public-shell.component';

/** Título da rota resolvido no idioma corrente, sem mudar os URLs. */
function pageTitle(key: TranslationKey): () => string {
  return () => inject(I18nService).t(key);
}

export const routes: Routes = [
  {
    // Casca comum das páginas públicas: fundo e altura mínima partilhados
    // entre autenticação, recuperação, gestão e convite.
    path: '',
    component: PublicShellComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: pageTitle('route.home'),
        loadComponent: () => import('./features/landing/landing.page').then((m) => m.LandingPage),
      },
      {
        path: 'entrar',
        title: pageTitle('route.login'),
        loadComponent: () => import('./features/auth/auth.page').then((m) => m.AuthPage),
        data: { mode: 'login' },
      },
      {
        path: 'criar-conta',
        title: pageTitle('route.signup'),
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
        title: pageTitle('route.forgot'),
        loadComponent: () => import('./features/auth/password.page').then((m) => m.PasswordPage),
        data: { mode: 'forgot' },
      },
      {
        path: 'redefinir-senha',
        title: pageTitle('route.reset'),
        loadComponent: () => import('./features/auth/password.page').then((m) => m.PasswordPage),
        data: { mode: 'reset' },
      },
      {
        path: 'repor-senha',
        pathMatch: 'full',
        redirectTo: 'redefinir-senha',
      },
      {
        path: 'gestao',
        title: pageTitle('route.management'),
        loadComponent: () =>
          import('./features/host-management/management-entry.page').then(
            (m) => m.ManagementEntryPage,
          ),
      },
      {
        path: 'gerir/:token',
        title: pageTitle('route.management'),
        loadComponent: () =>
          import('./features/host-management/management-entry.page').then(
            (m) => m.ManagementEntryPage,
          ),
      },
      {
        path: 'gestao/evento/:eventId',
        title: pageTitle('route.managementEvent'),
        loadComponent: () =>
          import('./features/host-management/management-event.page').then(
            (m) => m.ManagementEventPage,
          ),
      },
      {
        path: 'gestao/evento',
        pathMatch: 'full',
        redirectTo: 'gestao',
      },
      {
        path: 'gestao/:token',
        title: pageTitle('route.management'),
        loadComponent: () =>
          import('./features/host-management/management-entry.page').then(
            (m) => m.ManagementEntryPage,
          ),
      },
      {
        path: 'convite/:token',
        title: pageTitle('route.invitation'),
        loadComponent: () =>
          import('./features/invitation/invitation.page').then((m) => m.InvitationPage),
      },
      {
        path: 'i/:token',
        title: pageTitle('route.invitation'),
        loadComponent: () =>
          import('./features/invitation/invitation.page').then((m) => m.InvitationPage),
      },
      {
        path: 'isy',
        title: 'Convite · Isilda Manuel',
        loadComponent: () =>
          import('./features/isy-invite/isy-invite.component').then((m) => m.IsyInviteComponent),
      },
    ],
  },
  {
    path: 'admin',
    canActivate: [superAdminGuard],
    loadComponent: () => import('./features/admin/admin.page').then((m) => m.AdminPage),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'visao-geral',
      },
      {
        path: 'visao-geral',
        title: pageTitle('route.admin.overview'),
        loadComponent: () =>
          import('./features/admin/admin-overview.component').then((m) => m.AdminOverviewComponent),
      },
      {
        path: 'eventos',
        title: pageTitle('route.admin.events'),
        loadComponent: () =>
          import('./features/admin/admin-events.component').then((m) => m.AdminEventsComponent),
      },
      {
        path: 'utilizadores',
        title: pageTitle('route.admin.users'),
        loadComponent: () =>
          import('./features/admin/admin-users.component').then((m) => m.AdminUsersComponent),
      },
      {
        path: 'auditoria',
        title: pageTitle('route.admin.audit'),
        loadComponent: () =>
          import('./features/admin/admin-audit.component').then((m) => m.AdminAuditComponent),
      },
      {
        path: 'apoio',
        title: pageTitle('route.admin.support'),
        loadComponent: () =>
          import('./features/admin/admin-support.component').then((m) => m.AdminSupportComponent),
      },
      {
        path: 'novidades',
        title: pageTitle('route.admin.newsletter'),
        loadComponent: () =>
          import('./features/admin/admin-newsletter.component').then(
            (m) => m.AdminNewsletterComponent,
          ),
      },
      {
        path: 'relatorios',
        title: pageTitle('route.admin.reports'),
        loadComponent: () =>
          import('./features/admin/admin-reports.component').then((m) => m.AdminReportsComponent),
      },
    ],
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
        path: 'mensagens',
        title: 'Conto Contigo · Caixa de entrada',
        loadComponent: () => import('./features/messages/messages.page').then((m) => m.MessagesPage),
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
        loadComponent: () => import('./features/templates/templates.page').then((m) => m.TemplatesPage),
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
    path: '**',
    title: 'Conto Contigo · Página não encontrada',
    loadComponent: () => import('./features/not-found/not-found.page').then((m) => m.NotFoundPage),
  },
];
