import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  createWarrantyClaim,
  updateWarrantyClaimStatus
} from '../src/controllers/warrantyClaimController.js';
import { WarrantyClaim } from '../src/models/WarrantyClaim.js';
import { Equipment } from '../src/models/Equipment.js';

const request = (body = {}) => ({
  body,
  params: { id: '67b000000000000000000901' },
  user: {
    _id: '67b000000000000000000902',
    full_name: 'Kỹ thuật viên',
    code: 'KT-01',
    role: 'technician'
  },
  ip: '127.0.0.1'
});

const response = () => {
  const result = { statusCode: 200, body: null };
  return {
    result,
    status(code) {
      result.statusCode = code;
      return this;
    },
    json(body) {
      result.body = body;
      return this;
    }
  };
};

const runHandler = async (handler, req) => {
  const res = response();
  let error;
  await handler(req, res, (caught) => { error = caught; });
  if (error) throw error;
  return res.result;
};

describe('Warranty claim controller', () => {
  test('rejects a claim for equipment outside the warranty period', async () => {
    const originalFindById = Equipment.findById;
    const originalFindOne = WarrantyClaim.findOne;
    try {
      Equipment.findById = () => ({
        populate: async () => ({
          warranty_status: 'expired',
          warranty_expiry: new Date(Date.now() - 86400000),
          supplier_id: { _id: 'supplier-1', email: 'support@example.test' }
        })
      });
      WarrantyClaim.findOne = async () => null;
      const result = await runHandler(createWarrantyClaim, request({
        equipment_id: '67b000000000000000000901',
        issue_description: 'Không lên nguồn'
      }));
      assert.equal(result.statusCode, 422);
      assert.match(result.body.message, /không còn thời hạn bảo hành/i);
    } finally {
      Equipment.findById = originalFindById;
      WarrantyClaim.findOne = originalFindOne;
    }
  });

  test('rejects a claim when the supplier has no email address', async () => {
    const originalFindById = Equipment.findById;
    try {
      Equipment.findById = () => ({
        populate: async () => ({
          warranty_expiry: new Date(Date.now() + 86400000),
          supplier_id: { _id: 'supplier-1', email: '' }
        })
      });
      const result = await runHandler(createWarrantyClaim, request({
        equipment_id: '67b000000000000000000901',
        issue_description: 'Không lên nguồn'
      }));
      assert.equal(result.statusCode, 422);
      assert.match(result.body.message, /email hợp lệ/i);
    } finally {
      Equipment.findById = originalFindById;
    }
  });

  test('rejects a duplicate claim while another claim is active', async () => {
    const originalFindById = Equipment.findById;
    const originalFindOne = WarrantyClaim.findOne;
    try {
      Equipment.findById = () => ({
        populate: async () => ({
          _id: '67b000000000000000000901',
          code: 'EQ-01',
          name: 'Máy chiếu',
          warranty_expiry: new Date(Date.now() + 86400000),
          supplier_id: { _id: 'supplier-1', name: 'NCC', email: 'support@example.test' }
        })
      });
      WarrantyClaim.findOne = async () => ({ _id: 'existing-claim' });
      const result = await runHandler(createWarrantyClaim, request({
        equipment_id: '67b000000000000000000901',
        issue_description: 'Không lên nguồn'
      }));
      assert.equal(result.statusCode, 409);
      assert.match(result.body.message, /đang xử lý/i);
    } finally {
      Equipment.findById = originalFindById;
      WarrantyClaim.findOne = originalFindOne;
    }
  });

  test('rejects an invalid status transition without changing the claim', async () => {
    const originalFindById = WarrantyClaim.findById;
    const claim = {
      _id: 'claim-1',
      status: 'OPEN',
      status_history: [],
      save: async () => { throw new Error('Claim must not be saved'); }
    };
    try {
      WarrantyClaim.findById = async () => claim;
      const result = await runHandler(updateWarrantyClaimStatus, {
        ...request({ status: 'RESOLVED' }),
        params: { id: 'claim-1' }
      });
      assert.equal(result.statusCode, 409);
      assert.equal(claim.status, 'OPEN');
    } finally {
      WarrantyClaim.findById = originalFindById;
    }
  });
});
