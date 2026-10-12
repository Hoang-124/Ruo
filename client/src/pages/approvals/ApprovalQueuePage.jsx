import React, { useEffect, useState } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { PENDING_REQUESTS } from '../../mock/mockData';

const API_BASE_URL = 'http://localhost:5000/api/bookings';

const rolePriority = {
  lecturer: 0,
  academic_affairs: 1,
  admin: 2,
  facility_staff: 3,
  maintenance: 4,
  student: 5,
  default: 99
};

const formatDate = (date) => {
  if (!date) return 'Chưa xác định';
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return 'Chưa xác định';
  return value.toLocaleDateString('vi-VN');
};

const formatTime = (date) => {
  if (!date) return 'Chưa xác định';
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return 'Chưa xác định';
  return value.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const sortPendingRequests = (items) => {
  return [...items].sort((a, b) => {
    const aEscalated = a.isEscalated ? 0 : 1;
    const bEscalated = b.isEscalated ? 0 : 1;

    if (aEscalated !== bEscalated) {
      return aEscalated - bEscalated;
    }

    const aRole = a.role?.toLowerCase?.() || 'student';
    const bRole = b.role?.toLowerCase?.() || 'student';
    const aRolePriority = rolePriority[aRole] ?? rolePriority.default;
    const bRolePriority = rolePriority[bRole] ?? rolePriority.default;

    if (aRolePriority !== bRolePriority) {
      return aRolePriority - bRolePriority;
    }

    const aTime = new Date(a.startTime || a.createdAt || a.submittedAt || 0).getTime();
    const bTime = new Date(b.startTime || b.createdAt || b.submittedAt || 0).getTime();
    if (aTime !== bTime) {
      return aTime - bTime;
    }

    return (a.id || '').localeCompare(b.id || '');
  });
};

const normalizeRequest = (request) => {
  const user = request.user || {};
  const room = request.room || {};
  const role = user.role || request.role || 'student';
  const normalizedRole = role === 'lecturer' ? 'Giảng viên' : role === 'student' ? 'Sinh viên' : role;

  const startTime = request.startTime ? new Date(request.startTime) : null;
  const endTime = request.endTime ? new Date(request.endTime) : startTime;

  return {
    id: request.bookingCode || request.id || request._id,
    type: request.type || (request.equipmentName ? 'equipment_borrow' : 'room_booking'),
    user: user.fullName || request.userName || request.user || 'N/A',
    role: normalizedRole,
    roomCode: room.code || request.roomCode || room.name || 'N/A',
    date: startTime ? formatDate(startTime) : request.date || 'Chưa xác định',
    timeSlot: startTime && endTime
      ? `${formatTime(startTime)} - ${formatTime(endTime)}`
      : request.timeSlot || 'Chưa xác định',
    purpose: request.purpose || 'Không có mô tả',
    participants: request.participantsCount ?? request.participants ?? 1,
    submittedAt: request.createdAt ? new Date(request.createdAt).toLocaleString('vi-VN') : request.submittedAt || 'Chưa xác định',
    isEscalated: Boolean(request.isEscalated),
    escalationReason: request.escalationReason || null,
    startTime: request.startTime || request.createdAt || null,
    createdAt: request.createdAt || request.submittedAt || null
  };
};

export const ApprovalQueuePage = () => {
  const fallbackRequests = sortPendingRequests(PENDING_REQUESTS.map(normalizeRequest));
  const [requests, setRequests] = useState(fallbackRequests);
  const [selectedReq, setSelectedReq] = useState(fallbackRequests[0] || null);
  const [filterTab, setFilterTab] = useState('all');

  useEffect(() => {
    const loadPendingRequests = async () => {
      const token = localStorage.getItem('ruo_token');
      console.log('[ApprovalQueuePage] loadPendingRequests start', {
        hasToken: Boolean(token),
        apiUrl: `${API_BASE_URL}/pending`
      });

      if (!token) {
        console.warn('[ApprovalQueuePage] no auth token found, showing mock queue');
        const fallback = sortPendingRequests(PENDING_REQUESTS.map(normalizeRequest));
        setRequests(fallback);
        setSelectedReq(fallback[0] || null);
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/pending`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('[ApprovalQueuePage] pending response status', res.status);

        if (!res.ok) {
          const errorText = await res.text();
          console.error('[ApprovalQueuePage] pending API failed', { status: res.status, body: errorText });
          throw new Error(`HTTP ${res.status}: ${errorText}`);
        }

        const data = await res.json();
        console.log('[ApprovalQueuePage] pending payload', data);

        if (!data.success || !Array.isArray(data.requests)) {
          throw new Error('Invalid API payload');
        }

        const normalized = data.requests.map(normalizeRequest);
        const sorted = sortPendingRequests(normalized);
        setRequests(sorted);
        setSelectedReq(prev => sorted.find(item => item.id === prev?.id) || sorted[0] || null);
      } catch (error) {
        console.error('[ApprovalQueuePage] backend pending list unavailable, using mock queue:', error);
        const fallback = sortPendingRequests(PENDING_REQUESTS.map(normalizeRequest));
        setRequests(fallback);
        setSelectedReq(prev => fallback.find(item => item.id === prev?.id) || fallback[0] || null);
      }
    };

    loadPendingRequests();
  }, []);

  const filtered = requests.filter(r => {
    if (filterTab === 'room') return r.type === 'room_booking' || r.type === 'series_booking';
    if (filterTab === 'equipment') return r.type === 'equipment_borrow';
    if (filterTab === 'escalated') return r.isEscalated;
    return true;
  });

  const getPriorityBadge = (roleText = '') => {
    const normalized = roleText.toLowerCase();
    if (normalized.includes('giảng viên') || normalized.includes('lecturer')) {
      return { label: 'Ưu tiên GV', style: { background: 'rgba(245, 158, 11, 0.14)', color: '#b45309', border: '1px solid rgba(245, 158, 11, 0.45)' } };
    }
    if (normalized.includes('sinh viên') || normalized.includes('student')) {
      return { label: 'Sinh viên', style: { background: 'rgba(59, 130, 246, 0.12)', color: '#1d4ed8', border: '1px solid rgba(59, 130, 246, 0.35)' } };
    }
    return { label: 'Ưu tiên khác', style: { background: 'rgba(107, 114, 128, 0.12)', color: '#4b5563', border: '1px solid rgba(107, 114, 128, 0.35)' } };
  };

  const handleApprove = (id) => {
    const nextRequests = requests.filter(r => r.id !== id);
    alert(`Đã phê duyệt thành công yêu cầu ${id}! Hệ thống đã khóa slot trên Calendar và gửi mã QR qua email.`);
    setRequests(nextRequests);
    setSelectedReq(prev => (prev && prev.id === id ? nextRequests[0] || null : prev));
  };

  const handleReject = (id) => {
    const reason = prompt('Nhập lý do từ chối yêu cầu mượn:');
    if (reason) {
      const nextRequests = requests.filter(r => r.id !== id);
      alert(`Đã từ chối đơn ${id}. Lý do: ${reason}`);
      setRequests(nextRequests);
      setSelectedReq(prev => (prev && prev.id === id ? nextRequests[0] || null : prev));
    }
  };

  const handleEscalate = (id) => {
    const nextRequests = requests.map(r => r.id === id ? { ...r, isEscalated: true, escalationReason: 'Chuyển cấp thủ công từ chuyên viên CSVC' } : r);
    alert(`Đã chuyển cấp đơn ${id} lên Phòng Quản lý Đào tạo phê duyệt theo quy chế vượt thẩm quyền!`);
    setRequests(sortPendingRequests(nextRequests));
    setSelectedReq(prev => (prev && prev.id === id ? { ...prev, isEscalated: true, escalationReason: 'Chuyển cấp thủ công từ chuyên viên CSVC' } : prev));
  };

  return (
    <div style={{ paddingBottom: '60px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Hàng Đợi Duyệt Yêu Cầu & Cơ Chế Chuyển Cấp (Escalation Engine)</h1>
          <div className="page-subtitle">
            Tự động phát hiện 4 ngưỡng kích hoạt chuyển cấp (Trụ Cột 2) lên Phòng Đào tạo
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
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

      <div style={{ display: 'grid', gridTemplateColumns: '40% 60%', gap: '20px', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map((req) => {
            const isSelected = selectedReq && selectedReq.id === req.id;
            const priorityBadge = getPriorityBadge(req.role);
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', gap: '8px' }}>
                  <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-primary)' }}>
                    {req.user}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <span style={{ ...priorityBadge.style, borderRadius: '999px', padding: '4px 8px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {priorityBadge.label}
                    </span>
                    <span className={`badge ${req.isEscalated ? 'badge-warning' : 'badge-primary'}`}>
                      {req.isEscalated ? 'Chuyển cấp Đào tạo' : 'CSVC thẩm định'}
                    </span>
                  </div>
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
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                  <span>Người yêu cầu: <strong>{selectedReq.user}</strong> ({selectedReq.role})</span>
                  <span style={{ ...getPriorityBadge(selectedReq.role).style, borderRadius: '999px', padding: '4px 8px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {getPriorityBadge(selectedReq.role).label}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                {selectedReq.isEscalated && (
                  <span className="badge badge-warning" style={{ fontSize: '12px', padding: '6px 12px' }}>
                    <Icons.AlertTriangle size={14} /> Vượt Thẩm Quyền CSVC
                  </span>
                )}
              </div>
            </div>

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

            <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '20px', flexWrap: 'wrap' }}>
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
