import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const TransferListPage = () => {
  const { currentRoleKey, token } = useAuth();
  const isLecturer = currentRoleKey === 'lecturer';
  const isAdmin = currentRoleKey === 'admin';
  const isStaff = ['maintenance_staff', 'facility_staff', 'maintenance'].includes(currentRoleKey);
  const isStaffOrAdmin = !isLecturer;
  const { toast } = useToast();

  const [transfers, setTransfers] = useState([
    {
      _id: 'TRF001',
      equipment_id: { code: 'EQ-TV-201', name: 'Smart TV Samsung 75" QLED 4K', qr_code: 'RUO-EQ-TV-201' },
      from_room_id: { code: 'A1-101', name: 'Giảng Đường A1-101', building: 'A1', floor: 1 },
      to_room_id: { code: 'A1-201', name: 'Phòng Hội Thảo A1-201', building: 'A1', floor: 2 },
      requested_by: { full_name: 'Trần Minh Tuấn', code: 'KT202601' },
      approved_by: { full_name: 'Ban Giám Hiệu Đại Học' },
      reason: 'Phục vụ hội thảo khoa học quốc tế tại phòng A1-201',
      status: 'completed',
      created_at: '2026-09-28T09:00:00Z'
    },
    {
      _id: 'TRF002',
      equipment_id: { code: 'EQ-PRJ-101', name: 'Máy Chiếu Laser Sony VPL-FHZ75', qr_code: 'RUO-EQ-PRJ-101' },
      from_room_id: { code: 'A1-101', name: 'Giảng Đường A1-101', building: 'A1', floor: 1 },
      to_room_id: { code: 'A1-301', name: 'Phòng Lab Mạng A1-301', building: 'A1', floor: 3 },
      requested_by: { full_name: 'Trần Minh Tuấn', code: 'KT202601' },
      reason: 'Cung cấp máy chiếu laser cho chuyên đề bảo mật thông tin',
      status: 'pending',
      created_at: '2026-09-30T08:30:00Z'
    }
  ]);

  const [filterStatus, setFilterStatus] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTransfer, setNewTransfer] = useState({
    equipment_code: '',
    from_room: 'A1-101',
    to_room: 'A1-201',
    reason: ''
  });

  // Filter transfers
  const filteredTransfers = transfers.filter(t => {
    if (filterStatus === 'all') return true;
    return t.status === filterStatus;
  });

  const handleApprove = (id) => {
    if (!isAdmin) {
      toast.error('Chỉ Quản trị viên / Ban Giám Hiệu (Admin) mới có quyền phê duyệt điều chuyển thiết bị!');
      return;
    }
    setTransfers(prev => prev.map(t => t._id === id ? { ...t, status: 'approved', approved_by: { full_name: 'Ban Giám Hiệu (Đã duyệt)' } } : t));
    toast.success('Đã phê duyệt đề xuất điều chuyển thiết bị!');
  };

  const handleReject = (id) => {
    if (!isAdmin) {
      toast.error('Chỉ Quản trị viên / Ban Giám Hiệu (Admin) mới có quyền từ chối lệnh điều chuyển!');
      return;
    }
    setTransfers(prev => prev.map(t => t._id === id ? { ...t, status: 'rejected' } : t));
    toast.warning('Đã từ chối đề xuất điều chuyển thiết bị.');
  };

  const handleComplete = (id) => {
    setTransfers(prev => prev.map(t => t._id === id ? { ...t, status: 'completed' } : t));
    toast.success('Đã hoàn tất bàn giao thiết bị vào phòng mới!');
  };


  const handleCreate = (e) => {
    e.preventDefault();
    if (!newTransfer.equipment_code || !newTransfer.reason) {
      toast.error('Vui lòng nhập mã thiết bị và lý do điều chuyển');
      return;
    }

    const created = {
      _id: 'TRF' + Date.now().toString().slice(-4),
      equipment_id: { code: newTransfer.equipment_code.toUpperCase(), name: 'Thiết bị CSVC', qr_code: `RUO-${newTransfer.equipment_code}` },
      from_room_id: { code: newTransfer.from_room, name: `Phòng ${newTransfer.from_room}`, building: 'A1', floor: 1 },
      to_room_id: { code: newTransfer.to_room, name: `Phòng ${newTransfer.to_room}`, building: 'A1', floor: 2 },
      requested_by: { full_name: 'Bạn (Kỹ thuật viên)', code: 'KT-CURRENT' },
      reason: newTransfer.reason,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    setTransfers([created, ...transfers]);
    setIsModalOpen(false);
    setNewTransfer({ equipment_code: '', from_room: 'A1-101', to_room: 'A1-201', reason: '' });
    toast.success('Đã tạo đề xuất điều chuyển thiết bị!');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span style={{ padding: '4px 10px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B', border: '1px solid rgba(245, 158, 11, 0.25)', fontSize: '11px', fontWeight: 700 }}>Chờ Duyệt</span>;
      case 'approved':
        return <span style={{ padding: '4px 10px', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6', border: '1px solid rgba(59, 130, 246, 0.25)', fontSize: '11px', fontWeight: 700 }}>Đã Duyệt</span>;
      case 'completed':
        return <span style={{ padding: '4px 10px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.12)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.25)', fontSize: '11px', fontWeight: 700 }}>Hoàn Tất</span>;
      case 'rejected':
        return <span style={{ padding: '4px 10px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.12)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.25)', fontSize: '11px', fontWeight: 700 }}>Từ Chối</span>;
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--laser-cyan)', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>MODULE 03</span>
            <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>QUẢN LÝ THIẾT BỊ • VÒNG ĐỜI TÀI SẢN</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink-pure)', letterSpacing: '-0.02em', margin: 0 }}>
            Điều Chuyển Trang Thiết Bị Giữa Các Phòng
          </h1>
        </div>

        {isStaffOrAdmin && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="laser-btn laser-btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 700 }}
          >
            <Icons.Plus size={16} />
            <span>Tạo Đề Xuất Điều Chuyển</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--hairline-medium)', paddingBottom: '12px' }}>
        {['all', 'pending', 'approved', 'completed', 'rejected'].map(st => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`laser-btn ${filterStatus === st ? 'laser-btn-primary' : 'laser-btn-ghost'}`}
            style={{ padding: '6px 14px', borderRadius: 'var(--radius-sm)', fontSize: '12.5px', textTransform: 'capitalize' }}
          >
            {st === 'all' ? 'Tất cả trạng thái' : st === 'pending' ? 'Chờ phê duyệt' : st === 'approved' ? 'Đã phê duyệt' : st === 'completed' ? 'Đã bàn giao' : 'Từ chối'}
          </button>
        ))}
      </div>

      {/* Transfers Table */}
      <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'var(--surface-panel)', borderBottom: '1px solid var(--hairline-medium)', color: 'var(--ink-secondary)' }}>
              <th style={{ padding: '12px 16px' }}>Mã Đơn</th>
              <th style={{ padding: '12px 16px' }}>Thiết Bị</th>
              <th style={{ padding: '12px 16px' }}>Phòng Nguồn ➔ Phòng Đích</th>
              <th style={{ padding: '12px 16px' }}>Người Đề Xuất</th>
              <th style={{ padding: '12px 16px' }}>Lý Do</th>
              <th style={{ padding: '12px 16px' }}>Trạng Thái</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransfers.map((t, idx) => (
              <tr key={t._id} style={{ borderBottom: '1px solid var(--hairline-soft)', transition: 'background 0.15s ease' }}>
                <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--laser-cyan)' }}>{t._id}</td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--ink-pure)' }}>{t.equipment_id.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)' }}>{t.equipment_id.code} • {t.equipment_id.qr_code}</div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{ fontWeight: 600, color: '#EF4444' }}>{t.from_room_id.code}</span>
                  <span style={{ margin: '0 8px', color: 'var(--ink-muted)' }}>➔</span>
                  <span style={{ fontWeight: 600, color: '#10B981' }}>{t.to_room_id.code}</span>
                </td>
                <td style={{ padding: '14px 16px', color: 'var(--ink-secondary)' }}>
                  <div>{t.requested_by.full_name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>{new Date(t.created_at).toLocaleDateString('vi-VN')}</div>
                </td>
                <td style={{ padding: '14px 16px', color: 'var(--ink-secondary)', maxWidth: '240px' }}>{t.reason}</td>
                <td style={{ padding: '14px 16px' }}>{getStatusBadge(t.status)}</td>
                <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                  {t.status === 'pending' && (
                    isAdmin ? (
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          onClick={() => handleApprove(t._id)}
                          className="laser-btn laser-btn-primary"
                          style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '4px' }}
                          title="Ban Giám Hiệu phê duyệt điều chuyển thiết bị"
                        >
                          Duyệt (BGH)
                        </button>
                        <button
                          onClick={() => handleReject(t._id)}
                          className="laser-btn laser-btn-rose"
                          style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '4px' }}
                          title="Từ chối đề xuất điều chuyển"
                        >
                          Từ Chối
                        </button>
                      </div>
                    ) : isStaff ? (
                      <span style={{ fontSize: '11px', color: '#F59E0B', background: 'rgba(245,158,11,0.1)', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(245,158,11,0.25)' }}>
                        Chờ BGH Duyệt
                      </span>
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>Chờ xét duyệt</span>
                    )
                  )}
                  {t.status === 'approved' && (
                    isStaffOrAdmin ? (
                      <button
                        onClick={() => handleComplete(t._id)}
                        className="laser-btn"
                        style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '4px', background: 'rgba(16,185,129,0.2)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' }}
                        title="Xác nhận đã di dời và bàn giao thiết bị vào phòng đích"
                      >
                        Xác Nhận Bàn Giao
                      </button>
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--laser-cyan)' }}>Đã duyệt (Chờ bàn giao)</span>
                    )
                  )}
                  {t.status === 'completed' && (
                    <span style={{ fontSize: '11px', color: '#10B981', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Icons.CheckCircle size={12} /> Đã chốt vị trí
                    </span>
                  )}
                  {t.status === 'rejected' && (
                    <span style={{ fontSize: '11px', color: '#EF4444' }}>Đã từ chối</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>


      {/* Modal Đề Xuất Điều Chuyển */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--surface-panel)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-xl)', maxWidth: '520px', width: '100%', padding: '28px', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ink-pure)', margin: 0 }}>Đề Xuất Điều Chuyển Thiết Bị</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--ink-muted)', cursor: 'pointer' }}>
                <Icons.X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '6px' }}>Mã Thiết Bị (Asset Code)</label>
                <input
                  type="text"
                  placeholder="Ví dụ: EQ-PRJ-101"
                  value={newTransfer.equipment_code}
                  onChange={e => setNewTransfer({ ...newTransfer, equipment_code: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', color: 'var(--ink-pure)', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '6px' }}>Từ Phòng</label>
                  <select
                    value={newTransfer.from_room}
                    onChange={e => setNewTransfer({ ...newTransfer, from_room: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', color: 'var(--ink-pure)', fontSize: '13px' }}
                  >
                    <option value="A1-101">A1-101 (Tầng 1)</option>
                    <option value="A1-201">A1-201 (Tầng 2)</option>
                    <option value="A1-301">A1-301 (Tầng 3)</option>
                    <option value="A1-501">A1-501 (Kho Tầng 5)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '6px' }}>Đến Phòng Đích</label>
                  <select
                    value={newTransfer.to_room}
                    onChange={e => setNewTransfer({ ...newTransfer, to_room: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', color: 'var(--ink-pure)', fontSize: '13px' }}
                  >
                    <option value="A1-201">A1-201 (Tầng 2)</option>
                    <option value="A1-301">A1-301 (Tầng 3)</option>
                    <option value="A1-401">A1-401 (Tầng 4)</option>
                    <option value="A1-501">A1-501 (Kho Tầng 5)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '6px' }}>Lý Do Điều Chuyển</label>
                <textarea
                  rows="3"
                  placeholder="Nêu rõ mục đích điều chuyển phục vụ giảng dạy hoặc bảo trì..."
                  value={newTransfer.reason}
                  onChange={e => setNewTransfer({ ...newTransfer, reason: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', color: 'var(--ink-pure)', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="laser-btn laser-btn-ghost"
                  style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="laser-btn laser-btn-primary"
                  style={{ padding: '8px 20px', borderRadius: 'var(--radius-sm)', fontWeight: 700 }}
                >
                  Gửi Đề Xuất
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default TransferListPage;
