import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { auditApi } from '../../lib/api';
import { Button, Card, DataTable, StatusBadge, EmptyState } from '../../components/ui/Primitives';
import { useToast } from '../../context/ToastContext';

export const AuditLogPage = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [targetTableFilter, setTargetTableFilter] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState(null);
  
  // Verification State
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await auditApi.getLogs({ limit: 100 });
      if (res.success) {
        setLogs(res.logs || []);
      }
    } catch (err) {
      toast.error('Không thể tải nhật ký kiểm toán: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleVerifyChain = async () => {
    setVerifying(true);
    try {
      const res = await auditApi.verifyChain();
      if (res.success && res.verification) {
        setVerificationResult(res.verification);
        if (res.verification.isValid) {
          toast.success(
            `Chuỗi kiểm toán hoàn toàn nguyên vẹn! Đã xác thực ${res.verification.totalLogs} khối cryptographic block.`,
            'Bảo Mật Tuyệt Đối'
          );
        } else {
          toast.error(
            `CẢNH BÁO: Phát hiện vi phạm toàn vẹn tại khối seq=${res.verification.brokenAt} (${res.verification.reason})!`,
            'Phát Hiện Chỉnh Sửa Trái Phép'
          );
        }
      }
    } catch (err) {
      toast.error('Lỗi khi kiểm tra chuỗi kiểm toán: ' + err.message);
    } finally {
      setVerifying(false);
    }
  };

  const filteredLogs = logs.filter(l => {
    const q = searchFilter.toLowerCase();
    const matchSearch =
      (l.user_display || '').toLowerCase().includes(q) ||
      (l.action || '').toLowerCase().includes(q) ||
      (l.target_table || '').toLowerCase().includes(q) ||
      (l.entity_id || '').toLowerCase().includes(q);
    const matchTable = targetTableFilter === 'ALL' || l.target_table === targetTableFilter;
    return matchSearch && matchTable;
  });

  const columns = [
    {
      title: 'Seq #',
      key: 'seq',
      width: '70px',
      sortable: true,
      render: (val) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--blueprint-400)' }}>
          #{val}
        </span>
      )
    },
    {
      title: 'Thời Điểm Băm (Timestamp)',
      key: 'hashed_at',
      width: '180px',
      render: (val) => {
        if (!val) return '—';
        const d = new Date(val);
        return (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
            {d.toLocaleString('vi-VN')}
          </span>
        );
      }
    },
    {
      title: 'Người Thực Hiện',
      key: 'user_display',
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--ink-primary)' }}>{val || 'Hệ thống'}</div>
          {row.user_id && typeof row.user_id === 'object' && (
            <div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>{row.user_id.code} • {row.user_id.role}</div>
          )}
        </div>
      )
    },
    {
      title: 'Hành Động',
      key: 'action',
      render: (val) => (
        <span className="ruo-badge ruo-badge-neutral" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
          {val}
        </span>
      )
    },
    {
      title: 'Bảng / Thực Thể',
      key: 'target_table',
      render: (val, row) => (
        <span style={{ fontSize: '12px' }}>
          <strong style={{ color: 'var(--blueprint-400)' }}>{val}</strong>
          {row.entity_id && row.entity_id !== 'N/A' && (
            <span style={{ color: 'var(--ink-muted)', marginLeft: '4px' }}>({row.entity_id})</span>
          )}
        </span>
      )
    },
    {
      title: 'Mã Băm SHA-256',
      key: 'hash_sha256',
      render: (val) => (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--ink-muted)',
            cursor: 'pointer'
          }}
          title={val}
          onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(val);
            toast.success('Đã sao chép mã băm SHA-256');
          }}
        >
          {val ? `${val.slice(0, 10)}...${val.slice(-8)}` : 'GENESIS'}
        </span>
      )
    },
    {
      title: 'Chi Tiết',
      key: 'actions',
      align: 'right',
      render: (_, row) => (
        <Button size="sm" variant="ghost" onClick={() => setSelectedLog(row)}>
          Xem Diff
        </Button>
      )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'var(--ink-primary)' }}>
            Nhật Ký Kiểm Toán SHA-256 (Cryptographic Immutable Ledger)
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--ink-muted)' }}>
            Cơ chế ghi một chiều (Append-only) chống sửa đổi: Mỗi bản ghi liên kết mật mã với bản ghi trước qua SHA-256
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Button
            variant="primary"
            icon={Icons.Shield}
            loading={verifying}
            onClick={handleVerifyChain}
          >
            Kiểm Tra Toàn Vẹn Chuỗi SHA-256
          </Button>

          <a
            href={auditApi.exportCsv()}
            target="_blank"
            rel="noopener noreferrer"
            className="laser-btn laser-btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: 'var(--radius-md)', fontSize: '13px', textDecoration: 'none' }}
          >
            <Icons.Download size={16} />
            <span>Xuất CSV Kiểm Toán</span>
          </a>

          <Button
            variant="secondary"
            icon={Icons.RefreshCw || Icons.Clock}
            onClick={fetchLogs}
          >
            Làm Mới
          </Button>
        </div>
      </div>

      {/* Verification Status Banner */}
      {verificationResult && (
        <div
          style={{
            padding: '16px 20px',
            borderRadius: 'var(--radius-md)',
            background: verificationResult.isValid ? 'rgba(47, 179, 122, 0.12)' : 'rgba(229, 72, 77, 0.15)',
            border: `1px solid ${verificationResult.isValid ? 'rgba(47, 179, 122, 0.35)' : 'rgba(229, 72, 77, 0.4)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: verificationResult.isValid ? '#2FB37A' : '#E5484D',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFF'
              }}
            >
              <Icons.Shield size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '14px', color: verificationResult.isValid ? '#2FB37A' : '#E5484D' }}>
                {verificationResult.isValid
                  ? 'Chuỗi Kiểm Toán Hoàn Toàn Hợp Lệ & Nguyên Vẹn (Tamper-Free)'
                  : `CẢNH BÁO PHÁT HIỆN SỰ CỐ TOÀN VẸN: ${verificationResult.reason}`}
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--ink-secondary)', marginTop: '2px' }}>
                {verificationResult.message} • Tổng số khối đã duyệt: <strong>{verificationResult.totalLogs}</strong>
              </div>
            </div>
          </div>

          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              padding: '4px 10px',
              borderRadius: 'var(--radius-xs)',
              background: 'rgba(0,0,0,0.3)',
              color: 'var(--ink-primary)'
            }}
          >
            STATUS: {verificationResult.isValid ? 'CRYPTOGRAPHIC_VALID' : 'TAMPER_DETECTED'}
          </span>
        </div>
      )}

      {/* Filter Toolbar */}
      <Card style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Icons.Search size={15} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--ink-muted)' }} />
            <input
              type="text"
              className="ruo-portal-input"
              style={{ paddingLeft: '36px', height: '34px', fontSize: '13px' }}
              placeholder="Lọc theo người thực hiện, hành động, bảng dữ liệu hoặc mã..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Bảng:</span>
            <select
              value={targetTableFilter}
              onChange={(e) => setTargetTableFilter(e.target.value)}
              className="ruo-portal-input"
              style={{ height: '34px', fontSize: '12px', padding: '0 10px' }}
            >
              <option value="ALL">Tất cả bảng</option>
              <option value="users">users</option>
              <option value="roles">roles</option>
              <option value="equipments">equipments</option>
              <option value="equipment_movements">equipment_movements</option>
              <option value="repairs">repairs</option>
              <option value="parts_requests">parts_requests</option>
              <option value="disposals">disposals</option>
              <option value="inventory_sessions">inventory_sessions</option>
              <option value="master_data">master_data</option>
              <option value="system">system</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Ledger Table */}
      <DataTable
        columns={columns}
        data={filteredLogs}
        loading={loading}
        emptyMessage="Chưa có bản ghi nhật ký kiểm toán nào được lưu vết."
        onRowClick={(row) => setSelectedLog(row)}
      />

      {/* Diff / Detail Modal */}
      {selectedLog && (
        <div className="ruo-drawer-backdrop" onClick={() => setSelectedLog(null)}>
          <div
            className="ruo-drawer-panel"
            style={{ width: '600px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ruo-drawer-header">
              <div>
                <h2 className="ruo-drawer-title">Chi Tiết Bản Ghi Kiểm Toán #{selectedLog.seq}</h2>
                <p className="ruo-drawer-subtitle">{selectedLog.action} • {selectedLog.target_table}</p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="ruo-drawer-close-btn">
                <Icons.X size={18} />
              </button>
            </div>

            <div className="ruo-drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: '4px' }}>
                  Cryptographic Hashes
                </div>
                <div style={{ background: 'var(--surface-2)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', fontSize: '11.5px', fontFamily: 'var(--font-mono)' }}>
                  <div style={{ marginBottom: '6px' }}>
                    <span style={{ color: 'var(--ink-muted)' }}>PREV: </span>
                    <span style={{ color: 'var(--blueprint-300)' }}>{selectedLog.previous_hash || 'GENESIS'}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--ink-muted)' }}>HASH: </span>
                    <span style={{ color: '#2FB37A' }}>{selectedLog.hash_sha256}</span>
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: '4px' }}>
                  Thông Tin Thực Hiện
                </div>
                <div style={{ background: 'var(--surface-2)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', fontSize: '12.5px' }}>
                  <div>Người dùng: <strong>{selectedLog.user_display}</strong></div>
                  <div>IP Address: <span style={{ fontFamily: 'var(--font-mono)' }}>{selectedLog.ip_address}</span></div>
                  <div>Thời gian: {selectedLog.hashed_at ? new Date(selectedLog.hashed_at).toLocaleString('vi-VN') : '—'}</div>
                  <div>Thực thể ID: <span style={{ fontFamily: 'var(--font-mono)' }}>{selectedLog.entity_id}</span></div>
                </div>
              </div>

              {selectedLog.new_value && (
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: '4px' }}>
                    Payload Data (New Value)
                  </div>
                  <pre style={{ background: 'var(--surface-3)', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '12px', fontFamily: 'var(--font-mono)', overflowX: 'auto', color: 'var(--ink-secondary)' }}>
                    {JSON.stringify(selectedLog.new_value, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.old_value && (
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: '4px' }}>
                    Payload Data (Old Value)
                  </div>
                  <pre style={{ background: 'var(--surface-3)', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '12px', fontFamily: 'var(--font-mono)', overflowX: 'auto', color: 'var(--ink-muted)' }}>
                    {JSON.stringify(selectedLog.old_value, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogPage;
