import assert from 'node:assert/strict';
import test from 'node:test';
import { getPermissionsForRole, resolveRolePermissions } from './rbacHelper';
import { requirePermission, requireSuperAdmin } from '../middleware/rbacMiddleware';
import { PERMISSION_CATALOG } from './permissionCatalog';

test('the permission catalog exposes one row per independently assignable right', () => {
  const codes = PERMISSION_CATALOG.map(permission => permission.code);
  assert.ok(codes.length > 30);
  assert.equal(new Set(codes).size, codes.length, 'permission codes must be unique');
  assert.ok(PERMISSION_CATALOG.every(permission => permission.module && permission.description));
});

test('an explicitly configured empty role receives no default permissions', () => {
  assert.deepEqual(resolveRolePermissions('SALES_EXECUTIVE', [], true), []);
});

test('every non-Super-Admin role starts with no fixed permissions', () => {
  for (const role of ['MANAGER', 'SALES_EXECUTIVE', 'TECHNICIAN', 'HUB_INCHARGE', 'PRE_BOOKING', 'CUSTOMER_SUPPORT', 'TEST1']) {
    assert.deepEqual(resolveRolePermissions(role, [], false), [], `${role} should start empty`);
    assert.deepEqual(getPermissionsForRole(role), [], `${role} should have no hard-coded defaults`);
  }
});

test('Super Admin keeps its full system permissions', () => {
  assert.ok(getPermissionsForRole('SUPER_ADMIN').some(permission => permission.code === 'dashboard.view'));
  assert.ok(getPermissionsForRole('SUPER_ADMIN').some(permission => permission.code === 'roles.view'));
});

test('a role with one stored grant receives only that permission', () => {
  const permissions = resolveRolePermissions(
    'MANAGER',
    [{ code: 'leads.view', scope: 'TEAM' }],
    false
  );

  assert.deepEqual(permissions, [{ code: 'leads.view', scope: 'TEAM' }]);
  assert.equal(permissions.some(permission => permission.code.startsWith('dashboard.')), false);
  assert.equal(permissions.some(permission => permission.code === 'leads.delete'), false);
});

test('explicit user overrides revoke defaults and grant only requested codes', () => {
  const permissions = resolveRolePermissions('SALES_EXECUTIVE', [], false, {
    'dashboard.view': { enabled: false },
    'reports.view': { enabled: true, scope: 'TEAM' }
  });

  assert.equal(permissions.some(permission => permission.code === 'dashboard.view'), false);
  assert.deepEqual(permissions.find(permission => permission.code === 'reports.view'), {
    code: 'reports.view',
    scope: 'TEAM'
  });
});

test('invalid permission scopes safely normalize to ALL', () => {
  const permissions = resolveRolePermissions('CUSTOM', [], true, {
    'leads.view': { enabled: true, scope: 'ROOT' }
  });

  assert.deepEqual(permissions, [{ code: 'leads.view', scope: 'ALL' }]);
});

test('role mutation guard rejects non-Super-Admin users', () => {
  let statusCode = 0;
  let reachedNext = false;
  const res: any = {
    status(code: number) { statusCode = code; return this; },
    json() { return this; }
  };

  requireSuperAdmin({ user: { roleName: 'MANAGER' } } as any, res, (() => { reachedNext = true; }) as any);
  assert.equal(statusCode, 403);
  assert.equal(reachedNext, false);
});

test('role mutation guard allows Super Admin users', () => {
  let reachedNext = false;
  const res: any = { status() { return this; }, json() { return this; } };

  requireSuperAdmin({ user: { roleName: 'SUPER_ADMIN' } } as any, res, (() => { reachedNext = true; }) as any);
  assert.equal(reachedNext, true);
});

test('module route guard accepts only the exact granted permission code', () => {
  let statusCode = 0;
  let reachedNext = false;
  const res: any = {
    status(code: number) { statusCode = code; return this; },
    json() { return this; }
  };

  requirePermission('pre_bookings.view')({
    user: { roleName: 'CUSTOM_ROLE', permissions: [{ code: 'recoveries.view', scope: 'ALL' }] }
  } as any, res, (() => { reachedNext = true; }) as any);

  assert.equal(statusCode, 403);
  assert.equal(reachedNext, false);
});

test('module route guard carries the selected permission scope forward', () => {
  let reachedNext = false;
  const req: any = { user: { roleName: 'CUSTOM_ROLE', permissions: [{ code: 'leads.view', scope: 'ASSIGNED' }] } };
  const res: any = { status() { return this; }, json() { return this; } };

  requirePermission('leads.view')(req, res, (() => { reachedNext = true; }) as any);

  assert.equal(reachedNext, true);
  assert.equal(req.permissionScope, 'ASSIGNED');
});
