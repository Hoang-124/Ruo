import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { movementApi, equipmentApi, masterDataApi, authApi } from '../../lib/api';

export const MovementsPage = ({ preselectedEquipment = null, preselectedRoom = null, onClearPrefill }) => {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';
  const canManageMovements = currentUser?.role === 'facility_manager';
  const roleBadge = isAdmin ? 'ADMIN • CHỈ XEM' : 'FACILITY MANAGER';
  const [loading, setLoading] = useState(true);
  const [movements, setMovements] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [rejectingMovement, setRejectingMovement] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sourceRoomFilter, setSourceRoomFilter] = useState('');
  const [orderForm, setOrderForm] = useState({
    equipment_id: '',
    to_room_id: '',
    assigned_to: '',
    reason: '',
    type: 'transfer'
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [movRes, pendingRes] = await Promise.all([
        movementApi.list(),
        movementApi.pending()
      ]);

      if (movRes && movRes.success) {
        setMovements(movRes.movements || []);
      }
      if (pendingRes?.success) setPendingApprovals(pendingRes.movements || []);

      if (!canManageMovements) return;

      const [eqRes, roomRes, techRes] = await Promise.all([
        equipmentApi.list({ limit: 100 }),
        masterDataApi.getRooms({ limit: 100 }),
        authApi.listUsers({ role: 'technician' })
      ]);
      if (eqRes && eqRes.success) {
        setEquipments(eqRes.equipments || []);
        if (eqRes.equipments?.length > 0 && !orderForm.equipment_id) {
          setOrderForm(prev => ({ ...prev, equipment_id: eqRes.equipments[0]._id }));
        }
      }
      if (roomRes && roomRes.success) {
        setRooms(roomRes.rooms || []);
        if (roomRes.rooms?.length > 0 && !orderForm.to_room_id) {
          setOrderForm(prev => ({ ...prev, to_room_id: roomRes.rooms[0]._id }));
        }
      }
      if (techRes && techRes.success) {
        setTechnicians(techRes.users || []);
        if (techRes.users?.length > 0 && !orderForm.assigned_to) {
          setOrderForm(prev => ({ ...prev, assigned_to: techRes.users[0]._id }));
        }
      }
    } catch (err) {
      toast.error('Lỗi khi tải danh sách điều chuyển: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (preselectedEquipment && canManageMovements) {
      const eqRoomId = preselectedEquipment.room_id?._id || preselectedEquipment.room_id || preselectedRoom?._id || '';
      setSourceRoomFilter(eqRoomId || 'ALL');
      setOrderForm(prev => ({
        ...prev,
        equipment_id: preselectedEquipment._id,
        to_room_id: rooms.find(r => String(r._id) !== String(eqRoomId) && r.status !== 'inactive')?._id || prev.to_room_id
      }));
      setShowOrderModal(true);
      onClearPrefill?.();
    }
  }, [preselectedEquipment, preselectedRoom, rooms, canManageMovements, onClearPrefill]);

  const filteredSourceEquipments = equipments.filter(eq => {
    if (['disposed', 'lost'].includes(eq.status)) return false;
    if (!sourceRoomFilter || sourceRoomFilter === 'ALL') return true;
    if (sourceRoomFilter === 'WAREHOUSE') {
      return !eq.room_id || eq.room_id?.room_type === 'warehouse';
    }
    const eqRoomId = eq.room_id?._id || eq.room_id;
    return String(eqRoomId) === String(sourceRoomFilter);
  });

  const selectedEqObj = equipments.find(eq => String(eq._id) === String(orderForm.equipment_id));
  const currentEqRoomId = selectedEqObj?.room_id?._id || selectedEqObj?.room_id || '';
  const availableDestinationRooms = rooms.filter(
    r => r.status !== 'inactive' && String(r._id) !== String(currentEqRoomId)
  );

  const handleApprove = async (movement) => {
    if (!canManageMovements) return;
    try {
      await movementApi.approve(movement._id);
      toast.success('Đã phê duyệt phiếu điều chuyển. Kỹ thuật viên được giao đã nhận thông báo.');
      await fetchData();
    } catch (err) {
      toast.error(`Không thể phê duyệt phiếu: ${err.message}`);
    }
  };

  const handleReject = async (event) => {
    event.preventDefault();
    if (!canManageMovements) return;
    if (!rejectingMovement || rejectReason.trim().length < 3) {
      toast.error('Vui lòng nhập lý do từ chối (ít nhất 3 ký tự).');
      return;
    }
    try {
      setSubmitting(true);
      await movementApi.reject(rejectingMovement._id, rejectReason.trim());
      toast.success('Đã từ chối phiếu điều chuyển.');
      setRejectingMovement(null);
      setRejectReason('');
      await fetchData();
    } catch (err) {
      toast.error(`Không thể từ chối phiếu: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    if (!canManageMovements) return;
    if (!orderForm.equipment_id) {
      toast.error('Vui lòng chọn thiết bị cần điều chuyển.');
      return;
    }
    if (!orderForm.to_room_id) {
      toast.error('Vui lòng chọn phòng đến.');
      return;
    }
    if (!orderForm.reason.trim()) {
      toast.error('Vui lòng nhập lý do điều chuyển.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await movementApi.order({
        equipment_id: orderForm.equipment_id,
        to_room_id: orderForm.to_room_id,
        assigned_to: orderForm.assigned_to || null,
        reason: orderForm.reason.trim(),
        type: orderForm.type
      });

      if (res && res.success) {
        toast.success(res.message || 'Đã phát hành lệnh điều chuyển. Kỹ thuật viên có thể thực hiện ngay.');
        setShowOrderModal(false);
        setOrderForm({
          equipment_id: equipments[0]?._id || '',
          to_room_id: rooms[0]?._id || '',
          assigned_to: technicians[0]?._id || '',
          reason: '',
          type: 'transfer'
        });
        await fetchData();
      }
    } catch (err) {
      toast.error('Lỗi khi ra lệnh điều chuyển: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredMovements = statusFilter === 'awaiting_approval'
    ? pendingApprovals
    : statusFilter === 'ALL'
      ? movements
      : movements.filter(movement => movement.status === statusFilter);
  const awaitingApprovalCount = pendingApprovals.length;
  const approvedCount = movements.filter(movement => movement.status === 'approved').length;
  const completedCount = movements.filter(movement => movement.status === 'completed').length;

  const getMovementTypeBadge = (type) => {
    switch (type) {
      case 'allocation':
        return <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>Cấp Phát Ban Đầu</span>;
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

  const formatRoomDisplay = (room) => {
    if (!room) return 'Kho dự phòng (KHO-01)';
    if (!room.name || room.name === room.code) return room.code;
    return `${room.code} (${room.name})`;
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', color: '#F59E0B', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>{roleBadge}</span>
            <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Lệnh Điều Chuyển & Lịch Sử Di Chuyển Tài Sản Thực Địa</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink-pure)', letterSpacing: '-0.02em', margin: 0 }}>
            Quản Lý Điều Chuyển Thiết Bị CSVC
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--ink-muted)' }}>
            {isAdmin
              ? 'Tra cứu trạng thái và lịch sử các phiếu điều chuyển thiết bị (chế độ chỉ xem).'
              : 'Ra lệnh điều chuyển tài sản giữa các giảng đường / phòng lab / kho dự phòng và theo dõi việc thực thi của Kỹ thuật viên.'}
          </p>
        </div>

        {canManageMovements && (
          <button
            onClick={() => setShowOrderModal(true)}
            className="laser-btn laser-btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 18px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 700 }}
          >
            <Icons.Plus size={16} />
            <span>Ra Lệnh Điều Chuyển Mới</span>
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {[
          { value: 'ALL', label: `Tất cả (${movements.length})` },
          { value: 'awaiting_approval', label: `Chờ duyệt (${awaitingApprovalCount})` },
          { value: 'approved', label: `Đã duyệt (${approvedCount})` },
          { value: 'completed', label: `Hoàn tất (${completedCount})` }
        ].map(filter => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setStatusFilter(filter.value)}
            className={statusFilter === filter.value ? 'laser-btn laser-btn-primary' : 'laser-btn laser-btn-secondary'}
            style={{ padding: '7px 12px', fontSize: 12 }}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Movements Table */}
      <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--hairline-medium)' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--ink-pure)' }}>
            Danh sách phiếu điều chuyển ({filteredMovements.length})
          </h2>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink-muted)' }}>
            <Icons.RefreshCw size={28} className="spin" style={{ marginBottom: '12px' }} />
            <div>Đang tải lịch sử điều chuyển...</div>
          </div>
        ) : filteredMovements.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-muted)' }}>
            <Icons.RefreshCw size={36} style={{ opacity: 0.5, marginBottom: '12px' }} />
            <div style={{ fontSize: '15px', fontWeight: 600 }}>Chưa có lệnh điều chuyển nào được ghi nhận.</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--surface-panel)', borderBottom: '1px solid var(--hairline-medium)' }}>
                <th style={{ padding: '12px 18px', color: 'var(--ink-pure)', fontWeight: 700 }}>Loại Lệnh</th>
                <th style={{ padding: '12px 18px', color: 'var(--ink-pure)', fontWeight: 700 }}>Thiết Bị</th>
                <th style={{ padding: '12px 18px', color: 'var(--ink-pure)', fontWeight: 700 }}>Từ Nơi Đi → Tới Nơi Đến</th>
                <th style={{ padding: '12px 18px', color: 'var(--ink-pure)', fontWeight: 700 }}>KTV Thực Hiện</th>
                <th style={{ padding: '12px 18px', color: 'var(--ink-pure)', fontWeight: 700 }}>Trạng Thái</th>
                <th style={{ padding: '12px 18px', color: 'var(--ink-pure)', fontWeight: 700 }}>Ngày Lập Lệnh</th>
                <th style={{ padding: '12px 18px', textAlign: 'right', color: 'var(--ink-pure)', fontWeight: 700 }}>Duyệt Phiếu</th>
              </tr>
            </thead>
            <tbody>
              {filteredMovements.map(m => {
                const eq = m.equipment_id || {};
                const fromRoom = formatRoomDisplay(m.from_room_id);
                const toRoom = formatRoomDisplay(m.to_room_id);
                const canApprove = canManageMovements && m.status === 'awaiting_approval';
                const canReject = canManageMovements && m.status === 'awaiting_approval';
                const statusLabels = {
                  awaiting_approval: 'Chờ Quản lý duyệt',
                  approved: 'Đã duyệt - chờ KTV',
                  pending: 'Chờ KTV (phiếu cũ)',
                  rejected: 'Đã từ chối',
                  completed: 'Đã hoàn tất',
                  cancelled: 'Đã hủy'
                };
                const statusColor = m.status === 'completed' ? '#10B981' : m.status === 'rejected' || m.status === 'cancelled' ? '#EF4444' : '#F59E0B';

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
                    <td style={{ padding: '12px 18px', color: 'var(--ink-pure)' }}>
                      {m.performed_by?.full_name || m.assigned_to?.full_name || 'Chưa phân công'}
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background: `${statusColor}26`,
                          color: statusColor
                        }}
                      >
                        {statusLabels[m.status] || m.status}
                      </span>
                      {m.reject_reason && <div style={{ color: '#EF4444', fontSize: 11, marginTop: 4 }}>{m.reject_reason}</div>}
                    </td>
                    <td style={{ padding: '12px 18px', color: 'var(--ink-muted)', fontSize: '12px' }}>
                      {new Date(m.created_at).toLocaleDateString('vi-VN')}
                    </td>
                    <td style={{ padding: '12px 18px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {canApprove && (
                        <button
                          type="button"
                          onClick={() => handleApprove(m)}
                          className="laser-btn laser-btn-primary"
                          style={{ padding: '6px 10px', fontSize: 11, marginRight: 6 }}
                        >
                          Duyệt
                        </button>
                      )}
                      {canReject ? (
                        <button
                          type="button"
                          onClick={() => { setRejectingMovement(m); setRejectReason(''); }}
                          className="laser-btn laser-btn-secondary"
                          style={{ padding: '6px 10px', fontSize: 11 }}
                        >
                          Từ chối
                        </button>
                      ) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Order Modal */}
      {canManageMovements && showOrderModal && (
        <div className="ruo-drawer-backdrop" onClick={() => setShowOrderModal(false)}>
          <div className="ruo-drawer-panel" style={{ width: '540px' }} onClick={(e) => e.stopPropagation()}>
            <div className="ruo-drawer-header">
              <div>
                <h2 className="ruo-drawer-title">Ra Lệnh Điều Chuyển Thiết Bị</h2>
                <p className="ruo-drawer-subtitle">Lệnh do Quản lý CSVC phát hành có hiệu lực ngay để Kỹ thuật viên thực hiện.</p>
              </div>
              <button onClick={() => setShowOrderModal(false)} className="ruo-drawer-close-btn"><Icons.X size={18} /></button>
            </div>

            <form onSubmit={handleOrderSubmit}>
              <div className="ruo-drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Phòng xuất phát (Lọc thiết bị theo phòng)
                  </label>
                  <select
                    value={sourceRoomFilter}
                    onChange={(e) => {
                      const nextRoom = e.target.value;
                      setSourceRoomFilter(nextRoom);
                      const matching = equipments.filter(eq => {
                        if (['disposed', 'lost'].includes(eq.status)) return false;
                        if (!nextRoom || nextRoom === 'ALL') return true;
                        if (nextRoom === 'WAREHOUSE') return !eq.room_id || eq.room_id?.room_type === 'warehouse';
                        return String(eq.room_id?._id || eq.room_id) === String(nextRoom);
                      });
                      const firstEq = matching[0];
                      const firstEqRoomId = firstEq?.room_id?._id || firstEq?.room_id || '';
                      const nextDest = rooms.find(r => r.status !== 'inactive' && String(r._id) !== String(firstEqRoomId));
                      setOrderForm(prev => ({
                        ...prev,
                        equipment_id: firstEq?._id || '',
                        to_room_id: nextDest?._id || prev.to_room_id
                      }));
                    }}
                    className="ruo-portal-input"
                    style={{ width: '100%', height: '38px', fontSize: '13px' }}
                  >
                    <option value="">Tất cả phòng học & kho ({equipments.length} thiết bị)</option>
                    <option value="WAREHOUSE">[KHO] Kho dự phòng</option>
                    {rooms.map(r => (
                      <option key={r._id} value={r._id}>
                        {(r.room_type || r.type) === 'warehouse' ? `[KHO] ${r.code} - ${r.name}` : `${r.code} - ${r.name}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Chọn Thiết Bị Cần Điều Chuyển * ({filteredSourceEquipments.length} thiết bị)
                  </label>
                  <select
                    required
                    value={orderForm.equipment_id}
                    onChange={(e) => {
                      const nextEqId = e.target.value;
                      const eqObj = equipments.find(item => String(item._id) === String(nextEqId));
                      const eqRoomId = eqObj?.room_id?._id || eqObj?.room_id || '';
                      setOrderForm(prev => ({
                        ...prev,
                        equipment_id: nextEqId,
                        to_room_id: String(prev.to_room_id) === String(eqRoomId)
                          ? (rooms.find(r => r.status !== 'inactive' && String(r._id) !== String(eqRoomId))?._id || '')
                          : prev.to_room_id
                      }));
                    }}
                    className="ruo-portal-input"
                    style={{ width: '100%', height: '38px', fontSize: '13px' }}
                  >
                    {filteredSourceEquipments.length === 0 && <option value="">Không có thiết bị tại phòng này</option>}
                    {filteredSourceEquipments.map(eq => (
                      <option key={eq._id} value={eq._id}>
                        [{eq.room_id?.code || 'KHO'}] {eq.code} — {eq.name} ({eq.status})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedEqObj && (
                  <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', fontSize: '12px', color: 'var(--ink-secondary)' }}>
                    Vị trí hiện tại: <strong style={{ color: 'var(--ink-primary)' }}>{selectedEqObj.room_id ? `${selectedEqObj.room_id.code} — ${selectedEqObj.room_id.name || ''}` : 'Kho dự phòng'}</strong>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                      Phòng Học / Kho Nhận *
                    </label>
                    <select
                      required
                      value={orderForm.to_room_id}
                      onChange={(e) => setOrderForm({ ...orderForm, to_room_id: e.target.value })}
                      className="ruo-portal-input"
                      style={{ width: '100%', height: '38px', fontSize: '13px' }}
                    >
                      {availableDestinationRooms.map(r => (
                        <option key={r._id} value={r._id}>
                          {(r.room_type || r.type) === 'warehouse' ? `[KHO] ${r.code}` : `${r.code} - ${r.name}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                      Người Phụ Trách (Kỹ Thuật Viên)
                    </label>
                    <select
                      value={orderForm.assigned_to}
                      onChange={(e) => setOrderForm({ ...orderForm, assigned_to: e.target.value })}
                      className="ruo-portal-input"
                      style={{ width: '100%', height: '38px', fontSize: '13px' }}
                    >
                      <option value="">Bất kỳ KTV nào trong ca</option>
                      {technicians.map(t => (
                        <option key={t._id} value={t._id}>
                          {t.full_name} ({t.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Loại Lệnh Điều Chuyển
                  </label>
                  <select
                    value={orderForm.type}
                    onChange={(e) => setOrderForm({ ...orderForm, type: e.target.value })}
                    className="ruo-portal-input"
                    style={{ width: '100%', height: '38px', fontSize: '13px' }}
                  >
                    <option value="transfer">Điều chuyển thông thường giữa các phòng</option>
                    <option value="replacement">Cấp thiết bị thay thế khẩn cấp</option>
                    <option value="to_stock">Thu hồi thiết bị về kho dự phòng</option>
                    <option value="repair_out">Gửi thiết bị sang đơn vị sửa ngoài</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Lý Do Điều Chuyển *
                  </label>
                  <textarea
                    required
                    rows={3}
                    maxLength={500}
                    placeholder="VD: Cân đối thiết bị phục vụ kỳ thi đánh giá năng lực tại phòng B201..."
                    value={orderForm.reason}
                    onChange={(e) => setOrderForm({ ...orderForm, reason: e.target.value })}
                    className="ruo-portal-input"
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>
              </div>

              <div className="ruo-drawer-footer">
                <button type="button" onClick={() => setShowOrderModal(false)} className="laser-btn laser-btn-secondary" style={{ padding: '8px 16px' }}>Hủy Bỏ</button>
                <button type="submit" disabled={submitting} className="laser-btn laser-btn-primary" style={{ padding: '8px 20px', fontWeight: 700 }}>
                  {submitting ? 'Đang Phát Hành...' : 'Phát Hành Lệnh Điều Chuyển'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {canManageMovements && rejectingMovement && (
        <div className="ruo-drawer-backdrop" onClick={() => setRejectingMovement(null)}>
          <div className="ruo-drawer-panel" style={{ width: 480 }} onClick={event => event.stopPropagation()}>
            <div className="ruo-drawer-header">
              <div>
                <h2 className="ruo-drawer-title">Từ Chối Phiếu Điều Chuyển</h2>
                <p className="ruo-drawer-subtitle">
                  {rejectingMovement.equipment_id?.code} — {rejectingMovement.equipment_id?.name}
                </p>
              </div>
              <button type="button" onClick={() => setRejectingMovement(null)} className="ruo-drawer-close-btn">
                <Icons.X size={18} />
              </button>
            </div>
            <form onSubmit={handleReject}>
              <div className="ruo-drawer-body">
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                  Lý do từ chối *
                </label>
                <textarea
                  required
                  minLength={3}
                  maxLength={500}
                  rows={4}
                  value={rejectReason}
                  onChange={event => setRejectReason(event.target.value)}
                  className="ruo-portal-input"
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>
              <div className="ruo-drawer-footer">
                <button type="button" onClick={() => setRejectingMovement(null)} className="laser-btn laser-btn-secondary">
                  Hủy
                </button>
                <button type="submit" disabled={submitting} className="laser-btn laser-btn-primary">
                  {submitting ? 'Đang xử lý...' : 'Xác nhận từ chối'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MovementsPage;
