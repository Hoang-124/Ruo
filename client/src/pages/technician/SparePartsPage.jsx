import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { useToast } from '../../context/ToastContext';
import { sparePartApi, repairApi } from '../../lib/api';

export const SparePartsPage = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [parts, setParts] = useState([]);
  const [requests, setRequests] = useState([]);
  const [activeRepairs, setActiveRepairs] = useState([]);
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'requests'

  // Modal
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [requestForm, setRequestForm] = useState({
    repair_id: '',
    part_id: '',
    qty: 1,
    reason: 'Thay thế linh kiện hỏng trong quá trình sửa chữa'
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [partsRes, reqRes, repRes] = await Promise.all([
        sparePartApi.list(),
        sparePartApi.getRequests(),
        repairApi.list()
      ]);

      if (partsRes && partsRes.success) {
        setParts(partsRes.parts || []);
      }
      if (reqRes && reqRes.success) {
        setRequests(reqRes.requests || []);
      }
      if (repRes && repRes.success) {
        const inProgress = (repRes.repairs || []).filter(r => ['assigned', 'in_progress'].includes(r.status));
        setActiveRepairs(inProgress);
        if (inProgress.length > 0 && !requestForm.repair_id) {
          setRequestForm(prev => ({ ...prev, repair_id: inProgress[0]._id }));
        }
      }
    } catch (err) {
      toast.error('Lỗi khi tải kho linh kiện: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openRequest = (part = null) => {
    setRequestForm({
      repair_id: activeRepairs[0]?._id || '',
      part_id: part ? part._id : (parts[0]?._id || ''),
      qty: 1,
      reason: 'Thay thế linh kiện hỏng trong quá trình sửa chữa'
    });
    setShowRequestModal(true);
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    if (!requestForm.part_id) {
      toast.error('Vui lòng chọn linh kiện cần yêu cầu cấp phát.');
      return;
    }
    if (!requestForm.repair_id) {
      toast.error('Vui lòng chọn phiếu sửa chữa cần cấp linh kiện.');
      return;
    }
    if (requestForm.qty < 1) {
      toast.error('Số lượng linh kiện yêu cầu phải lớn hơn 0.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await sparePartApi.createRequest({
        repair_id: requestForm.repair_id,
        items: [{ part_id: requestForm.part_id, qty: Number(requestForm.qty) || 1 }],
        reason: requestForm.reason.trim()
      });

      if (res && res.success) {
        toast.success('Đã gửi yêu cầu cấp linh kiện thành công! Quản lý CSVC sẽ xét duyệt.');
        setShowRequestModal(false);
        setActiveTab('requests');
        await fetchData();
      }
    } catch (err) {
      toast.error('Lỗi khi gửi yêu cầu: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const lowStockCount = parts.filter(p => p.stock <= (p.min_stock || 5)).length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', color: '#0EA5E9', background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.25)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>KỸ THUẬT VIÊN</span>
            <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>MODULE 04 • UC: VIEW SPARE PARTS & REQUEST PARTS</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink-pure)', letterSpacing: '-0.02em', margin: 0 }}>
            Kho Linh Kiện Dự Phòng & Yêu Cầu Cấp Phát
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--ink-muted)' }}>
            Tra cứu tồn kho linh kiện thay thế tại chỗ, lập phiếu yêu cầu cấp phát gửi Cán bộ Quản lý CSVC phê duyệt.
          </p>
        </div>

        <button
          onClick={() => openRequest()}
          className="laser-btn laser-btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 18px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 700 }}
        >
          <Icons.Plus size={16} />
          <span>Yêu Cầu Linh Kiện Mới</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Mã linh kiện trong kho</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--ink-pure)', marginTop: '4px' }}>{parts.length}</div>
        </div>

        <div style={{ background: 'var(--surface-card)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: '12px', color: '#EF4444', fontWeight: 600 }}>Cảnh báo sắp hết hàng (Dưới Min)</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#EF4444', marginTop: '4px' }}>{lowStockCount}</div>
        </div>

        <div style={{ background: 'var(--surface-card)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: '12px', color: 'var(--laser-cyan)', fontWeight: 600 }}>Phiếu yêu cầu cấp linh kiện</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--laser-cyan)', marginTop: '4px' }}>{requests.length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--hairline-medium)', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('inventory')}
          style={{
            padding: '10px 18px',
            fontSize: '13px',
            fontWeight: activeTab === 'inventory' ? 700 : 500,
            color: activeTab === 'inventory' ? 'var(--laser-cyan)' : 'var(--ink-muted)',
            borderBottom: activeTab === 'inventory' ? '2px solid var(--laser-cyan)' : '2px solid transparent',
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer'
          }}
        >
          Danh Mục Tồn Kho Linh Kiện ({parts.length})
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          style={{
            padding: '10px 18px',
            fontSize: '13px',
            fontWeight: activeTab === 'requests' ? 700 : 500,
            color: activeTab === 'requests' ? 'var(--laser-cyan)' : 'var(--ink-muted)',
            borderBottom: activeTab === 'requests' ? '2px solid var(--laser-cyan)' : '2px solid transparent',
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer'
          }}
        >
          Lịch Sử Yêu Cầu Cấp Phát ({requests.length})
        </button>
      </div>

      {/* Tab: Inventory List */}
      {activeTab === 'inventory' && (
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink-muted)' }}>
              <Icons.RefreshCw size={28} className="spin" style={{ marginBottom: '12px' }} />
              <div>Đang tải danh mục linh kiện...</div>
            </div>
          ) : parts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-muted)' }}>
              <Icons.Package size={36} style={{ opacity: 0.5, marginBottom: '12px' }} />
              <div style={{ fontSize: '15px', fontWeight: 600 }}>Chưa có linh kiện nào trong kho.</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--surface-panel)', borderBottom: '1px solid var(--hairline-medium)' }}>
                  <th style={{ padding: '12px 18px', color: 'var(--ink-pure)', fontWeight: 700 }}>Mã Linh Kiện</th>
                  <th style={{ padding: '12px 18px', color: 'var(--ink-pure)', fontWeight: 700 }}>Tên Linh Kiện & Thông Số</th>
                  <th style={{ padding: '12px 18px', color: 'var(--ink-pure)', fontWeight: 700 }}>Chủng Loại Thiết Bị</th>
                  <th style={{ padding: '12px 18px', color: 'var(--ink-pure)', fontWeight: 700 }}>Tồn Kho Thực Tế</th>
                  <th style={{ padding: '12px 18px', color: 'var(--ink-pure)', fontWeight: 700 }}>Định Mức Tối Thiểu</th>
                  <th style={{ padding: '12px 18px', textAlign: 'right', color: 'var(--ink-pure)', fontWeight: 700 }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {parts.map(p => {
                  const isLow = p.stock <= (p.min_stock || 5);
                  return (
                    <tr key={p._id} style={{ borderBottom: '1px solid var(--hairline-soft)' }}>
                      <td style={{ padding: '12px 18px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--laser-cyan)' }}>
                        {p.part_code || p.code || 'PRT'}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--ink-pure)' }}>{p.name}</div>
                        <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>{p.description || 'Linh kiện thay thế chuẩn'}</div>
                      </td>
                      <td style={{ padding: '12px 18px', color: 'var(--ink-secondary)' }}>
                        {p.category_id?.name || 'Chung'}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: isLow ? '#EF4444' : '#10B981' }}>
                          {p.stock}
                        </span>
                        {isLow && (
                          <span style={{ marginLeft: '8px', fontSize: '10.5px', background: 'rgba(239,68,68,0.15)', color: '#EF4444', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                            Sắp hết
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 18px', color: 'var(--ink-muted)', fontSize: '12px' }}>
                        {p.min_stock || 5} đơn vị
                      </td>
                      <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                        <button
                          onClick={() => openRequest(p)}
                          className="laser-btn laser-btn-secondary"
                          style={{ padding: '5px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Icons.Plus size={13} />
                          <span>Yêu Cầu Cấp</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab: Requests List */}
      {activeTab === 'requests' && (
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {requests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-muted)' }}>
              <Icons.CheckCircle size={36} style={{ opacity: 0.5, marginBottom: '12px' }} />
              <div style={{ fontSize: '15px', fontWeight: 600 }}>Chưa có yêu cầu cấp linh kiện nào.</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--surface-panel)', borderBottom: '1px solid var(--hairline-medium)' }}>
                  <th style={{ padding: '12px 18px', color: 'var(--ink-pure)', fontWeight: 700 }}>Mã Yêu Cầu</th>
                  <th style={{ padding: '12px 18px', color: 'var(--ink-pure)', fontWeight: 700 }}>Phiếu Sửa Chữa</th>
                  <th style={{ padding: '12px 18px', color: 'var(--ink-pure)', fontWeight: 700 }}>Linh Kiện & Số Lượng</th>
                  <th style={{ padding: '12px 18px', color: 'var(--ink-pure)', fontWeight: 700 }}>Trạng Thái Duyệt</th>
                  <th style={{ padding: '12px 18px', color: 'var(--ink-pure)', fontWeight: 700 }}>Ngày Lập</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(r => {
                  const isPending = r.status === 'pending';
                  const isApproved = r.status === 'approved';
                  const isRejected = r.status === 'rejected';

                  return (
                    <tr key={r._id} style={{ borderBottom: '1px solid var(--hairline-soft)' }}>
                      <td style={{ padding: '12px 18px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--laser-cyan)' }}>
                        {r.request_code || `REQ-${r._id?.slice(-6)}`}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--ink-pure)' }}>
                          {r.repair_id?.ticket_code || 'Phiếu sửa'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        {(r.items || []).map((it, idx) => (
                          <div key={idx} style={{ fontSize: '12.5px' }}>
                            • <strong>{it.part_id?.name || 'Linh kiện'}</strong> x {it.qty}
                          </div>
                        ))}
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
                          {isPending ? 'Chờ Quản Lý Duyệt' : isApproved ? 'Đã Phê Duyệt' : 'Bị Từ Chối'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 18px', color: 'var(--ink-muted)', fontSize: '12px' }}>
                        {new Date(r.created_at).toLocaleDateString('vi-VN')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Request Modal */}
      {showRequestModal && (
        <div className="ruo-drawer-backdrop" onClick={() => setShowRequestModal(false)}>
          <div className="ruo-drawer-panel" style={{ width: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="ruo-drawer-header">
              <div>
                <h2 className="ruo-drawer-title">Yêu Cầu Cấp Phát Linh Kiện Thay Thế</h2>
                <p className="ruo-drawer-subtitle">Phiếu yêu cầu sẽ được chuyển tới Quản lý CSVC để trừ kho và xuất hàng</p>
              </div>
              <button onClick={() => setShowRequestModal(false)} className="ruo-drawer-close-btn"><Icons.X size={18} /></button>
            </div>

            <form onSubmit={handleRequestSubmit}>
              <div className="ruo-drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Phiếu Sửa Chữa Áp Dụng *
                  </label>
                  {activeRepairs.length === 0 ? (
                    <div style={{ padding: '10px', background: 'var(--surface-panel)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: '#F59E0B' }}>
                      Hiện không có phiếu sửa chữa nào đang xử lý.
                    </div>
                  ) : (
                    <select
                      required
                      value={requestForm.repair_id}
                      onChange={(e) => setRequestForm({ ...requestForm, repair_id: e.target.value })}
                      className="ruo-portal-input"
                      style={{ width: '100%', height: '38px', fontSize: '13px' }}
                    >
                      {activeRepairs.map(rep => (
                        <option key={rep._id} value={rep._id}>
                          {rep.ticket_code} — {rep.equipment_id?.name} ({rep.room_id?.code})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Chọn Linh Kiện Cần Cấp *
                  </label>
                  <select
                    required
                    value={requestForm.part_id}
                    onChange={(e) => setRequestForm({ ...requestForm, part_id: e.target.value })}
                    className="ruo-portal-input"
                    style={{ width: '100%', height: '38px', fontSize: '13px' }}
                  >
                    {parts.map(p => (
                      <option key={p._id} value={p._id}>
                        {p.part_code || p.code} - {p.name} (Còn tồn: {p.stock})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Số Lượng Yêu Cầu *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={requestForm.qty}
                    onChange={(e) => setRequestForm({ ...requestForm, qty: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="ruo-portal-input"
                    style={{ width: '100%', height: '38px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Lý Do / Vị Trí Cần Thay Thế
                  </label>
                  <textarea
                    rows={3}
                    value={requestForm.reason}
                    onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                    className="ruo-portal-input"
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>
              </div>

              <div className="ruo-drawer-footer">
                <button type="button" onClick={() => setShowRequestModal(false)} className="laser-btn laser-btn-secondary" style={{ padding: '8px 16px' }}>Hủy Bỏ</button>
                <button type="submit" disabled={submitting} className="laser-btn laser-btn-primary" style={{ padding: '8px 20px', fontWeight: 700 }}>
                  {submitting ? 'Đang Gửi...' : 'Gửi Phiếu Yêu Cầu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SparePartsPage;
