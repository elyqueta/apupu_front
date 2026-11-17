import { Component, computed, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { GuestInvitationsRepository } from '../../core/data/guest-invitations.repository';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import { GuestInvitation, RsvpStatus } from '../../core/models/models';
import { ICONS } from '../../core/ui/icons';
import { SkeletonComponent } from '../../shared/components/skeleton.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { TemplateArtworkComponent } from '../../shared/components/template-artwork.component';

type InviteFilter = 'all' | RsvpStatus;

/**
 * "Meus convites" (`/convites`): os eventos para os quais a conta autenticada
 * foi convidada, na perspetiva do convidado.
 *
 * A página injeta o `GuestInvitationsRepository` diretamente (e não via
 * `WorkspaceStore`) para que uma falha do endpoint não acione o ecrã de erro
 * global da shell — o estado de erro é tratado aqui.
 */
@Component({
  selector: 'app-invitations-page',
  imports: [FaIconComponent, SkeletonComponent, StatusBadgeComponent, TemplateArtworkComponent],
  templateUrl: './invitations.page.html',
})
export class InvitationsPage {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  private readonly repository = inject(GuestInvitationsRepository);

  protected readonly search = signal('');
  protected readonly filter = signal<InviteFilter>('all');

  protected readonly loading = this.repository.loading;
  protected readonly error = this.repository.error;
  protected readonly invitations = computed<GuestInvitation[]>(() => this.repository.data() ?? []);

  protected readonly filters: Array<{ id: InviteFilter; labelKey: TranslationKey }> = [
    { id: 'all', labelKey: 'invites.filter.all' },
    { id: 'pending', labelKey: 'invites.filter.pending' },
    { id: 'confirmed', labelKey: 'invites.filter.confirmed' },
    { id: 'declined', labelKey: 'invites.filter.declined' },
  ];

  protected readonly counts = computed(() => {
    const invitations = this.invitations();
    return {
      all: invitations.length,
      pending: invitations.filter((invitation) => invitation.status === 'pending').length,
      confirmed: invitations.filter((invitation) => invitation.status === 'confirmed').length,
      declined: invitations.filter((invitation) => invitation.status === 'declined').length,
    } satisfies Record<InviteFilter, number>;
  });

  protected readonly filtered = computed<GuestInvitation[]>(() => {
    const filter = this.filter();
    const term = this.search().trim().toLocaleLowerCase(this.i18n.locale());
    return this.invitations()
      .filter((invitation) => filter === 'all' || invitation.status === filter)
      .filter((invitation) => {
        if (!term) {
          return true;
        }
        return `${invitation.title} ${invitation.hostName} ${invitation.venue} ${invitation.city}`
          .toLocaleLowerCase(this.i18n.locale())
          .includes(term);
      })
      .sort((a, b) => this.sortTime(a) - this.sortTime(b));
  });

  constructor() {
    // `load()` guarda o erro no repositório; a rejeição é tratada aqui para não
    // gerar uma promise rejeitada sem handler.
    void this.repository.load().catch(() => undefined);
  }

  protected count(filter: InviteFilter): number {
    return this.counts()[filter];
  }

  protected setFilter(filter: InviteFilter): void {
    this.filter.set(filter);
  }

  protected async retry(): Promise<void> {
    await this.repository.load({ force: true }).catch(() => undefined);
  }

  protected typeLabel(invitation: GuestInvitation): string {
    return invitation.type ? this.i18n.t(`type.${invitation.type}` as TranslationKey) : '';
  }

  protected locationLabel(invitation: GuestInvitation): string {
    if (invitation.onlineLink) {
      return this.i18n.t('invites.online');
    }
    return [invitation.venue, invitation.city].filter((part) => part.length > 0).join(', ');
  }

  private sortTime(invitation: GuestInvitation): number {
    return invitation.startsAt ? new Date(invitation.startsAt).getTime() : Number.POSITIVE_INFINITY;
  }
}
