import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ApiError } from '../api/api-error';
import { I18nService } from './i18n.service';
import {
  isTeamForbidden,
  isTeamNotFound,
  teamErrorKey,
  teamErrorMessage,
} from './team-errors';

const TECHNICAL_CODES = [
  'task_complete_forbidden',
  'task_edit_forbidden',
  'task_not_found',
  'member_has_open_tasks',
  'team_has_open_tasks',
  'host_member_immutable',
  'too_many_emails',
  'invite_cooldown',
  'invite_send_limit',
  'invite_email_rate_limited',
  'invite_host_rate_limited',
  'invite_rate_limited',
  'invite_not_possible',
  'invite_expired',
  'invite_already_accepted',
  'invite_not_found',
  'team_not_found',
  'team_action_forbidden',
  'team_name_conflict',
  'team_member_not_found',
  'member_already_active',
  'member_without_email',
  'unexpected_error',
  'network_error',
];

describe('team error messages', () => {
  let i18n: I18nService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
    });
    i18n = TestBed.inject(I18nService);
  });

  function error(code: string, status = 400): ApiError {
    return new ApiError(status, code, code);
  }

  it('maps each required API code to a specific i18n key', () => {
    expect(teamErrorKey(error('task_complete_forbidden'))).toBe(
      'errors.taskCompleteForbidden',
    );
    expect(teamErrorKey(error('member_has_open_tasks'))).toBe('errors.memberHasOpenTasks');
    expect(teamErrorKey(error('team_has_open_tasks'))).toBe('errors.teamHasOpenTasks');
    expect(teamErrorKey(error('host_member_immutable'))).toBe('errors.hostMemberImmutable');
    expect(teamErrorKey(error('too_many_emails'))).toBe('errors.tooManyEmails');
    expect(teamErrorKey(error('invite_cooldown'))).toBe('errors.inviteCooldown');
    expect(teamErrorKey(error('invite_send_limit'))).toBe('errors.inviteSendLimit');
    expect(teamErrorKey(error('invite_email_rate_limited'))).toBe(
      'errors.inviteEmailRateLimited',
    );
    expect(teamErrorKey(error('invite_host_rate_limited'))).toBe(
      'errors.inviteHostRateLimited',
    );
    expect(teamErrorKey(error('invite_not_possible'))).toBe('errors.inviteNotPossible');
  });

  it('falls back to a generic message for unknown codes', () => {
    expect(teamErrorKey(error('qualquer_coisa_nova'))).toBe('errors.generic');
    expect(teamErrorMessage(i18n, error('qualquer_coisa_nova'))).toBe(
      i18n.t('errors.generic'),
    );
  });

  it('names the assignee when completing a task is not allowed', () => {
    expect(teamErrorMessage(i18n, error('task_complete_forbidden'), { name: 'Ana' })).toBe(
      'Só Ana pode concluir esta tarefa.',
    );
    expect(teamErrorMessage(i18n, error('task_complete_forbidden'))).toBe(
      i18n.t('errors.taskCompleteForbiddenGeneric'),
    );
  });

  it('never leaks the technical code into the visible message', () => {
    for (const code of TECHNICAL_CODES) {
      const message = teamErrorMessage(i18n, error(code));
      expect(message.length).toBeGreaterThan(0);
      expect(message).not.toContain(code);
      expect(message).not.toMatch(/_/);
    }
  });

  it('translates the invite and member messages into pt-PT', () => {
    expect(teamErrorMessage(i18n, error('too_many_emails'))).toContain('50');
    expect(teamErrorMessage(i18n, error('invite_not_possible'))).toBe(
      'Não foi possível convidar este e-mail.',
    );
    expect(teamErrorMessage(i18n, error('member_has_open_tasks'))).toContain('Reatribui');
    expect(teamErrorMessage(i18n, error('team_has_open_tasks'))).toContain('equipa');
  });

  it('treats 404 and 403 as missing access / forbidden', () => {
    expect(isTeamNotFound(error('team_not_found', 404))).toBe(true);
    expect(isTeamNotFound(error('qualquer', 404))).toBe(true);
    expect(isTeamNotFound(error('team_not_found', 400))).toBe(true);
    expect(isTeamNotFound(error('qualquer', 400))).toBe(false);

    expect(isTeamForbidden(error('team_action_forbidden', 403))).toBe(true);
    expect(isTeamForbidden(error('qualquer', 403))).toBe(true);
    expect(isTeamForbidden(error('qualquer', 400))).toBe(false);
  });
});
