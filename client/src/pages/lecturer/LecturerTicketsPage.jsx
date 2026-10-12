import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { useToast } from '../../context/ToastContext';
import { repairApi } from '../../lib/api';

export const LecturerTicketsPage = ({ onNavigateTab }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Rating Modal / State
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingVal, setRatingVal] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await repairApi.list();
      if (res && res.success) {
        setTickets(res.repairs || []);
      }
    } catch (err) {
      toast.error('Không thể tải danh sách phiếu báo hỏng: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const openRating = (ticket) => {
    setSelectedTicket(ticket);
    setRatingVal(ticket.feedback_rating || 5);
    setRatingComment(ticket.feedback_comment || '');
    setShowRatingModal(true);
  };

  const handleRatingSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmittingRating(true);
      const res = await repairApi.rateFeedback(selectedTicket._id, {
        rating: ratingVal,
        comment: ratingComment.trim()
      });

      if (res && res.success) {
        toast.success(`Đã gửi đánh giá ${ratingVal} sao cho phiếu ${selectedTicket.ticket_code}!`);
        setShowRatingModal(false);
        await fetchTickets();
      }
    } catch (err) {
      toast.error('Lỗi khi gửi đánh giá: ' + err.message);
    } finally {
      setSubmittingRating(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'reported':
        return <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>Chờ Tiếp Nhận</span>;
      case 'assigned':
        return <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: 'rgba(6,182,212,0.15)', color: 'var(--laser-cyan)' }}>Đã Giao KTV</span>;
      case 'in_progress':
        return <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: 'rgba(59,130,246,0.15)', color: '#3B82F6' }}>Đang Sửa Chữa</span>;
      case 'resolved':
        return <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>Đã Khắc Phục</span>;
      case 'unrepairable':
        return <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>Không Thể Sửa</span>;
      case 'closed':
        return <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: 'rgba(100,116,139,0.2)', color: 'var(--ink-secondary)' }}>Đã Nghiệm Thu</span>;
      default:
        return <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: 'rgba(255,255,255,0.08)', color: 'var(--ink-muted)' }}>{status}</span>;
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'OPEN') return ['reported', 'assigned', 'in_progress'].includes(t.status);
    if (statusFilter === 'DONE') return ['resolved', 'closed'].includes(t.status);
    return true;
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', color: '#10B981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>GIẢNG VIÊN</span>
            <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>MODULE 04 • UC: TRACK REPAIR STATUS & EVALUATE QUALITY</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink-pure)', letterSpacing: '-0.02em', margin: 0 }}>
            Phiếu Báo Hỏng & Đánh Giá Sửa Chữa
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--ink-muted)' }}>
            Theo dõi tiến trình khắc phục sự cố, trao đổi với Kỹ thuật viên và chấm điểm hài lòng sau nghiệm thu.
          </p>
        </div>

        <button
          onClick={() => onNavigateTab && onNavigateTab('report_issue')}
          className="laser-btn laser-btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 18px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 700 }}
        >
          <Icons.Plus size={16} />
          <span>Gửi Báo Hỏng Mới</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--hairline-medium)', marginBottom: '20px' }}>
        {[
          { key: 'ALL', label: `Tất Cả Phiếu (${tickets.length})` },
          { key: 'OPEN', label: 'Đang Xử Lý' },
          { key: 'DONE', label: 'Đã Hoàn Thành' }
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

      {/* Tickets List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink-muted)' }}>
          <Icons.RefreshCw size={28} className="spin" style={{ marginBottom: '12px' }} />
          <div>Đang tải danh sách phiếu báo hỏng...</div>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--surface-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--hairline-medium)', color: 'var(--ink-muted)' }}>
          <Icons.CheckCircle size={36} style={{ opacity: 0.5, marginBottom: '12px' }} />
          <div style={{ fontSize: '15px', fontWeight: 600 }}>Không có phiếu báo hỏng nào.</div>
          <div style={{ fontSize: '13px', marginTop: '4px' }}>Cơ sở vật chất giảng dạy đang hoạt động bình thường.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredTickets.map(t => {
            const eq = t.equipment_id || {};
            const room = t.room_id || {};
            const isClosed = t.status === 'closed';
            const hasRating = t.feedback_rating && t.feedback_rating > 0;

            return (
              <div
                key={t._id}
                style={{
                  background: 'var(--surface-card)',
                  border: '1px solid var(--hairline-medium)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '16px'
                }}
              >
                <div style={{ flex: 1, minWidth: '300px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '13px', color: 'var(--laser-cyan)', background: 'rgba(6,182,212,0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                      {t.ticket_code}
                    </span>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink-pure)' }}>
                      {eq.name || 'Thiết bị'} ({eq.code || 'Mã N/A'})
                    </span>
                    {getStatusBadge(t.status)}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '12.5px', color: 'var(--ink-muted)', marginBottom: '10px' }}>
                    <div>Phòng học: <strong style={{ color: 'var(--ink-pure)' }}>{room.code} - {room.name}</strong></div>
                    <div>Mức độ: <strong style={{ color: t.damage_level === 'critical' ? '#EF4444' : t.damage_level === 'major' ? '#F59E0B' : '#10B981' }}>{t.damage_level}</strong></div>
                    <div>Hạn SLA: <strong style={{ color: 'var(--ink-pure)' }}>{t.deadline ? new Date(t.deadline).toLocaleString('vi-VN') : '—'}</strong></div>
                    <div>KTV phụ trách: <strong style={{ color: 'var(--ink-pure)' }}>{t.assigned_to?.full_name || 'Đang phân công'}</strong></div>
                  </div>

                  <div style={{ background: 'var(--surface-panel)', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '13px', color: 'var(--ink-pure)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--ink-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '2px' }}>Nội dung báo hỏng:</div>
                    {t.incident_description}
                  </div>

                  {/* Feedback rating display */}
                  {hasRating && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', fontSize: '12.5px', color: '#F59E0B' }}>
                      <span>Đánh giá chất lượng:</span>
                      <strong>{'★'.repeat(t.feedback_rating)}{'☆'.repeat(5 - t.feedback_rating)}</strong>
                      <span style={{ color: 'var(--ink-muted)' }}>({t.feedback_comment || 'Không có bình luận'})</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '150px' }}>
                  <button
                    onClick={() => setSelectedTicket(t)}
                    className="laser-btn laser-btn-secondary"
                    style={{ padding: '8px 14px', fontSize: '12.5px' }}
                  >
                    Xem Chi Tiết
                  </button>

                  {isClosed && (
                    <button
                      onClick={() => openRating(t)}
                      className="laser-btn"
                      style={{ padding: '8px 14px', fontSize: '12.5px', background: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 'var(--radius-md)', fontWeight: 700 }}
                    >
                      {hasRating ? 'Sửa Đánh Giá' : '★ Chấm Điểm Sao'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ticket Details Drawer */}
      {selectedTicket && !showRatingModal && (
        <div className="ruo-drawer-backdrop" onClick={() => setSelectedTicket(null)}>
          <div className="ruo-drawer-panel" style={{ width: '560px' }} onClick={(e) => e.stopPropagation()}>
            <div className="ruo-drawer-header">
              <div>
                <h2 className="ruo-drawer-title">{selectedTicket.ticket_code}</h2>
                <p className="ruo-drawer-subtitle">{selectedTicket.equipment_id?.name} ({selectedTicket.equipment_id?.code})</p>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="ruo-drawer-close-btn"><Icons.X size={18} /></button>
            </div>

            <div className="ruo-drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-panel)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>Trạng Thái Phiếu</div>
                  <div style={{ marginTop: '4px' }}>{getStatusBadge(selectedTicket.status)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>Mức Độ Hư Hỏng</div>
                  <div style={{ fontWeight: 700, color: 'var(--ink-pure)', marginTop: '4px' }}>{selectedTicket.damage_level}</div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ink-muted)', fontWeight: 700, marginBottom: '6px' }}>
                  Thông Tin Tiến Trình Xử Lý
                </div>
                <div style={{ background: 'var(--surface-panel)', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '12.5px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div>Kỹ thuật viên tiếp nhận: <strong>{selectedTicket.assigned_to?.full_name || 'Chưa giao'}</strong></div>
                  <div>Thời gian tiếp nhận: {selectedTicket.created_at ? new Date(selectedTicket.created_at).toLocaleString('vi-VN') : '—'}</div>
                  <div>Hạn cam kết SLA: <strong>{selectedTicket.deadline ? new Date(selectedTicket.deadline).toLocaleString('vi-VN') : '—'}</strong></div>
                  {selectedTicket.outcome && (
                    <div>Kết luận kỹ thuật: <strong style={{ color: selectedTicket.outcome === 'repaired' ? '#10B981' : '#EF4444' }}>{selectedTicket.outcome === 'repaired' ? 'Đã khắc phục thành công' : 'Không thể sửa chữa'}</strong></div>
                  )}
                </div>
              </div>

              {selectedTicket.incident_description && (
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ink-muted)', fontWeight: 700, marginBottom: '6px' }}>
                    Mô Tả Ban Đầu Của Giảng Viên
                  </div>
                  <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
                    {selectedTicket.incident_description}
                  </div>
                </div>
              )}
            </div>

            <div className="ruo-drawer-footer">
              {selectedTicket.status === 'closed' && (
                <button
                  onClick={() => openRating(selectedTicket)}
                  className="laser-btn laser-btn-primary"
                  style={{ width: '100%', padding: '10px', fontWeight: 700 }}
                >
                  ★ Đánh Giá Chất Lượng Sửa Chữa (1-5 Sao)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && selectedTicket && (
        <div className="ruo-drawer-backdrop" onClick={() => setShowRatingModal(false)}>
          <div className="ruo-drawer-panel" style={{ width: '460px' }} onClick={(e) => e.stopPropagation()}>
            <div className="ruo-drawer-header">
              <div>
                <h2 className="ruo-drawer-title">Đánh Giá Chất Lượng Sửa Chữa</h2>
                <p className="ruo-drawer-subtitle">Phiếu: {selectedTicket.ticket_code}</p>
              </div>
              <button onClick={() => setShowRatingModal(false)} className="ruo-drawer-close-btn"><Icons.X size={18} /></button>
            </div>

            <form onSubmit={handleRatingSubmit}>
              <div className="ruo-drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '13px', color: 'var(--ink-secondary)' }}>
                  Vui lòng cho biết mức độ hài lòng của thầy/cô về kết quả khắc phục sự cố thiết bị:
                </div>

                {/* 5-star interactive picker */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', fontSize: '36px', cursor: 'pointer', userSelect: 'none' }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <span
                      key={star}
                      onClick={() => setRatingVal(star)}
                      style={{ color: star <= ratingVal ? '#F59E0B' : 'var(--hairline-medium)', transition: 'transform 0.1s' }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#F59E0B' }}>
                  {ratingVal === 5 ? '5/5 - Rất Hài Lòng' : ratingVal === 4 ? '4/5 - Hài Lòng' : ratingVal === 3 ? '3/5 - Bình Thường' : ratingVal === 2 ? '2/5 - Chưa Hài Lòng' : '1/5 - Kém'}
                </div>

                <div style={{ textAlign: 'left' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                    Nhận Xét & Góp Ý (Tùy chọn)
                  </label>
                  <textarea
                    rows={3}
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                    placeholder="VD: Kỹ thuật viên xử lý rất nhanh, máy chiếu hoạt động sắc nét trở lại..."
                    className="ruo-portal-input"
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>
              </div>

              <div className="ruo-drawer-footer">
                <button type="button" onClick={() => setShowRatingModal(false)} className="laser-btn laser-btn-secondary" style={{ padding: '8px 16px' }}>Hủy Bỏ</button>
                <button type="submit" disabled={submittingRating} className="laser-btn laser-btn-primary" style={{ padding: '8px 20px', fontWeight: 700 }}>
                  {submittingRating ? 'Đang Lưu...' : 'Gửi Đánh Giá'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LecturerTicketsPage;
