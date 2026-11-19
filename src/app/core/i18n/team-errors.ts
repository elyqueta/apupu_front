import { ApiError } from '../api/api-error';
import { I18nService } from './i18n.service';
import { TranslationKey } from './translations';

/**
 * Mapeamento central dos códigos de erro de equipas/tarefas para chaves
 * i18n. Nenhum código técnico é mostrado ao utilizador.
 */
const TEAM_ERROR_KEYS: Record<string, TranslationKey> = {
  task_complete_forbidden: 'errors.taskCompleteForbidden',
  task_reassign_forbidden: 'errors.taskReassignForbidden',
  task_edit_forbidden: 'errors.taskEditForbidden',
  task_not_found: 'errors.taskNotFound',
  member_has_open_tasks: 'errors.memberHasOpenTasks',
  team_has_open_tasks: 'errors.teamHasOpenTasks',
  host_member_immutable: 'errors.hostMemberImmutable',
  too_many_emails: 'errors.tooManyEmails',
  invite_cooldown: 'errors.inviteCooldown',
  invite_send_limit: 'errors.inviteSendLimit',
  invite_email_rate_limited: 'errors.inviteEmailRateLimited',
  invite_host_rate_limited: 'errors.inviteHostRateLimited',
  invite_rate_limited: 'errors.inviteHostRateLimited',
  invite_not_possible: 'errors.inviteNotPossible',
  invite_not_created: 'errors.inviteNotPossible',
  invite_not_active: 'errors.inviteNotPossible',
  invite_revoked: 'errors.inviteNotPossible',
  invite_expired: 'errors.inviteExpired',
  invite_already_accepted: 'errors.inviteAlreadyAccepted',
  invite_not_found: 'errors.inviteNotFound',
  team_not_found: 'errors.teamNotFound',
  team_action_forbidden: 'errors.teamActionForbidden',
  team_name_conflict: 'errors.teamNameConflict',
  team_member_not_found: 'errors.teamMemberNotFound',
  member_already_active: 'errors.memberAlreadyActive',
  member_without_email: 'errors.memberWithoutEmail',
};

export function teamErrorKey(error: ApiError): TranslationKey {
  return TEAM_ERROR_KEYS[error.code] ?? 'errors.generic';
}

/**
 * Mensagem pt-PT/EN para um erro de equipas.
 *
 * `task_complete_forbidden` usa o nome do responsável quando a página o
 * conhece; sem nome, cai na variante genérica.
 */
export function teamErrorMessage(
  i18n: I18nService,
  error: ApiError,
  params: Record<string, string | number> = {},
): string {
  if (error.code === 'task_complete_forbidden' && !params['name']) {
    return i18n.t('errors.taskCompleteForbiddenGeneric');
  }
  return i18n.t(teamErrorKey(error), params);
}

/** `true` quando o erro significa que a equipa não existe ou está fora do acesso. */
export function isTeamNotFound(error: ApiError): boolean {
  return error.status === 404 || error.code === 'team_not_found';
}

/** `true` quando o erro significa falta de permissão para gerir a equipa. */
export function isTeamForbidden(error: ApiError): boolean {
  return error.status === 403 || error.code === 'team_action_forbidden';
}
