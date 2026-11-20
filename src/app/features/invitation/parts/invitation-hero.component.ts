import { Component, computed, inject, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslationKey } from '../../../core/i18n/translations';
import { EVENT_TYPE_ICONS, ICONS } from '../../../core/ui/icons';
import { TemplateArtworkComponent } from '../../../shared/components/template-artwork.component';
import { InvitationEventView } from '../invitation.models';

/** Capa, título, tipo e anfitrião: sempre visíveis ao abrir o convite. */
@Component({
  selector: 'app-invitation-hero',
  imports: [FaIconComponent, TemplateArtworkComponent],
  template: `
    <article class="overflow-hidden rounded-4xl border border-line bg-surface shadow-card">
      @if (event().coverUrl; as cover) {
        <button
          type="button"
          class="group/cover relative block h-56 w-full overflow-hidden text-left sm:h-72"
          [attr.aria-label]="i18n.t('common.expandImage') + ': ' + event().title"
          (click)="coverOpen.emit()"
        >
          <img
            [src]="cover"
            [alt]="event().title"
            class="size-full object-cover transition duration-500 group-hover/cover:scale-[1.02]"
          />
          <span
            class="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/25 to-transparent"
          ></span>
          <span
            class="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-1 p-5 text-white sm:p-6"
          >
            <span class="text-xs font-semibold uppercase tracking-[0.18em] text-white/85">
              {{ i18n.t('invitation.hostedBy', { name: event().hostName }) }}
            </span>
            <span class="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              {{ event().title }}
            </span>
          </span>
        </button>
      } @else {
        <app-template-artwork
          [templateId]="event().templateId"
          variant="hero"
          [title]="event().title"
          [subtitle]="i18n.t('invitation.hostedBy', { name: event().hostName })"
          class="block h-56 sm:h-72"
        />
      }

      <div class="flex flex-wrap items-end justify-between gap-4 p-5 sm:p-6">
        <div class="min-w-0">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-brand-strong">
            {{ i18n.t('invitation.youAreInvited') }}
          </p>
          <h1 class="mt-1 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {{ i18n.t('invitation.guestGreeting', { name: guestName() }) }}
          </h1>
          @if (typeLabel()) {
            <p class="mt-2 inline-flex items-center gap-2 text-sm text-muted">
              <fa-icon [icon]="typeIcon()" aria-hidden="true" />
              {{ typeLabel() }}
            </p>
          }
        </div>

        <div class="flex flex-wrap items-center gap-3">
          @if (countdownDays() > 0) {
            <div class="rounded-2xl border border-line bg-surface-raised px-4 py-2 text-center">
              <p class="text-xs font-semibold text-muted">{{ i18n.t('invitation.countdown') }}</p>
              <p class="font-display text-2xl font-semibold leading-tight text-ink">
                {{ countdownDays() }}
                <span class="text-xs font-medium text-muted">{{ i18n.t('common.days') }}</span>
              </p>
            </div>
          }
          <span
            class="inline-flex items-center rounded-full border border-line bg-surface-raised px-3 py-2 text-xs font-semibold text-ink"
          >
            {{ i18n.t(statusKey()) }}
          </span>
        </div>
      </div>
    </article>
  `,
})
export class InvitationHeroComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;

  readonly event = input.required<InvitationEventView>();
  readonly guestName = input('');
  readonly countdownDays = input(0);

  readonly coverOpen = output<void>();

  protected readonly typeLabel = computed(() => {
    const type = this.event().type;
    return type ? this.i18n.t(`type.${type}` as TranslationKey) : '';
  });

  protected readonly typeIcon = computed<IconDefinition>(
    () => EVENT_TYPE_ICONS[this.event().type ?? 'other'] ?? ICONS['star'],
  );

  protected readonly statusKey = computed<TranslationKey>(
    () => `status.${this.event().status}` as TranslationKey,
  );
}
