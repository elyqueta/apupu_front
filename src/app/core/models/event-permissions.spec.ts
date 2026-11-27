import {
  communityMemberPermissions,
  eventPermissionsFor,
  hostPermissions,
  managerPermissions,
} from './models';

describe('event permissions', () => {
  it('dá ao anfitrião todas as ações do contrato', () => {
    expect(hostPermissions()).toEqual({
      canEditEvent: true,
      canManageGuests: true,
      canManageTeams: true,
      canManageManagers: true,
      canExport: true,
      canCancelEvent: true,
      canChangeEventStatus: true,
      canEditExistingGuests: true,
      canDeleteActivity: true,
      canManageTasks: true,
      canResendManageLink: true,
    });
  });

  it('limita o gestor ao que o contrato e o middleware permitem', () => {
    const permissions = managerPermissions();

    expect(permissions.canEditEvent).toBe(true);
    expect(permissions.canManageGuests).toBe(true);
    expect(permissions.canManageTeams).toBe(false);
    expect(permissions.canManageManagers).toBe(false);
    expect(permissions.canExport).toBe(false);
    expect(permissions.canCancelEvent).toBe(false);
    expect(permissions.canChangeEventStatus).toBe(false);
    expect(permissions.canEditExistingGuests).toBe(false);
    expect(permissions.canDeleteActivity).toBe(false);
    expect(permissions.canManageTasks).toBe(false);
    expect(permissions.canResendManageLink).toBe(false);
  });

  it('permite que o membro da comunidade adicione convidados e exporte', () => {
    const permissions = communityMemberPermissions();

    expect(permissions.canManageGuests).toBe(true);
    expect(permissions.canExport).toBe(true);
    expect(permissions.canEditEvent).toBe(false);
    expect(permissions.canManageTeams).toBe(false);
    expect(permissions.canManageManagers).toBe(false);
    expect(permissions.canCancelEvent).toBe(false);
    expect(permissions.canEditExistingGuests).toBe(false);
  });

  it('trata access_role=host como anfitrião e o resto como gestor', () => {
    expect(managerPermissions({ accessRole: 'host' })).toEqual(hostPermissions());
    expect(eventPermissionsFor('host')).toEqual(hostPermissions());
    expect(eventPermissionsFor('manager')).toEqual(managerPermissions());
    expect(eventPermissionsFor('communityMember')).toEqual(communityMemberPermissions());
    expect(managerPermissions({ accessRole: null })).toEqual(managerPermissions());
  });
});
