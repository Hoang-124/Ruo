import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  DEFAULT_NOTIFICATION_TEMPLATES,
  interpolateTemplate,
  extractPlaceholders
} from '../src/controllers/adminConfigController.js';

describe('UC-9.4 Template Config - Standardized Placeholders & Interpolation Engine', () => {
  test('interpolateTemplate accurately replaces {{userName}} and {{equipmentName}}', () => {
    const rawTemplate = 'Kính gửi {{userName}}, thiết bị {{equipmentName}} tại phòng {{roomCode}} đã sẵn sàng.';
    const variables = {
      userName: 'Lê Thị Uyên',
      equipmentName: 'Máy Chiếu Sony Laser 4K',
      roomCode: 'P302'
    };

    const result = interpolateTemplate(rawTemplate, variables);
    assert.strictEqual(
      result,
      'Kính gửi Lê Thị Uyên, thiết bị Máy Chiếu Sony Laser 4K tại phòng P302 đã sẵn sàng.'
    );
  });

  test('interpolateTemplate supports bidirectional camelCase and snake_case aliases', () => {
    // Template uses camelCase, variables object provides snake_case
    const templateWithCamel = 'Xin chào {{userName}}, sự cố {{ticketCode}} trên {{equipmentName}} đang xử lý.';
    const snakeVariables = {
      user_name: 'Nguyễn Văn Minh',
      ticket_code: 'TK-2026-999',
      equipment_name: 'Máy In HP LaserJet Pro'
    };

    const out1 = interpolateTemplate(templateWithCamel, snakeVariables);
    assert.strictEqual(
      out1,
      'Xin chào Nguyễn Văn Minh, sự cố TK-2026-999 trên Máy In HP LaserJet Pro đang xử lý.'
    );

    // Template uses snake_case, variables object provides camelCase
    const templateWithSnake = 'Thông báo: {{user_name}} phụ trách {{equipment_name}}.';
    const camelVariables = {
      userName: 'Trần Kỹ Thuật',
      equipmentName: 'Micro AKG Không Dây'
    };

    const out2 = interpolateTemplate(templateWithSnake, camelVariables);
    assert.strictEqual(out2, 'Thông báo: Trần Kỹ Thuật phụ trách Micro AKG Không Dây.');
  });

  test('extractPlaceholders extracts unique placeholder tags from template string', () => {
    const templateStr = 'Gửi {{userName}}, thiết bị {{equipmentName}} ({{equipmentCode}}) tại {{roomCode}}. Xác nhận lại {{userName}}.';
    const tags = extractPlaceholders(templateStr);

    assert.deepStrictEqual(tags.sort(), ['equipmentCode', 'equipmentName', 'roomCode', 'userName'].sort());
  });

  test('DEFAULT_NOTIFICATION_TEMPLATES includes standardized keys and {{userName}}/{{equipmentName}} variables', () => {
    assert.ok(DEFAULT_NOTIFICATION_TEMPLATES.repair_assigned, 'repair_assigned template must exist');
    assert.ok(DEFAULT_NOTIFICATION_TEMPLATES.approval_request, 'approval_request template must exist');
    assert.ok(DEFAULT_NOTIFICATION_TEMPLATES.deadline_overdue, 'deadline_overdue template must exist');
    assert.ok(DEFAULT_NOTIFICATION_TEMPLATES.password_reset, 'password_reset template must exist');
    assert.ok(DEFAULT_NOTIFICATION_TEMPLATES.disposal_proposal, 'disposal_proposal template must exist');

    const repairTags = DEFAULT_NOTIFICATION_TEMPLATES.repair_assigned.availableVariables.map((v) => v.tag);
    assert.ok(repairTags.includes('{{userName}}'), 'repair_assigned must declare {{userName}}');
    assert.ok(repairTags.includes('{{equipmentName}}'), 'repair_assigned must declare {{equipmentName}}');

    const disposalTags = DEFAULT_NOTIFICATION_TEMPLATES.disposal_proposal.availableVariables.map((v) => v.tag);
    assert.ok(disposalTags.includes('{{userName}}'), 'disposal_proposal must declare {{userName}}');
    assert.ok(disposalTags.includes('{{equipmentName}}'), 'disposal_proposal must declare {{equipmentName}}');
  });
});
