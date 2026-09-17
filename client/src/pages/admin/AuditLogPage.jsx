import React, { useState } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { AUDIT_LOGS } from '../../mock/mockData';

export const AuditLogPage = () => {
  const [logs] = useState(AUDIT_LOGS);
  const [selectedLog, setSelectedLog] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');

  const filteredLogs = logs.filter(l =>
    l.user.toLowerCase().includes(searchFilter.toLowerCase()) ||
    l.action.toLowerCase().includes(searchFilter.toLowerCase()) ||
    l.target.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Nhật Ký Kiểm Toán Hệ Thống (Immutable Audit Log)</h1>
          <div className="page-subtitle">
            Cơ chế ghi một chiều (Append-only) lưu vết vĩnh viễn: Ai, làm gì, lúc nào, địa chỉ IP và biến động dữ liệu (Payload Diff)
          </div>
        </div>

        <div className="header-actions">
          <button className="btn btn-outline" onClick={() => alert('Đã xuất file audit_logs_2026.csv thành công!')}>
            <Icons.Download size={16} />
            <span>Xuất Báo Cáo CSV</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="card" style={{ padding: '14px 20px', marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Icons.Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: '36px' }}
            placeholder="Lọc theo người thực hiện, hành động (BOOKING_CREATE, TICKET_ASSIGN) hoặc đối tượng..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
          />
        </div>
        <span className="badge badge-success">
          <Icons.Shield size={13} /> Khóa bất biến (Tamper-proof)
        </span>
      </div>

      {/* Audit Data Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mã Log</th>
                <th>Mốc Thời Gian</th>
                <th>Người Thực Hiện</th>
                <th>Địa Chỉ IP</th>
                <th>Hành Động Hệ Thống</th>
                <th>Đối Tượng Tác Động</th>
                <th style={{ textAlign: 'right' }}>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--color-primary-700)' }}>
                    {log.id}
                  </td>
                  <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {log.timestamp}
                  </td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{log.user}</div>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                    {log.ip}
                  </td>
                  <td>
                    <span className="badge badge-primary">
                      {log.action}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{log.entity}: </span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary-600)' }}>{log.target}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => setSelectedLog(log)}
                    >
                      <Icons.Eye size={14} /> Xem Diff
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Diff Viewer Modal */}
      {selectedLog && (
        <div className="modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <div>
                <div style={{ fontWeight: 800, fontSize: '16px' }}>Biến Động Dữ Liệu: {selectedLog.id}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Hành động: {selectedLog.action} lúc {selectedLog.timestamp}
                </div>
              </div>
              <button onClick={() => setSelectedLog(null)} className="icon-btn">
                <Icons.X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ marginBottom: '14px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Payload ghi vết chi tiết (JSON Diff Snapshot):
              </div>

              <pre
                style={{
                  background: 'var(--color-gray-900)',
                  color: '#34D399',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '13px',
                  lineHeight: 1.5,
                  overflowX: 'auto'
                }}
              >
                {JSON.stringify(selectedLog.diff, null, 2)}
              </pre>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedLog(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
