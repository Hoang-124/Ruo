import React, { useCallback, useEffect, useState } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { USER_ROLES } from '../../config/navigation';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { disposalApi, repairApi } from '../../lib/api';

const statusLabels = {
  proposed: 'Chờ CSVC thẩm định',
  hc_approved: 'Chờ BGH phê duyệt',
  bgh_approved: 'Chờ lập dự trù',
  procurement_planned: 'Chờ KTV tiếp nhận',
  approved: 'Đã phê duyệt (hồ sơ cũ)',
  completed: 'Đã hoàn tất',
  rejected: 'Đã từ chối'
};

const formatCurrency = (value) => `${(Number(value) || 0).toLocaleString('vi-VN')} đ`;
const formatRatio = (value) => `${(Number(value) || 0).toFixed(2)}%`;

export const DisposalProposePage = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [proposals, setProposals] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [closedRepairs, setClosedRepairs] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [dialog, setDialog] = useState('');
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [formData, setFormData] = useState({
    equipment_id: '',
    repair_id: '',
    reason: '',
    recovery_value: 0
  });
  const [procurement, setProcurement] = useState({ budget: '', replacement_name: '', note: '' });
  const [receipt, setReceipt] = useState({ code: '', serial_number: '', brand: '', model: '', price: '' });
  const [rejectReason, setRejectReason] = useState('');

  const isTechnician = currentUser?.role === USER_ROLES.TECHNICIAN;
  const isManager = currentUser?.role === USER_ROLES.FACILITY_MANAGER;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const requests = [disposalApi.list()];
      if (isTechnician) requests.push(repairApi.list({ outcome: 'unrepairable' }));
      const results = await Promise.allSettled(requests);
      const [disposalResult, repairResult] = results;

      if (disposalResult.status === 'fulfilled' && disposalResult.value?.success) {
        const dispRes = disposalResult.value;
        setProposals(dispRes.proposals || []);
        setCandidates(dispRes.candidates || []);
      } else {
        const message = disposalResult.status === 'rejected'
          ? disposalResult.reason.message
          : 'Máy chủ không trả dữ liệu hồ sơ thanh lý.';
        toast.error(`Không thể tải hồ sơ thanh lý: ${message}`);
      }

      if (isTechnician && repairResult.status === 'fulfilled' && repairResult.value?.success) {
        setClosedRepairs(repairResult.value.repairs || []);
      } else if (isTechnician && repairResult.status === 'rejected') {
        toast.error(`Không thể tải phiếu sửa chữa: ${repairResult.reason.message}`);
      }
    } finally {
      setLoading(false);
    }
  }, [isTechnician, toast]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const openProposal = (equipment = null) => {
    setFormData({
      equipment_id: equipment?._id || '',
      repair_id: equipment?.unrepairable_repair_id || '',
      reason: '',
      recovery_value: equipment?.remaining_value ? Math.round(equipment.remaining_value * 0.1) : 0
    });
    setDialog('propose');
  };

  const selectedCandidate = candidates.find((candidate) => candidate._id === formData.equipment_id);
  const relevantRepairs = closedRepairs.filter((repair) => {
    const repairEquipmentId = repair.equipment_id?._id || repair.equipment_id;
    return repairEquipmentId === formData.equipment_id;
  });

  const runAction = async (action, successMessage) => {
    try {
      setSubmitting(true);
      const response = await action();
      if (response?.success) {
        toast.success(successMessage(response));
        setDialog('');
        setSelectedProposal(null);
        await fetchData();
      }
    } catch (err) {
      toast.error(err.message || 'Không thể cập nhật hồ sơ thanh lý.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleProposal = async (event) => {
    event.preventDefault();
    if (!formData.equipment_id || !formData.reason.trim()) {
      toast.error('Vui lòng chọn thiết bị và nhập lý do đề xuất.');
      return;
    }
    await runAction(
      () => disposalApi.propose({
        equipment_id: formData.equipment_id,
        repair_id: formData.repair_id || null,
        reason: formData.reason.trim(),
        recovery_value: Number(formData.recovery_value) || 0
      }),
      () => 'Đã gửi đề xuất; hồ sơ đang chờ Quản lý CSVC thẩm định.'
    );
  };

  const openProcurement = (proposal) => {
    setSelectedProposal(proposal);
    setProcurement({
      budget: String(proposal.procurement?.budget ?? ''),
      replacement_name: proposal.procurement?.replacement_name || proposal.equipment_id?.name || '',
      note: proposal.procurement?.note || ''
    });
    setDialog('procurement');
  };

  const handleProcurement = async (event) => {
    event.preventDefault();
    if (!procurement.replacement_name.trim() || procurement.budget === '') {
      toast.error('Vui lòng nhập thiết bị thay thế và ngân sách dự trù.');
      return;
    }
    await runAction(
      () => disposalApi.procurement(selectedProposal._id, {
        budget: Number(procurement.budget),
        replacement_name: procurement.replacement_name.trim(),
        note: procurement.note.trim()
      }),
      () => 'Đã lưu dự trù; KTV có thể ghi nhận tiếp nhận thiết bị thay thế.'
    );
  };

  const openReceipt = (proposal) => {
    setSelectedProposal(proposal);
    setReceipt({ code: '', serial_number: '', brand: '', model: '', price: String(proposal.procurement?.budget ?? '') });
    setDialog('receipt');
  };

  const handleReceipt = async (event) => {
    event.preventDefault();
    const actualPrice = Number(receipt.price);
    const plannedBudget = Number(selectedProposal?.procurement?.budget);
    if (!receipt.code.trim() || receipt.price === '' || !Number.isFinite(actualPrice) || actualPrice <= 0) {
      toast.error('Vui lòng nhập mã tài sản và nguyên giá thiết bị mới.');
      return;
    }
    if (actualPrice > plannedBudget) {
      toast.error(`Nguyên giá không được vượt ngân sách dự trù ${formatCurrency(plannedBudget)}.`);
      return;
    }
    await runAction(
      () => disposalApi.receipt(selectedProposal._id, {
        ...receipt,
        code: receipt.code.trim(),
        price: Number(receipt.price)
      }),
      (response) => response.message || 'Đã tiếp nhận thiết bị và hoàn tất hồ sơ.'
    );
  };

  const handleReject = async (event) => {
    event.preventDefault();
    if (!rejectReason.trim()) {
      toast.error('Vui lòng nhập lý do từ chối.');
      return;
    }
    await runAction(
      () => disposalApi.hcReject(selectedProposal._id, rejectReason.trim()),
      () => 'Đã từ chối hồ sơ và hoàn trạng thái thiết bị.'
    );
  };

  const openReject = (proposal) => {
    setSelectedProposal(proposal);
    setRejectReason('');
    setDialog('reject');
  };

  const renderDialog = (title, subtitle, onSubmit, children) => (
    <div className="ruo-drawer-backdrop" onClick={() => setDialog('')}>
      <div className="ruo-drawer-panel" style={{ width: 'min(560px, 96vw)' }} onClick={(event) => event.stopPropagation()}>
        <div className="ruo-drawer-header">
          <div>
            <h2 className="ruo-drawer-title">{title}</h2>
            <p className="ruo-drawer-subtitle">{subtitle}</p>
          </div>
          <button type="button" onClick={() => setDialog('')} className="ruo-drawer-close-btn" aria-label="Đóng">
            <Icons.X size={18} />
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="ruo-drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {children}
          </div>
          <div className="ruo-drawer-footer">
            <button type="button" onClick={() => setDialog('')} className="laser-btn laser-btn-secondary">Hủy</button>
            <button type="submit" disabled={submitting} className="laser-btn laser-btn-primary">
              {submitting ? 'Đang lưu...' : 'Xác nhận'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const fieldStyle = { width: '100%' };
  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '5px' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '22px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', color: isManager ? '#F59E0B' : '#06B6D4', background: 'rgba(6,182,212,0.1)', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>
              {isManager ? 'QUẢN LÝ CSVC' : 'KỸ THUẬT VIÊN'}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Quy trình RACI thanh lý tài sản</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink-pure)', margin: 0 }}>Hồ Sơ Đề Xuất Thanh Lý Tài Sản</h1>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--ink-muted)' }}>
            R = chi phí sửa chữa / nguyên giá. Cần R ≥ 60% hoặc có kết luận không thể sửa chữa.
          </p>
        </div>
        <button onClick={fetchData} className="laser-btn laser-btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <Icons.RefreshCw size={16} /> Làm mới
        </button>
      </div>

      {isTechnician && (
        <section style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-lg)', padding: '18px', marginBottom: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div>
              <h2 style={{ fontSize: '16px', margin: 0 }}>Thiết bị đủ điều kiện xem xét ({candidates.length})</h2>
              <p style={{ fontSize: '12px', color: 'var(--ink-muted)', margin: '5px 0 0' }}>Danh sách được lọc theo ngưỡng chi phí sửa chữa hoặc phiếu không thể sửa.</p>
            </div>
            <button onClick={() => openProposal()} className="laser-btn laser-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
              <Icons.Plus size={15} /> Tạo đề xuất
            </button>
          </div>
          {candidates.length ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '10px' }}>
              {candidates.map((candidate) => (
                <div key={candidate._id} style={{ padding: '12px', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-md)' }}>
                  <strong style={{ color: 'var(--laser-cyan)' }}>{candidate.code}</strong>
                  <div style={{ fontWeight: 700, marginTop: '3px' }}>{candidate.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--ink-muted)', margin: '5px 0 9px' }}>
                    R = {formatRatio(candidate.r_ratio)} • Sửa: {formatCurrency(candidate.repair_cost)} / Nguyên giá: {formatCurrency(candidate.original_value)}
                    {candidate.unrepairable_ticket_code ? ` • Phiếu ${candidate.unrepairable_ticket_code}: không thể sửa` : ''}
                  </div>
                  <button onClick={() => openProposal(candidate)} className="laser-btn laser-btn-secondary" style={{ fontSize: '12px' }}>Lập đề xuất</button>
                </div>
              ))}
            </div>
          ) : <div style={{ color: 'var(--ink-muted)', fontSize: '13px' }}>Chưa có thiết bị đạt điều kiện thanh lý.</div>}
        </section>
      )}

      <section style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '15px 18px', borderBottom: '1px solid var(--hairline-medium)' }}>
          <h2 style={{ fontSize: '16px', margin: 0 }}>Tiến độ hồ sơ ({proposals.length})</h2>
        </div>
        {loading ? <div style={{ padding: '36px', textAlign: 'center', color: 'var(--ink-muted)' }}>Đang tải hồ sơ...</div> :
          proposals.length === 0 ? <div style={{ padding: '36px', textAlign: 'center', color: 'var(--ink-muted)' }}>Chưa có hồ sơ thanh lý.</div> :
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {proposals.map((proposal) => {
                const equipment = proposal.equipment_id || {};
                return (
                  <article key={proposal._id} style={{ padding: '16px 18px', borderBottom: '1px solid var(--hairline-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ minWidth: 250, flex: 1 }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <strong style={{ color: 'var(--laser-cyan)' }}>{equipment.code || 'Thiết bị'}</strong>
                        <span style={{ fontWeight: 700 }}>{equipment.name}</span>
                        <span style={{ padding: '3px 8px', borderRadius: '5px', fontSize: '11px', fontWeight: 700, background: proposal.status === 'rejected' ? 'rgba(239,68,68,.12)' : 'rgba(6,182,212,.12)', color: proposal.status === 'rejected' ? '#EF4444' : 'var(--laser-cyan)' }}>
                          {statusLabels[proposal.status] || proposal.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--ink-muted)', marginTop: '6px' }}>
                        R = {formatRatio(proposal.r_ratio)} • {formatCurrency(proposal.repair_cost)} / {formatCurrency(proposal.original_value)} • Người đề xuất: {proposal.proposed_by?.full_name || 'KTV'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--ink-secondary)', marginTop: '4px' }}>{proposal.reason}</div>
                      {proposal.decision_number && <div style={{ fontSize: '12px', marginTop: '4px' }}>Quyết định BGH: <strong>{proposal.decision_number}</strong></div>}
                      {proposal.procurement?.replacement_name && <div style={{ fontSize: '12px', marginTop: '4px' }}>Dự trù: {proposal.procurement.replacement_name} • {formatCurrency(proposal.procurement.budget)}</div>}
                      {proposal.replacement_equipment_id && <div style={{ fontSize: '12px', marginTop: '4px' }}>Đã nhận: <strong>{proposal.replacement_equipment_id.code}</strong> • QR: {proposal.replacement_equipment_id.qr_code}</div>}
                      {proposal.reject_reason && <div style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px' }}>Lý do từ chối: {proposal.reject_reason}</div>}
                    </div>
                    {isManager && proposal.status === 'proposed' && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button disabled={submitting} onClick={() => runAction(() => disposalApi.hcApprove(proposal._id), () => 'Đã thẩm định và chuyển hồ sơ lên BGH.')} className="laser-btn laser-btn-primary">Thẩm định</button>
                        <button disabled={submitting} onClick={() => openReject(proposal)} className="laser-btn laser-btn-secondary">Từ chối</button>
                      </div>
                    )}
                    {isManager && proposal.status === 'bgh_approved' && (
                      <button onClick={() => openProcurement(proposal)} className="laser-btn laser-btn-primary">Lập dự trù</button>
                    )}
                    {isTechnician && proposal.status === 'procurement_planned' && (
                      <button onClick={() => openReceipt(proposal)} className="laser-btn laser-btn-primary">Tiếp nhận thiết bị</button>
                    )}
                  </article>
                );
              })}
            </div>}
      </section>

      {dialog === 'propose' && renderDialog(
        'Lập đề xuất thanh lý',
        'Hồ sơ sẽ chuyển đến Quản lý CSVC thẩm định.',
        handleProposal,
        <>
          <div>
            <label style={labelStyle}>Thiết bị *</label>
            <select required value={formData.equipment_id} onChange={(event) => {
              const candidate = candidates.find((item) => item._id === event.target.value);
              setFormData({ ...formData, equipment_id: event.target.value, repair_id: candidate?.unrepairable_repair_id || '' });
            }} className="ruo-portal-input" style={fieldStyle}>
              <option value="">-- Chọn thiết bị đủ điều kiện --</option>
              {candidates.map((candidate) => <option key={candidate._id} value={candidate._id}>{candidate.code} - {candidate.name} (R {formatRatio(candidate.r_ratio)})</option>)}
            </select>
          </div>
          {selectedCandidate && (
            <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--surface-panel)', fontSize: '12px' }}>
              R = {formatRatio(selectedCandidate.r_ratio)} | Chi phí sửa: {formatCurrency(selectedCandidate.repair_cost)} | Nguyên giá: {formatCurrency(selectedCandidate.original_value)}
            </div>
          )}
          {relevantRepairs.length > 0 && (
            <div>
              <label style={labelStyle}>Phiếu kết luận không thể sửa (nếu có)</label>
              <select value={formData.repair_id} onChange={(event) => setFormData({ ...formData, repair_id: event.target.value })} className="ruo-portal-input" style={fieldStyle}>
                <option value="">-- Chỉ xét theo ngưỡng R --</option>
                {relevantRepairs.map((repair) => <option key={repair._id} value={repair._id}>{repair.ticket_code} — {repair.outcome}</option>)}
              </select>
            </div>
          )}
          <div>
            <label style={labelStyle}>Lý do đề xuất *</label>
            <textarea required rows={3} value={formData.reason} onChange={(event) => setFormData({ ...formData, reason: event.target.value })} className="ruo-portal-input" style={{ ...fieldStyle, resize: 'vertical' }} />
          </div>
          <div>
            <label style={labelStyle}>Giá trị thu hồi dự kiến (VNĐ)</label>
            <input type="number" min="0" value={formData.recovery_value} onChange={(event) => setFormData({ ...formData, recovery_value: event.target.value })} className="ruo-portal-input" style={fieldStyle} />
          </div>
        </>
      )}

      {dialog === 'procurement' && renderDialog(
        'Lập dự trù mua sắm thay thế',
        `Tài sản thay thế được gắn với phòng hiện tại của ${selectedProposal?.equipment_id?.code || 'thiết bị'}.`,
        handleProcurement,
        <>
          <div><label style={labelStyle}>Tên thiết bị thay thế *</label><input required value={procurement.replacement_name} onChange={(event) => setProcurement({ ...procurement, replacement_name: event.target.value })} className="ruo-portal-input" style={fieldStyle} /></div>
          <div><label style={labelStyle}>Ngân sách dự trù (VNĐ) *</label><input required type="number" min="0" value={procurement.budget} onChange={(event) => setProcurement({ ...procurement, budget: event.target.value })} className="ruo-portal-input" style={fieldStyle} /></div>
          <div><label style={labelStyle}>Ghi chú mua sắm</label><textarea rows={3} value={procurement.note} onChange={(event) => setProcurement({ ...procurement, note: event.target.value })} className="ruo-portal-input" style={{ ...fieldStyle, resize: 'vertical' }} /></div>
        </>
      )}

      {dialog === 'receipt' && renderDialog(
        'Tiếp nhận tài sản thay thế',
        `Thiết bị mới sẽ được tạo trong danh mục, sinh QR và đặt tại phòng của ${selectedProposal?.equipment_id?.code || 'tài sản cũ'}.`,
        handleReceipt,
        <>
          <div><label style={labelStyle}>Mã tài sản mới *</label><input required value={receipt.code} onChange={(event) => setReceipt({ ...receipt, code: event.target.value })} className="ruo-portal-input" style={fieldStyle} /></div>
          <div><label style={labelStyle}>Số serial</label><input value={receipt.serial_number} onChange={(event) => setReceipt({ ...receipt, serial_number: event.target.value })} className="ruo-portal-input" style={fieldStyle} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div><label style={labelStyle}>Hãng</label><input value={receipt.brand} onChange={(event) => setReceipt({ ...receipt, brand: event.target.value })} className="ruo-portal-input" style={fieldStyle} /></div>
            <div><label style={labelStyle}>Model</label><input value={receipt.model} onChange={(event) => setReceipt({ ...receipt, model: event.target.value })} className="ruo-portal-input" style={fieldStyle} /></div>
          </div>
          <div><label style={labelStyle}>Nguyên giá thực tế (VNĐ) *</label><input required type="number" min="1" max={selectedProposal?.procurement?.budget} value={receipt.price} onChange={(event) => setReceipt({ ...receipt, price: event.target.value })} className="ruo-portal-input" style={fieldStyle} /></div>
          <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Nhập số tiền VNĐ đầy đủ (ví dụ 10 triệu nhập 10000000); không vượt dự trù {formatCurrency(selectedProposal?.procurement?.budget)}. Danh mục và phòng nhận giữ theo tài sản cũ; QR được tự sinh.</div>
        </>
      )}

      {dialog === 'reject' && renderDialog(
        'Từ chối đề xuất thanh lý',
        `Thiết bị ${selectedProposal?.equipment_id?.code || ''} sẽ trở về trạng thái trước khi đề xuất.`,
        handleReject,
        <div><label style={labelStyle}>Lý do từ chối *</label><textarea required rows={4} value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} className="ruo-portal-input" style={{ ...fieldStyle, resize: 'vertical' }} /></div>
      )}
    </div>
  );
};

export default DisposalProposePage;
