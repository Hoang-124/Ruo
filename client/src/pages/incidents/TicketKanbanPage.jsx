import React, { useState } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { SLABadge } from '../../components/ui/SLABadge';
import { TICKETS as initialTickets } from '../../mock/mockData';

export const TicketKanbanPage = () => {
  const [tickets, setTickets] = useState(initialTickets);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTicketData, setNewTicketData] = useState({
    roomCode: 'A1-302',
    equipmentName: 'Máy chiếu Sony',
    title: '',
    description: '',
    priority: 'high'
  });

  const columns = [
    { id: 'open', title: 'MỚI TẠO', badgeType: 'neutral', icon: Icons.Clock },
    { id: 'assigned', title: 'ĐÃ PHÂN CÔNG', badgeType: 'primary', icon: Icons.User },
    { id: 'in_progress', title: 'ĐANG XỬ LÝ', badgeType: 'warning', icon: Icons.Wrench },
    { id: 'resolved', title: 'ĐÃ KHẮC PHỤC (CHỜ DUYỆT)', badgeType: 'purple', icon: Icons.CheckCircle },
    { id: 'closed', title: 'ĐÃ ĐÓNG (HOÀN TẤT)', badgeType: 'success', icon: Icons.Shield }
  ];

  const handleCreateTicket = () => {
    if (!newTicketData.title) {
      alert('Vui lòng nhập mô tả tóm tắt sự cố!');
      return;
    }
    const newT = {
      id: `TCK-2026-${String(tickets.length + 45).padStart(4, '0')}`,
      roomCode: newTicketData.roomCode,
      equipmentName: newTicketData.equipmentName,
      title: newTicketData.title,
      description: newTicketData.description || 'Không có mô tả thêm.',
      priority: newTicketData.priority,
      priorityLabel: newTicketData.priority.toUpperCase(),
      status: 'open',
      statusLabel: 'Mới tạo',
      reporterName: 'Trần Bảo Hoàng',
      reporterRole: 'Sinh viên',
      reportedAt: 'Vừa xong',
      slaRemainingMinutes: newTicketData.priority === 'critical' ? 240 : 480,
      slaTotalHours: newTicketData.priority === 'critical' ? 4 : 8,
      slaState: 'on_track',
      assignedTo: 'Chưa phân công',
      images: [],
      timeline: [{ time: 'Vừa xong', event: 'Khởi tạo phiếu báo sự cố' }]
    };
    setTickets([newT, ...tickets]);
    setShowNewModal(false);
    setNewTicketData({ roomCode: 'A1-302', equipmentName: '', title: '', description: '', priority: 'high' });
  };

  const handleMoveStatus = (ticketId, nextStatus) => {
    setTickets(prev => prev.map(t => {
      if (t.id === ticketId) {
        return {
          ...t,
          status: nextStatus,
          timeline: [...t.timeline, { time: 'Vừa xong', event: `Chuyển trạng thái sang ${nextStatus.toUpperCase()}` }]
        };
      }
      return t;
    }));
    if (selectedTicket && selectedTicket.id === ticketId) {
      setSelectedTicket(prev => ({ ...prev, status: nextStatus }));
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Quản Lý Sự Cố & Kanban Giám Sát SLA (Trụ Cột 3)</h1>
          <div className="page-subtitle">
            Hệ thống tính giờ làm việc hành chính (Business Hours Only) và cảnh báo sớm 3 giai đoạn: On Track • At Risk • Overdue
          </div>
        </div>

        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => setShowNewModal(true)}>
            <Icons.Plus size={16} />
            <span>Báo Cáo Sự Cố Mới</span>
          </button>
        </div>
      </div>

      {/* Kanban Board Columns Container */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '16px',
          alignItems: 'start',
          overflowX: 'auto',
          minWidth: '1100px',
          paddingBottom: '20px'
        }}
      >
        {columns.map((col) => {
          const colTickets = tickets.filter(t => t.status === col.id);
          const ColIcon = col.icon;
          return (
            <div
              key={col.id}
              style={{
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-color)',
                padding: '14px',
                minHeight: '520px',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Column Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '14px',
                  paddingBottom: '10px',
                  borderBottom: '1px solid var(--border-color)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '13px' }}>
                  <ColIcon size={16} color="var(--color-primary-600)" />
                  <span>{col.title}</span>
                </div>
                <span className={`badge badge-${col.badgeType}`}>
                  {colTickets.length}
                </span>
              </div>

              {/* Tickets in this Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                {colTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    style={{
                      background: 'var(--bg-page)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                      boxShadow: 'var(--shadow-xs)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--color-primary-400)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                      e.currentTarget.style.transform = 'none';
                    }}
                  >
                    {/* Ticket Code & Priority Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '12px', color: 'var(--color-primary-700)' }}>
                        {ticket.id}
                      </span>
                      <span
                        className={`badge ${
                          ticket.priority === 'critical'
                            ? 'badge-danger sla-overdue-pulse'
                            : ticket.priority === 'high'
                            ? 'badge-warning'
                            : 'badge-primary'
                        }`}
                        style={{ fontSize: '10px' }}
                      >
                        {ticket.priority.toUpperCase()}
                      </span>
                    </div>

                    {/* Title & Room */}
                    <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.3 }}>
                      {ticket.title}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Icons.Room size={12} /> {ticket.roomCode}
                      </span>
                      <span>•</span>
                      <span>{ticket.equipmentName}</span>
                    </div>

                    {/* SLA Badge */}
                    <div style={{ marginTop: '4px' }}>
                      <SLABadge
                        slaState={ticket.slaState}
                        remainingMinutes={ticket.slaRemainingMinutes}
                        totalHours={ticket.slaTotalHours}
                      />
                    </div>

                    {/* Assigned info */}
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <Icons.User size={12} />
                      <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {ticket.assignedTo}
                      </span>
                    </div>
                  </div>
                ))}

                {colTickets.length === 0 && (
                  <div
                    style={{
                      border: '2px dashed var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '32px 16px',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      fontSize: '12px'
                    }}
                  >
                    Không có ticket nào
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Ticket Detail Drawer Panel */}
      {selectedTicket && (
        <div className="modal-overlay" onClick={() => setSelectedTicket(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '600px' }}
          >
            <div className="modal-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--color-primary-700)', fontSize: '16px' }}>
                    {selectedTicket.id}
                  </span>
                  <span className={`badge ${selectedTicket.priority === 'critical' ? 'badge-danger' : 'badge-warning'}`}>
                    {selectedTicket.priorityLabel}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Báo cáo bởi: {selectedTicket.reporterName} ({selectedTicket.reporterRole}) lúc {selectedTicket.reportedAt}
                </div>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="icon-btn">
                <Icons.X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <h3 style={{ fontSize: '17px', fontWeight: 800, marginBottom: '8px' }}>
                {selectedTicket.title}
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '20px' }}>
                {selectedTicket.description}
              </p>

              {/* SLA Engine Metrics Card */}
              <div
                style={{
                  background: 'var(--bg-card-subtle)',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  marginBottom: '20px'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Icons.Clock size={16} color="var(--color-primary-600)" />
                  Cam Kết Thời Gian Giải Quyết (SLA Matrix):
                </div>
                <div className="grid-cols-2" style={{ gap: '10px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Tiêu chuẩn SLA:</span>{' '}
                    <strong>{selectedTicket.slaTotalHours} giờ hành chính</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Kỹ thuật viên phụ trách:</span>{' '}
                    <strong>{selectedTicket.assignedTo}</strong>
                  </div>
                </div>
                <div style={{ marginTop: '10px' }}>
                  <SLABadge
                    slaState={selectedTicket.slaState}
                    remainingMinutes={selectedTicket.slaRemainingMinutes}
                    totalHours={selectedTicket.slaTotalHours}
                  />
                </div>
              </div>

              {/* Double Confirmation Flow (UC-1.18: Nghiệm thu 2 chiều) */}
              {selectedTicket.status === 'resolved' && (
                <div
                  style={{
                    background: 'var(--color-purple-50)',
                    border: '1px solid var(--color-purple-500)',
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '20px'
                  }}
                >
                  <h4 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-purple-700)', marginBottom: '6px' }}>
                    Quy trình Nghiệm thu Đóng Ticket 2 Chiều:
                  </h4>
                  <p style={{ fontSize: '13px', color: 'var(--color-purple-700)', marginBottom: '12px' }}>
                    Kỹ thuật viên đã báo cáo sửa chữa xong. Bạn vui lòng xác nhận kết quả hoạt động tại hiện trường:
                  </p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => handleMoveStatus(selectedTicket.id, 'closed')}
                    >
                      <Icons.CheckCircle size={14} /> Hài Lòng & Đóng Ticket (5 Sao)
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ color: 'var(--color-danger-600)', borderColor: 'var(--color-danger-500)' }}
                      onClick={() => handleMoveStatus(selectedTicket.id, 'in_progress')}
                    >
                      Chưa khắc phục xong (Yêu cầu làm lại)
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons to Move Ticket */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  CHUYỂN TRẠNG THÁI TIẾN TRÌNH:
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleMoveStatus(selectedTicket.id, 'assigned')}>
                    Đã Gán
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleMoveStatus(selectedTicket.id, 'in_progress')}>
                    Đang Xử Lý
                  </button>
                  <button className="btn btn-purple btn-sm" onClick={() => handleMoveStatus(selectedTicket.id, 'resolved')}>
                    Đã Khắc Phục (Resolved)
                  </button>
                  <button className="btn btn-success btn-sm" onClick={() => handleMoveStatus(selectedTicket.id, 'closed')}>
                    Đóng Ticket (Closed)
                  </button>
                </div>
              </div>

              {/* Timeline */}
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px' }}>Dòng Thời Gian Xử Lý:</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                  {selectedTicket.timeline.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', width: '80px' }}>
                        {item.time}
                      </span>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-primary-500)' }} />
                      <span>{item.event}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Incident Report Modal */}
      {showNewModal && (
        <div className="modal-overlay" onClick={() => setShowNewModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Tạo Báo Cáo Sự Cố Cơ Sở Vật Chất</h3>
              <button onClick={() => setShowNewModal(false)} className="icon-btn">
                <Icons.X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="grid-cols-2">
                <div className="form-group">
                  <label className="form-label">Phòng xảy ra sự cố</label>
                  <select
                    className="form-control"
                    value={newTicketData.roomCode}
                    onChange={(e) => setNewTicketData({ ...newTicketData, roomCode: e.target.value })}
                  >
                    <option value="A1-302">A1-302 (Phòng lý thuyết)</option>
                    <option value="B2-105">B2-105 (Lab máy tính)</option>
                    <option value="A1-405">A1-405 (Hội trường)</option>
                    <option value="B1-201">B1-201 (Lab vi mạch)</option>
                    <option value="C1-304">C1-304 (Smart classroom)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Mức độ khẩn cấp (SLA)</label>
                  <select
                    className="form-control"
                    value={newTicketData.priority}
                    onChange={(e) => setNewTicketData({ ...newTicketData, priority: e.target.value })}
                  >
                    <option value="critical">[CRITICAL] Khẩn cấp (Cháy nổ, ngập, cúp điện - SLA 4h 24/7)</option>
                    <option value="high">[HIGH] Cao (Hỏng máy chiếu, điều hòa - SLA 8h)</option>
                    <option value="medium">[MEDIUM] Trung bình (Cháy bóng đèn, micro rè - SLA 24h)</option>
                    <option value="low">[LOW] Thấp (Bàn ghế lỏng vít, rách rèm - SLA 48h)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Thiết bị gặp sự cố</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="VD: Máy chiếu Sony, Điều hòa Daikin, Bóng đèn trần..."
                  value={newTicketData.equipmentName}
                  onChange={(e) => setNewTicketData({ ...newTicketData, equipmentName: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tiêu đề sự cố</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Mô tả vắn tắt hiện tượng hỏng hóc..."
                  value={newTicketData.title}
                  onChange={(e) => setNewTicketData({ ...newTicketData, title: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mô tả chi tiết & vị trí hiện trường</label>
                <textarea
                  rows="3"
                  className="form-control"
                  placeholder="Nhập chi tiết hiện tượng để kỹ thuật viên chuẩn bị sẵn linh kiện thay thế..."
                  value={newTicketData.description}
                  onChange={(e) => setNewTicketData({ ...newTicketData, description: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowNewModal(false)}>
                Hủy bỏ
              </button>
              <button className="btn btn-primary" onClick={handleCreateTicket}>
                <Icons.CheckCircle size={16} /> Gửi Báo Cáo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
