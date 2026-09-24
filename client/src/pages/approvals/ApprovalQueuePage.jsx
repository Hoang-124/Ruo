import React, { useState } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { PENDING_REQUESTS } from '../../mock/mockData';

export const ApprovalQueuePage = () => {
  const [requests, setRequests] = useState(PENDING_REQUESTS);
  const [selectedReq, setSelectedReq] = useState(PENDING_REQUESTS[0]);
  const [filterTab, setFilterTab] = useState('all');

  const filtered = requests.filter(r => {
    if (filterTab === 'room') return r.type === 'room_booking' || r.type === 'series_booking';
    if (filterTab === 'equipment') return r.type === 'equipment_borrow';
    if (filterTab === 'escalated') return r.isEscalated;
    return true;
  });

  const handleApprove = (id) => {
    alert(`Đã phê duyệt thành công yêu cầu ${id}! Hệ thống đã khóa slot trên Calendar và gửi mã QR qua email.`);
    setRequests(prev => prev.filter(r => r.id !== id));
    if (selectedReq && selectedReq.id === id) {
      setSelectedReq(requests.find(r => r.id !== id) || null);
    }
  };

  const handleReject = (id) => {
    const reason = prompt('Nhập lý do từ chối yêu cầu mượn:');
    if (reason) {
      alert(`Đã từ chối đơn ${id}. Lý do: ${reason}`);
      setRequests(prev => prev.filter(r => r.id !== id));
      if (selectedReq && selectedReq.id === id) {
        setSelectedReq(requests.find(r => r.id !== id) || null);
      }
    }
  };

  const handleEscalate = (id) => {
    alert(`Đã chuyển cấp đơn ${id} lên Phòng Quản lý Đào tạo phê duyệt theo quy chế vượt thẩm quyền!`);
    setRequests(prev => prev.map(r => r.id === id ? { ...r, isEscalated: true, escalationReason: 'Chuyển cấp thủ công từ chuyên viên CSVC' } : r));
  };

  return (
    <div style={{ paddingBottom: '60px' }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Hàng Đợi Duyệt Yêu Cầu & Cơ Chế Chuyển Cấp (Escalation Engine)</h1>
          <div className="page-subtitle">
            Tự động phát hiện 4 ngưỡng kích hoạt chuyển cấp (Trụ Cột 2) lên Phòng Đào tạo
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button
          className={`btn ${filterTab === 'all' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setFilterTab('all')}
        >
          Tất cả yêu cầu ({requests.length})
        </button>
        <button
          className={`btn ${filterTab === 'room' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setFilterTab('room')}
        >
          Đặt phòng ({requests.filter(r => r.type.includes('booking')).length})
        </button>
        <button
          className={`btn ${filterTab === 'equipment' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setFilterTab('equipment')}
        >
          Mượn thiết bị ({requests.filter(r => r.type === 'equipment_borrow').length})
        </button>
        <button
          className={`btn ${filterTab === 'escalated' ? 'btn-purple' : 'btn-secondary'} btn-sm`}
          onClick={() => setFilterTab('escalated')}
        >
          <Icons.Shield size={14} />
          Chuyển cấp Escalated ({requests.filter(r => r.isEscalated).length})
        </button>
      </div>

      {/* Split View: Left List (40%) + Right Detail (60%) */}
      <div style={{ display: 'grid', gridTemplateColumns: '40% 60%', gap: '20px', alignItems: 'start' }}>
        {/* Left List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map((req) => {
            const isSelected = selectedReq && selectedReq.id === req.id;
            return (
              <div
                key={req.id}
                onClick={() => setSelectedReq(req)}
                className="card"
                style={{
                  padding: '16px',
                  cursor: 'pointer',
                  borderLeft: isSelected ? '4px solid var(--color-primary-600)' : '1px solid var(--border-color)',
                  background: isSelected ? 'var(--color-primary-50)' : 'var(--bg-card)',
                  transition: 'all var(--transition-fast)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-primary)' }}>
                    {req.user}
                  </div>
                  <span className={`badge ${req.isEscalated ? 'badge-warning' : 'badge-primary'}`}>
                    {req.isEscalated ? 'Chuyển cấp Đào tạo' : 'CSVC thẩm định'}
                  </span>
                </div>

                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-primary-800)', marginBottom: '4px' }}>
                  {req.roomCode}
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {req.date} • {req.timeSlot}
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  Gửi lúc: {req.submittedAt}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              Không có yêu cầu nào trong danh sách
            </div>
          )}
        </div>

        {/* Right Detail Panel */}
        {selectedReq ? (
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
              <div>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '12px', color: 'var(--color-primary-600)' }}>
                  {selectedReq.id}
                </span>
                <h2 style={{ fontSize: '20px', fontWeight: 800, marginTop: '2px' }}>
                  {selectedReq.roomCode}
                </h2>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Người yêu cầu: <strong>{selectedReq.user}</strong> ({selectedReq.role})
                </div>
              </div>

              {selectedReq.isEscalated && (
                <span className="badge badge-warning" style={{ fontSize: '12px', padding: '6px 12px' }}>
                  <Icons.AlertTriangle size={14} /> Vượt Thẩm Quyền CSVC
                </span>
              )}
            </div>

            {/* Escalation Rule Detection Warning */}
            {selectedReq.isEscalated && (
              <div
                style={{
                  background: 'var(--color-warning-50)',
                  border: '1px solid var(--color-warning-500)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px',
                  marginBottom: '20px',
                  fontSize: '13px',
                  color: 'var(--color-warning-700)'
                }}
              >
                <div style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <Icons.Shield size={16} />
                  KÍCH HOẠT QUY TẮC CHUYỂN CẤP (ESCALATION RULE):
                </div>
                <div>{selectedReq.escalationReason}</div>
                <div style={{ fontSize: '11px', marginTop: '6px', opacity: 0.85 }}>
                  *Theo quy định, đơn này bắt buộc phải do Trưởng Phòng Quản lý Đào tạo phê duyệt chính thức.
                </div>
              </div>
            )}

            {/* Details Grid */}
            <div className="grid-cols-2" style={{ gap: '16px', marginBottom: '20px' }}>
              <div style={{ padding: '12px', background: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Thời gian mượn:</div>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>{selectedReq.date}</div>
                <div style={{ fontSize: '13px' }}>{selectedReq.timeSlot}</div>
              </div>

              <div style={{ padding: '12px', background: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Quy mô tham gia:</div>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>{selectedReq.participants || 1} người</div>
                <div style={{ fontSize: '13px', color: 'var(--color-green-600)', fontWeight: 600 }}>Cam kết tuân thủ nội quy</div>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Mục đích sử dụng:</div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                {selectedReq.purpose}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
              <button
                className="btn btn-success"
                style={{ flex: 1 }}
                onClick={() => handleApprove(selectedReq.id)}
              >
                <Icons.CheckCircle size={16} />
                <span>Phê Duyệt Đơn</span>
              </button>

              <button
                className="btn btn-outline"
                style={{ color: 'var(--color-danger-600)', borderColor: 'var(--color-danger-500)', flex: 1 }}
                onClick={() => handleReject(selectedReq.id)}
              >
                <Icons.X size={16} />
                <span>Từ Chối</span>
              </button>

              {!selectedReq.isEscalated && (
                <button
                  className="btn btn-purple"
                  onClick={() => handleEscalate(selectedReq.id)}
                  title="Chuyển cấp lên Phòng Đào tạo duyệt"
                >
                  <Icons.Shield size={16} />
                  <span>Chuyển Cấp (Escalate)</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Chọn một yêu cầu từ danh sách bên trái để xem chi tiết thẩm định
          </div>
        )}
      </div>
    </div>
  );
};
