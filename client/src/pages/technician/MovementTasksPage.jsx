import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { useToast } from '../../context/ToastContext';
import { movementApi } from '../../lib/api';

export const MovementTasksPage = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [movements, setMovements] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'COMPLETED'
  const [selectedMovement, setSelectedMovement] = useState(null);

  // Confirm Modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmNotes, setConfirmNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchMovements = async () => {
    try {
      setLoading(true);
      const res = await movementApi.list();
      if (res && res.success) {
        setMovements(res.movements || []);
      }
    } catch (err) {
      toast.error('Lỗi khi tải lệnh di chuyển: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, []);

  const openConfirmModal = (m) => {
    setSelectedMovement(m);
    setConfirmNotes('Đã di chuyển thực địa và kiểm tra kết nối thiết bị tại phòng nhận.');
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await movementApi.confirm(selectedMovement._id, confirmNotes.trim());
      if (res && res.success) {
        toast.success(`Đã xác nhận hoàn tất lệnh di chuyển thiết bị [${selectedMovement.equipment_id?.code}]!`);
        setShowConfirmModal(false);
        await fetchMovements();
      }
    } catch (err) {
      toast.error('Lỗi khi xác nhận di chuyển: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getMovementTypeBadge = (type) => {
    switch (type) {
      case 'replacement':
        return <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: 'rgba(6,182,212,0.15)', color: 'var(--laser-cyan)' }}>Thay Đồ Dự Phòng</span>;
      case 'transfer':
        return <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: 'rgba(59,130,246,0.15)', color: '#3B82F6' }}>Điều Chuyển Phòng</span>;
      case 'repair_out':
        return <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>Gửi Sửa Ngoài</span>;
      case 'repair_return':
        return <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>Nhận Lại Sau Sửa</span>;
      case 'to_stock':
        return <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: 'rgba(168,85,247,0.15)', color: '#A855F7' }}>Thu Hồi Về Kho</span>;
      default:
        return <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: 'rgba(255,255,255,0.08)', color: 'var(--ink-muted)' }}>{type}</span>;
    }
  };

  const filtered = movements.filter(m => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'PENDING') return m.status === 'pending';
    if (statusFilter === 'COMPLETED') return m.status === 'completed';
    return true;
  });

  const pendingCount = movements.filter(m => m.status === 'pending').length;
  const completedCount = movements.filter(m => m.status === 'completed').length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', color: '#0EA5E9', background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.25)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>KỸ THUẬT VIÊN</span>
            <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>MODULE 03 • LỆNH DI CHUYỂN, THAY THẾ DỰ PHÒNG & XÁC NHẬN</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink-pure)', letterSpacing: '-0.02em', margin: 0 }}>
            Lệnh Di Chuyển & Thay Thế Thiết Bị Thực Địa
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--ink-muted)' }}>
            Tiếp nhận các lệnh di chuyển từ Quản lý CSVC, vận chuyển thiết bị tới đúng phòng và xác nhận cập nhật vị trí trên hệ thống.
          </p>
        </div>

        <button
          onClick={fetchMovements}
          className="laser-btn laser-btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 16px', borderRadius: 'var(--radius-md)', fontSize: '13px' }}
        >
          <Icons.RefreshCw size={16} />
          <span>Làm Mới</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Tổng lệnh di chuyển</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--ink-pure)', marginTop: '4px' }}>{movements.length}</div>
        </div>

        <div style={{ background: 'var(--surface-card)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: '12px', color: '#F59E0B', fontWeight: 600 }}>Cần thực hiện thực địa (Pending)</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#F59E0B', marginTop: '4px' }}>{pendingCount}</div>
        </div>

        <div style={{ background: 'var(--surface-card)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: '12px', color: '#10B981', fontWeight: 600 }}>Đã hoàn tất bàn giao</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#10B981', marginTop: '4px' }}>{completedCount}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--hairline-medium)', marginBottom: '20px' }}>
        {[
          { key: 'ALL', label: `Tất Cả Lệnh (${movements.length})` },
          { key: 'PENDING', label: `Cần Thực Hiện (${pendingCount})` },
          { key: 'COMPLETED', label: `Đã Hoàn Thành (${completedCount})` }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            style={{
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: statusFilter === tab.key ? 700 : 500,
              color: statusFilter === tab.key ? 'var(--laser-cyan)' : 'var(--ink-muted)',
              borderBottom: statusFilter === tab.key ? '2px solid var(--laser-cyan)' : '2px solid transparent',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Movements Table */}
      <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink-muted)' }}>
            <Icons.RefreshCw size={28} className="spin" style={{ marginBottom: '12px' }} />
            <div>Đang tải danh sách lệnh di chuyển...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-muted)' }}>
            <Icons.CheckCircle size={36} style={{ opacity: 0.5, marginBottom: '12px' }} />
            <div style={{ fontSize: '15px', fontWeight: 600 }}>Không có lệnh di chuyển nào trong danh mục này.</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--surface-panel)', borderBottom: '1px solid var(--hairline-medium)' }}>
                <th style={{ padding: '12px 18px', color: 'var(--ink-pure)', fontWeight: 700 }}>Loại Lệnh</th>
                <th style={{ padding: '12px 18px', color: 'var(--ink-pure)', fontWeight: 700 }}>Thiết Bị Cần Chuyển</th>
                <th style={{ padding: '12px 18px', color: 'var(--ink-pure)', fontWeight: 700 }}>Từ Nơi Đi → Tới Nơi Đến</th>
                <th style={{ padding: '12px 18px', color: 'var(--ink-pure)', fontWeight: 700 }}>Trạng Thái</th>
                <th style={{ padding: '12px 18px', color: 'var(--ink-pure)', fontWeight: 700 }}>Người Ra Lệnh</th>
                <th style={{ padding: '12px 18px', textAlign: 'right', color: 'var(--ink-pure)', fontWeight: 700 }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => {
                const eq = m.equipment_id || {};
                const fromRoom = m.from_room_id ? `${m.from_room_id.code} (${m.from_room_id.name})` : 'Kho dự phòng (null)';
                const toRoom = m.to_room_id ? `${m.to_room_id.code} (${m.to_room_id.name})` : 'Kho dự phòng (null)';
                const isPending = m.status === 'pending';

                return (
                  <tr key={m._id} style={{ borderBottom: '1px solid var(--hairline-soft)' }}>
                    <td style={{ padding: '12px 18px' }}>
                      {getMovementTypeBadge(m.type)}
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--laser-cyan)' }}>{eq.code}</div>
                      <div style={{ fontWeight: 600, color: 'var(--ink-pure)' }}>{eq.name}</div>
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: 'var(--ink-secondary)', fontSize: '12px' }}>{fromRoom}</span>
                        <Icons.ArrowRight size={14} color="var(--laser-cyan)" />
                        <strong style={{ color: 'var(--ink-pure)', fontSize: '12.5px' }}>{toRoom}</strong>
                      </div>
                      {m.reason && <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '2px' }}>Lý do: {m.reason}</div>}
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background: isPending ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                          color: isPending ? '#F59E0B' : '#10B981'
                        }}
                      >
                        {isPending ? 'Chờ Thực Hiện' : 'Đã Xác Nhận'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 18px', color: 'var(--ink-muted)', fontSize: '12px' }}>
                      {m.ordered_by?.full_name || 'Quản lý CSVC'}
                    </td>
                    <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                      {isPending ? (
                        <button
                          onClick={() => openConfirmModal(m)}
                          className="laser-btn laser-btn-primary"
                          style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <Icons.Check size={14} />
                          <span>Xác Nhận Đã Chuyển</span>
                        </button>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#10B981', fontWeight: 600 }}>Hoàn Tất</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Confirm Movement Modal */}
      {showConfirmModal && selectedMovement && (
        <div className="ruo-drawer-backdrop" onClick={() => setShowConfirmModal(false)}>
          <div className="ruo-drawer-panel" style={{ width: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="ruo-drawer-header">
              <div>
                <h2 className="ruo-drawer-title">Xác Nhận Hoàn Thành Di Chuyển</h2>
                <p className="ruo-drawer-subtitle">{selectedMovement.equipment_id?.name} ({selectedMovement.equipment_id?.code})</p>
              </div>
              <button onClick={() => setShowConfirmModal(false)} className="ruo-drawer-close-btn"><Icons.X size={18} /></button>
            </div>

            <form onSubmit={handleConfirmSubmit}>
              <div className="ruo-drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ background: 'var(--surface-panel)', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '12.5px' }}>
                  <div>Nơi đi: <strong>{selectedMovement.from_room_id?.code || 'Kho dự phòng'}</strong></div>
                  <div style={{ marginTop: '4px' }}>Nơi đến: <strong>{selectedMovement.to_room_id?.code || 'Kho dự phòng'}</strong></div>
                  <div style={{ marginTop: '4px' }}>Loại di chuyển: <strong>{selectedMovement.type}</strong></div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                    Ghi Chú Nghiệm Thu Thực Địa
                  </label>
                  <textarea
                    rows={3}
                    value={confirmNotes}
                    onChange={(e) => setConfirmNotes(e.target.value)}
                    className="ruo-portal-input"
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>
              </div>

              <div className="ruo-drawer-footer">
                <button type="button" onClick={() => setShowConfirmModal(false)} className="laser-btn laser-btn-secondary" style={{ padding: '8px 16px' }}>Hủy Bỏ</button>
                <button type="submit" disabled={submitting} className="laser-btn laser-btn-primary" style={{ padding: '8px 20px', fontWeight: 700 }}>
                  {submitting ? 'Đang Xác Nhận...' : 'Xác Nhận Đã Đưa Tới Nơi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MovementTasksPage;
