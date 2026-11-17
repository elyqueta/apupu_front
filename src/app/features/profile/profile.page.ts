import { DOCUMENT } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import { HostEvent } from '../../core/models/models';
import { WorkspaceStore } from '../../core/services/workspace.store';
import { ICONS } from '../../core/ui/icons';
import { AvatarComponent } from '../../shared/components/avatar.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { ProfileEditDialogComponent } from './profile-edit-dialog.component';

interface Metric {
  labelKey: TranslationKey;
  value: string;
}

/**
 * Página de perfil: identidade do anfitrião, resumo da atividade e atalhos.
 *
 * Toda a configuração da aplicação (tema, idioma, senha, privacidade) fica em
 * `/definicoes`; aqui só se mostra e edita a identidade.
 */
@Component({
  selector: 'app-profile-page',
  imports: [
    RouterLink,
    FaIconComponent,
    AvatarComponent,
    StatusBadgeComponent,
    ProfileEditDialogComponent,
  ],
  templateUrl: './profile.page.html',
})
export class ProfilePage {
  protected readonly store = inject(WorkspaceStore);
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;

  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);

  protected readonly editOpen = signal(false);
  protected readonly searchTerm = signal('');

  protected readonly profile = this.store.profile;
  protected readonly stats = this.store.globalStats;

  protected readonly metrics = computed<Metric[]>(() => [
    {
      labelKey: 'profile.stats.events',
      value: this.i18n.number(this.store.events().length),
    },
    {
      labelKey: 'profile.stats.guests',
      value: this.i18n.number(this.stats().total),
    },
    {
      labelKey: 'profile.stats.active',
      value: this.i18n.number(this.store.activeEvents().length),
    },
    {
      labelKey: 'profile.stats.confirmation',
      value: `${this.stats().responseRate}%`,
    },
  ]);

  protected readonly events = computed<HostEvent[]>(() => {
    const term = this.searchTerm().trim().toLowerCase();
    return [...this.store.events()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .filter((event) => !term || event.title.toLowerCase().includes(term))
      .slice(0, 6);
  });

  constructor() {
    // O "chrome" (perfil, eventos, atividade) já é carregado pela shell.
    this.store.load({});
  }

  protected openEdit(): void {
    this.editOpen.set(true);
  }

  protected formatDate(event: HostEvent): string {
    return event.startsAt ? this.i18n.shortDate(event.startsAt, event.timezone) : '—';
  }

  protected guestCount(event: HostEvent): string {
    return this.i18n.number(event.stats?.total ?? 0);
  }

  protected openEvent(eventId: string): void {
    void this.router.navigate(['/eventos', eventId]);
  }

  /** Exporta a lista de eventos visível para CSV, sem depender do backend. */
  protected exportEvents(): void {
    const header = [
      this.i18n.t('profile.table.name'),
      this.i18n.t('profile.table.date'),
      this.i18n.t('profile.table.guests'),
      this.i18n.t('profile.table.status'),
    ];
    const rows = this.events().map((event) => [
      event.title,
      this.formatDate(event),
      this.guestCount(event),
      this.i18n.t(`status.${event.status}` as TranslationKey),
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = this.document.createElement('a');
    anchor.href = url;
    anchor.download = 'contacomigo-eventos.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
