export const EQUIPMENT_STATUS_LABELS = { in_use: 'Đang sử dụng', in_stock: 'Trong kho', broken: 'Hỏng',
  repairing: 'Đang sửa chữa', pending_disposal: 'Chờ thanh lý', disposed: 'Đã thanh lý', lost: 'Thất lạc' };
export const INVENTORY_STATUS_LABELS = { matched: 'Khớp', wrong_location: 'Sai vị trí', damaged: 'Hư hỏng', missing: 'Thiếu', unscanned: 'Chưa kiểm tra' };

export const parseExportQuery = (query = {}) => {
  const type = query.type ?? 'equipment';
  const format = query.format ?? 'csv';
  if (!['equipment', 'inventory'].includes(type) || !['csv', 'print'].includes(format)) {
    return { valid: false, message: 'Loại báo cáo là equipment hoặc inventory; định dạng là csv hoặc print.' };
  }
  if (type === 'inventory' && (typeof query.sessionId !== 'string' || !/^[a-f\d]{24}$/i.test(query.sessionId))) {
    return { valid: false, message: 'Vui lòng chọn đợt kiểm kê hợp lệ.' };
  }
  return { valid: true, type, format, sessionId: query.sessionId };
};

const csvCell = value => {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  let text = String(value ?? '');
  // Excel interprets formula prefixes even when preceded by whitespace or control characters.
  if (/^[\s\u0000-\u001f]*[=+@-]/u.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
};
export const renderReportCsv = report => {
  const heading = [report.institution, report.title, ...report.metadata];
  const rows = [...heading.map(text => [text, ...Array(Math.max(0, report.columns.length - 1)).fill('')]),
    report.columns, ...report.rows];
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
};

const htmlEscape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
export const renderReportHtml = report => `<!doctype html>
<html lang="vi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${htmlEscape(report.title)}</title><style>
@page { size: A4 landscape; margin: 12mm; }
* { box-sizing: border-box; } body { margin: 0; padding: 24px; font: 12px/1.5 Arial, sans-serif; color: #172033; background: white; }
header { border-bottom: 2px solid #1f3a52; margin-bottom: 18px; padding-bottom: 12px; }
.institution { font-weight: bold; letter-spacing: .05em; } h1 { font-size: 21px; margin: 8px 0; } p { margin: 4px 0; }
table { border-collapse: collapse; width: 100%; table-layout: fixed; font-size: 11px; }
thead { display: table-header-group; } th, td { padding: 7px; border: 1px solid #aeb8c4; text-align: left; overflow-wrap: anywhere; white-space: pre-wrap; }
th { background: #eef2f6; } tr { break-inside: avoid; } .signatures { display: flex; justify-content: space-around; margin-top: 28px; min-height: 90px; break-inside: avoid; }
.signatures div { text-align: center; } footer { margin-top: 16px; font-size: 10px; color: #475569; }
@media print { body { padding: 0; } th { print-color-adjust: exact; } }
</style></head><body><header><p class="institution">${htmlEscape(report.institution)}</p><h1>${htmlEscape(report.title)}</h1>
${report.metadata.map(line => `<p>${htmlEscape(line)}</p>`).join('')}</header>
<table><thead><tr>${report.columns.map(label => `<th scope="col">${htmlEscape(label)}</th>`).join('')}</tr></thead><tbody>
${report.rows.length ? report.rows.map(row => `<tr>${row.map(value => `<td>${htmlEscape(typeof value === 'number' ? value.toLocaleString('vi-VN') : value)}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${report.columns.length}">Không có dữ liệu trong phạm vi báo cáo.</td></tr>`}
</tbody></table><div class="signatures"><div><strong>Người lập báo cáo</strong><p>(Ký, ghi rõ họ tên)</p></div><div><strong>Xác nhận của đơn vị</strong><p>(Ký, ghi rõ họ tên)</p></div></div>
<footer>Ruo · Hệ thống quản lý cơ sở vật chất đại học · Số dòng: ${report.rows.length}</footer></body></html>`;
