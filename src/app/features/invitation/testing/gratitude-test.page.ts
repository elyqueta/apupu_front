import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { GratitudeInvitationComponent } from '../parts/gratitude-invitation.component';
import { InvitationEventView } from '../invitation.models';
import { DEFAULT_MANIFEST, TemplateManifest } from '../../../core/models/template-manifest';

function baseEvent(overrides: Partial<InvitationEventView> = {}): InvitationEventView {
  return {
    id: 'evt-test',
    title: 'Gratitude',
    type: 'other',
    hostName: 'Igreja Cristã Reino-Church',
    hostEmail: 'host@example.com',
    hostPhone: null,
    hostAvatarUrl: null,
    startsAt: '2026-12-20T14:00:00.000Z',
    endsAt: null,
    rsvpDeadline: null,
    timezone: 'Africa/Luanda',
    venue: 'Igreja Cristã Reino Church',
    address: 'Luanda',
    city: 'Luanda',
    onlineLink: null,
    message: '',
    rules: '',
    dressCode: '',
    coverUrl: null,
    templateId: null,
    templateSlug: 'gratitude',
    status: 'published',
    contributionEnabled: false,
    bankDetails: null,
    youtubeVideoId: null,
    organizers: [],
    community: null,
    latitude: null,
    longitude: null,
    placeLabel: null,
    placeName: null,
    manifest: DEFAULT_MANIFEST,
    ...overrides,
  } as InvitationEventView;
}

const CASES: Record<string, { event: Partial<InvitationEventView>; manifest: Partial<TemplateManifest> }> = {
  a: { event: { title: 'Gratitude', dressCode: '' }, manifest: { pdf: { ...DEFAULT_MANIFEST.pdf, logo_url: null as unknown as TemplateManifest['pdf']['logo_url'] } } },
  b: { event: { title: 'Gratitude', dressCode: '' }, manifest: { pdf: { ...DEFAULT_MANIFEST.pdf, logo_url: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', logo_shape: 'circle', logo_size: 'md' } } },
  c: { event: { title: 'Gratitude', dressCode: 'Traje africano' }, manifest: { pdf: { ...DEFAULT_MANIFEST.pdf, logo_url: null as unknown as TemplateManifest['pdf']['logo_url'] } } },
  d: {
    event: { title: 'Gratitude', dressCode: 'Traje africano', venue: 'Igreja Cristã Reino Church, Bairro Central, Talatona, Luanda' },
    manifest: { pdf: { ...DEFAULT_MANIFEST.pdf, logo_url: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', logo_shape: 'circle', logo_size: 'md' } } },
  // Long-title fixture: the title must step down in font size, not be squeezed.
  e: {
    event: { title: 'O nosso dia especial', dressCode: '' },
    manifest: { pdf: { ...DEFAULT_MANIFEST.pdf, logo_url: null as unknown as TemplateManifest['pdf']['logo_url'] } } },
};

@Component({
  selector: 'app-gratitude-test-page',
  standalone: true,
  imports: [GratitudeInvitationComponent],
  styles: [`
    :host ::ng-deep .poster { width: 1024px !important; max-width: 1024px !important; height: 1280px !important; aspect-ratio: auto !important; border-radius: 0 !important; }
  `],
  template: `
    <div style="margin:0;background:#eee;width:1024px;height:1280px;overflow:hidden;">
      <app-gratitude-invitation [event]="event()" [manifest]="manifest()" />
    </div>
  `,
})
export class GratitudeTestPage {
  private readonly route = inject(ActivatedRoute);
  private readonly caseId = computed(() => this.route.snapshot.paramMap.get('case') ?? this.route.snapshot.queryParamMap.get('case') ?? 'a');
  readonly event = computed(() => baseEvent((CASES[this.caseId()] ?? CASES['a']).event));
  readonly manifest = computed(() => ({ ...DEFAULT_MANIFEST, ...(CASES[this.caseId()] ?? CASES['a']).manifest } as TemplateManifest));
}
