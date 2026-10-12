import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { useToast } from '../../context/ToastContext';
import { repairApi, authApi, equipmentApi, masterDataApi } from '../../lib/api';

export const TicketKanbanPage = () => {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [repairs, setRepairs] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [spareEquipments, setSpareEquipments] = useState([]);
  const [rooms, setRooms] = useState([]);

  // Active drawer & modals
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Forms
  const [assignForm, setAssignForm] = useState({
    assigned_to: '',
    damage_level: 'minor',
    deadline: '',
    replacement_equipment_id: ''
  });

  const [closeForm, setCloseForm] = useState({
    destination_room_id: ''
  });

  const columns = [
    { id: 'reported', title: 'MỚI TIẾP NHẬN', color: '#F59E0B' },
    { id: 'assigned', title: 'ĐÃ GIAO KTV', color: 'var(--laser-cyan)' },
    { id: 'in_progress', title: 'ĐANG XỬ LÝ', color: '#3B82F6' },
    { id: 'resolved', title: 'ĐÃ KHẮC PHỤC', color: '#10B981' },
    { id: 'unrepairable', title: 'KHÔNG THỂ SỬA', color: '#EF4444' },
    { id: 'closed', title: 'ĐÃ ĐÓNG PHIẾU', color: 'var(--ink-secondary)' }
  ];

  const fetchData = async () => {
    try {
      setLoading(true);
      const [repRes, techRes, eqRes, roomRes] = await Promise.all([
        repairApi.list(),
        authApi.listUsers({ role: 'technician' }),
        equipmentApi.list({ status: 'in_stock' }),
        masterDataApi.getRooms({ limit: 100 })
      ]);

      if (repRes && repRes.success) {
        setRepairs(repRes.repairs || []);
      }
      if (techRes && techRes.success) {
        setTechnicians(techRes.users || []);
      }
      if (eqRes && eqRes.success) {
        setSpareEquipments(eqRes.equipments || []);
      }
      if (roomRes && roomRes.success) {
        setRooms(roomRes.rooms || []);
      }
    } catch (err) {
      toast.error('Lỗi khi tải dữ liệu sửa chữa: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAssign = (ticket) => {
    setSelectedTicket(ticket);
    const defaultHours = ticket.damage_level === 'critical' ? 4 : ticket.damage_level === 'major' ? 24 : 48;
    const defaultDeadline = new Date(Date.now() + defaultHours * 3600 * 1000).toISOString().slice(0, 16);

    setAssignForm({
      assigned_to: technicians[0]?._id || '',
      damage_level: ticket.damage_level || 'minor',
      deadline: defaultDeadline,
      replacement_equipment_id: ''
    });
    setShowAssignModal(true);
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!assignForm.assigned_to) {
      toast.error('Vui lòng chọn Kỹ thuật viên phụ trách.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await repairApi.assign(selectedTicket._id, {
        assigned_to: assignForm.assigned_to,
        damage_level: assignForm.damage_level,
        deadline: assignForm.deadline ? new Date(assignForm.deadline) : null,
        replacement_equipment_id: assignForm.replacement_equipment_id || null
      });

      if (res && res.success) {
        toast.success(`Đã giao nhiệm vụ phiếu [${selectedTicket.ticket_code}] thành công!`);
        setShowAssignModal(false);
        await fetchData();
      }
    } catch (err) {
      toast.error('Lỗi khi phân công KTV: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openClose = (ticket) => {
    setSelectedTicket(ticket);
    const warehouseRoom = rooms.find(r => r.type === 'warehouse');
    setCloseForm({
      destination_room_id: ticket.room_id?._id || warehouseRoom?._id || ''
    });
    setShowCloseModal(true);
  };

  const handleCloseSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await repairApi.closeTicket(selectedTicket._id, {
        destination_room_id: closeForm.destination_room_id || null
      });

      if (res && res.success) {
        toast.success(`Đã nghiệm thu và đóng phiếu sửa chữa [${selectedTicket.ticket_code}]!`);
        setShowCloseModal(false);
        await fetchData();
      }
    } catch (err) {
      toast.error('Lỗi khi đóng phiếu: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', color: '#F59E0B', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>FACILITY MANAGER</span>
            <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>MODULE 04 • QUẢN LÝ VÒNG ĐỜI SỬA CHỮA (KANBAN SLA)</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink-pure)', letterSpacing: '-0.02em', margin: 0 }}>
            Trung Tâm Điều Phối Sửa Chữa Thiết Bị
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--ink-muted)' }}>
            Giao việc cho Kỹ thuật viên, cấp đồ dự phòng thay thế từ kho, duyệt linh kiện và chọn nơi về sau khi sửa xong.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="laser-btn laser-btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 16px', borderRadius: 'var(--radius-md)', fontSize: '13px' }}
        >
          <Icons.RefreshCw size={16} />
          <span>Làm Mới</span>
        </button>
      </div>

      {/* Kanban Board Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink-muted)' }}>
          <Icons.RefreshCw size={28} className="spin" style={{ marginBottom: '12px' }} />
          <div>Đang nạp bảng điều phối Kanban...</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '14px', alignItems: 'start' }}>
          {columns.map(col => {
            const colTickets = repairs.filter(r => r.status === col.id);

            return (
              <div
                key={col.id}
                style={{
                  background: 'var(--surface-card)',
                  border: '1px solid var(--hairline-medium)',
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: '400px'
                }}
              >
                {/* Column Header */}
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--hairline-medium)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: col.color }} />
                    <strong style={{ fontSize: '12.5px', color: 'var(--ink-pure)', letterSpacing: '0.02em' }}>{col.title}</strong>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 7px', borderRadius: '10px', background: 'var(--surface-panel)', color: 'var(--ink-secondary)' }}>
                    {colTickets.length}
                  </span>
                </div>

                {/* Column Body Cards */}
                <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflowY: 'auto', maxHeight: '700px' }}>
                  {colTickets.map(t => {
                    const eq = t.equipment_id || {};
                    const room = t.room_id || {};
                    const isReported = t.status === 'reported';
                    const isResolved = t.status === 'resolved';

                    return (
                      <div
                        key={t._id}
                        style={{
                          background: 'var(--surface-panel)',
                          border: '1px solid var(--hairline-soft)',
                          borderRadius: 'var(--radius-md)',
                          padding: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          cursor: 'pointer',
                          transition: 'border-color 0.15s'
                        }}
                        onClick={() => setSelectedTicket(t)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 800, color: 'var(--laser-cyan)' }}>
                            {t.ticket_code}
                          </span>
                          <span style={{ fontSize: '10.5px', fontWeight: 700, padding: '2px 6px', borderRadius: '3px', background: t.damage_level === 'critical' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)', color: t.damage_level === 'critical' ? '#EF4444' : '#F59E0B' }}>
                            {t.damage_level}
                          </span>
                        </div>

                        <div>
                          <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--ink-pure)' }}>{eq.name}</div>
                          <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>Phòng: {room.code || 'Chưa gán'}</div>
                        </div>

                        <div style={{ fontSize: '12px', color: 'var(--ink-secondary)', background: 'var(--surface-card)', padding: '6px 8px', borderRadius: '4px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {t.incident_description}
                        </div>

                        {t.assigned_to && (
                          <div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                            KTV: <strong style={{ color: 'var(--ink-pure)' }}>{t.assigned_to.full_name}</strong>
                          </div>
                        )}

                        {/* Quick action buttons */}
                        <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }} onClick={(e) => e.stopPropagation()}>
                          {isReported && (
                            <button
                              onClick={() => openAssign(t)}
                              className="laser-btn laser-btn-primary"
                              style={{ width: '100%', padding: '6px', fontSize: '11.5px', fontWeight: 700 }}
                            >
                              Giao KTV & Cấp Đồ
                            </button>
                          )}

                          {isResolved && (
                            <button
                              onClick={() => openClose(t)}
                              className="laser-btn laser-btn-primary"
                              style={{ width: '100%', padding: '6px', fontSize: '11.5px', fontWeight: 700 }}
                            >
                              Nghiệm Thu & Đóng Phiếu
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {colTickets.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '30px 0', fontSize: '12px', color: 'var(--hairline-medium)' }}>
                      Không có phiếu
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ticket Detail Drawer */}
      {selectedTicket && !showAssignModal && !showCloseModal && (
        <div className="ruo-drawer-backdrop" onClick={() => setSelectedTicket(null)}>
          <div className="ruo-drawer-panel" style={{ width: '580px' }} onClick={(e) => e.stopPropagation()}>
            <div className="ruo-drawer-header">
              <div>
                <h2 className="ruo-drawer-title">{selectedTicket.ticket_code}</h2>
                <p className="ruo-drawer-subtitle">{selectedTicket.equipment_id?.name} ({selectedTicket.equipment_id?.code})</p>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="ruo-drawer-close-btn"><Icons.X size={18} /></button>
            </div>

            <div className="ruo-drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: 'var(--surface-panel)', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '12.5px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                <div>Phòng học: <strong>{selectedTicket.room_id?.code}</strong></div>
                <div>Trạng thái: <strong>{selectedTicket.status}</strong></div>
                <div>Mức hư hỏng: <strong>{selectedTicket.damage_level}</strong></div>
                <div>KTV phụ trách: <strong>{selectedTicket.assigned_to?.full_name || 'Chưa giao'}</strong></div>
              </div>

              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ink-muted)', fontWeight: 700, marginBottom: '4px' }}>
                  Mô Tả Sự Cố
                </div>
                <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', padding: '10px 12px', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
                  {selectedTicket.incident_description}
                </div>
              </div>

              {selectedTicket.replacement_equipment_id && (
                <div style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.25)', padding: '10px 12px', borderRadius: 'var(--radius-md)', fontSize: '12.5px' }}>
                  Thiết bị dự phòng thay thế đã cấp: <strong>{selectedTicket.replacement_equipment_id?.name} ({selectedTicket.replacement_equipment_id?.code})</strong>
                </div>
              )}

              {selectedTicket.feedback_rating && (
                <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', padding: '10px 12px', borderRadius: 'var(--radius-md)', fontSize: '12.5px' }}>
                  <div>Đánh giá của Giảng viên: <strong style={{ color: '#F59E0B' }}>{'★'.repeat(selectedTicket.feedback_rating)} ({selectedTicket.feedback_rating}/5 sao)</strong></div>
                  {selectedTicket.feedback_comment && <div style={{ marginTop: '2px', color: 'var(--ink-secondary)' }}>"{selectedTicket.feedback_comment}"</div>}
                </div>
              )}
            </div>

            <div className="ruo-drawer-footer">
              {selectedTicket.status === 'reported' && (
                <button onClick={() => openAssign(selectedTicket)} className="laser-btn laser-btn-primary" style={{ padding: '8px 20px', fontWeight: 700 }}>
                  Giao Nhiệm Vụ Cho KTV
                </button>
              )}
              {selectedTicket.status === 'resolved' && (
                <button onClick={() => openClose(selectedTicket)} className="laser-btn laser-btn-primary" style={{ padding: '8px 20px', fontWeight: 700 }}>
                  Nghiệm Thu & Đóng Phiếu
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && selectedTicket && (
        <div className="ruo-drawer-backdrop" onClick={() => setShowAssignModal(false)}>
          <div className="ruo-drawer-panel" style={{ width: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="ruo-drawer-header">
              <div>
                <h2 className="ruo-drawer-title">Phân Công Kỹ Thuật Viên & Cấp Đồ Dự Phòng</h2>
                <p className="ruo-drawer-subtitle">{selectedTicket.ticket_code}</p>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="ruo-drawer-close-btn"><Icons.X size={18} /></button>
            </div>

            <form onSubmit={handleAssignSubmit}>
              <div className="ruo-drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Chọn Kỹ Thuật Viên Phụ Trách *
                  </label>
                  <select
                    required
                    value={assignForm.assigned_to}
                    onChange={(e) => setAssignForm({ ...assignForm, assigned_to: e.target.value })}
                    className="ruo-portal-input"
                    style={{ width: '100%', height: '38px' }}
                  >
                    {technicians.map(t => (
                      <option key={t._id} value={t._id}>
                        {t.full_name} ({t.code} • {t.department || 'Tổ Kỹ Thuật CSVC'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Mức Độ Hư Hỏng & Thời Hạn SLA
                  </label>
                  <select
                    value={assignForm.damage_level}
                    onChange={(e) => setAssignForm({ ...assignForm, damage_level: e.target.value })}
                    className="ruo-portal-input"
                    style={{ width: '100%', height: '38px' }}
                  >
                    <option value="minor">Hỏng Nhẹ (Minor - SLA 48h)</option>
                    <option value="major">Hỏng Nặng (Major - SLA 24h)</option>
                    <option value="critical">Khẩn Cấp (Critical - SLA 4h)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Hạn Xử Lý Hoàn Tất (SLA Deadline)
                  </label>
                  <input
                    type="datetime-local"
                    value={assignForm.deadline}
                    onChange={(e) => setAssignForm({ ...assignForm, deadline: e.target.value })}
                    className="ruo-portal-input"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Chọn Thiết Bị Dự Phòng Từ Kho KHO-01 (Tùy chọn)
                  </label>
                  <select
                    value={assignForm.replacement_equipment_id}
                    onChange={(e) => setAssignForm({ ...assignForm, replacement_equipment_id: e.target.value })}
                    className="ruo-portal-input"
                    style={{ width: '100%', height: '38px' }}
                  >
                    <option value="">-- Không cấp đồ dự phòng --</option>
                    {spareEquipments.map(eq => (
                      <option key={eq._id} value={eq._id}>
                        {eq.code} - {eq.name} ({eq.brand} {eq.model})
                      </option>
                    ))}
                  </select>
                  <div style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '4px' }}>
                    Hệ thống sẽ tự động tạo lệnh di chuyển [replacement] từ kho sang phòng học cho KTV xác nhận.
                  </div>
                </div>
              </div>

              <div className="ruo-drawer-footer">
                <button type="button" onClick={() => setShowAssignModal(false)} className="laser-btn laser-btn-secondary" style={{ padding: '8px 16px' }}>Hủy Bỏ</button>
                <button type="submit" disabled={submitting} className="laser-btn laser-btn-primary" style={{ padding: '8px 20px', fontWeight: 700 }}>
                  {submitting ? 'Đang Phân Công...' : 'Xác Nhận Giao Việc'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Modal */}
      {showCloseModal && selectedTicket && (
        <div className="ruo-drawer-backdrop" onClick={() => setShowCloseModal(false)}>
          <div className="ruo-drawer-panel" style={{ width: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="ruo-drawer-header">
              <div>
                <h2 className="ruo-drawer-title">Nghiệm Thu & Chọn Nơi Về Sau Sửa</h2>
                <p className="ruo-drawer-subtitle">{selectedTicket.ticket_code}</p>
              </div>
              <button onClick={() => setShowCloseModal(false)} className="ruo-drawer-close-btn"><Icons.X size={18} /></button>
            </div>

            <form onSubmit={handleCloseSubmit}>
              <div className="ruo-drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ fontSize: '12.5px', color: 'var(--ink-secondary)' }}>
                  Theo quy chuẩn vận hành: Nếu phòng học ban đầu đã đủ định mức (hoặc đã được cấp thiết bị dự phòng), thiết bị sau khi sửa xong sẽ được điều chuyển về <strong>Kho dự phòng KHO-01</strong>.
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                    Chọn Nơi Về Của Thiết Bị Sau Sửa Chữa *
                  </label>
                  <select
                    required
                    value={closeForm.destination_room_id}
                    onChange={(e) => setCloseForm({ destination_room_id: e.target.value })}
                    className="ruo-portal-input"
                    style={{ width: '100%', height: '40px', fontSize: '13px' }}
                  >
                    {rooms.map(r => (
                      <option key={r._id} value={r._id}>
                        {r.type === 'warehouse' ? `[KHO DỰ PHÒNG] ${r.code} - ${r.name}` : `${r.code} - ${r.name}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="ruo-drawer-footer">
                <button type="button" onClick={() => setShowCloseModal(false)} className="laser-btn laser-btn-secondary" style={{ padding: '8px 16px' }}>Hủy Bỏ</button>
                <button type="submit" disabled={submitting} className="laser-btn laser-btn-primary" style={{ padding: '8px 20px', fontWeight: 700 }}>
                  {submitting ? 'Đang Đóng Phiếu...' : 'Xác Nhận & Đóng Phiếu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketKanbanPage;
