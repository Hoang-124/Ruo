import { test } from 'node:test';
import assert from 'node:assert/strict';
import sparePartRoutes from '../src/routes/sparePartRoutes.js';
import partsRequestRoutes from '../src/routes/partsRequestRoutes.js';
import { DEFAULT_CANONICAL_ROLES } from '../src/controllers/roleController.js';

const cases = [
  [sparePartRoutes, '/forecast', 'get', 'spare_part:update'],
  [sparePartRoutes, '/', 'post', 'spare_part:update'],
  [sparePartRoutes, '/:id', 'put', 'spare_part:update'],
  [sparePartRoutes, '/:id', 'delete', 'spare_part:update'],
  [sparePartRoutes, '/:id/stock', 'put', 'spare_part:update'],
  [sparePartRoutes, '/requests', 'post', 'parts:request'],
  [sparePartRoutes, '/requests/:id/approve', 'put', 'parts:approve'],
  [sparePartRoutes, '/requests/:id/reject', 'put', 'parts:approve'],
  [partsRequestRoutes, '/', 'post', 'parts:request'],
  [partsRequestRoutes, '/:id/approve', 'put', 'parts:approve'],
  [partsRequestRoutes, '/:id/reject', 'put', 'parts:approve']
];

for (const [router, path, method, permission] of cases) {
  test(`${method} ${path}: explicit matrix revocation blocks all authorized roles`, async () => {
    const route = router.stack.find(layer => layer.route?.path === path && layer.route.methods[method]).route;
    const guards = route.stack.slice(0, -1).map(layer => layer.handle).filter(handle => handle.name !== 'protect');
    for (const role of ['facility_manager', 'admin']) {
      for (const granted of [false, true]) {
        const req = { user: { role }, userPermissions: granted ? [permission] : [], userPermissionsFromDb: true };
        const res = { status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; } };
        let allowed = true;
        for (const guard of guards) {
          let next = false;
          await guard(req, res, () => { next = true; });
          if (!next) { allowed = false; break; }
        }
        assert.equal(allowed, granted);
        if (!granted) assert.equal(res.statusCode, 403);
      }
    }
  });
}

test('new canonical roles preserve intended manager/admin stock capabilities', () => {
  for (const role of ['facility_manager', 'admin']) {
    for (const permission of ['parts:request', 'parts:approve', 'spare_part:update']) {
      assert.ok(DEFAULT_CANONICAL_ROLES[role].permissions.includes(permission));
    }
  }
});
