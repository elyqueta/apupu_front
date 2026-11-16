import { Component, input } from '@angular/core';

export type SkeletonVariant =
  | 'dashboard'
  | 'cards'
  | 'detail'
  | 'table'
  | 'profile'
  | 'chart'
  | 'invitation';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  template: `
    <div role="status" aria-live="polite" aria-busy="true" class="w-full">
      <span class="sr-only">A carregar…</span>
      @switch (variant()) {
        @case ('dashboard') {
          <div class="space-y-5" aria-hidden="true">
            <div class="h-8 w-56 rounded-xl bg-surface-raised motion-safe:animate-pulse"></div>
            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              @for (item of [1, 2, 3, 4]; track item) {
                <div class="h-28 rounded-3xl bg-surface-raised motion-safe:animate-pulse"></div>
              }
            </div>
            <div class="grid gap-4 xl:grid-cols-3">
              <div class="h-72 rounded-3xl bg-surface-raised motion-safe:animate-pulse xl:col-span-2"></div>
              <div class="h-72 rounded-3xl bg-surface-raised motion-safe:animate-pulse"></div>
            </div>
            <div class="h-64 rounded-3xl bg-surface-raised motion-safe:animate-pulse"></div>
          </div>
        }
        @case ('table') {
          <div class="space-y-4" aria-hidden="true">
            <div class="h-8 w-48 rounded-xl bg-surface-raised motion-safe:animate-pulse"></div>
            <div class="h-24 rounded-3xl bg-surface-raised motion-safe:animate-pulse"></div>
            <div class="overflow-hidden rounded-3xl border border-line">
              @for (item of [1, 2, 3, 4, 5, 6]; track item) {
                <div class="h-16 border-b border-line bg-surface-raised/70 motion-safe:animate-pulse last:border-0"></div>
              }
            </div>
          </div>
        }
        @case ('detail') {
          <div class="space-y-4" aria-hidden="true">
            <div class="h-60 rounded-3xl bg-surface-raised motion-safe:animate-pulse"></div>
            <div class="grid gap-4 lg:grid-cols-2">
              @for (item of [1, 2, 3, 4]; track item) {
                <div class="h-48 rounded-3xl bg-surface-raised motion-safe:animate-pulse"></div>
              }
            </div>
          </div>
        }
        @case ('profile') {
          <div class="mx-auto max-w-4xl space-y-4" aria-hidden="true">
            <div class="h-8 w-56 rounded-xl bg-surface-raised motion-safe:animate-pulse"></div>
            <div class="h-32 rounded-3xl bg-surface-raised motion-safe:animate-pulse"></div>
            <div class="h-80 rounded-3xl bg-surface-raised motion-safe:animate-pulse"></div>
          </div>
        }
        @case ('chart') {
          <div class="space-y-4" aria-hidden="true">
            <div class="h-8 w-48 rounded-xl bg-surface-raised motion-safe:animate-pulse"></div>
            <div class="grid gap-3 sm:grid-cols-3">
              @for (item of [1, 2, 3]; track item) {
                <div class="h-28 rounded-3xl bg-surface-raised motion-safe:animate-pulse"></div>
              }
            </div>
            <div class="h-80 rounded-3xl bg-surface-raised motion-safe:animate-pulse"></div>
          </div>
        }
        @case ('invitation') {
          <div class="mx-auto max-w-5xl space-y-4" aria-hidden="true">
            <div class="h-64 rounded-3xl bg-surface-raised motion-safe:animate-pulse"></div>
            <div class="grid gap-4 lg:grid-cols-2">
              @for (item of [1, 2]; track item) {
                <div class="h-60 rounded-3xl bg-surface-raised motion-safe:animate-pulse"></div>
              }
            </div>
          </div>
        }
        @default {
          <div class="space-y-4" aria-hidden="true">
            <div class="h-8 w-48 rounded-xl bg-surface-raised motion-safe:animate-pulse"></div>
            <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              @for (item of [1, 2, 3, 4, 5, 6]; track item) {
                <div class="h-56 rounded-3xl bg-surface-raised motion-safe:animate-pulse"></div>
              }
            </div>
          </div>
        }
      }
    </div>
  `,
})
export class SkeletonComponent {
  readonly variant = input<SkeletonVariant>('cards');
}
