import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { useToast } from '../../context/ToastContext';
import { repairApi, authApi, equipmentApi, masterDataApi } from '../../lib/api';
import { RepairStepper } from '../../components/repairs/RepairStepper';
import { DeadlineCountdown } from '../../components/repairs/DeadlineCountdown';

const toLocalDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export const TicketKanbanPage = () => {
  const { toast } = useToast();
  const { error: showError } = toast;

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const [loading, setLoading] = useState(true);
  const [repairs, setRepairs] = useState([]);
  const [slaStats, setSlaStats] = useState(null);
  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL' | 'OVERDUE' | 'AT_RISK'
  const [checkingBreaches, setCheckingBreaches] = useState(false);
  const [technicians, setTechnicians] = useState([]);
  const [spareEquipments, setSpareEquipments] = useState([]);
  const [rooms, setRooms] = useState([]);

  // Active drawer & modals
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [aiCopilotLoading, setAiCopilotLoading] = useState(false);
  const [aiCopilotMap, setAiCopilotMap] = useState({});
  const aiRequest = useRef(0);

  const aiContext = JSON.stringify([selectedTicket?._id]);
  const [previousAiContext, setPreviousAiContext] = useState(aiContext);
  if (previousAiContext !== aiContext) {
    setPreviousAiContext(aiContext);
    setAiCopilotLoading(false);
  }

  useEffect(() => {
    aiRequest.current += 1;
    return () => { aiRequest.current += 1; };
  }, [selectedTicket?._id]);

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

  const STATUS_LABELS = {
    reported: { label: 'Mới tiếp nhận', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
    assigned: { label: 'Đã giao KTV', color: 'var(--laser-cyan)', bg: 'rgba(6,182,212,0.15)' },
    in_progress: { label: 'Đang sửa chữa', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
    resolved: { label: 'Đã khắc phục', color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
    unrepairable: { label: 'Không thể sửa', color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
    closed: { label: 'Đã đóng phiếu', color: 'var(--ink-secondary)', bg: 'rgba(100,116,139,0.18)' }
  };

  const DAMAGE_LABELS = {
    minor: { label: 'Hỏng nhẹ', short: 'Nhẹ', color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
    major: { label: 'Hỏng nặng', short: 'Nặng', color: '#F59E0B', bg: 'rgba(245,158,11,0.18)' },
    critical: { label: 'Khẩn cấp', short: 'Khẩn cấp', color: '#EF4444', bg: 'rgba(239,68,68,0.2)' }
  };

  const getStatusBadge = (status) => {
    const info = STATUS_LABELS[status] || { label: status, color: 'var(--ink-secondary)', bg: 'var(--surface-panel)' };
    return (
      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '11.5px', fontWeight: 700, color: info.color, background: info.bg }}>
        {info.label}
      </span>
    );
  };

  const getDamageBadge = (level, compact = false) => {
    const info = DAMAGE_LABELS[level] || { label: level, short: level, color: '#F59E0B', bg: 'rgba(245,158,11,0.18)' };
    return (
      <span style={{ display: 'inline-block', padding: '2px 7px', borderRadius: '4px', fontSize: compact ? '10.5px' : '11.5px', fontWeight: 700, color: info.color, background: info.bg }}>
        {compact ? info.short : info.label}
      </span>
    );
  };

  const columns = [
    { id: 'reported', title: 'MỚI TIẾP NHẬN', color: '#F59E0B' },
    { id: 'assigned', title: 'ĐÃ GIAO KTV', color: 'var(--laser-cyan)' },
    { id: 'in_progress', title: 'ĐANG XỬ LÝ', color: '#3B82F6' },
    { id: 'resolved', title: 'ĐÃ KHẮC PHỤC', color: '#10B981' },
    { id: 'unrepairable', title: 'KHÔNG THỂ SỬA', color: '#EF4444' },
    { id: 'closed', title: 'ĐÃ ĐÓNG PHIẾU', color: 'var(--ink-secondary)' }
  ];

  const fetchData = useCallback(async () => {
    aiRequest.current += 1;
    setAiCopilotLoading(false);
    setAiCopilotMap({});
    try {
      setLoading(true);
      const [repRes, techRes, eqRes, roomRes, slaRes] = await Promise.all([
        repairApi.list(),
        authApi.listUsers({ role: 'technician' }),
        equipmentApi.list({ status: 'in_stock' }),
        masterDataApi.getRooms({ limit: 100 }),
        repairApi.getSlaStats().catch(() => null)
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
      if (slaRes && slaRes.success) {
        setSlaStats(slaRes.data);
      }
    } catch (err) {
      showError('Lỗi khi tải dữ liệu sửa chữa: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  const handleCheckBreaches = async () => {
    try {
      setCheckingBreaches(true);
      const res = await repairApi.checkSlaBreaches();
      if (res && res.success) {
        toast.success(res.message);
        await fetchData();
      }
    } catch (err) {
      showError('Lỗi khi kiểm tra vi phạm SLA: ' + err.message);
    } finally {
      setCheckingBreaches(false);
    }
  };

  useEffect(() => {
    // This effect synchronizes remote data; the loader also sets its pending state before awaiting the response.
    // eslint-disable-next-line react/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const handleRunAiCopilot = async (ticket) => {
    if (!ticket?._id) return;
    const request = ++aiRequest.current;
    try {
      setAiCopilotLoading(true);
      const res = await repairApi.aiCopilot(ticket._id);
      if (request !== aiRequest.current) return;
      if (res && res.success && res.copilot) {
        setAiCopilotMap((prev) => ({ ...prev, [ticket._id]: res.copilot }));
        toast.success(`AI Copilot đã phân tích phiếu [${ticket.ticket_code}]!`);
      }
    } catch (err) {
      if (request === aiRequest.current) showError('Lỗi khi chạy AI Điều phối: ' + err.message);
    } finally {
      if (request === aiRequest.current) setAiCopilotLoading(false);
    }
  };

  const applyAiDispatchRecommendation = (copilot) => {
    const rec = copilot?.dispatch_recommendation;
    if (!rec) return;
    // AI searches the full category; the initial lists may be paginated.
    if (rec.recommended_replacement?._id) {
      setSpareEquipments((prev) => prev.some((eq) => eq._id === rec.recommended_replacement._id)
        ? prev : [...prev, rec.recommended_replacement]);
    }
    if (rec.recommended_technician?._id) {
      setTechnicians((prev) => prev.some((tech) => tech._id === rec.recommended_technician._id)
        ? prev : [...prev, rec.recommended_technician]);
    }
    setAssignForm((prev) => ({
      ...prev,
      assigned_to: rec.recommended_technician?._id || prev.assigned_to,
      damage_level: rec.suggested_damage_level || prev.damage_level,
      deadline: toLocalDateTime(rec.suggested_deadline) || prev.deadline,
      replacement_equipment_id: rec.recommended_replacement?._id || prev.replacement_equipment_id
    }));
    toast.success('Đã điền tự động KTV tối ưu, hạn SLA và thiết bị dự phòng từ AI!');
  };

  const openAssign = (ticket) => {
    setSelectedTicket(ticket);
    const defaultHours = ticket.damage_level === 'critical' ? 8 : ticket.damage_level === 'major' ? 24 : 48;
    const defaultDeadline = toLocalDateTime(ticket.deadline) || toLocalDateTime(now + defaultHours * 3600 * 1000);

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
      showError('Vui lòng chọn Kỹ thuật viên phụ trách.');
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
      showError('Lỗi khi phân công KTV: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openClose = (ticket) => {
    setSelectedTicket(ticket);
    const warehouseRoom = rooms.find(r => (r.room_type || r.type) === 'warehouse');
    setCloseForm({
      destination_room_id: ticket.room_id?._id || warehouseRoom?._id || ''
    });
    setShowCloseModal(true);
  };

  const handleCloseSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const isUnrepairable = selectedTicket.status === 'unrepairable';
      const res = await repairApi.closeTicket(selectedTicket._id, {
        destination_room_id: isUnrepairable ? null : (closeForm.destination_room_id || null)
      });

      if (res && res.success) {
        toast.success(
          isUnrepairable
            ? `Đã đóng phiếu [${selectedTicket.ticket_code}] và chuyển thiết bị sang danh sách chờ thanh lý!`
            : `Đã nghiệm thu và đóng phiếu sửa chữa [${selectedTicket.ticket_code}]!`
        );
        setShowCloseModal(false);
        setSelectedTicket(null);
        await fetchData();
      }
    } catch (err) {
      showError('Lỗi khi đóng phiếu: ' + err.message);
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
            <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Điều Phối Kỹ Thuật & Giám Sát Hạn Định SLA</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink-pure)', letterSpacing: '-0.02em', margin: 0 }}>
            Trung Tâm Điều Phối Sửa Chữa Thiết Bị
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--ink-muted)' }}>
            Giao việc cho Kỹ thuật viên, cấp đồ dự phòng thay thế từ kho, duyệt linh kiện và chọn nơi về sau khi sửa xong.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleCheckBreaches}
            disabled={checkingBreaches}
            className="laser-btn laser-btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 16px', borderRadius: 'var(--radius-md)', fontSize: '13px', border: '1px solid rgba(239,68,68,0.4)', color: '#EF4444' }}
            title="Quét toàn bộ phiếu quá hạn và phát cảnh báo đến KTV và Quản Lý"
          >
            <Icons.AlertTriangle size={16} />
            <span>{checkingBreaches ? 'Đang Quét...' : 'Quét Cảnh Báo SLA'}</span>
          </button>

          <button
            onClick={fetchData}
            className="laser-btn laser-btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 16px', borderRadius: 'var(--radius-md)', fontSize: '13px' }}
          >
            <Icons.RefreshCw size={16} />
            <span>Làm Mới</span>
          </button>
        </div>
      </div>

      {/* SLA & KPI Stats (UC-7.2) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Tỷ Lệ Tuân Thủ SLA</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: (slaStats?.compliance_rate ?? 100) >= 90 ? '#10B981' : (slaStats?.compliance_rate ?? 100) >= 70 ? '#F59E0B' : '#EF4444', marginTop: '4px' }}>
            {slaStats ? `${slaStats.compliance_rate}%` : '100%'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '2px' }}>
            {slaStats?.on_time_resolved || 0} đúng hạn / {slaStats?.resolved_count || 0} đã xong
          </div>
        </div>

        <div
          onClick={() => setFilterMode(filterMode === 'OVERDUE' ? 'ALL' : 'OVERDUE')}
          style={{
            background: 'var(--surface-card)',
            border: filterMode === 'OVERDUE' ? '2px solid #EF4444' : '1px solid rgba(239,68,68,0.3)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 18px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <div style={{ fontSize: '12px', color: '#EF4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🚨 Đang Quá Hạn SLA</span>
            {filterMode === 'OVERDUE' && <span style={{ fontSize: '10px', background: '#EF4444', color: '#fff', padding: '1px 5px', borderRadius: '4px' }}>ĐANG LỌC</span>}
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#EF4444', marginTop: '4px' }}>
            {slaStats?.currently_overdue ?? 0}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '2px' }}>
            Bấm để {filterMode === 'OVERDUE' ? 'hủy lọc' : 'lọc ca trễ hạn'}
          </div>
        </div>

        <div
          onClick={() => setFilterMode(filterMode === 'AT_RISK' ? 'ALL' : 'AT_RISK')}
          style={{
            background: 'var(--surface-card)',
            border: filterMode === 'AT_RISK' ? '2px solid #F59E0B' : '1px solid rgba(245,158,11,0.3)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 18px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <div style={{ fontSize: '12px', color: '#F59E0B', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>⚠️ Sắp Hết Hạn (≤ 2h)</span>
            {filterMode === 'AT_RISK' && <span style={{ fontSize: '10px', background: '#F59E0B', color: '#fff', padding: '1px 5px', borderRadius: '4px' }}>ĐANG LỌC</span>}
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#F59E0B', marginTop: '4px' }}>
            {slaStats?.currently_at_risk ?? 0}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '2px' }}>
            Bấm để {filterMode === 'AT_RISK' ? 'hủy lọc' : 'lọc ca rủi ro'}
          </div>
        </div>

        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Thời Gian Xử Lý TB (MTTR)</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--laser-cyan)', marginTop: '4px' }}>
            {slaStats?.avg_resolution_hours ?? 0}h
          </div>
          <div style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '2px' }}>
            Khẩn cấp: {slaStats?.by_damage_level?.critical?.overdue ?? 0} trễ / {slaStats?.by_damage_level?.critical?.total ?? 0}
          </div>
        </div>
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
            const colTickets = repairs.filter(r => {
              if (r.status !== col.id) return false;
              if (filterMode === 'OVERDUE') {
                return r.deadline_status === 'overdue' || (r.deadline && new Date(r.deadline).getTime() < now);
              }
              if (filterMode === 'AT_RISK') {
                return r.deadline_status === 'at_risk' || (r.remaining_minutes > 0 && r.remaining_minutes <= 120);
              }
              return true;
            });

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
                    const isUnrepairable = t.status === 'unrepairable';

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
                          {getDamageBadge(t.damage_level, true)}
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

                        {/* Real-time SLA Deadline Countdown (UC-7.1) */}
                        {t.deadline && (
                          <div style={{ marginTop: '2px' }}>
                            <DeadlineCountdown compact={true} deadline={t.deadline} status={t.status} />
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

                          {isUnrepairable && (
                            <button
                              onClick={() => openClose(t)}
                              className="laser-btn"
                              style={{ width: '100%', padding: '6px', fontSize: '11.5px', fontWeight: 700, background: 'rgba(239,68,68,0.14)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.35)' }}
                            >
                              Đóng Phiếu (Chờ Thanh Lý)
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
              <RepairStepper status={selectedTicket.status} outcome={selectedTicket.outcome} />

              {/* Real-time SLA Deadline Countdown (UC-7.1) */}
              {selectedTicket.deadline && (
                <DeadlineCountdown deadline={selectedTicket.deadline} status={selectedTicket.status} />
              )}

              <div style={{ background: 'var(--surface-panel)', padding: '12px 14px', borderRadius: 'var(--radius-md)', fontSize: '12.5px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', alignItems: 'center' }}>
                <div>Phòng học: <strong>{selectedTicket.room_id?.code || 'Chưa gán'}</strong></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span>Trạng thái:</span>
                  {getStatusBadge(selectedTicket.status)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span>Mức hư hỏng:</span>
                  {getDamageBadge(selectedTicket.damage_level)}
                </div>
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

              {/* AI Dispatch & Diagnosis Copilot Panel */}
              <div style={{ background: 'var(--surface-2)', border: '1.5px solid var(--border-focus)', borderRadius: 'var(--radius-md)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '12.5px', color: 'var(--ink-pure)' }}>
                    <Icons.Sparkles size={15} style={{ color: 'var(--laser-cyan)' }} />
                    <span>AI Chẩn Đoán & Gợi Ý Điều Phối</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRunAiCopilot(selectedTicket)}
                    disabled={aiCopilotLoading}
                    className="laser-btn laser-btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '11.5px', fontWeight: 700 }}
                  >
                    {aiCopilotLoading ? 'Đang Phân Tích...' : (aiCopilotMap[selectedTicket._id] ? 'Phân Tích Lại' : 'Chạy AI Copilot')}
                  </button>
                </div>

                {aiCopilotMap[selectedTicket._id] && (() => {
                  const cp = aiCopilotMap[selectedTicket._id];
                  const bestTech = cp.dispatch_recommendation?.recommended_technician;
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                      {cp.disposal_advisory?.should_consider_disposal && (
                        <div style={{ background: 'var(--status-danger-bg)', border: '1px solid var(--status-danger-border)', color: 'var(--status-danger-color)', padding: '8px 10px', borderRadius: 'var(--radius-sm)', fontWeight: 700 }}>
                          ⚠ {cp.disposal_advisory.recommendation}
                        </div>
                      )}
                      <div>
                        <strong style={{ color: 'var(--ink-pure)' }}>Nguyên nhân gốc dự kiến:</strong>{' '}
                        <span style={{ color: 'var(--ink-secondary)' }}>{cp.diagnosis?.root_cause}</span>
                      </div>
                      {bestTech && (
                        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', padding: '8px 10px', borderRadius: 'var(--radius-sm)' }}>
                          <div style={{ fontWeight: 800, color: 'var(--laser-cyan)' }}>
                            KTV đề xuất #1: {bestTech.full_name} ({bestTech.code}) • Điểm phù hợp {bestTech.score}/100
                          </div>
                          <div style={{ color: 'var(--ink-muted)', fontSize: '11.5px', marginTop: '2px' }}>{bestTech.reason}</div>
                        </div>
                      )}
                      {Array.isArray(cp.recommended_parts) && cp.recommended_parts.length > 0 && (
                        <div>
                          <strong style={{ color: 'var(--ink-pure)' }}>Linh kiện kho gợi ý:</strong>{' '}
                          {cp.recommended_parts.map((p) => `${p.name} (Tồn: ${p.stock} ${p.unit})`).join(' • ')}
                        </div>
                      )}
                    </div>
                  );
                })()}
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

            <div className="ruo-drawer-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
              <button onClick={() => setSelectedTicket(null)} className="laser-btn laser-btn-secondary" style={{ padding: '8px 16px' }}>
                Đóng Cửa Sổ
              </button>
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
              {selectedTicket.status === 'unrepairable' && (
                <>
                  <a
                    href="#/disposal_propose"
                    onClick={() => setSelectedTicket(null)}
                    className="laser-btn laser-btn-secondary"
                    style={{ padding: '8px 16px', fontWeight: 700, textDecoration: 'none', color: '#EF4444', borderColor: 'rgba(239,68,68,0.4)' }}
                  >
                    Lập Đề Xuất Thanh Lý
                  </a>
                  <button onClick={() => openClose(selectedTicket)} className="laser-btn laser-btn-primary" style={{ padding: '8px 20px', fontWeight: 700 }}>
                    Xác Nhận & Đóng Phiếu (Chờ Thanh Lý)
                  </button>
                </>
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
                {/* AI Dispatch One-Click Banner inside Assign Modal */}
                <div style={{ background: 'var(--surface-2)', border: '1.5px solid var(--border-focus)', borderRadius: 'var(--radius-md)', padding: '10px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800, color: 'var(--ink-pure)' }}>
                      <Icons.Sparkles size={14} style={{ color: 'var(--laser-cyan)' }} />
                      <span>AI Gợi Ý Phân Công Tối Ưu</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => handleRunAiCopilot(selectedTicket)}
                        disabled={aiCopilotLoading}
                        className="laser-btn laser-btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 700 }}
                      >
                        {aiCopilotLoading ? 'Đang Tính...' : 'Gợi Ý Từ AI'}
                      </button>
                      {aiCopilotMap[selectedTicket._id] && (
                        <button
                          type="button"
                          onClick={() => applyAiDispatchRecommendation(aiCopilotMap[selectedTicket._id])}
                          className="laser-btn laser-btn-primary"
                          style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 700 }}
                        >
                          Áp Dụng Gợi Ý
                        </button>
                      )}
                    </div>
                  </div>
                  {aiCopilotMap[selectedTicket._id]?.dispatch_recommendation?.recommended_technician && (
                    <div style={{ marginTop: '8px', fontSize: '11.5px', color: 'var(--ink-secondary)' }}>
                      Đề xuất: <strong>{aiCopilotMap[selectedTicket._id].dispatch_recommendation.recommended_technician.full_name}</strong> ({aiCopilotMap[selectedTicket._id].dispatch_recommendation.recommended_technician.reason})
                      {aiCopilotMap[selectedTicket._id].dispatch_recommendation.recommended_replacement && (
                        <span> • Đồ dự phòng: <strong>{aiCopilotMap[selectedTicket._id].dispatch_recommendation.recommended_replacement.code}</strong></span>
                      )}
                    </div>
                  )}
                </div>

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
                    <option value="critical">Khẩn Cấp (Critical - SLA 8h)</option>
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
                <h2 className="ruo-drawer-title">
                  {selectedTicket.status === 'unrepairable'
                    ? 'Đóng Phiếu Sửa Chữa & Chuyển Chờ Thanh Lý'
                    : 'Nghiệm Thu & Chọn Nơi Về Sau Sửa'}
                </h2>
                <p className="ruo-drawer-subtitle">{selectedTicket.ticket_code} • {selectedTicket.equipment_id?.name}</p>
              </div>
              <button onClick={() => setShowCloseModal(false)} className="ruo-drawer-close-btn"><Icons.X size={18} /></button>
            </div>

            <form onSubmit={handleCloseSubmit}>
              <div className="ruo-drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {selectedTicket.status === 'unrepairable' ? (
                  <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', padding: '12px 14px', borderRadius: 'var(--radius-md)', fontSize: '12.5px', color: 'var(--ink-primary)' }}>
                    <div style={{ fontWeight: 700, color: '#EF4444', marginBottom: '4px' }}>
                      Xác nhận thiết bị không thể khắc phục
                    </div>
                    <div>
                      Kỹ thuật viên đã kết luận thiết bị này không thể sửa chữa. Khi đóng phiếu, thiết bị sẽ được giữ ở trạng thái <strong>Chờ thanh lý</strong> để đưa vào danh sách đề xuất thanh lý trình Hiệu trưởng phê duyệt.
                    </div>
                  </div>
                ) : (
                  <>
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
                            {(r.room_type || r.type) === 'warehouse' ? `[KHO DỰ PHÒNG] ${r.code} - ${r.name}` : `${r.code} - ${r.name}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
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
