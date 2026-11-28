/**
 * Bloco 16 — harness auto-contido para Playwright: convite Gratitude com
 * três localizações, FAB e folha de informações. Sem backend, sessão ou
 * credenciais; usa os componentes reais do convite.
 */
import { Component, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../../core/i18n/i18n.service';
import { DEFAULT_MANIFEST, normalizeManifest } from '../../../core/models/template-manifest';
import { ICONS } from '../../../core/ui/icons';
import { TemplateRendererComponent } from '../../../shared/components/template-renderer.component';
import { InvitationLocation, InvitationEventView } from '../invitation.models';
import { InvitationShellComponent } from '../invitation-shell.component';
import { InvitationInfoSheetComponent } from '../parts/invitation-info-sheet.component';

const locations: InvitationLocation[] = [
  {
    id: 'loc-civil',
    isPrimary: true,
    kind: 'venue',
    address: 'Rua São João, 12, Luanda',
    venueName: 'Cartório Central',
    label: 'Cerimónia civil',
    startsAt: '2027-08-15T14:00:00.000Z',
    city: 'Luanda',
    latitude: -8.8383334,
    longitude: 13.2344449,
    onlineUrl: null,
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=-8.838333,13.234445',
  },
  {
    id: 'loc-festa',
    isPrimary: false,
    kind: 'venue',
    address: 'Talatona, Luanda',
    venueName: 'Salão Principal',
    label: 'Recepção',
    startsAt: '2027-08-15T18:00:00.000Z',
    city: 'Luanda',
    latitude: -8.881234,
    longitude: 13.189876,
    onlineUrl: null,
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=-8.881234,13.189876',
  },
  {
    id: 'loc-online',
    isPrimary: false,
    kind: 'online',
    address: null,
    venueName: null,
    label: 'Transmissão',
    startsAt: null,
    city: null,
    latitude: null,
    longitude: null,
    onlineUrl: 'https://exemplo.ao/direto',
    mapsUrl: null,
  },
];

const data = {
  title: 'Casamento da Ana e do João',
  subtitle: 'CELEBRAÇÃO DE CASAMENTO',
  hostName: 'Ana',
  startsAt: '2027-08-15T14:00:00.000Z',
  timezone: 'Africa/Luanda',
  city: 'Luanda',
  address: 'Rua São João, 12, Luanda',
  venue: 'Cartório Central',
  templateSlug: 'gratitude',
  locations,
};

const event = {
  id: 'event-test',
  title: data.title,
  subtitle: data.subtitle,
  type: 'wedding',
  hostName: 'Ana',
  hostEmail: 'ana@exemplo.ao',
  hostPhone: null,
  hostAvatarUrl: null,
  startsAt: data.startsAt,
  endsAt: null,
  rsvpDeadline: null,
  timezone: data.timezone,
  venue: data.venue,
  address: data.address,
  city: data.city,
  onlineLink: null,
  message: 'Celebramos juntos.',
  rules: 'Traje formal.',
  dressCode: 'Traje africano',
  coverUrl: null,
  templateId: null,
  status: 'published',
  contributionEnabled: false,
  bankDetails: null,
  youtubeVideoId: null,
  latitude: locations[0]!.latitude,
  longitude: locations[0]!.longitude,
  placeLabel: null,
  placeName: null,
  locations,
  organizers: [],
  community: null,
  manifest: normalizeManifest({
    ...DEFAULT_MANIFEST,
    ornaments: { ...DEFAULT_MANIFEST.ornaments, frame: 'gratitude' },
    orientation: 'card45',
    open_style: 'none',
  }),
  templateSlug: 'gratitude',
} as InvitationEventView;

@Component({
  selector: 'app-invitation-test-page',
  standalone: true,
  imports: [InvitationShellComponent, TemplateRendererComponent, InvitationInfoSheetComponent, FaIconComponent],
  template: `
    <app-invitation-shell [manifest]="event.manifest" style="--inv-rsvp-bar: 5rem">
      <main class="mx-auto w-full max-w-5xl px-4 py-5" data-testid="invitation-main">
        <app-template-renderer [manifest]="event.manifest" [data]="data" mode="full" />
      </main>
      <button
        type="button"
        class="inv-fab"
        data-testid="inv-fab"
        aria-haspopup="dialog"
        [attr.aria-expanded]="sheetOpen()"
        [attr.aria-label]="i18n.t('block16.moreInfo')"
        (click)="sheetOpen.set(true)"
      >
        <fa-icon [icon]="icons['info']" aria-hidden="true" />
        <span class="max-sm:hidden">{{ i18n.t('block16.moreInfo') }}</span>
      </button>
      <div
        class="fixed inset-x-0 bottom-0 z-40 border-t inv-line inv-surface px-4 pb-3 pt-2 lg:hidden"
        data-testid="inv-rsvp-bar"
      >
        <div class="mx-auto flex w-full max-w-5xl gap-3">
          <button type="button" class="inv-btn min-h-12 flex-1" data-testid="inv-bar-accept">
            {{ i18n.t('invitation.going') }}
          </button>
          <button type="button" class="inv-btn-secondary min-h-12 flex-1" data-testid="inv-bar-decline">
            {{ i18n.t('invitation.notGoing') }}
          </button>
        </div>
      </div>
      <app-invitation-info-sheet
        [open]="sheetOpen()"
        [event]="event"
        [token]="'teste'"
        (closed)="sheetOpen.set(false)"
      />
    </app-invitation-shell>
  `,
})
export class InvitationTestPage {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  protected readonly event = event;
  protected readonly data = data;
  protected readonly sheetOpen = signal(false);
}
