import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { toApiError } from '../../core/api/api-error';
import { ApiCommunity, CommunitiesRepository } from '../../core/data/communities.repository';
import {
  ApiInstitution,
  ApiInstitutionDetail,
  ApiInstitutionRequest,
  InstitutionsRepository,
} from '../../core/data/institutions.repository';
import { I18nService } from '../../core/i18n/i18n.service';
import { ToastService } from '../../core/services/toast.service';
import { ICONS } from '../../core/ui/icons';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { ModalComponent } from '../../shared/components/modal.component';
import { SkeletonComponent } from '../../shared/components/skeleton.component';
import { InstitutionFormDialogComponent } from './institution-form-dialog.component';

type Community = ApiInstitutionDetail['communities'][number];
type PickerMode = 'invite' | 'join';

/**
 * Página de uma instituição (Bloco 13): capa + avatar, comunidades,
 * eventos agregados e, para o criador, os pedidos. Ligar ou remover uma
 * comunidade exige o código (OTP) enviado ao criador.
 */
@Component({
  selector: 'app-institution-detail-page',
  imports: [
    RouterLink,
    FormsModule,
    FaIconComponent,
    SkeletonComponent,
    ModalComponent,
    ConfirmDialogComponent,
    InstitutionFormDialogComponent,
  ],
  templateUrl: './institution-detail.page.html',
})
export class InstitutionDetailPage {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  private readonly repo = inject(InstitutionsRepository);
  private readonly communitiesRepo = inject(CommunitiesRepository);
  private readonly toasts = inject(ToastService);
  private readonly router = inject(Router);

  readonly slug = input.required<string>();

  protected readonly loading = signal(true);
  protected readonly notFound = signal(false);
  protected readonly detail = signal<ApiInstitutionDetail | null>(null);
  protected readonly institution = computed(() => this.detail()?.institution ?? null);
  protected readonly isCreator = computed(() => this.institution()?.is_creator ?? false);
  protected readonly busy = signal(false);

  protected readonly editOpen = signal(false);
  protected readonly deleteOpen = signal(false);
  protected readonly deleteName = signal('');
  protected readonly leaveTarget = signal<Community | null>(null);

  protected readonly pickerMode = signal<PickerMode | null>(null);
  protected readonly pickerLoading = signal(false);
  protected readonly pickerQuery = signal('');
  protected readonly pickerItems = signal<ApiCommunity[]>([]);
  private pickerTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly otpRequest = signal<ApiInstitutionRequest | null>(null);
  protected readonly otpCode = signal('');
  protected readonly otpError = signal('');

  /** Pedidos abertos (só o criador os recebe). */
  protected readonly requests = computed(() => this.detail()?.requests ?? []);

  constructor() {
    effect(() => {
      this.slug();
      untracked(() => void this.load());
    });
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.notFound.set(false);
    try {
      this.detail.set(await this.repo.detail(this.slug()));
    } catch {
      this.notFound.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  protected requestLabel(request: ApiInstitutionRequest): string {
    if (request.kind === 'remove') return this.i18n.t('block13.request.remove', { community: request.community_name });
    return request.direction === 'community_to_institution'
      ? this.i18n.t('block13.request.fromCommunity', { community: request.community_name })
      : this.i18n.t('block13.request.invited', { community: request.community_name });
  }

  protected requestStatus(request: ApiInstitutionRequest): string {
    if (request.status === 'awaiting_otp') return this.i18n.t('block13.request.awaitingOtp');
    if (!request.community_accepted && request.kind === 'link') return this.i18n.t('block13.request.waitingCommunity');
    return '';
  }

  protected canApprove(request: ApiInstitutionRequest): boolean {
    return request.kind === 'remove' || request.community_accepted;
  }

  protected communityLink(community: Community): string[] {
    return community.i_own || this.isCreator() ? ['/comunidades', community.slug] : ['/comunidade', community.slug];
  }

  protected eventDate(event: ApiInstitutionDetail['events'][number]): string {
    return this.i18n.dateTime(event.starts_at, event.timezone);
  }

  // —— OTP ——
  protected async approve(request: ApiInstitutionRequest): Promise<void> {
    if (request.status === 'awaiting_otp') {
      this.openOtp(request);
      return;
    }
    await this.run(async () => this.openOtp(await this.repo.approve(request.id)));
  }

  private openOtp(request: ApiInstitutionRequest): void {
    this.otpCode.set('');
    this.otpError.set('');
    this.otpRequest.set(request);
  }

  protected onOtpInput(value: string): void {
    this.otpCode.set(value.replace(/\D/g, '').slice(0, 6));
  }

  protected async confirmOtp(): Promise<void> {
    const request = this.otpRequest();
    if (!request || this.otpCode().length !== 6) {
      this.otpError.set(this.i18n.t('block13.otp.error'));
      return;
    }
    this.busy.set(true);
    this.otpError.set('');
    try {
      await this.repo.confirm(request.id, this.otpCode());
      this.otpRequest.set(null);
      this.toasts.success(this.i18n.t('block13.otp.done'));
      await this.load();
    } catch (error: unknown) {
      const apiError = toApiError(error);
      this.otpError.set(apiError.status === 422 || apiError.status === 400 ? this.i18n.t('block13.otp.error') : apiError.message || this.i18n.t('block13.common.error'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async reject(request: ApiInstitutionRequest): Promise<void> {
    await this.run(async () => {
      await this.repo.reject(request.id);
      this.toasts.success(this.i18n.t('block13.request.rejected'));
      await this.load();
    });
  }

  protected async removeCommunity(community: Community): Promise<void> {
    const institution = this.institution();
    if (!institution) return;
    await this.run(async () => this.openOtp(await this.repo.startRemoval(institution.id, community.id)));
  }

  protected async confirmLeave(): Promise<void> {
    const institution = this.institution();
    const community = this.leaveTarget();
    if (!institution || !community) return;
    this.leaveTarget.set(null);
    await this.run(async () => {
      await this.repo.leave(institution.id, community.id);
      this.toasts.success(this.i18n.t('block13.detail.left'));
      await this.load();
    });
  }

  // —— Escolher comunidade (convidar / associar) ——
  protected openPicker(mode: PickerMode): void {
    this.pickerMode.set(mode);
    this.pickerQuery.set('');
    void this.loadPicker();
  }

  protected onPickerSearch(value: string): void {
    this.pickerQuery.set(value);
    if (this.pickerTimer) clearTimeout(this.pickerTimer);
    this.pickerTimer = setTimeout(() => void this.loadPicker(), 300);
  }

  private async loadPicker(): Promise<void> {
    const mode = this.pickerMode();
    if (!mode) return;
    this.pickerLoading.set(true);
    try {
      const q = this.pickerQuery().trim() || undefined;
      const list = await this.communitiesRepo.list(mode === 'invite' ? 'discover' : 'mine', q);
      const linked = new Set((this.detail()?.communities ?? []).map((c) => c.id));
      this.pickerItems.set(list.filter((c) => !linked.has(c.id) && (mode === 'invite' || c.my_role === 'owner')));
    } catch {
      this.pickerItems.set([]);
    } finally {
      this.pickerLoading.set(false);
    }
  }

  protected async pick(community: ApiCommunity): Promise<void> {
    const institution = this.institution();
    const mode = this.pickerMode();
    if (!institution || !mode || community.institution) return;
    await this.run(async () => {
      if (mode === 'invite') await this.repo.invite(institution.id, community.id);
      else await this.repo.requestJoin(institution.id, community.id);
      this.pickerMode.set(null);
      this.toasts.success(this.i18n.t('block13.request.sent'));
      await this.load();
    });
  }

  // —— Editar / apagar ——
  protected onSaved(institution: ApiInstitution): void {
    this.editOpen.set(false);
    if (institution.slug !== this.slug()) void this.router.navigate(['/instituicoes', institution.slug]);
    else void this.load();
  }

  protected async confirmDelete(): Promise<void> {
    const institution = this.institution();
    if (!institution || this.deleteName().trim() !== institution.name) return;
    await this.run(async () => {
      await this.repo.remove(institution.id, this.deleteName().trim());
      this.deleteOpen.set(false);
      this.toasts.success(this.i18n.t('block13.detail.deleted'));
      void this.router.navigate(['/instituicoes']);
    });
  }

  private async run(action: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    try {
      await action();
    } catch (error: unknown) {
      const apiError = toApiError(error);
      this.toasts.error(apiError.status === 403 ? this.i18n.t('block13.common.forbidden') : apiError.message || this.i18n.t('block13.common.error'));
    } finally {
      this.busy.set(false);
    }
  }
}
