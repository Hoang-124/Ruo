import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { useToast } from '../../context/ToastContext';
import { disposalApi } from '../../lib/api';

export const DisposalApprovalPage = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [proposals, setProposals] = useState([]);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedProposal, setSelectedProposal] = useState(null);

  // Modals
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [decisionNumber, setDecisionNumber] = useState('');
  const [recoveryValue, setRecoveryValue] = useState(0);
  const [rejectReason, setRejectReason] = useState('');

  const fetchDisposals = async () => {
    try {
      setLoading(true);
      const res = await disposalApi.list();
      if (res && res.success) {
        setProposals(res.proposals || []);
      }
    } catch (err) {
      toast.error('Không thể tải danh sách hồ sơ thanh lý: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisposals();
  }, []);

  const openApprove = (p) => {
    setSelectedProposal(p);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    setDecisionNumber(`QD-TL-${dateStr}/${p.equipment_id?.code || '01'}`);
    setRecoveryValue(p.recovery_value || 0);
    setShowApproveModal(true);
  };

  const openReject = (p) => {
    setSelectedProposal(p);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleApproveSubmit = async (e) => {
    e.preventDefault();
    if (!decisionNumber.trim()) {
      toast.error('Vui lòng nhập số quyết định phê duyệt của Ban Giám Hiệu.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await disposalApi.approve(selectedProposal._id, decisionNumber.trim(), Number(recoveryValue) || 0);
      if (res && res.success) {
        toast.success(`Đã phê duyệt thanh lý thành công theo Quyết định ${decisionNumber}!`);
        setShowApproveModal(false);
        await fetchDisposals();
      }
    } catch (err) {
      toast.error('Lỗi khi phê duyệt hồ sơ: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      toast.error('Vui lòng nhập lý do từ chối hồ sơ thanh lý.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await disposalApi.reject(selectedProposal._id, rejectReason.trim());
      if (res && res.success) {
        toast.success('Đã từ chối hồ sơ thanh lý thành công. Thiết bị được giữ lại.');
        setShowRejectModal(false);
        await fetchDisposals();
      }
    } catch (err) {
      toast.error('Lỗi khi từ chối hồ sơ: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = proposals.filter((p) => {
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'PENDING') return p.status === 'proposed';
    if (filterStatus === 'APPROVED') return p.status === 'approved' || p.status === 'completed';
    if (filterStatus === 'REJECTED') return p.status === 'rejected';
    return true;
  });

  const countPending = proposals.filter((p) => p.status === 'proposed').length;
  const countApproved = proposals.filter((p) => p.status === 'approved' || p.status === 'completed').length;
  const countRejected = proposals.filter((p) => p.status === 'rejected').length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', color: '#EF4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>ADMIN MODULE</span>
            <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>THẨM QUYỀN BAN GIÁM HIỆU • UC: APPROVE DISPOSAL REQUEST</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink-pure)', letterSpacing: '-0.02em', margin: 0 }}>
            Phê Duyệt Hồ Sơ Thanh Lý Thiết Bị
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--ink-muted)' }}>
            Xem xét các hồ sơ thanh lý thiết bị hỏng / không thể sửa chữa do Quản lý CSVC đề xuất và ban hành Quyết định thanh lý.
          </p>
        </div>

        <button
          onClick={fetchDisposals}
          className="laser-btn laser-btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 18px', borderRadius: 'var(--radius-md)', fontSize: '13px' }}
        >
          <Icons.RefreshCw size={16} />
          <span>Làm Mới</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-lg)', padding: '16px 20px' }}>
          <div style={{ fontSize: '12.5px', color: 'var(--ink-muted)' }}>Tổng hồ sơ tiếp nhận</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink-pure)', marginTop: '4px' }}>{proposals.length}</div>
        </div>

        <div style={{ background: 'var(--surface-card)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 'var(--radius-lg)', padding: '16px 20px' }}>
          <div style={{ fontSize: '12.5px', color: '#F59E0B', fontWeight: 600 }}>Chờ BGH phê duyệt</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#F59E0B', marginTop: '4px' }}>{countPending}</div>
        </div>

        <div style={{ background: 'var(--surface-card)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius-lg)', padding: '16px 20px' }}>
          <div style={{ fontSize: '12.5px', color: '#10B981', fontWeight: 600 }}>Đã ban hành quyết định</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#10B981', marginTop: '4px' }}>{countApproved}</div>
        </div>

        <div style={{ background: 'var(--surface-card)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-lg)', padding: '16px 20px' }}>
          <div style={{ fontSize: '12.5px', color: '#EF4444', fontWeight: 600 }}>Đã từ chối</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#EF4444', marginTop: '4px' }}>{countRejected}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--hairline-medium)', marginBottom: '20px' }}>
        {[
          { key: 'ALL', label: `Tất Cả (${proposals.length})` },
          { key: 'PENDING', label: `Cần Xử Lý (${countPending})` },
          { key: 'APPROVED', label: `Đã Duyệt (${countApproved})` },
          { key: 'REJECTED', label: `Từ Chối (${countRejected})` }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            style={{
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: filterStatus === tab.key ? 700 : 500,
              color: filterStatus === tab.key ? 'var(--laser-cyan)' : 'var(--ink-muted)',
              borderBottom: filterStatus === tab.key ? '2px solid var(--laser-cyan)' : '2px solid transparent',
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

      {/* Proposals List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink-muted)' }}>
          <Icons.RefreshCw size={28} className="spin" style={{ marginBottom: '12px' }} />
          <div>Đang tải hồ sơ đề xuất thanh lý...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--surface-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--hairline-medium)', color: 'var(--ink-muted)' }}>
          <Icons.Package size={36} style={{ opacity: 0.5, marginBottom: '12px' }} />
          <div style={{ fontSize: '15px', fontWeight: 600 }}>Không tìm thấy hồ sơ thanh lý nào.</div>
          <div style={{ fontSize: '13px', marginTop: '4px' }}>Tất cả các tài sản đều trong trạng thái vận hành ổn định.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filtered.map((p) => {
            const eq = p.equipment_id || {};
            const isPending = p.status === 'proposed';
            const isApproved = p.status === 'approved' || p.status === 'completed';
            const isRejected = p.status === 'rejected';

            return (
              <div
                key={p._id}
                style={{
                  background: 'var(--surface-card)',
                  border: isPending ? '1px solid rgba(245,158,11,0.5)' : '1px solid var(--hairline-medium)',
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
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '14px', color: 'var(--laser-cyan)', background: 'rgba(6,182,212,0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                      {eq.code || 'EQ-UNKNOWN'}
                    </span>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--ink-pure)' }}>
                      {eq.name || 'Thiết bị không xác định'}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: isPending ? 'rgba(245,158,11,0.15)' : isApproved ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                        color: isPending ? '#F59E0B' : isApproved ? '#10B981' : '#EF4444'
                      }}
                    >
                      {isPending ? 'CHỜ PHÊ DUYỆT' : isApproved ? `ĐÃ PHÊ DUYỆT (${p.decision_number || 'QD-OK'})` : 'ĐÃ TỪ CHỐI'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', fontSize: '12.5px', color: 'var(--ink-muted)', marginBottom: '12px' }}>
                    <div>Hãng / Model: <strong style={{ color: 'var(--ink-pure)' }}>{eq.brand} {eq.model}</strong></div>
                    <div>Nguyên giá: <strong style={{ color: 'var(--ink-pure)' }}>{(eq.price || 0).toLocaleString('vi-VN')} đ</strong></div>
                    <div>Giá trị còn lại: <strong style={{ color: 'var(--ink-pure)' }}>{(eq.remaining_value || 0).toLocaleString('vi-VN')} đ</strong></div>
                    <div>Thu hồi dự kiến: <strong style={{ color: '#10B981' }}>{(p.recovery_value || 0).toLocaleString('vi-VN')} đ</strong></div>
                  </div>

                  <div style={{ background: 'var(--surface-panel)', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '13px', marginBottom: '10px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--ink-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '2px' }}>
                      Lý do đề xuất từ Facility Manager:
                    </div>
                    <div style={{ color: 'var(--ink-pure)' }}>{p.reason}</div>
                  </div>

                  {p.repair_id && (
                    <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
                      Phiếu sửa chữa đính kèm: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--laser-cyan)' }}>{p.repair_id.ticket_code}</span> • Mức hỏng: <strong>{p.repair_id.damage_level}</strong> • Kết quả: <strong>{p.repair_id.outcome}</strong>
                    </div>
                  )}

                  {isRejected && p.reject_reason && (
                    <div style={{ marginTop: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', padding: '8px 12px', borderRadius: 'var(--radius-md)', fontSize: '12.5px', color: '#EF4444' }}>
                      <strong>Lý do BGH từ chối:</strong> {p.reject_reason}
                    </div>
                  )}

                  <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '8px' }}>
                    Người đề xuất: <strong>{p.proposed_by?.full_name || 'Quản lý CSVC'}</strong> ({p.proposed_by?.code}) • Ngày: {new Date(p.created_at).toLocaleString('vi-VN')}
                  </div>
                </div>

                {isPending && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '160px' }}>
                    <button
                      onClick={() => openApprove(p)}
                      className="laser-btn laser-btn-primary"
                      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '9px 16px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 700 }}
                    >
                      <Icons.CheckCircle size={16} />
                      <span>Phê Duyệt</span>
                    </button>

                    <button
                      onClick={() => openReject(p)}
                      className="laser-btn laser-btn-secondary"
                      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '9px 16px', borderRadius: 'var(--radius-md)', fontSize: '13px', color: '#EF4444' }}
                    >
                      <Icons.X size={16} />
                      <span>Từ Chối</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Approve Disposal */}
      {showApproveModal && selectedProposal && (
        <div className="ruo-drawer-backdrop" onClick={() => setShowApproveModal(false)}>
          <div className="ruo-drawer-panel" style={{ width: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="ruo-drawer-header">
              <div>
                <h2 className="ruo-drawer-title">Phê Duyệt Hồ Sơ Thanh Lý Tài Sản</h2>
                <p className="ruo-drawer-subtitle">Thiết bị: {selectedProposal.equipment_id?.name} ({selectedProposal.equipment_id?.code})</p>
              </div>
              <button onClick={() => setShowApproveModal(false)} className="ruo-drawer-close-btn">
                <Icons.X size={18} />
              </button>
            </div>

            <form onSubmit={handleApproveSubmit}>
              <div className="ruo-drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '12.5px', color: '#10B981' }}>
                  Hành động này xác nhận Ban Giám Hiệu đồng ý thanh lý thiết bị. Trạng thái thiết bị sẽ được chuyển thành <strong>ĐÃ THANH LÝ (disposed)</strong> và đưa ra khỏi danh mục tài sản hoạt động.
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px' }}>
                    Số Quyết Định Ban Hành (BGH) *
                  </label>
                  <input
                    type="text"
                    required
                    value={decisionNumber}
                    onChange={(e) => setDecisionNumber(e.target.value)}
                    placeholder="VD: QD-TL-2026/01/BGH"
                    className="ruo-portal-input"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px' }}>
                    Giá Trị Thu Hồi Dự Kiến (VNĐ)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    value={recoveryValue}
                    onChange={(e) => setRecoveryValue(e.target.value)}
                    className="ruo-portal-input"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div className="ruo-drawer-footer">
                <button
                  type="button"
                  onClick={() => setShowApproveModal(false)}
                  className="laser-btn laser-btn-secondary"
                  style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)' }}
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="laser-btn laser-btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 20px', borderRadius: 'var(--radius-md)', fontWeight: 700 }}
                >
                  {submitting ? <Icons.RefreshCw size={16} className="spin" /> : <Icons.CheckCircle size={16} />}
                  <span>Ký Quyết Định & Duyệt</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reject Disposal */}
      {showRejectModal && selectedProposal && (
        <div className="ruo-drawer-backdrop" onClick={() => setShowRejectModal(false)}>
          <div className="ruo-drawer-panel" style={{ width: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="ruo-drawer-header">
              <div>
                <h2 className="ruo-drawer-title">Từ Chối Đề Xuất Thanh Lý</h2>
                <p className="ruo-drawer-subtitle">Thiết bị: {selectedProposal.equipment_id?.name} ({selectedProposal.equipment_id?.code})</p>
              </div>
              <button onClick={() => setShowRejectModal(false)} className="ruo-drawer-close-btn">
                <Icons.X size={18} />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit}>
              <div className="ruo-drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '12.5px', color: '#EF4444' }}>
                  Thiết bị sẽ được hoàn về trạng thái <strong>HỎNG (broken)</strong> và Quản lý CSVC cùng Kỹ thuật viên sẽ tiếp tục tìm phương án sửa chữa hoặc tận dụng.
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px' }}>
                    Lý Do Từ Chối (Bắt buộc) *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="VD: Chi phí sửa chữa vẫn trong hạn mức cho phép; đề nghị chuyển sang đơn vị ngoài kiểm tra lại..."
                    className="ruo-portal-input"
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>
              </div>

              <div className="ruo-drawer-footer">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="laser-btn laser-btn-secondary"
                  style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)' }}
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="laser-btn"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 20px', borderRadius: 'var(--radius-md)', fontWeight: 700, background: '#EF4444', color: '#fff', border: 'none' }}
                >
                  {submitting ? <Icons.RefreshCw size={16} className="spin" /> : <Icons.X size={16} />}
                  <span>Xác Nhận Từ Chối</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisposalApprovalPage;
