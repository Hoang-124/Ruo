import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { useToast } from '../../context/ToastContext';
import { disposalApi, equipmentApi, repairApi } from '../../lib/api';

export const DisposalProposePage = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [proposals, setProposals] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [closedRepairs, setClosedRepairs] = useState([]);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    equipment_id: '',
    repair_id: '',
    reason: 'Chi phí sửa chữa tích lũy vượt 60% giá trị còn lại (R >= 60%) hoặc linh kiện không còn sản xuất.',
    recovery_value: 0
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dispRes, repRes] = await Promise.all([
        disposalApi.list(),
        repairApi.list({ outcome: 'unrepairable' })
      ]);

      if (dispRes && dispRes.success) {
        setProposals(dispRes.proposals || []);
        setCandidates(dispRes.candidates || []);
      }
      if (repRes && repRes.success) {
        setClosedRepairs(repRes.repairs || []);
      }
    } catch (err) {
      toast.error('Lỗi khi tải danh sách thanh lý: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openProposeModal = (eq = null) => {
    setFormData({
      equipment_id: eq ? eq._id : (candidates[0]?._id || ''),
      repair_id: '',
      reason: 'Chi phí sửa chữa tích lũy vượt 60% giá trị còn lại (R >= 60%) hoặc linh kiện không còn sản xuất.',
      recovery_value: eq?.remaining_value ? Math.round(eq.remaining_value * 0.1) : 0
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.equipment_id) {
      toast.error('Vui lòng chọn thiết bị cần đề xuất thanh lý.');
      return;
    }
    if (!formData.reason.trim()) {
      toast.error('Vui lòng nhập lý do đề xuất thanh lý.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await disposalApi.propose({
        equipment_id: formData.equipment_id,
        repair_id: formData.repair_id || null,
        reason: formData.reason.trim(),
        recovery_value: Number(formData.recovery_value) || 0
      });

      if (res && res.success) {
        toast.success('Đã gửi hồ sơ đề xuất thanh lý thành công lên Ban Giám Hiệu!');
        setShowModal(false);
        await fetchData();
      }
    } catch (err) {
      toast.error('Lỗi khi lập đề xuất: ' + err.message);
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
            <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>MODULE 03 • UC: PROPOSE DISPOSAL (ĐỀ XUẤT THANH LÝ)</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink-pure)', letterSpacing: '-0.02em', margin: 0 }}>
            Hồ Sơ Đề Xuất Thanh Lý Tài Sản
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--ink-muted)' }}>
            Lập danh sách các thiết bị hỏng không thể sửa chữa hoặc chi phí vượt 60% để trình Ban Giám Hiệu ban hành Quyết định thanh lý.
          </p>
        </div>

        <button
          onClick={() => openProposeModal()}
          className="laser-btn laser-btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 18px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 700 }}
        >
          <Icons.Plus size={16} />
          <span>Lập Hồ Sơ Đề Xuất Mới</span>
        </button>
      </div>

      {/* Flagged Candidates Warning Card */}
      {candidates.length > 0 && (
        <div style={{ background: 'var(--surface-card)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Icons.AlertTriangle size={18} color="#F59E0B" />
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#F59E0B', margin: 0 }}>
              Thiết Bị Cần Xem Xét Thanh Lý ({candidates.length})
            </h3>
          </div>
          <div style={{ fontSize: '12.5px', color: 'var(--ink-muted)', marginBottom: '12px' }}>
            Các tài sản dưới đây có tình trạng <strong>bị hỏng</strong> hoặc đã được Kỹ thuật viên báo cáo <strong>không thể sửa chữa (unrepairable)</strong>:
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {candidates.map((c) => (
              <div
                key={c._id}
                style={{
                  background: 'var(--surface-panel)',
                  border: '1px solid var(--hairline-medium)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '12.5px', color: 'var(--laser-cyan)' }}>
                    {c.code}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink-pure)' }}>{c.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                    Trạng thái: <strong style={{ color: '#EF4444' }}>{c.status}</strong> • Giá gốc: {(c.price || 0).toLocaleString('vi-VN')} đ
                  </div>
                </div>

                <button
                  onClick={() => openProposeModal(c)}
                  className="laser-btn laser-btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
                >
                  Lập Đề Xuất
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Proposals History List */}
      <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--hairline-medium)' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--ink-pure)' }}>
            Danh Sách Hồ Sơ Đã Đề Xuất ({proposals.length})
          </h2>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink-muted)' }}>
            <Icons.RefreshCw size={28} className="spin" style={{ marginBottom: '12px' }} />
            <div>Đang tải hồ sơ thanh lý...</div>
          </div>
        ) : proposals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-muted)' }}>
            <Icons.CheckCircle size={36} style={{ opacity: 0.5, marginBottom: '12px' }} />
            <div style={{ fontSize: '15px', fontWeight: 600 }}>Chưa có hồ sơ thanh lý nào.</div>
            <div style={{ fontSize: '13px', marginTop: '4px' }}>Mọi tài sản đều đang trong vòng đời phục vụ hiệu quả.</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--surface-panel)', borderBottom: '1px solid var(--hairline-medium)' }}>
                <th style={{ padding: '12px 18px', color: 'var(--ink-pure)', fontWeight: 700 }}>Thiết Bị</th>
                <th style={{ padding: '12px 18px', color: 'var(--ink-pure)', fontWeight: 700 }}>Lý Do Đề Xuất</th>
                <th style={{ padding: '12px 18px', color: 'var(--ink-pure)', fontWeight: 700 }}>Thu Hồi Dự Kiến</th>
                <th style={{ padding: '12px 18px', color: 'var(--ink-pure)', fontWeight: 700 }}>Trạng Thái BGH</th>
                <th style={{ padding: '12px 18px', color: 'var(--ink-pure)', fontWeight: 700 }}>Ngày Đề Xuất</th>
              </tr>
            </thead>
            <tbody>
              {proposals.map((p) => {
                const eq = p.equipment_id || {};
                const isPending = p.status === 'proposed';
                const isApproved = p.status === 'approved' || p.status === 'completed';
                const isRejected = p.status === 'rejected';

                return (
                  <tr key={p._id} style={{ borderBottom: '1px solid var(--hairline-soft)' }}>
                    <td style={{ padding: '12px 18px' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--laser-cyan)' }}>{eq.code}</div>
                      <div style={{ fontWeight: 600, color: 'var(--ink-pure)' }}>{eq.name}</div>
                    </td>
                    <td style={{ padding: '12px 18px', maxWidth: '300px' }}>
                      <div style={{ color: 'var(--ink-secondary)' }}>{p.reason}</div>
                      {isRejected && p.reject_reason && (
                        <div style={{ color: '#EF4444', fontSize: '11.5px', marginTop: '4px' }}>
                          Lý do từ chối: {p.reject_reason}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--ink-pure)' }}>
                      {(p.recovery_value || 0).toLocaleString('vi-VN')} đ
                    </td>
                    <td style={{ padding: '12px 18px' }}>
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
                        {isPending ? 'Chờ BGH Duyệt' : isApproved ? `Đã Duyệt (${p.decision_number || 'OK'})` : 'Bị Từ Chối'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 18px', color: 'var(--ink-muted)', fontSize: '12px' }}>
                      {new Date(p.created_at).toLocaleDateString('vi-VN')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Propose Modal */}
      {showModal && (
        <div className="ruo-drawer-backdrop" onClick={() => setShowModal(false)}>
          <div className="ruo-drawer-panel" style={{ width: '540px' }} onClick={(e) => e.stopPropagation()}>
            <div className="ruo-drawer-header">
              <div>
                <h2 className="ruo-drawer-title">Lập Hồ Sơ Đề Xuất Thanh Lý Thiết Bị</h2>
                <p className="ruo-drawer-subtitle">Hồ sơ sẽ được chuyển tới Ban Giám Hiệu để xem xét và ra quyết định</p>
              </div>
              <button onClick={() => setShowModal(false)} className="ruo-drawer-close-btn"><Icons.X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="ruo-drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Chọn Thiết Bị Thanh Lý *
                  </label>
                  <select
                    required
                    value={formData.equipment_id}
                    onChange={(e) => setFormData({ ...formData, equipment_id: e.target.value })}
                    className="ruo-portal-input"
                    style={{ width: '100%' }}
                  >
                    <option value="">-- Chọn thiết bị --</option>
                    {candidates.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.code} - {c.name} ({c.status})
                      </option>
                    ))}
                  </select>
                </div>

                {closedRepairs.length > 0 && (
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                      Gắn Phiếu Sửa Chữa Đã Báo Không Thể Sửa (Tùy chọn)
                    </label>
                    <select
                      value={formData.repair_id}
                      onChange={(e) => setFormData({ ...formData, repair_id: e.target.value })}
                      className="ruo-portal-input"
                      style={{ width: '100%' }}
                    >
                      <option value="">-- Không gắn phiếu --</option>
                      {closedRepairs.map((r) => (
                        <option key={r._id} value={r._id}>
                          {r.ticket_code} - {r.incident_description?.slice(0, 40)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Lý Do Đề Xuất Thanh Lý *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="ruo-portal-input"
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Giá Trị Thu Hồi Dự Kiến (VNĐ)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    value={formData.recovery_value}
                    onChange={(e) => setFormData({ ...formData, recovery_value: e.target.value })}
                    className="ruo-portal-input"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div className="ruo-drawer-footer">
                <button type="button" onClick={() => setShowModal(false)} className="laser-btn laser-btn-secondary" style={{ padding: '8px 16px' }}>Hủy Bỏ</button>
                <button type="submit" disabled={submitting} className="laser-btn laser-btn-primary" style={{ padding: '8px 20px', fontWeight: 700 }}>
                  {submitting ? 'Đang Gửi...' : 'Gửi Lên Ban Giám Hiệu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisposalProposePage;
