import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ICONS } from '../../../core/ui/icons';
import { AvatarComponent } from '../../../shared/components/avatar.component';
import { ModalComponent } from '../../../shared/components/modal.component';
import { InvitationEventView, InvitationOrganizer } from '../invitation.models';

/**
 * Bloco 14 — "Organização": cartão com os avatares e um sheet de leitura
 * com responsável primeiro e depois gestores, cada um com E-mail e
 * WhatsApp quando há contacto. Membros nunca aparecem (o back só devolve
 * responsável e gestores). Num evento de comunidade mostra a comunidade.
 */
@Component({
  selector: 'app-invitation-organizers',
  imports: [RouterLink, FaIconComponent, AvatarComponent, ModalComponent],
  template: `
    @if (organizers().length) {
      <section class="flex items-center gap-3 rounded-4xl border border-line bg-surface p-4 shadow-card" data-testid="invitation-organizers">
        <div class="flex -space-x-2">
          @for (organizer of organizers().slice(0, 4); track $index) {
            <app-avatar [name]="organizer.name" [imageUrl]="organizer.avatarUrl" size="sm" />
          }
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-ink">{{ i18n.t('block14.organizers.title') }}</p>
          <p class="truncate text-xs text-muted">{{ event().community?.name || organizers()[0]?.name }}</p>
        </div>
        <button type="button" class="ui-btn-secondary" data-testid="invitation-organizers-open" (click)="open.set(true)">
          {{ i18n.t('block14.organizers.open') }}
        </button>
      </section>

      <app-modal [open]="open()" presentation="sheet" [title]="i18n.t('block14.organizers.title')" (closed)="open.set(false)">
        <div class="flex flex-col gap-3">
          @if (event().community; as community) {
            <div class="flex items-center gap-3 rounded-2xl border border-line bg-surface-raised p-3">
              <app-avatar [name]="community.name" [imageUrl]="community.avatarUrl" size="sm" />
              <div class="min-w-0 flex-1">
                <p class="text-xs text-muted">{{ i18n.t('block14.organizers.community') }}</p>
                <p class="truncate text-sm font-semibold text-ink">{{ community.name }}</p>
              </div>
              @if (community.isPublic) {
                <a [routerLink]="['/comunidade', community.slug]" class="ui-btn-secondary">{{ i18n.t('block14.organizers.join') }}</a>
              }
            </div>
          }
          <ul class="flex flex-col gap-2">
            @for (organizer of organizers(); track $index) {
              <li class="flex flex-col gap-3 rounded-2xl border p-3 sm:flex-row sm:items-center" [class]="organizer.role === 'owner' ? 'border-brand/40 bg-brand/5' : 'border-line'">
                <div class="flex min-w-0 flex-1 items-center gap-3">
                  <app-avatar [name]="organizer.name" [imageUrl]="organizer.avatarUrl" size="md" />
                  <div class="min-w-0">
                    <p class="truncate text-sm font-semibold text-ink">{{ organizer.name }}</p>
                    <p class="text-xs font-semibold" [class]="organizer.role === 'owner' ? 'text-brand-strong' : 'text-muted'">
                      {{ i18n.t(organizer.role === 'owner' ? 'block14.organizers.owner' : 'block14.organizers.manager') }}
                    </p>
                  </div>
                </div>
                <div class="flex gap-2">
                  @if (organizer.email) {
                    <a class="ui-btn-secondary flex-1" [href]="'mailto:' + organizer.email">
                      <fa-icon [icon]="icons['envelope']" aria-hidden="true" />
                      {{ i18n.t('block14.organizers.email') }}
                    </a>
                  }
                  @if (whatsapp(organizer); as link) {
                    <a class="ui-btn-secondary flex-1" [href]="link" target="_blank" rel="noopener noreferrer">
                      <fa-icon [icon]="icons['whatsapp']" aria-hidden="true" />
                      {{ i18n.t('block14.organizers.whatsapp') }}
                    </a>
                  }
                </div>
              </li>
            }
          </ul>
        </div>
      </app-modal>
    }
  `,
})
export class InvitationOrganizersComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;

  readonly event = input.required<InvitationEventView>();
  protected readonly open = signal(false);
  protected readonly organizers = computed(() => this.event().organizers);

  /** `wa.me` só com dígitos; números de 9 dígitos assumem Angola (+244). */
  protected whatsapp(organizer: InvitationOrganizer): string | null {
    const digits = (organizer.phone ?? '').replace(/\D/g, '');
    if (digits.length < 9) return null;
    return `https://wa.me/${digits.length === 9 ? `244${digits}` : digits}`;
  }
}
