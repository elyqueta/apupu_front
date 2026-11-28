import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../core/i18n/i18n.service';
import { ICONS } from '../../core/ui/icons';

/**
 * Cartão único de comunidade/instituição nas páginas públicas.
 * A descrição tem altura reservada para que todos os cartões da grelha
 * tenham o mesmo tamanho (`auto-rows-fr` nos contentores).
 */
@Component({
  selector: 'app-public-entity-card',
  imports: [RouterLink, FaIconComponent],
  template: `
    <article
      class="relative flex h-full min-w-0 flex-col rounded-4xl border border-line/40 bg-surface shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-brand/40 focus-within:border-brand/50"
      [attr.data-testid]="testId()"
    >
      <div class="relative h-32 shrink-0 overflow-hidden rounded-t-4xl bg-gradient-to-br from-brand/45 via-secondary/20 to-surface-raised">
        @if (coverUrl()) {
          <img [src]="coverUrl()" alt="" class="size-full object-cover" loading="lazy" />
        } @else {
          <span class="absolute -right-6 -top-8 size-32 rounded-full border border-white/20 bg-white/10" aria-hidden="true"></span>
          <span class="absolute -bottom-14 left-10 size-32 rounded-full border border-white/15 bg-white/5" aria-hidden="true"></span>
        }
        <span class="absolute right-3 top-3 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-ink">
          {{ badgeLabel() }}
        </span>
      </div>
      <!-- Irmão da capa: o overflow da capa não pode cortar as iniciais. -->
      <span
        class="relative z-10 -mt-7 ml-4 grid size-14 place-items-center overflow-hidden rounded-2xl border-4 border-surface bg-surface-raised text-lg font-semibold text-brand-strong shadow-card"
      >
        @if (avatarUrl()) {
          <img [src]="avatarUrl()" alt="" class="size-full object-cover" />
        } @else if (kind() === 'community') {
          {{ initials() }}
        } @else {
          <fa-icon [icon]="icons['bank']" aria-hidden="true" />
        }
      </span>

      <div class="flex flex-1 flex-col gap-2 px-4 pb-4 pt-2">
        <h3 class="line-clamp-2 min-h-11 break-words font-display text-base font-semibold leading-snug text-ink">
          {{ name() }}
        </h3>
        <p class="line-clamp-2 min-h-10 break-words text-xs leading-5 text-muted">
          {{ description() || '—' }}
        </p>
        <div class="flex min-w-0 items-center gap-2 border-t border-line/40 pt-3 text-xs font-semibold text-muted">
          <span class="grid size-8 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand-strong">
            <fa-icon [icon]="icons[kind() === 'community' ? 'guestGroup' : 'bank']" aria-hidden="true" />
          </span>
          <span class="min-w-0 break-words">{{ countLabel() }}</span>
        </div>
        <a
          [routerLink]="path()"
          class="ui-btn mt-auto min-h-11 w-full shrink-0 justify-center whitespace-nowrap"
          [attr.aria-label]="i18n.t('common.view') + ': ' + name()"
        >
          {{ i18n.t('common.view') }}
          <fa-icon [icon]="icons['chevronRight']" class="text-xs" aria-hidden="true" />
        </a>
      </div>
    </article>
  `,
})
export class PublicEntityCardComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;

  readonly kind = input.required<'community' | 'institution'>();
  readonly name = input.required<string>();
  readonly slug = input.required<string>();
  readonly description = input<string | null>(null);
  readonly avatarUrl = input<string | null>(null);
  readonly coverUrl = input<string | null>(null);
  readonly count = input.required<number>();

  protected readonly initials = computed(() =>
    (this.name() || '?')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join(''),
  );
  protected readonly badgeLabel = computed(() =>
    this.kind() === 'community'
      ? this.i18n.t('block12.feed.public')
      : this.i18n.t('block13.feed.institution'),
  );
  protected readonly countLabel = computed(() =>
    this.kind() === 'community'
      ? this.i18n.plural(this.count(), 'plural.member.one', 'plural.member.many')
      : this.i18n.plural(this.count(), 'plural.community.one', 'plural.community.many'),
  );
  protected readonly path = computed(() =>
    this.kind() === 'community' ? ['/comunidade', this.slug()] : ['/instituicoes', this.slug()],
  );
  protected readonly testId = computed(() =>
    this.kind() === 'community'
      ? `feed-community-${this.slug()}`
      : `feed-institution-${this.slug()}`,
  );
}
