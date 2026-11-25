import { Component, computed, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { GuestInvitationsRepository } from '../../core/data/guest-invitations.repository';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import { GuestInvitation, RsvpStatus } from '../../core/models/models';
import { ICONS } from '../../core/ui/icons';
import { ImageLightboxComponent } from '../../shared/components/image-lightbox.component';
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
  imports: [
    FaIconComponent,
    ImageLightboxComponent,
    SkeletonComponent,
    StatusBadgeComponent,
    TemplateArtworkComponent,
  ],
  templateUrl: './invitations.page.html',
})
export class InvitationsPage {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  private readonly repository = inject(GuestInvitationsRepository);

  protected readonly search = signal('');
  protected readonly filter = signal<InviteFilter>('all');
  protected readonly lightbox = signal<{ src: string; alt: string } | null>(null);

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
      .sort((a, b) => this.compareInvitations(a, b));
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

  protected openCover(invitation: GuestInvitation): void {
    if (invitation.coverUrl) {
      this.lightbox.set({ src: invitation.coverUrl, alt: invitation.title });
    }
  }

  protected closeCover(): void {
    this.lightbox.set(null);
  }

  protected locationLabel(invitation: GuestInvitation): string {
    if (invitation.onlineLink) {
      return this.i18n.t('invites.online');
    }
    return [invitation.venue, invitation.city].filter((part) => part.length > 0).join(', ');
  }

  private eventGroup(status: GuestInvitation['eventStatus']): number {
    if (status === 'cancelled') return 2;
    if (status === 'completed') return 1;
    return 0;
  }

  private compareInvitations(a: GuestInvitation, b: GuestInvitation): number {
    const ga = this.eventGroup(a.eventStatus);
    const gb = this.eventGroup(b.eventStatus);
    if (ga !== gb) return ga - gb;
    const ta = a.startsAt ? new Date(a.startsAt).getTime() : Number.POSITIVE_INFINITY;
    const tb = b.startsAt ? new Date(b.startsAt).getTime() : Number.POSITIVE_INFINITY;
    if (ga === 0) return ta - tb;
    return tb - ta;
  }
}
