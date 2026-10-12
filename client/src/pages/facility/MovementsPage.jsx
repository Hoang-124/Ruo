import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { useToast } from '../../context/ToastContext';
import { movementApi, equipmentApi, masterDataApi, authApi } from '../../lib/api';

export const MovementsPage = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [movements, setMovements] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [technicians, setTechnicians] = useState([]);

  // Modal
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderForm, setOrderForm] = useState({
    equipment_id: '',
    to_room_id: '',
    performed_by: '',
    reason: '',
    type: 'transfer'
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [movRes, eqRes, roomRes, techRes] = await Promise.all([
        movementApi.list(),
        equipmentApi.list({ limit: 100 }),
        masterDataApi.getRooms({ limit: 100 }),
        authApi.listUsers({ role: 'technician' })
      ]);

      if (movRes && movRes.success) {
        setMovements(movRes.movements || []);
      }
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
        if (techRes.users?.length > 0 && !orderForm.performed_by) {
          setOrderForm(prev => ({ ...prev, performed_by: techRes.users[0]._id }));
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

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
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
        performed_by: orderForm.performed_by || null,
        reason: orderForm.reason.trim(),
        type: orderForm.type
      });

      if (res && res.success) {
        toast.success('Đã ban hành lệnh điều chuyển thiết bị thành công! Đang chờ KTV xác nhận thực địa.');
        setShowOrderModal(false);
        setOrderForm({
          equipment_id: equipments[0]?._id || '',
          to_room_id: rooms[0]?._id || '',
          performed_by: technicians[0]?._id || '',
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

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', color: '#F59E0B', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>FACILITY MANAGER</span>
            <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>MODULE 03 • LỆNH ĐIỀU CHUYỂN & LỊCH SỬ DI CHUYỂN TÀI SẢN</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink-pure)', letterSpacing: '-0.02em', margin: 0 }}>
            Quản Lý Điều Chuyển Thiết Bị CSVC
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--ink-muted)' }}>
            Ra lệnh điều chuyển tài sản giữa các giảng đường / phòng lab / kho dự phòng và theo dõi việc thực thi của Kỹ thuật viên.
          </p>
        </div>

        <button
          onClick={() => setShowOrderModal(true)}
          className="laser-btn laser-btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 18px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 700 }}
        >
          <Icons.Plus size={16} />
          <span>Ra Lệnh Điều Chuyển Mới</span>
        </button>
      </div>

      {/* Movements Table */}
      <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--hairline-medium)' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--ink-pure)' }}>
            Lịch Sử Điều Chuyển Toàn Trường ({movements.length})
          </h2>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink-muted)' }}>
            <Icons.RefreshCw size={28} className="spin" style={{ marginBottom: '12px' }} />
            <div>Đang tải lịch sử điều chuyển...</div>
          </div>
        ) : movements.length === 0 ? (
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
              </tr>
            </thead>
            <tbody>
              {movements.map(m => {
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
                    <td style={{ padding: '12px 18px', color: 'var(--ink-pure)' }}>
                      {m.performed_by?.full_name || 'Kỹ thuật viên bất kỳ'}
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
                        {isPending ? 'Chờ KTV Bàn Giao' : 'Đã Hoàn Tất'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 18px', color: 'var(--ink-muted)', fontSize: '12px' }}>
                      {new Date(m.created_at).toLocaleDateString('vi-VN')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Order Modal */}
      {showOrderModal && (
        <div className="ruo-drawer-backdrop" onClick={() => setShowOrderModal(false)}>
          <div className="ruo-drawer-panel" style={{ width: '540px' }} onClick={(e) => e.stopPropagation()}>
            <div className="ruo-drawer-header">
              <div>
                <h2 className="ruo-drawer-title">Ban Hành Lệnh Điều Chuyển Thiết Bị</h2>
                <p className="ruo-drawer-subtitle">Lệnh sẽ được gửi tới Kỹ thuật viên để thực hiện di chuyển thực địa</p>
              </div>
              <button onClick={() => setShowOrderModal(false)} className="ruo-drawer-close-btn"><Icons.X size={18} /></button>
            </div>

            <form onSubmit={handleOrderSubmit}>
              <div className="ruo-drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Chọn Thiết Bị Cần Điều Chuyển *
                  </label>
                  <select
                    required
                    value={orderForm.equipment_id}
                    onChange={(e) => setOrderForm({ ...orderForm, equipment_id: e.target.value })}
                    className="ruo-portal-input"
                    style={{ width: '100%', height: '38px', fontSize: '13px' }}
                  >
                    {equipments.map(eq => (
                      <option key={eq._id} value={eq._id}>
                        [{eq.code}] {eq.name} — Vị trí: {eq.room_id?.code || 'Kho dự phòng'} ({eq.status})
                      </option>
                    ))}
                  </select>
                </div>

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
                      {rooms.map(r => (
                        <option key={r._id} value={r._id}>
                          {r.type === 'warehouse' ? `[KHO] ${r.code}` : `${r.code} - ${r.name}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                      Chỉ Định Kỹ Thuật Viên Thực Hiện
                    </label>
                    <select
                      value={orderForm.performed_by}
                      onChange={(e) => setOrderForm({ ...orderForm, performed_by: e.target.value })}
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
                  {submitting ? 'Đang Ban Hành...' : 'Ban Hành Lệnh'}
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
