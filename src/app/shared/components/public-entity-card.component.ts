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
      class="flex h-full min-w-0 flex-col overflow-hidden rounded-4xl border border-line/40 bg-surface/60 shadow-card backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-brand/40"
      [attr.data-testid]="testId()"
    >
      <div class="relative h-28 shrink-0 overflow-hidden bg-gradient-to-br from-brand/35 via-surface-raised to-surface">
        @if (coverUrl()) {
          <img [src]="coverUrl()" alt="" class="size-full object-cover" loading="lazy" />
        }
        <span
          class="absolute -bottom-6 left-4 grid size-12 place-items-center overflow-hidden rounded-2xl border-2 border-surface bg-surface-raised text-lg font-semibold text-brand-strong shadow-card"
        >
          @if (avatarUrl()) {
            <img [src]="avatarUrl()" alt="" class="size-full object-cover" />
          } @else if (kind() === 'community') {
            {{ initials() }}
          } @else {
            <fa-icon [icon]="icons['bank']" aria-hidden="true" />
          }
        </span>
      </div>

      <div class="flex flex-1 flex-col gap-2 p-4 pt-8">
        <h3 class="line-clamp-2 min-h-11 break-words font-display text-base font-semibold leading-snug text-ink">
          {{ name() }}
        </h3>
        <p class="line-clamp-2 min-h-10 break-words text-xs leading-5 text-muted">
          {{ description() || '—' }}
        </p>
        <div class="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span class="ui-chip">
            <fa-icon [icon]="icons[kind() === 'community' ? 'globe' : 'bank']" aria-hidden="true" />
            {{ badgeLabel() }}
          </span>
          <span class="break-words">{{ countLabel() }}</span>
        </div>
        <a
          [routerLink]="path()"
          class="ui-btn-secondary mt-auto min-h-11 w-full justify-center"
          [attr.aria-label]="i18n.t('common.view') + ': ' + name()"
        >
          {{ i18n.t('common.view') }}
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
