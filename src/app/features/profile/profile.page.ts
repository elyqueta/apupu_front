import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { toApiError } from '../../core/api/api-error';
import { ReportExportFormat, ReportsRepository } from '../../core/data/reports.repository';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import { HostEvent } from '../../core/models/models';
import { DownloadService } from '../../core/services/download.service';
import { ToastService } from '../../core/services/toast.service';
import { WorkspaceStore } from '../../core/services/workspace.store';
import { ICONS } from '../../core/ui/icons';
import { AvatarComponent } from '../../shared/components/avatar.component';
import { LogoComponent } from '../../shared/components/logo.component';
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
    LogoComponent,
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
  private readonly downloads = inject(DownloadService);
  private readonly toasts = inject(ToastService);
  private readonly reports = inject(ReportsRepository);

  protected readonly editOpen = signal(false);
  protected readonly visibilitySaving = signal(false);
  protected readonly exportOpen = signal(false);
  protected readonly exporting = signal<ReportExportFormat | null>(null);
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

  /** Abre/fecha o menu de exportação do relatório da conta. */
  protected toggleExport(): void {
    this.exportOpen.update((open) => !open);
  }

  /**
   * Descarrega o relatório agregado da conta gerado no servidor.
   *
   * O ficheiro vem do backend com o mesmo layout do separador
   * "Relatórios"; a página de perfil só inicia o download.
   */
  /** Interruptor "Perfil público" (privado por defeito). */
  protected async toggleProfileVisibility(): Promise<void> {
    if (this.visibilitySaving()) return;
    const next = this.profile().profileVisibility === 'public' ? 'private' : 'public';
    this.visibilitySaving.set(true);
    try {
      await this.store.setProfileVisibility(next);
      this.toasts.success(this.i18n.t('block10.profile.saved'));
    } catch {
      this.toasts.error(this.i18n.t('block10.profile.saveError'));
    } finally {
      this.visibilitySaving.set(false);
    }
  }

  protected async exportReport(format: ReportExportFormat): Promise<void> {
    if (this.exporting() !== null) {
      return;
    }

    this.exportOpen.set(false);
    this.exporting.set(format);

    try {
      const file = await this.reports.export(format);
      this.downloads.save(file, `conto-contigo-relatorio.${format}`);
      this.toasts.success(this.i18n.t('reports.exported'));
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    } finally {
      this.exporting.set(null);
    }
  }
}
