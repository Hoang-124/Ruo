import { api } from './api';

function parseCsvRows(csvText, maxRows = 100) {
  const clean = String(csvText || '').replace(/^\uFEFF/, '').trim();
  if (!clean) return [];
  const lines = clean.split(/\r?\n/).slice(0, maxRows + 1);
  return lines.map((line) => {
    const cells = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        cells.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    cells.push(current);
    return cells;
  });
}

function showCsvPreviewModal({ filename, content, savedPath }) {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById('ruo-csv-export-modal');
  if (existing) existing.remove();

  const isJson = String(filename || '').toLowerCase().endsWith('.json');
  const rows = isJson ? [] : parseCsvRows(content, 80);
  const headers = rows[0] || [];
  const dataRows = rows.slice(1);

  const backdrop = document.createElement('div');
  backdrop.id = 'ruo-csv-export-modal';
  backdrop.style.cssText = [
    'position:fixed',
    'inset:0',
    'z-index:12000',
    'background:rgba(15,23,42,0.65)',
    'backdrop-filter:blur(5px)',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'padding:20px',
    'font-family:"Be Vietnam Pro",system-ui,sans-serif'
  ].join(';');

  const panel = document.createElement('div');
  panel.style.cssText = [
    'width:min(1040px, 96vw)',
    'max-height:88vh',
    'background:#ffffff',
    'color:#0f172a',
    'border-radius:16px',
    'border:1px solid #cbd5e1',
    'box-shadow:0 24px 60px rgba(15,23,42,0.35)',
    'display:flex',
    'flex-direction:column',
    'overflow:hidden'
  ].join(';');

  const colLetters = headers.map((_, idx) => {
    let n = idx;
    let s = '';
    while (n >= 0) {
      s = String.fromCharCode((n % 26) + 65) + s;
      n = Math.floor(n / 26) - 1;
    }
    return s;
  });

  const escapeHtml = (str) =>
    String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const tableHtml = isJson
    ? `<pre style="margin:0;padding:16px;background:#f8fafc;border-radius:8px;font-size:12px;overflow:auto;max-height:52vh;">${escapeHtml(content)}</pre>`
    : `
      <div style="overflow:auto;max-height:52vh;border:1px solid #cbd5e1;border-radius:10px;background:#ffffff;">
        <table style="width:100%;border-collapse:collapse;font-size:12.5px;text-align:left;">
          <thead style="position:sticky;top:0;z-index:2;">
            <tr style="background:#f1f5f9;border-bottom:1px solid #cbd5e1;color:#64748b;font-size:11px;text-align:center;">
              <th style="padding:6px 10px;border-right:1px solid #cbd5e1;width:42px;">#</th>
              ${colLetters.map((letter) => `<th style="padding:6px 10px;border-right:1px solid #cbd5e1;font-weight:700;">${letter}</th>`).join('')}
            </tr>
            <tr style="background:#166534;color:#ffffff;border-bottom:2px solid #14532d;">
              <th style="padding:9px 10px;border-right:1px solid rgba(255,255,255,0.2);text-align:center;font-weight:700;">1</th>
              ${headers.map((h) => `<th style="padding:9px 12px;border-right:1px solid rgba(255,255,255,0.2);white-space:nowrap;font-weight:700;">${escapeHtml(h)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${dataRows
              .map(
                (r, rIdx) => `
              <tr style="border-bottom:1px solid #e2e8f0;background:${rIdx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                <td style="padding:7px 10px;border-right:1px solid #e2e8f0;background:#f1f5f9;color:#64748b;font-weight:700;text-align:center;">${rIdx + 2}</td>
                ${headers
                  .map(
                    (_, cIdx) =>
                      `<td style="padding:7px 12px;border-right:1px solid #e2e8f0;color:#0f172a;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(r[cIdx] || '')}">${escapeHtml(r[cIdx] || '')}</td>`
                  )
                  .join('')}
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;

  panel.innerHTML = `
    <div style="padding:16px 22px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;background:#f8fafc;">
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="width:40px;height:40px;border-radius:10px;background:#16a34a;color:#ffffff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;">
          XLS
        </div>
        <div>
          <div style="font-size:16px;font-weight:800;color:#0f172a;">Xuất Tệp Excel / CSV Thành Công — ${escapeHtml(filename)}</div>
          <div style="font-size:12.5px;color:#15803d;font-weight:600;margin-top:2px;">
            ✔ Đã lưu trực tiếp vào máy: <code style="background:#dcfce7;padding:2px 6px;border-radius:4px;color:#166534;">${escapeHtml(savedPath || `Downloads\\${filename}`)}</code>
          </div>
        </div>
      </div>
      <button id="ruo-csv-close-top" style="border:1px solid #cbd5e1;background:#ffffff;border-radius:8px;width:34px;height:34px;cursor:pointer;font-size:16px;font-weight:700;color:#475569;">✕</button>
    </div>

    <div style="padding:16px 22px;overflow:hidden;display:flex;flex-direction:column;gap:12px;">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;font-size:12.5px;color:#475569;">
        <span>Bảng xem trước chuẩn Microsoft Excel (UTF-8 BOM • Hiển thị ${dataRows.length} dòng dữ liệu):</span>
        <span id="ruo-csv-action-status" style="color:#16a34a;font-weight:700;"></span>
      </div>
      ${tableHtml}
    </div>

    <div style="padding:14px 22px;border-top:1px solid #e2e8f0;background:#f8fafc;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
      <div style="font-size:12px;color:#64748b;">
        Mẹo: Bấm <strong>"Mở Ngay Bằng Excel"</strong> để bật trực tiếp tệp trên Windows mà không bị trình duyệt chặn tải xuống.
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        <button id="ruo-csv-copy-btn" style="padding:9px 14px;border-radius:8px;border:1px solid #cbd5e1;background:#ffffff;color:#0f172a;font-size:13px;font-weight:700;cursor:pointer;">
          Sao Chép Bảng
        </button>
        <button id="ruo-csv-folder-btn" style="padding:9px 14px;border-radius:8px;border:1px solid #0284c7;background:#f0f9ff;color:#0369a1;font-size:13px;font-weight:700;cursor:pointer;">
          Mở Thư Mục Chứa File
        </button>
        <button id="ruo-csv-excel-btn" style="padding:9px 18px;border-radius:8px;border:none;background:#16a34a;color:#ffffff;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(22,163,74,0.3);">
          Mở Ngay Bằng Excel
        </button>
      </div>
    </div>
  `;

  backdrop.appendChild(panel);
  document.body.appendChild(backdrop);

  const close = () => backdrop.remove();
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
  panel.querySelector('#ruo-csv-close-top')?.addEventListener('click', close);

  const statusEl = panel.querySelector('#ruo-csv-action-status');

  panel.querySelector('#ruo-csv-copy-btn')?.addEventListener('click', async () => {
    try {
      const tsv = rows.map((r) => r.join('\t')).join('\r\n');
      await navigator.clipboard.writeText(tsv || content);
      if (statusEl) statusEl.textContent = '✔ Đã sao chép! Bạn có thể bấm Ctrl+V vào Excel.';
    } catch {
      if (statusEl) statusEl.textContent = 'Không thể sao chép tự động.';
    }
  });

  panel.querySelector('#ruo-csv-folder-btn')?.addEventListener('click', async () => {
    try {
      if (statusEl) statusEl.textContent = 'Đang mở thư mục Downloads trên Windows...';
      await api.post('/reports/open-csv', { filename, mode: 'folder' });
      if (statusEl) statusEl.textContent = '✔ Đã mở thư mục Downloads!';
    } catch (err) {
      if (statusEl) statusEl.textContent = 'Lỗi mở thư mục: ' + (err.message || '');
    }
  });

  panel.querySelector('#ruo-csv-excel-btn')?.addEventListener('click', async () => {
    try {
      if (statusEl) statusEl.textContent = 'Đang khởi chạy Microsoft Excel...';
      await api.post('/reports/open-csv', { filename, mode: 'excel' });
      if (statusEl) statusEl.textContent = '✔ Đã mở tệp trên Windows!';
    } catch (err) {
      if (statusEl) statusEl.textContent = 'Lỗi mở tệp: ' + (err.message || '');
    }
  });
}

export async function triggerCsvDownload(csvOrBlob, filename = 'ruo_export.csv') {
  const isTestEnv = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent || '');

  // Keep synchronous DOM anchor behavior in unit tests (jsdom)
  if (isTestEnv) {
    const blob =
      csvOrBlob instanceof Blob
        ? csvOrBlob
        : new Blob([String(csvOrBlob || '')], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    return { filename, savedPath: null };
  }

  let textContent = '';
  if (csvOrBlob instanceof Blob) {
    textContent = await csvOrBlob.text();
  } else {
    textContent = String(csvOrBlob || '');
  }

  try {
    const res = await api.post('/reports/save-csv', {
      filename,
      content: textContent
    });
    if (res && res.success) {
      showCsvPreviewModal({
        filename: res.filename || filename,
        content: textContent,
        savedPath: res.savedPath
      });
      return res;
    }
  } catch {
    // Fallback if backend save-csv is unreachable
  }

  const blob =
    csvOrBlob instanceof Blob
      ? csvOrBlob
      : new Blob([textContent.startsWith('\uFEFF') ? textContent : `\uFEFF${textContent}`], {
          type: 'text/csv;charset=utf-8;'
        });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    link.remove();
    window.URL.revokeObjectURL(url);
  }, 60000);
  return { filename, savedPath: null };
}
