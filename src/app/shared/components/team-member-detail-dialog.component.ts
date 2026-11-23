import { Component, inject, input, output } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import { TeamMember } from '../../core/models/models';
import { AvatarComponent } from './avatar.component';
import { ModalComponent } from './modal.component';

/**
 * Leitura rápida de um membro a partir dos cartões de equipa.
 *
 * Os dados vêm sempre de `GET /host/teams/:id/members`, que já aplica as
 * regras de acesso do backend; o sheet não acrescenta nem expõe campos que a
 * API não tenha devolvido. A foto vem da pré-visualização da equipa (o DTO
 * completo do membro não a inclui), com iniciais como fallback.
 */
@Component({
  selector: 'app-team-member-detail-dialog',
  imports: [AvatarComponent, ModalComponent],
  template: `
    <app-modal
      [open]="open()"
      [title]="i18n.t('block9.team.memberTitle')"
      presentation="sheet"
      size="md"
      (closed)="closed.emit()"
    >
      <div data-testid="team-member-detail" class="flex flex-col gap-4">
        @if (loading()) {
          <p class="text-sm text-muted">{{ i18n.t('common.loading') }}</p>
        } @else if (member(); as value) {
          <div class="flex items-center gap-3">
            <app-avatar
              [name]="memberName(value)"
              [imageUrl]="avatarUrl()"
              size="lg"
            />
            <div class="min-w-0">
              <p class="text-base font-semibold text-ink">{{ memberName(value) }}</p>
              <p class="text-xs text-muted">{{ i18n.t(roleLabel(value.role)) }}</p>
            </div>
          </div>

          <dl class="grid gap-3 rounded-2xl border border-line bg-surface-raised/40 p-4 text-sm">
            <div class="flex flex-wrap items-baseline justify-between gap-2">
              <dt class="text-xs font-semibold text-muted">{{ i18n.t('block9.team.memberStatus') }}</dt>
              <dd class="text-ink">{{ i18n.t(statusLabel(value.status)) }}</dd>
            </div>
            <div class="flex flex-wrap items-baseline justify-between gap-2">
              <dt class="text-xs font-semibold text-muted">{{ i18n.t('block9.team.memberOpenTasks') }}</dt>
              <dd class="text-ink">{{ i18n.t('teamDetail.openTasksMember', { count: value.openTaskCount }) }}</dd>
            </div>
            @if (value.email) {
              <div class="flex flex-wrap items-baseline justify-between gap-2">
                <dt class="text-xs font-semibold text-muted">{{ i18n.t('common.email') }}</dt>
                <dd class="min-w-0 break-all text-right text-ink">{{ value.email }}</dd>
              </div>
            }
            @if (value.phone) {
              <div class="flex flex-wrap items-baseline justify-between gap-2">
                <dt class="text-xs font-semibold text-muted">{{ i18n.t('common.phone') }}</dt>
                <dd class="text-ink">{{ value.phone }}</dd>
              </div>
            }
            @if (!value.email && !value.phone) {
              <p class="text-xs text-muted">{{ i18n.t('block9.team.memberNoContact') }}</p>
            }
          </dl>
        } @else {
          <p class="text-sm text-muted">{{ i18n.t('block9.team.memberNotFound') }}</p>
        }
      </div>
    </app-modal>
  `,
})
export class TeamMemberDetailDialogComponent {
  readonly open = input.required<boolean>();
  readonly member = input<TeamMember | null>(null);
  readonly avatarUrl = input<string | null>(null);
  readonly loading = input(false);

  readonly closed = output<void>();

  protected readonly i18n = inject(I18nService);

  protected memberName(member: TeamMember): string {
    return member.displayName ?? this.i18n.t('teams.previewFallback');
  }

  protected roleLabel(role: TeamMember['role']): TranslationKey {
    return `teamRole.${role}` as TranslationKey;
  }

  protected statusLabel(status: TeamMember['status']): TranslationKey {
    return `teamMemberStatus.${status}` as TranslationKey;
  }
}
