import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { repairApi, equipmentApi } from '../../lib/api';
import { Button, Card, StatusBadge, Drawer, EmptyState } from '../../components/ui/Primitives';

export const TicketKanbanPage = () => {
  const { currentUser, currentRoleKey } = useAuth();
  const { toast } = useToast();

  const isManagerOrAdmin = ['manager', 'admin'].includes(currentRoleKey);
  const isStaffOrAdmin = ['staff', 'admin'].includes(currentRoleKey);

  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);

  // New ticket state
  const [newTicket, setNewTicket] = useState({
    equipment_code: '',
    incident_description: '',
    damage_level: 'minor'
  });
  const [submitting, setSubmitting] = useState(false);

  // New log / cost state
  const [logData, setLogData] = useState({
    action: 'repaired',
    description: '',
    cost: 0
  });

  const columns = [
    { id: 'reported', title: 'MỚI BÁO SỰ CỐ', color: '#64748B', count: 0 },
    { id: 'assigned', title: 'ĐÃ PHÂN CÔNG', color: '#3E7BFA', count: 0 },
    { id: 'in_progress', title: 'ĐANG XỬ LÝ', color: '#E5A33B', count: 0 },
    { id: 'resolved', title: 'ĐÃ KHẮC PHỤC', color: '#8B5CF6', count: 0 },
    { id: 'closed', title: 'ĐÃ ĐÓNG / NGHIỆM THU', color: '#2FB37A', count: 0 }
  ];

  const fetchRepairs = async () => {
    setLoading(true);
    try {
      const res = await repairApi.list();
      if (res.success) {
        setRepairs(res.repairs || []);
      }
    } catch (err) {
      toast.error('Lỗi khi tải danh sách sửa chữa: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepairs();
  }, []);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!newTicket.equipment_code || !newTicket.incident_description) {
      toast.error('Vui lòng cung cấp mã thiết bị và mô tả sự cố.');
      return;
    }

    setSubmitting(true);
    try {
      const eqRes = await equipmentApi.getByCode(newTicket.equipment_code.trim().toUpperCase());
      if (!eqRes.success || !eqRes.equipment) {
        toast.error('Không tìm thấy thiết bị với mã: ' + newTicket.equipment_code);
        setSubmitting(false);
        return;
      }

      const res = await repairApi.create({
        equipment_id: eqRes.equipment._id,
        incident_description: newTicket.incident_description.trim(),
        damage_level: newTicket.damage_level
      });

      if (res.success) {
        toast.success('Đã tạo phiếu báo hỏng thiết bị thành công!');
        setShowCreateModal(false);
        setNewTicket({ equipment_code: '', incident_description: '', damage_level: 'minor' });
        fetchRepairs();
      }
    } catch (err) {
      toast.error('Lỗi tạo phiếu báo hỏng: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (repairId, nextStatus) => {
    try {
      const res = await repairApi.updateStatus(repairId, nextStatus, `Chuyển trạng thái sang ${nextStatus}`);
      if (res.success) {
        toast.success(`Đã cập nhật trạng thái phiếu sang ${nextStatus}!`);
        fetchRepairs();
        if (selectedTicket && selectedTicket._id === repairId) {
          setSelectedTicket(prev => ({ ...prev, status: nextStatus }));
        }
      }
    } catch (err) {
      toast.error('Không thể chuyển trạng thái: ' + err.message);
    }
  };

  const handleAddLogSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTicket || !logData.description) return;

    try {
      const res = await repairApi.addLog(selectedTicket._id, {
        action: logData.action,
        description: logData.description,
        cost: Number(logData.cost) || 0
      });

      if (res.success) {
        toast.success('Đã ghi nhận nhật ký kỹ thuật & cập nhật chi phí khấu hao!');
        setShowLogModal(false);
        setLogData({ action: 'repaired', description: '', cost: 0 });
        fetchRepairs();
      }
    } catch (err) {
      toast.error('Lỗi thêm nhật ký sửa chữa: ' + err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'var(--ink-primary)' }}>
            Sự Cố & Sửa Chữa Thiết Bị (Kanban SLA)
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--ink-muted)' }}>
            Theo dõi tiến độ sửa chữa, nhật ký kỹ thuật và cập nhật tỷ lệ chi phí sửa chữa R% theo thời gian thực
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isStaffOrAdmin && (
            <Button variant="primary" icon={Icons.Plus} onClick={() => setShowCreateModal(true)}>
              Báo Cáo Sự Cố Mới
            </Button>
          )}
          <Button variant="secondary" onClick={fetchRepairs}>
            Làm Mới
          </Button>
        </div>
      </div>

      {/* Kanban Board Container */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(260px, 1fr))',
          gap: '16px',
          overflowX: 'auto',
          paddingBottom: '20px'
        }}
      >
        {columns.map(col => {
          const colTickets = repairs.filter(r => r.status === col.id);
          return (
            <div
              key={col.id}
              style={{
                background: 'var(--surface-1)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '600px'
              }}
            >
              {/* Column Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: '12px',
                  marginBottom: '12px',
                  borderBottom: `2px solid ${col.color}`
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: col.color }} />
                  <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--ink-primary)', letterSpacing: '0.04em' }}>
                    {col.title}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 'var(--radius-xs)',
                    background: 'var(--surface-3)',
                    color: 'var(--ink-muted)'
                  }}
                >
                  {colTickets.length}
                </span>
              </div>

              {/* Cards List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                {colTickets.map(ticket => {
                  const eq = ticket.equipment_id;
                  return (
                    <div
                      key={ticket._id}
                      onClick={() => setSelectedTicket(ticket)}
                      style={{
                        background: 'var(--surface-card)',
                        border: '1px solid var(--border-default)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '12px',
                        cursor: 'pointer',
                        boxShadow: 'var(--shadow-card)',
                        transition: 'transform var(--duration-fast)',
                        borderLeft: `3px solid ${col.color}`
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700, color: 'var(--blueprint-400)' }}>
                          {ticket.ticket_code || ticket._id.slice(-6)}
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: 'var(--radius-xs)',
                            background: ticket.damage_level === 'major' ? 'rgba(229,72,77,0.15)' : 'rgba(229,163,59,0.15)',
                            color: ticket.damage_level === 'major' ? '#E5484D' : '#E5A33B'
                          }}
                        >
                          {ticket.damage_level === 'major' ? 'HỎNG NẶNG' : 'HỎNG NHẸ'}
                        </span>
                      </div>

                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink-primary)', marginBottom: '4px' }}>
                        {eq?.name || 'Thiết bị'}
                      </div>

                      <div style={{ fontSize: '12px', color: 'var(--ink-muted)', marginBottom: '10px', lineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {ticket.incident_description}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)', fontSize: '11px', color: 'var(--ink-muted)' }}>
                        <span>Mã: <strong style={{ color: 'var(--ink-secondary)', fontFamily: 'var(--font-mono)' }}>{eq?.code || '—'}</strong></span>
                        {ticket.total_cost > 0 && (
                          <span style={{ color: '#E5A33B', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                            {Number(ticket.total_cost).toLocaleString('vi-VN')} đ
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {colTickets.length === 0 && (
                  <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--ink-muted)', fontSize: '12px' }}>
                    Không có phiếu
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Ticket Detail Drawer */}
      {selectedTicket && (
        <Drawer
          isOpen={Boolean(selectedTicket)}
          onClose={() => setSelectedTicket(null)}
          title={`Phiếu Sửa Chữa #${selectedTicket.ticket_code || selectedTicket._id.slice(-6)}`}
          subtitle={selectedTicket.equipment_id?.name}
          width="540px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Status & Actions */}
            <div style={{ background: 'var(--surface-2)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: '8px' }}>
                Trạng Thái & Thao Tác Chuyển Giao
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <StatusBadge status={selectedTicket.status} />

                {selectedTicket.status === 'reported' && isStaffOrAdmin && (
                  <Button size="sm" variant="primary" onClick={() => handleStatusChange(selectedTicket._id, 'assigned')}>
                    Tiếp Nhận & Giao Việc
                  </Button>
                )}

                {selectedTicket.status === 'assigned' && isStaffOrAdmin && (
                  <Button size="sm" variant="primary" onClick={() => handleStatusChange(selectedTicket._id, 'in_progress')}>
                    Bắt Đầu Xử Lý
                  </Button>
                )}

                {selectedTicket.status === 'in_progress' && isStaffOrAdmin && (
                  <>
                    <Button size="sm" variant="secondary" onClick={() => setShowLogModal(true)}>
                      + Ghi Nhật Ký / Chi Phí
                    </Button>
                    <Button size="sm" variant="primary" onClick={() => handleStatusChange(selectedTicket._id, 'resolved')}>
                      Khắc Phục Xong
                    </Button>
                  </>
                )}

                {selectedTicket.status === 'resolved' && isManagerOrAdmin && (
                  <Button size="sm" variant="primary" onClick={() => handleStatusChange(selectedTicket._id, 'closed')}>
                    Quản Lý Xác Nhận & Đóng Phiếu
                  </Button>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: '4px' }}>
                Mô tả hiện tượng hỏng hóc
              </div>
              <p style={{ background: 'var(--surface-2)', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '13px', margin: 0, color: 'var(--ink-primary)' }}>
                {selectedTicket.incident_description}
              </p>
            </div>

            {/* Equipment Info */}
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: '4px' }}>
                Thiết Bị Liên Quan
              </div>
              <div style={{ background: 'var(--surface-2)', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '12.5px' }}>
                <div>Mã thiết bị: <strong style={{ fontFamily: 'var(--font-mono)' }}>{selectedTicket.equipment_id?.code}</strong></div>
                <div>Tên thiết bị: {selectedTicket.equipment_id?.name}</div>
                <div>Mức độ thiệt hại: <strong style={{ color: selectedTicket.damage_level === 'major' ? '#E5484D' : '#E5A33B' }}>{selectedTicket.damage_level}</strong></div>
                <div>Tổng chi phí sửa chữa: <strong style={{ fontFamily: 'var(--font-mono)', color: '#E5A33B' }}>{Number(selectedTicket.total_cost || 0).toLocaleString('vi-VN')} đ</strong></div>
              </div>
            </div>
          </div>
        </Drawer>
      )}

      {/* Log Cost Modal */}
      {showLogModal && (
        <div className="ruo-drawer-backdrop" onClick={() => setShowLogModal(false)}>
          <div className="ruo-drawer-panel" style={{ width: '440px', height: 'auto', margin: 'auto', borderRadius: 'var(--radius-md)' }} onClick={e => e.stopPropagation()}>
            <div className="ruo-drawer-header">
              <h2 className="ruo-drawer-title">Ghi Nhật Ký Sửa Chữa & Chi Phí</h2>
              <button onClick={() => setShowLogModal(false)} className="ruo-drawer-close-btn">
                <Icons.X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddLogSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '4px' }}>Hành động kỹ thuật</label>
                <select
                  className="ruo-portal-input"
                  value={logData.action}
                  onChange={e => setLogData({ ...logData, action: e.target.value })}
                >
                  <option value="repaired">Sửa chữa / Căn chỉnh thiết bị</option>
                  <option value="parts_replaced">Thay thế linh kiện</option>
                  <option value="tested">Kiểm thử hoạt động</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '4px' }}>Chi phí phát sinh (VND)</label>
                <input
                  type="number"
                  className="ruo-portal-input"
                  value={logData.cost}
                  onChange={e => setLogData({ ...logData, cost: e.target.value })}
                />
                <span style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '4px', display: 'block' }}>
                  Chi phí này sẽ tự động cập nhật vào chi phí tích lũy của thiết bị để tính toán chỉ số R%.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '4px' }}>Mô tả chi tiết</label>
                <textarea
                  className="ruo-portal-input"
                  style={{ minHeight: '70px', padding: '10px' }}
                  placeholder="Ghi rõ bộ phận đã sửa hoặc linh kiện thay thế..."
                  value={logData.description}
                  onChange={e => setLogData({ ...logData, description: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <Button variant="ghost" onClick={() => setShowLogModal(false)}>Hủy</Button>
                <Button type="submit" variant="primary">Lưu Nhật Ký</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div className="ruo-drawer-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="ruo-drawer-panel" style={{ width: '480px' }} onClick={e => e.stopPropagation()}>
            <div className="ruo-drawer-header">
              <h2 className="ruo-drawer-title">Báo Cáo Sự Cố Thiết Bị Mới</h2>
              <button onClick={() => setShowCreateModal(false)} className="ruo-drawer-close-btn">
                <Icons.X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateTicket} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '4px' }}>Mã thiết bị gặp sự cố *</label>
                <input
                  type="text"
                  className="ruo-portal-input"
                  placeholder="Ví dụ: EQ-PRJ-101 hoặc EQ-TV-201"
                  value={newTicket.equipment_code}
                  onChange={e => setNewTicket({ ...newTicket, equipment_code: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '4px' }}>Mức độ hỏng hóc *</label>
                <select
                  className="ruo-portal-input"
                  value={newTicket.damage_level}
                  onChange={e => setNewTicket({ ...newTicket, damage_level: e.target.value })}
                >
                  <option value="minor">Hỏng nhẹ (Sửa chữa trong ngày - SLA 4h)</option>
                  <option value="major">Hỏng nặng (Cần thay thế linh kiện bo mạch - SLA 24h)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '4px' }}>Mô tả hiện tượng sự cố *</label>
                <textarea
                  className="ruo-portal-input"
                  style={{ minHeight: '90px', padding: '10px' }}
                  placeholder="Mô tả cụ thể hiện tượng: mất nguồn, chập cháy, nhấp nháy đèn báo lỗi..."
                  value={newTicket.incident_description}
                  onChange={e => setNewTicket({ ...newTicket, incident_description: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Hủy</Button>
                <Button type="submit" variant="primary" loading={submitting}>Tạo Phiếu Sự Cố</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketKanbanPage;
