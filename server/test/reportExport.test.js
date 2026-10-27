import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as exports from '../src/services/reportExport.js';

const report = { institution: 'TRƯỜNG ĐẠI HỌC RUO', title: 'BÁO CÁO TÀI SẢN',
  metadata: ['Ngày lập: 27/10/2026', 'Người lập: <Admin>'], columns: ['Mã', 'Tên', 'Nguyên giá'],
  rows: [['=1+1', 'Máy "chiếu", A\nB', 12345], [' \t@SUM(1)', '<img src=x onerror=alert(1)>', 0]] };
test('UC-8.9 CSV keeps Vietnamese, quotes/newlines and neutralizes spreadsheet formulas', () => {
  const csv = exports.renderReportCsv(report);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('TRƯỜNG ĐẠI HỌC RUO'));
  assert.ok(csv.includes('"\'=1+1"'));
  assert.ok(csv.includes('"\' \t@SUM(1)"'));
  assert.ok(csv.includes('"Máy ""chiếu"", A\nB"'));
  assert.ok(csv.includes(',12345\r\n'));
});
test('UC-8.9 printable HTML escapes every value and supports page breaks and repeated table headers', () => {
  const html = exports.renderReportHtml(report);
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(html.includes('&lt;Admin&gt;'));
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('@page'));
  assert.ok(html.includes('table-header-group'));
  assert.ok(html.includes('lang="vi"'));
  assert.ok(exports.renderReportHtml({ ...report, rows: [] }).includes('Không có dữ liệu'));
});
test('UC-8.9 validates export type, format and inventory session id', () => {
  assert.equal(exports.parseExportQuery({}).valid, true);
  for (const query of [{ format: 'pdf' }, { type: 'bad' }, { type: ['equipment'] }, { type: 'inventory' }, { type: 'inventory', sessionId: '../secret' }]) {
    assert.equal(exports.parseExportQuery(query).valid, false);
  }
  assert.equal(exports.parseExportQuery({ type: 'inventory', sessionId: 'a'.repeat(24), format: 'print' }).valid, true);
});
