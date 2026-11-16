import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { repairApi, authApi, equipmentApi, masterDataApi } from '../../lib/api';
import { RepairStepper } from '../../components/repairs/RepairStepper';
import { DeadlineCountdown } from '../../components/repairs/DeadlineCountdown';
import { TicketChatDrawer } from '../../components/chat/TicketChatDrawer';

const toLocalDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export const TicketKanbanPage = () => {
  const { toast } = useToast();
  const { error: showError } = toast;
  let currentUser = null;
  try {
    const auth = useAuth();
    currentUser = auth?.currentUser || null;
  } catch {
    currentUser = null;
  }
  const isFacilityManager = !currentUser?.role || currentUser.role === 'facility_manager';

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const [loading, setLoading] = useState(true);
  const [repairs, setRepairs] = useState([]);
  const [slaStats, setSlaStats] = useState(null);
  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL' | 'OVERDUE' | 'AT_RISK'
  const [searchQuery, setSearchQuery] = useState('');
  const [displayMode, setDisplayMode] = useState('kanban'); // 'kanban' | 'table'
  const [columnViewMode, setColumnViewMode] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'RESOLVED'
  const [checkingBreaches, setCheckingBreaches] = useState(false);
  const [technicians, setTechnicians] = useState([]);
  const [spareEquipments, setSpareEquipments] = useState([]);
  const [chatTicket, setChatTicket] = useState(null);
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
    replacement_equipment_id: '',
    force_override: false
  });
  const [autoDispatching, setAutoDispatching] = useState(false);

  const [closeForm, setCloseForm] = useState({
    destination_room_id: ''
  });

  const STATUS_LABELS = {
    reported: { label: 'Mới tiếp nhận', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
    assigned: { label: 'Đã giao KTV', color: '#ea580c', bg: 'rgba(234, 88, 12,0.12)', border: 'rgba(234, 88, 12,0.3)' },
    in_progress: { label: 'Đang sửa chữa', color: '#2563eb', bg: 'rgba(37,99,235,0.12)', border: 'rgba(37,99,235,0.3)' },
    resolved: { label: 'Đã khắc phục', color: '#16a34a', bg: 'rgba(22,163,74,0.12)', border: 'rgba(22,163,74,0.3)' },
    unrepairable: { label: 'Không thể sửa', color: '#dc2626', bg: 'rgba(220,38,38,0.12)', border: 'rgba(220,38,38,0.3)' },
    closed: { label: 'Đã đóng phiếu', color: '#64748b', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.25)' }
  };

  const DAMAGE_LABELS = {
    minor: { label: 'Hỏng nhẹ', short: 'Nhẹ', color: '#16a34a', bg: 'rgba(22,163,74,0.1)', border: 'rgba(22,163,74,0.25)' },
    major: { label: 'Hỏng nặng', short: 'Nặng', color: '#d97706', bg: 'rgba(217,119,6,0.12)', border: 'rgba(217,119,6,0.3)' },
    critical: { label: 'Khẩn cấp', short: 'Khẩn cấp', color: '#dc2626', bg: 'rgba(220,38,38,0.12)', border: 'rgba(220,38,38,0.3)' }
  };

  const getStatusBadge = (status) => {
    const info = STATUS_LABELS[status] || { label: status, color: '#64748b', bg: 'var(--surface-3)', border: 'var(--border-subtle)' };
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: '5px', fontSize: '11px', fontWeight: 700, color: info.color, background: info.bg, border: `1px solid ${info.border}` }}>
        {info.label}
      </span>
    );
  };

  const getDamageBadge = (level, compact = false) => {
    const info = DAMAGE_LABELS[level] || { label: level, short: level, color: '#d97706', bg: 'rgba(217,119,6,0.12)', border: 'rgba(217,119,6,0.25)' };
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 7px', borderRadius: '5px', fontSize: compact ? '10px' : '11px', fontWeight: 700, color: info.color, background: info.bg, border: `1px solid ${info.border}` }}>
        {compact ? info.short : info.label}
      </span>
    );
  };

  const allColumns = useMemo(() => [
    { id: 'reported', title: 'MỚI TIẾP NHẬN', color: '#f59e0b', category: 'ACTIVE' },
    { id: 'assigned', title: 'ĐÃ GIAO KTV', color: '#ea580c', category: 'ACTIVE' },
    { id: 'in_progress', title: 'ĐANG XỬ LÝ', color: '#2563eb', category: 'ACTIVE' },
    { id: 'resolved', title: 'ĐÃ KHẮC PHỤC', color: '#16a34a', category: 'RESOLVED' },
    { id: 'unrepairable', title: 'KHÔNG THỂ SỬA', color: '#dc2626', category: 'RESOLVED' },
    { id: 'closed', title: 'ĐÃ ĐÓNG PHIẾU', color: '#64748b', category: 'RESOLVED' }
  ], []);

  const visibleColumns = useMemo(() => {
    if (columnViewMode === 'ACTIVE') return allColumns.filter(c => c.category === 'ACTIVE');
    if (columnViewMode === 'RESOLVED') return allColumns.filter(c => c.category === 'RESOLVED');
    return allColumns;
  }, [allColumns, columnViewMode]);

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
        const list = repRes.repairs || [];
        setRepairs(list);
        setSelectedTicket((prev) => {
          if (!prev) return null;
          return list.find((item) => item._id === prev._id) || prev;
        });
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

  const handleAutoDispatchAll = async () => {
    try {
      setAutoDispatching(true);
      const res = await repairApi.autoDispatch();
      if (res && res.success) {
        toast.success(res.message || `AI đã tự động phân công ${res.dispatched_count || 0} phiếu theo đúng chuyên môn!`);
        await fetchData();
      }
    } catch (err) {
      showError('Lỗi khi chạy AI tự động phân công: ' + err.message);
    } finally {
      setAutoDispatching(false);
    }
  };

  const handleQuickApproveAiAssign = async (ticket) => {
    const recTechId = ticket?.ai_recommended_to?._id || ticket?.ai_recommended_to;
    if (!recTechId) {
      openAssign(ticket);
      return;
    }
    try {
      setSubmitting(true);
      const defaultHours = ticket.damage_level === 'critical' ? 8 : ticket.damage_level === 'major' ? 24 : 48;
      const deadlineDate = ticket.deadline ? new Date(ticket.deadline) : new Date(now + defaultHours * 3600 * 1000);
      const res = await repairApi.assign(ticket._id, {
        assigned_to: recTechId,
        damage_level: ticket.damage_level || 'minor',
        deadline: deadlineDate,
        replacement_equipment_id: null
      });
      if (res && res.success) {
        toast.success(res.message || `Đã duyệt giao phiếu [${ticket.ticket_code}] cho KTV chuyên môn do AI đề xuất!`);
        await fetchData();
      }
    } catch (err) {
      showError('Không thể duyệt giao nhanh: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openAssign = (ticket) => {
    setSelectedTicket(ticket);
    const defaultHours = ticket.damage_level === 'critical' ? 8 : ticket.damage_level === 'major' ? 24 : 48;
    const defaultDeadline = toLocalDateTime(ticket.deadline) || toLocalDateTime(now + defaultHours * 3600 * 1000);
    const prefilledTech = ticket.ai_recommended_to?._id || ticket.assigned_to?._id || technicians[0]?._id || '';

    setAssignForm({
      assigned_to: prefilledTech,
      damage_level: ticket.damage_level || 'minor',
      deadline: defaultDeadline,
      replacement_equipment_id: ticket.replacement_equipment_id?._id || '',
      force_override: false
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
      const payload = {
        assigned_to: assignForm.assigned_to,
        damage_level: assignForm.damage_level,
        deadline: assignForm.deadline ? new Date(assignForm.deadline) : null,
        replacement_equipment_id: assignForm.replacement_equipment_id || null
      };
      if (assignForm.force_override) {
        payload.force_override = true;
      }
      const res = await repairApi.assign(selectedTicket._id, payload);

      if (res && res.success) {
        toast.success(res.message || `Đã giao nhiệm vụ phiếu [${selectedTicket.ticket_code}] thành công!`);
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

  // Filtered tickets by search query & SLA filter
  const filteredRepairs = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    return repairs.filter((r) => {
      if (filterMode === 'OVERDUE') {
        const isOverdue = r.deadline_status === 'overdue' || (r.deadline && new Date(r.deadline).getTime() < now);
        if (!isOverdue) return false;
      } else if (filterMode === 'AT_RISK') {
        const isAtRisk = r.deadline_status === 'at_risk' || (r.remaining_minutes > 0 && r.remaining_minutes <= 120);
        if (!isAtRisk) return false;
      }

      if (!q) return true;
      const codeMatch = (r.ticket_code || '').toLowerCase().includes(q);
      const eqNameMatch = (r.equipment_id?.name || '').toLowerCase().includes(q);
      const eqCodeMatch = (r.equipment_id?.code || '').toLowerCase().includes(q);
      const roomMatch = (r.room_id?.code || '').toLowerCase().includes(q);
      const techMatch = (r.assigned_to?.full_name || '').toLowerCase().includes(q);
      const descMatch = (r.incident_description || '').toLowerCase().includes(q);
      return codeMatch || eqNameMatch || eqCodeMatch || roomMatch || techMatch || descMatch;
    });
  }, [repairs, filterMode, searchQuery, now]);

  return (
    <div style={{ maxWidth: '100%', margin: '0 auto', paddingBottom: '32px' }}>
      {/* Top Header Command Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', color: '#f59e0b', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.28)', padding: '2px 8px', borderRadius: '5px', fontWeight: 800, letterSpacing: '0.04em' }}>
              FACILITY MANAGER
            </span>
            <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Điều Phối Kỹ Thuật • Giám Sát Hạn Định SLA Tòa A1</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink-pure)', letterSpacing: '-0.02em', margin: 0 }}>
            Trung Tâm Điều Phối Sửa Chữa (Kanban SLA)
          </h1>
          <p style={{ margin: '5px 0 0', fontSize: '13px', color: 'var(--ink-secondary)' }}>
            Tiếp nhận báo hỏng từ Giảng viên, AI gợi ý KTV đúng chuyên môn, cấp thiết bị dự phòng KHO-01 và nghiệm thu đóng phiếu.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {isFacilityManager && (
            <button
              onClick={handleAutoDispatchAll}
              disabled={autoDispatching}
              className="ruo-btn ruo-btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #ea580c, #c2410c)',
                color: '#ffffff',
                border: 'none',
                boxShadow: '0 2px 8px rgba(234, 88, 12,0.3)',
                cursor: autoDispatching ? 'wait' : 'pointer'
              }}
              title="AI tự động phân tích các phiếu Mới Tiếp Nhận và đề xuất/giao KTV đúng chuyên môn"
            >
              <Icons.Sparkles size={16} />
              <span>{autoDispatching ? 'AI Đang Giao...' : 'AI Gợi Ý Giao Theo Chuyên Môn'}</span>
            </button>
          )}

          <button
            onClick={handleCheckBreaches}
            disabled={checkingBreaches}
            className="ruo-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 15px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.35)',
              color: '#dc2626',
              cursor: checkingBreaches ? 'wait' : 'pointer'
            }}
            title="Quét toàn bộ phiếu quá hạn và phát cảnh báo đến KTV và Quản Lý"
          >
            <Icons.AlertTriangle size={15} />
            <span>{checkingBreaches ? 'Đang Quét...' : 'Quét Cảnh Báo SLA'}</span>
          </button>

          <button
            onClick={fetchData}
            className="ruo-btn ruo-btn-ghost"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              border: '1px solid var(--border-default)',
              background: 'var(--surface-card)',
              color: 'var(--ink-secondary)',
              cursor: 'pointer'
            }}
          >
            <Icons.RefreshCw size={15} />
            <span>Làm Mới</span>
          </button>
        </div>
      </div>

      {/* SLA & KPI Stats (UC-7.2) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: '12px', padding: '16px 18px', boxShadow: 'var(--shadow-xs)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--ink-muted)', fontWeight: 600 }}>Tỷ Lệ Tuân Thủ SLA</span>
            <Icons.CheckCircle size={16} color="#16a34a" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: (slaStats?.compliance_rate ?? 100) >= 90 ? '#16a34a' : (slaStats?.compliance_rate ?? 100) >= 70 ? '#f59e0b' : '#dc2626', marginTop: '4px' }}>
            {slaStats ? `${slaStats.compliance_rate}%` : '100%'}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '3px' }}>
            {slaStats?.on_time_resolved || 0} đúng hạn / {slaStats?.resolved_count || 0} đã hoàn tất
          </div>
        </div>

        <div
          onClick={() => setFilterMode(filterMode === 'OVERDUE' ? 'ALL' : 'OVERDUE')}
          style={{
            background: filterMode === 'OVERDUE' ? 'rgba(239,68,68,0.06)' : 'var(--surface-card)',
            border: filterMode === 'OVERDUE' ? '2px solid #dc2626' : '1px solid rgba(239,68,68,0.25)',
            borderRadius: '12px',
            padding: '16px 18px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: 'var(--shadow-xs)'
          }}
          title="Bấm để lọc danh sách các ca trễ hạn SLA"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Icons.AlertCircle size={15} color="#dc2626" />
              <span>Đang Quá Hạn SLA</span>
            </div>
            {filterMode === 'OVERDUE' && (
              <span style={{ fontSize: '10px', fontWeight: 800, background: '#dc2626', color: '#fff', padding: '1px 6px', borderRadius: '4px' }}>
                ĐANG LỌC
              </span>
            )}
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#dc2626', marginTop: '4px' }}>
            {slaStats?.currently_overdue ?? 0}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '3px' }}>
            {filterMode === 'OVERDUE' ? 'Bấm lại để hủy lọc' : 'Bấm để lọc ca trễ hạn'}
          </div>
        </div>

        <div
          onClick={() => setFilterMode(filterMode === 'AT_RISK' ? 'ALL' : 'AT_RISK')}
          style={{
            background: filterMode === 'AT_RISK' ? 'rgba(245,158,11,0.06)' : 'var(--surface-card)',
            border: filterMode === 'AT_RISK' ? '2px solid #f59e0b' : '1px solid rgba(245,158,11,0.25)',
            borderRadius: '12px',
            padding: '16px 18px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: 'var(--shadow-xs)'
          }}
          title="Bấm để lọc các ca sắp quá hạn trong 2 giờ tới"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '12px', color: '#d97706', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Icons.Clock size={15} color="#d97706" />
              <span>Sắp Hết Hạn (≤ 2h)</span>
            </div>
            {filterMode === 'AT_RISK' && (
              <span style={{ fontSize: '10px', fontWeight: 800, background: '#d97706', color: '#fff', padding: '1px 6px', borderRadius: '4px' }}>
                ĐANG LỌC
              </span>
            )}
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#d97706', marginTop: '4px' }}>
            {slaStats?.currently_at_risk ?? 0}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '3px' }}>
            {filterMode === 'AT_RISK' ? 'Bấm lại để hủy lọc' : 'Bấm để lọc ca rủi ro'}
          </div>
        </div>

        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: '12px', padding: '16px 18px', boxShadow: 'var(--shadow-xs)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--ink-muted)', fontWeight: 600 }}>Thời Gian Xử Lý TB (MTTR)</span>
            <Icons.Activity size={16} color="#ea580c" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#ea580c', marginTop: '4px' }}>
            {slaStats?.avg_resolution_hours ?? 0}h
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '3px' }}>
            Khẩn cấp: {slaStats?.by_damage_level?.critical?.overdue ?? 0} trễ / {slaStats?.by_damage_level?.critical?.total ?? 0}
          </div>
        </div>
      </div>

      {/* Filter & View Controls Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '12px 16px',
          background: 'var(--surface-card)',
          border: '1px solid var(--border-default)',
          borderRadius: '12px',
          marginBottom: '18px',
          boxShadow: 'var(--shadow-xs)'
        }}
      >
        {/* Search input */}
        <div style={{ position: 'relative', minWidth: '280px', flex: '1 1 300px' }}>
          <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-muted)', pointerEvents: 'none' }}>
            <Icons.Search size={15} />
          </div>
          <input
            type="text"
            placeholder="Tìm theo mã phiếu, tên thiết bị, phòng học, KTV..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ruo-portal-input"
            style={{ width: '100%', height: '38px', paddingLeft: '36px', paddingRight: searchQuery ? '30px' : '12px', fontSize: '12.5px' }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--ink-muted)', cursor: 'pointer', padding: '2px' }}
            >
              <Icons.Close size={14} />
            </button>
          )}
        </div>

        {/* View Switchers */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Display Mode: Kanban vs Table */}
          <div style={{ display: 'inline-flex', background: 'var(--surface-2)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <button
              type="button"
              onClick={() => setDisplayMode('kanban')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: displayMode === 'kanban' ? 700 : 500,
                background: displayMode === 'kanban' ? 'var(--surface-card)' : 'transparent',
                color: displayMode === 'kanban' ? '#ea580c' : 'var(--ink-muted)',
                border: 'none',
                boxShadow: displayMode === 'kanban' ? 'var(--shadow-xs)' : 'none',
                cursor: 'pointer'
              }}
            >
              <Icons.Dashboard size={13} />
              <span>Bảng Kanban (6 Cột)</span>
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('table')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: displayMode === 'table' ? 700 : 500,
                background: displayMode === 'table' ? 'var(--surface-card)' : 'transparent',
                color: displayMode === 'table' ? '#ea580c' : 'var(--ink-muted)',
                border: 'none',
                boxShadow: displayMode === 'table' ? 'var(--shadow-xs)' : 'none',
                cursor: 'pointer'
              }}
            >
              <Icons.FileText size={13} />
              <span>Danh Sách Đầy Đủ Trường</span>
            </button>
          </div>

          {/* Column filter when in Kanban mode */}
          {displayMode === 'kanban' && (
            <div style={{ display: 'inline-flex', background: 'var(--surface-2)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                onClick={() => setColumnViewMode('ALL')}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: columnViewMode === 'ALL' ? 700 : 500,
                  background: columnViewMode === 'ALL' ? 'var(--surface-card)' : 'transparent',
                  color: columnViewMode === 'ALL' ? 'var(--ink-pure)' : 'var(--ink-muted)',
                  border: 'none',
                  boxShadow: columnViewMode === 'ALL' ? 'var(--shadow-xs)' : 'none',
                  cursor: 'pointer'
                }}
              >
                Tất Cả (6)
              </button>
              <button
                type="button"
                onClick={() => setColumnViewMode('ACTIVE')}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: columnViewMode === 'ACTIVE' ? 700 : 500,
                  background: columnViewMode === 'ACTIVE' ? 'var(--surface-card)' : 'transparent',
                  color: columnViewMode === 'ACTIVE' ? '#ea580c' : 'var(--ink-muted)',
                  border: 'none',
                  boxShadow: columnViewMode === 'ACTIVE' ? 'var(--shadow-xs)' : 'none',
                  cursor: 'pointer'
                }}
              >
                Đang Xử Lý (3)
              </button>
              <button
                type="button"
                onClick={() => setColumnViewMode('RESOLVED')}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: columnViewMode === 'RESOLVED' ? 700 : 500,
                  background: columnViewMode === 'RESOLVED' ? 'var(--surface-card)' : 'transparent',
                  color: columnViewMode === 'RESOLVED' ? '#16a34a' : 'var(--ink-muted)',
                  border: 'none',
                  boxShadow: columnViewMode === 'RESOLVED' ? 'var(--shadow-xs)' : 'none',
                  cursor: 'pointer'
                }}
              >
                Đã Xong (3)
              </button>
            </div>
          )}

          {filterMode !== 'ALL' && (
            <button
              onClick={() => setFilterMode('ALL')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11.5px',
                padding: '5px 10px',
                borderRadius: '6px',
                background: 'rgba(239,68,68,0.1)',
                color: '#dc2626',
                border: '1px solid rgba(239,68,68,0.25)',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              <Icons.Close size={12} />
              <span>Hủy Lọc SLA</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--ink-muted)' }}>
          <Icons.RefreshCw size={32} className="spin" style={{ marginBottom: '12px', color: '#ea580c' }} />
          <div style={{ fontSize: '14px', fontWeight: 600 }}>Đang nạp dữ liệu điều phối sửa chữa...</div>
        </div>
      ) : displayMode === 'table' ? (
        /* ========================================================================
           FULL-FIELD DATA TABLE VIEW (HIỂN THỊ ĐẦY ĐỦ 100% CÁC TRƯỜNG DỮ LIỆU)
           ======================================================================== */
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-xs)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '1.5px solid var(--border-default)' }}>
                  <th style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--ink-secondary)', whiteSpace: 'nowrap' }}>MÃ PHIẾU</th>
                  <th style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--ink-secondary)', minWidth: '170px' }}>THIẾT BỊ / TÀI SẢN</th>
                  <th style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--ink-secondary)', whiteSpace: 'nowrap' }}>PHÒNG HỌC</th>
                  <th style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--ink-secondary)', minWidth: '220px' }}>MÔ TẢ SỰ CỐ CHI TIẾT</th>
                  <th style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--ink-secondary)', whiteSpace: 'nowrap' }}>MỨC ĐỘ</th>
                  <th style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--ink-secondary)', whiteSpace: 'nowrap' }}>TRẠNG THÁI</th>
                  <th style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--ink-secondary)', minWidth: '200px' }}>KTV PHỤ TRÁCH / GỢI Ý AI</th>
                  <th style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--ink-secondary)', minWidth: '140px' }}>HẠN XỬ LÝ (SLA)</th>
                  <th style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--ink-secondary)', textAlign: 'right', minWidth: '150px' }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {filteredRepairs.map((t) => {
                  const eq = t.equipment_id || {};
                  const room = t.room_id || {};
                  const isReported = t.status === 'reported';
                  const isResolved = t.status === 'resolved';
                  const isUnrepairable = t.status === 'unrepairable';

                  return (
                    <tr
                      key={t._id}
                      style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background-color 0.15s ease' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--surface-2)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      {/* Mã phiếu */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <span
                          onClick={() => setSelectedTicket(t)}
                          style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 800, color: '#ea580c', background: 'rgba(234, 88, 12,0.09)', padding: '3px 8px', borderRadius: '5px', cursor: 'pointer' }}
                        >
                          {t.ticket_code}
                        </span>
                      </td>

                      {/* Thiết bị */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--ink-pure)', lineHeight: 1.35 }}>
                          {eq.name || 'Thiết bị không xác định'}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                          Mã: {eq.code || 'N/A'} {eq.brand ? `• ${eq.brand}` : ''}
                        </div>
                      </td>

                      {/* Phòng */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'var(--surface-2)', padding: '3px 8px', borderRadius: '5px', color: 'var(--ink-secondary)', fontWeight: 600 }}>
                          <Icons.MapPin size={11} />
                          <span>{room.code ? `Phòng ${room.code}` : 'Chưa gán'}</span>
                        </span>
                      </td>

                      {/* Mô tả sự cố - Đầy đủ 100% không bị cắt */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ color: 'var(--ink-secondary)', lineHeight: 1.45, wordBreak: 'break-word' }}>
                          {t.incident_description || 'Không có mô tả chi tiết'}
                        </div>
                      </td>

                      {/* Mức độ */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        {getDamageBadge(t.damage_level)}
                      </td>

                      {/* Trạng thái */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        {getStatusBadge(t.status)}
                      </td>

                      {/* KTV phụ trách / Gợi ý AI */}
                      <td style={{ padding: '12px 14px' }}>
                        {t.assigned_to ? (
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--ink-pure)' }}>
                              {t.assigned_to.full_name}
                            </div>
                            <div style={{ fontSize: '11px', color: '#ea580c' }}>
                              {t.assigned_to.specialty_label || t.assigned_to.department || 'KTV Vận Hành'}
                            </div>
                          </div>
                        ) : isReported && t.ai_recommended_to ? (
                          <div style={{ background: 'rgba(234, 88, 12,0.08)', padding: '5px 8px', borderRadius: '6px', border: '1px solid rgba(234, 88, 12,0.22)' }}>
                            <div style={{ fontSize: '10.5px', color: '#ea580c', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <Icons.Sparkles size={11} />
                              <span>AI Gợi Ý: {t.ai_recommended_to.full_name}</span>
                            </div>
                            <div style={{ fontSize: '10.5px', color: 'var(--ink-muted)' }}>
                              {t.ai_recommended_to.specialty_label || t.ai_recommended_to.department} ({t.ai_dispatch_score || 90}đ)
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--ink-muted)' }}>Chưa phân công</span>
                        )}
                      </td>

                      {/* Hạn SLA */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        {t.deadline ? (
                          <DeadlineCountdown compact={true} deadline={t.deadline} status={t.status} />
                        ) : (
                          <span style={{ color: 'var(--ink-muted)' }}>Chưa đặt hạn</span>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          {isReported && (
                            <>
                              {t.ai_recommended_to && (
                                <button
                                  type="button"
                                  onClick={() => handleQuickApproveAiAssign(t)}
                                  disabled={submitting}
                                  className="ruo-btn"
                                  style={{ padding: '5px 9px', fontSize: '11px', fontWeight: 700, background: 'rgba(22,163,74,0.12)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.3)', borderRadius: '6px', cursor: 'pointer' }}
                                  title="Duyệt giao KTV do AI đề xuất"
                                >
                                  Duyệt AI
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => openAssign(t)}
                                className="ruo-btn ruo-btn-primary"
                                style={{ padding: '5px 10px', fontSize: '11px', fontWeight: 700, borderRadius: '6px', background: '#ea580c', color: '#fff', border: 'none', cursor: 'pointer' }}
                              >
                                Giao KTV & Cấp Đồ
                              </button>
                            </>
                          )}

                          {(t.status === 'assigned' || t.status === 'in_progress') && (
                            <>
                              <button
                                type="button"
                                onClick={() => openAssign(t)}
                                className="ruo-btn ruo-btn-ghost"
                                style={{ padding: '5px 9px', fontSize: '11px', fontWeight: 600, border: '1px solid var(--border-default)', borderRadius: '6px', cursor: 'pointer' }}
                              >
                                Đổi KTV
                              </button>
                              <button
                                type="button"
                                onClick={() => setChatTicket(t)}
                                className="ruo-btn ruo-btn-ghost"
                                style={{ padding: '5px 9px', fontSize: '11px', fontWeight: 600, border: '1px solid var(--border-default)', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}
                              >
                                <Icons.MessageSquare size={12} />
                                <span>Chat</span>
                              </button>
                            </>
                          )}

                          {isResolved && (
                            <button
                              type="button"
                              onClick={() => openClose(t)}
                              className="ruo-btn ruo-btn-primary"
                              style={{ padding: '5px 10px', fontSize: '11px', fontWeight: 700, borderRadius: '6px', background: '#16a34a', color: '#fff', border: 'none', cursor: 'pointer' }}
                            >
                              Nghiệm Thu
                            </button>
                          )}

                          {isUnrepairable && (
                            <button
                              type="button"
                              onClick={() => openClose(t)}
                              className="ruo-btn"
                              style={{ padding: '5px 10px', fontSize: '11px', fontWeight: 700, borderRadius: '6px', background: 'rgba(220,38,38,0.1)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.3)', cursor: 'pointer' }}
                            >
                              Đóng Phiếu
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredRepairs.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '40px 14px', color: 'var(--ink-muted)' }}>
                      Không có phiếu nào phù hợp với bộ lọc hiện tại
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ========================================================================
           FULL-WIDTH RESPONSIVE 6-COLUMN KANBAN (NO HORIZONTAL SCROLLBAR AT ALL)
           ======================================================================== */
        <div
          className="ruo-kanban-fullwidth-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${visibleColumns.length}, minmax(0, 1fr))`,
            gap: '10px',
            width: '100%',
            alignItems: 'stretch'
          }}
        >
          {visibleColumns.map((col) => {
            const colTickets = filteredRepairs.filter((r) => r.status === col.id);

            return (
              <div
                key={col.id}
                style={{
                  background: 'var(--surface-card)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: 'var(--shadow-xs)',
                  minWidth: 0
                }}
              >
                {/* Column Header */}
                <div
                  style={{
                    padding: '10px 12px',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--surface-2)',
                    borderTopLeftRadius: '9px',
                    borderTopRightRadius: '9px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                    <strong style={{ fontSize: '11.5px', color: 'var(--ink-pure)', letterSpacing: '0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {col.title}
                    </strong>
                  </div>
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 800,
                      padding: '1px 6px',
                      borderRadius: '99px',
                      background: 'var(--surface-card)',
                      color: col.color,
                      border: `1px solid ${col.color}40`,
                      flexShrink: 0
                    }}
                  >
                    {colTickets.length}
                  </span>
                </div>

                {/* Column Body Cards (Smooth Y-Scroll inside column without overflowing horizontally) */}
                <div
                  style={{
                    padding: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    flex: 1,
                    overflowY: 'auto',
                    maxHeight: 'calc(100vh - 300px)',
                    scrollbarWidth: 'thin'
                  }}
                >
                  {colTickets.map((t) => {
                    const eq = t.equipment_id || {};
                    const room = t.room_id || {};
                    const isReported = t.status === 'reported';
                    const isResolved = t.status === 'resolved';
                    const isUnrepairable = t.status === 'unrepairable';
                    const isSelected = selectedTicket?._id === t._id;

                    return (
                      <div
                        key={t._id}
                        onClick={() => setSelectedTicket(t)}
                        style={{
                          background: 'var(--surface-1, #ffffff)',
                          border: isSelected ? '1.5px solid #ea580c' : '1px solid var(--border-subtle)',
                          borderRadius: '8px',
                          padding: '10px 11px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.16s ease',
                          boxShadow: isSelected ? '0 4px 12px rgba(234, 88, 12,0.16)' : '0 1px 3px rgba(0,0,0,0.03)',
                          wordBreak: 'break-word'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = 'var(--border-focus, #94a3b8)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = 'var(--border-subtle)';
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
                          }
                        }}
                      >
                        {/* Top Bar: Code & Severity */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '10.5px', fontWeight: 800, color: '#ea580c', background: 'rgba(234, 88, 12,0.09)', padding: '2px 6px', borderRadius: '4px' }}>
                            {t.ticket_code}
                          </span>
                          {getDamageBadge(t.damage_level, true)}
                        </div>

                        {/* Equipment Name & Room (Full Info, No Cutoff) */}
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '12.5px', color: 'var(--ink-pure)', lineHeight: 1.35, marginBottom: '3px' }}>
                            {eq.name || 'Thiết bị không xác định'}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--ink-muted)' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'var(--surface-2)', padding: '2px 6px', borderRadius: '4px' }}>
                              <Icons.MapPin size={10} />
                              <span>{room.code ? `Phòng ${room.code}` : 'Chưa gán'}</span>
                            </span>
                          </div>
                        </div>

                        {/* Incident Description (Full text, NO ellipsis) */}
                        {t.incident_description && (
                          <div
                            style={{
                              fontSize: '11.5px',
                              color: 'var(--ink-secondary)',
                              background: 'var(--surface-2)',
                              padding: '6px 8px',
                              borderRadius: '5px',
                              borderLeft: '2.5px solid var(--border-default)',
                              lineHeight: 1.4,
                              wordBreak: 'break-word'
                            }}
                          >
                            "{t.incident_description}"
                          </div>
                        )}

                        {/* AI Recommendation Box (Visible when reported) */}
                        {isReported && t.ai_recommended_to && (
                          <div
                            style={{
                              background: 'linear-gradient(135deg, rgba(234, 88, 12,0.08), rgba(99,102,241,0.08))',
                              border: '1px solid rgba(234, 88, 12,0.28)',
                              borderRadius: '6px',
                              padding: '6px 8px'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                              <span style={{ fontSize: '10px', fontWeight: 800, color: '#ea580c', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <Icons.Sparkles size={11} />
                                AI Gợi Ý
                              </span>
                              <span style={{ fontSize: '9.5px', fontWeight: 800, color: '#16a34a', background: 'rgba(22,163,74,0.12)', padding: '1px 5px', borderRadius: '99px' }}>
                                {t.ai_dispatch_score || 90}đ
                              </span>
                            </div>
                            <div style={{ color: 'var(--ink-pure)', fontWeight: 700, fontSize: '11.5px' }}>
                              {t.ai_recommended_to.full_name} ({t.ai_recommended_to.code})
                            </div>
                            <div style={{ color: 'var(--ink-muted)', fontSize: '10px' }}>
                              {t.ai_recommended_to.specialty_label || t.ai_recommended_to.department || 'KTV Chuyên Trách'}
                            </div>
                          </div>
                        )}

                        {/* Assigned Technician Block (Full Name, No Cutoff) */}
                        {t.assigned_to && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '6px',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              background: 'var(--surface-2)',
                              border: '1px solid var(--border-subtle)'
                            }}
                          >
                            <div
                              style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #ea580c, #c2410c)',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '10px',
                                fontWeight: 800,
                                flexShrink: 0,
                                marginTop: '1px'
                              }}
                            >
                              {t.assigned_to.full_name?.split(' ').pop()?.charAt(0) || 'K'}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--ink-pure)', lineHeight: 1.3, wordBreak: 'break-word' }}>
                                {t.assigned_to.full_name}
                              </div>
                              <div style={{ fontSize: '10px', color: '#ea580c', fontWeight: 600, marginTop: '1px' }}>
                                {t.assigned_to.specialty_label || t.assigned_to.department || 'KTV Vận Hành'}
                              </div>
                            </div>
                            {t.ai_auto_assigned && (
                              <span style={{ fontSize: '9px', fontWeight: 800, padding: '1px 4px', borderRadius: '3px', background: 'rgba(234, 88, 12,0.12)', color: '#ea580c', flexShrink: 0 }}>
                                AI
                              </span>
                            )}
                          </div>
                        )}

                        {/* Reassign Warning Alert */}
                        {t.reassign_requested && (
                          <div style={{ background: 'rgba(234,88,12,0.1)', border: '1px solid rgba(234,88,12,0.4)', borderRadius: '5px', padding: '5px 7px', fontSize: '10.5px' }}>
                            <div style={{ fontWeight: 800, color: '#ea580c', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <Icons.AlertTriangle size={11} color="#ea580c" />
                              <span>Xin Đổi Ca</span>
                            </div>
                            {t.reassign_reason && (
                              <div style={{ color: 'var(--ink-secondary)', marginTop: '2px' }}>
                                "{t.reassign_reason}"
                              </div>
                            )}
                          </div>
                        )}

                        {/* Real-time SLA Deadline Countdown */}
                        {t.deadline && (
                          <div style={{ marginTop: '1px' }}>
                            <DeadlineCountdown compact={true} deadline={t.deadline} status={t.status} />
                          </div>
                        )}

                        {/* Action Buttons Toolbar */}
                        <div style={{ display: 'flex', gap: '5px', marginTop: '3px', flexWrap: 'wrap' }} onClick={(e) => e.stopPropagation()}>
                          {isReported && (
                            <>
                              {t.ai_recommended_to && (
                                <button
                                  type="button"
                                  onClick={() => handleQuickApproveAiAssign(t)}
                                  disabled={submitting}
                                  className="ruo-btn"
                                  style={{
                                    width: '100%',
                                    padding: '5px 8px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    background: 'rgba(22,163,74,0.12)',
                                    color: '#16a34a',
                                    border: '1px solid rgba(22,163,74,0.3)',
                                    borderRadius: '5px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '4px',
                                    cursor: 'pointer'
                                  }}
                                  title="Duyệt giao KTV do AI đề xuất"
                                >
                                  <Icons.CheckCircle size={12} />
                                  <span>Duyệt AI ({t.ai_recommended_to.code || 'KTV'})</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => openAssign(t)}
                                className="ruo-btn ruo-btn-primary"
                                style={{
                                  width: '100%',
                                  padding: '6px 8px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  borderRadius: '5px',
                                  background: 'linear-gradient(135deg, #ea580c, #c2410c)',
                                  color: '#ffffff',
                                  border: 'none',
                                  cursor: 'pointer'
                                }}
                              >
                                Giao KTV & Cấp Đồ
                              </button>
                            </>
                          )}

                          {(t.status === 'assigned' || t.status === 'in_progress') && (
                            <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
                              <button
                                type="button"
                                onClick={() => openAssign(t)}
                                className="ruo-btn ruo-btn-ghost"
                                style={{
                                  flex: 1,
                                  padding: '5px 6px',
                                  fontSize: '10.5px',
                                  fontWeight: 700,
                                  border: t.reassign_requested ? '1px solid #ea580c' : '1px solid var(--border-default)',
                                  color: t.reassign_requested ? '#ea580c' : 'var(--ink-secondary)',
                                  background: 'var(--surface-2)',
                                  borderRadius: '5px',
                                  cursor: 'pointer'
                                }}
                              >
                                Đổi KTV
                              </button>
                              <button
                                type="button"
                                onClick={() => setChatTicket(t)}
                                className="ruo-btn ruo-btn-ghost"
                                style={{
                                  flex: 1,
                                  padding: '5px 6px',
                                  fontSize: '10.5px',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '3px',
                                  border: '1px solid var(--border-default)',
                                  background: 'var(--surface-2)',
                                  color: 'var(--ink-secondary)',
                                  borderRadius: '5px',
                                  cursor: 'pointer'
                                }}
                              >
                                <Icons.MessageSquare size={11} />
                                <span>Chat</span>
                              </button>
                            </div>
                          )}

                          {isResolved && (
                            <button
                              type="button"
                              onClick={() => openClose(t)}
                              className="ruo-btn ruo-btn-primary"
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                fontSize: '11px',
                                fontWeight: 700,
                                borderRadius: '5px',
                                background: 'linear-gradient(135deg, #16a34a, #15803d)',
                                color: '#ffffff',
                                border: 'none',
                                cursor: 'pointer'
                              }}
                            >
                              Nghiệm Thu
                            </button>
                          )}

                          {isUnrepairable && (
                            <button
                              type="button"
                              onClick={() => openClose(t)}
                              className="ruo-btn"
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                fontSize: '11px',
                                fontWeight: 700,
                                background: 'rgba(220,38,38,0.1)',
                                color: '#dc2626',
                                border: '1px solid rgba(220,38,38,0.3)',
                                borderRadius: '5px',
                                cursor: 'pointer'
                              }}
                            >
                              Đóng Phiếu
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {colTickets.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '30px 8px', fontSize: '11.5px', color: 'var(--ink-muted)' }}>
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
              <button onClick={() => setSelectedTicket(null)} className="ruo-drawer-close-btn"><Icons.Close size={18} /></button>
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
                <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', padding: '10px 12px', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
                  {selectedTicket.incident_description || 'Không có mô tả'}
                </div>
              </div>

              {/* AI Dispatch & Diagnosis Copilot Panel */}
              <div style={{ background: 'var(--surface-2)', border: '1.5px solid var(--border-focus)', borderRadius: 'var(--radius-md)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '12.5px', color: 'var(--ink-pure)' }}>
                    <Icons.Sparkles size={15} style={{ color: '#ea580c' }} />
                    <span>AI Chẩn Đoán & Gợi Ý Điều Phối</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRunAiCopilot(selectedTicket)}
                    disabled={aiCopilotLoading}
                    className="ruo-btn ruo-btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '11.5px', fontWeight: 700 }}
                  >
                    {aiCopilotLoading ? 'Đang Phân Tích...' : (aiCopilotMap[selectedTicket._id] ? 'Phân Tích Lại' : 'Chạy AI Copilot')}
                  </button>
                </div>

                {aiCopilotMap[selectedTicket._id] && (() => {
                  const cp = aiCopilotMap[selectedTicket._id];
                  const bestTech = cp.dispatch_recommendation?.recommended_technician;
                  const hist = cp.historical_insights;
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '10.5px', fontWeight: 800, padding: '2px 7px', borderRadius: '4px', background: 'var(--status-info-bg)', color: 'var(--status-info-color)', border: '1px solid var(--status-info-border)' }}>
                          {cp.engine === 'gemini' ? 'GEMINI HYBRID AI' : 'RUO CORTEX LOCAL AI'}
                        </span>
                        {cp.diagnosis?.playbook_title && (
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: 'var(--surface-card)', color: 'var(--ink-secondary)', border: '1px solid var(--border-default)' }}>
                            {cp.diagnosis.playbook_title}
                          </span>
                        )}
                      </div>
                      {cp.disposal_advisory?.should_consider_disposal && (
                        <div style={{ background: 'var(--status-danger-bg)', border: '1px solid var(--status-danger-border)', color: 'var(--status-danger-color)', padding: '8px 10px', borderRadius: 'var(--radius-sm)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Icons.AlertTriangle size={14} color="currentColor" />
                          <span>{cp.disposal_advisory.recommendation}</span>
                        </div>
                      )}
                      {hist?.chronic_pattern?.advisory && (
                        <div style={{ background: 'var(--status-warning-bg)', border: '1px solid var(--status-warning-border)', color: 'var(--status-warning-color)', padding: '7px 10px', borderRadius: 'var(--radius-sm)', fontSize: '11.5px', fontWeight: 600 }}>
                          {hist.chronic_pattern.advisory}
                        </div>
                      )}
                      <div>
                        <strong style={{ color: 'var(--ink-pure)' }}>Nguyên nhân gốc dự kiến:</strong>{' '}
                        <span style={{ color: 'var(--ink-secondary)' }}>{cp.diagnosis?.root_cause}</span>
                      </div>
                      {bestTech && (
                        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', padding: '8px 10px', borderRadius: 'var(--radius-sm)' }}>
                          <div style={{ fontWeight: 800, color: '#ea580c' }}>
                            KTV đề xuất #1: {bestTech.full_name} ({bestTech.code}) • Điểm phù hợp {bestTech.score}/100
                          </div>
                          <div style={{ color: 'var(--ink-muted)', fontSize: '11.5px', marginTop: '2px' }}>{bestTech.reason}</div>
                        </div>
                      )}
                      {hist?.learned_benchmarks?.matched_cases_count > 0 && (
                        <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                          <strong style={{ color: 'var(--ink-pure)' }}>Học từ lịch sử Tòa A1:</strong>{' '}
                          Khớp {hist.learned_benchmarks.matched_cases_count} ca tương tự
                          {hist.learned_benchmarks.avg_mttr_hours ? ` • MTTR trung bình ${hist.learned_benchmarks.avg_mttr_hours}h` : ''}
                          {hist.learned_benchmarks.avg_repair_cost_vnd ? ` • Chi phí TB ${hist.learned_benchmarks.avg_repair_cost_vnd.toLocaleString('vi-VN')} đ` : ''}
                        </div>
                      )}
                      {Array.isArray(cp.recommended_parts) && cp.recommended_parts.length > 0 && (
                        <div>
                          <strong style={{ color: 'var(--ink-pure)' }}>Linh kiện vật tư gợi ý (Kho Linh Kiện):</strong>{' '}
                          {cp.recommended_parts.map((p) => `[${p.code}] ${p.name} (Tồn: ${p.stock} ${p.unit})`).join(' • ')}
                        </div>
                      )}
                      {cp.dispatch_recommendation?.recommended_replacement && (
                        <div>
                          <strong style={{ color: 'var(--ink-pure)' }}>Thiết bị dự phòng thay thế (Kho KHO-01):</strong>{' '}
                          <span style={{ color: '#ea580c', fontWeight: 700 }}>
                            {cp.dispatch_recommendation.recommended_replacement.code} — {cp.dispatch_recommendation.recommended_replacement.name}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {selectedTicket.replacement_equipment_id && (
                <div style={{ background: 'rgba(234, 88, 12,0.08)', border: '1px solid rgba(234, 88, 12,0.25)', padding: '10px 12px', borderRadius: 'var(--radius-md)', fontSize: '12.5px' }}>
                  Thiết bị dự phòng thay thế đã cấp: <strong>{selectedTicket.replacement_equipment_id?.name} ({selectedTicket.replacement_equipment_id?.code})</strong>
                </div>
              )}

              {selectedTicket.feedback_rating && (
                <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', padding: '10px 12px', borderRadius: 'var(--radius-md)', fontSize: '12.5px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Đánh giá của Giảng viên:</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: '#f59e0b' }}>
                      {Array.from({ length: 5 }).map((_, sIdx) => (
                        <Icons.Star
                          key={sIdx}
                          size={13}
                          fill={sIdx < selectedTicket.feedback_rating ? '#f59e0b' : 'none'}
                          color="#f59e0b"
                        />
                      ))}
                    </span>
                    <strong style={{ color: '#f59e0b' }}>({selectedTicket.feedback_rating}/5 sao)</strong>
                  </div>
                  {selectedTicket.feedback_comment && <div style={{ marginTop: '2px', color: 'var(--ink-secondary)' }}>"{selectedTicket.feedback_comment}"</div>}
                </div>
              )}
            </div>

            <div className="ruo-drawer-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
              <button onClick={() => setSelectedTicket(null)} className="ruo-btn ruo-btn-secondary" style={{ padding: '8px 16px' }}>
                Đóng Cửa Sổ
              </button>
              <button
                onClick={() => setChatTicket(selectedTicket)}
                className="ruo-btn ruo-btn-secondary"
                style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
                title="Mở kênh chat trao đổi của phiếu sửa chữa"
              >
                <Icons.MessageSquare size={15} />
                <span>Mở Khung Chat Phiếu</span>
              </button>
              {selectedTicket.status === 'reported' && (
                <button onClick={() => openAssign(selectedTicket)} className="ruo-btn ruo-btn-primary" style={{ padding: '8px 20px', fontWeight: 700 }}>
                  Giao Nhiệm Vụ Cho KTV
                </button>
              )}
              {(selectedTicket.status === 'assigned' || selectedTicket.status === 'in_progress') && (
                <button onClick={() => openAssign(selectedTicket)} className="ruo-btn ruo-btn-primary" style={{ padding: '8px 20px', fontWeight: 700 }}>
                  Đổi Kỹ Thuật Viên Phụ Trách
                </button>
              )}
              {selectedTicket.status === 'resolved' && (
                <button onClick={() => openClose(selectedTicket)} className="ruo-btn ruo-btn-primary" style={{ padding: '8px 20px', fontWeight: 700 }}>
                  Nghiệm Thu & Đóng Phiếu
                </button>
              )}
              {selectedTicket.status === 'unrepairable' && (
                <>
                  <a
                    href="#/disposal_propose"
                    onClick={() => setSelectedTicket(null)}
                    className="ruo-btn ruo-btn-secondary"
                    style={{ padding: '8px 16px', fontWeight: 700, textDecoration: 'none', color: '#dc2626', borderColor: 'rgba(239,68,68,0.4)' }}
                  >
                    Lập Đề Xuất Thanh Lý
                  </a>
                  <button onClick={() => openClose(selectedTicket)} className="ruo-btn ruo-btn-primary" style={{ padding: '8px 20px', fontWeight: 700 }}>
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
          <div className="ruo-drawer-panel" style={{ width: '540px' }} onClick={(e) => e.stopPropagation()}>
            <div className="ruo-drawer-header">
              <div>
                <h2 className="ruo-drawer-title">Phân Công Kỹ Thuật Viên & Cấp Đồ Dự Phòng</h2>
                <p className="ruo-drawer-subtitle">{selectedTicket.ticket_code}</p>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="ruo-drawer-close-btn"><Icons.Close size={18} /></button>
            </div>

            <form onSubmit={handleAssignSubmit}>
              <div className="ruo-drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* AI Dispatch One-Click Banner inside Assign Modal */}
                <div style={{ background: 'var(--surface-2)', border: '1.5px solid var(--border-focus)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800, color: 'var(--ink-pure)' }}>
                      <Icons.Sparkles size={14} style={{ color: '#ea580c' }} />
                      <span>AI Gợi Ý Phân Công Tối Ưu</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => handleRunAiCopilot(selectedTicket)}
                        disabled={aiCopilotLoading}
                        className="ruo-btn ruo-btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 700 }}
                      >
                        {aiCopilotLoading ? 'Đang Tính...' : 'Gợi Ý Từ AI'}
                      </button>
                      {aiCopilotMap[selectedTicket._id] && (
                        <button
                          type="button"
                          onClick={() => applyAiDispatchRecommendation(aiCopilotMap[selectedTicket._id])}
                          className="ruo-btn ruo-btn-primary"
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
                  {Array.isArray(aiCopilotMap[selectedTicket._id]?.dispatch_recommendation?.ranked_technicians) && (
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '130px', overflowY: 'auto' }}>
                      {aiCopilotMap[selectedTicket._id].dispatch_recommendation.ranked_technicians.map((rt) => (
                        <div
                          key={rt._id}
                          onClick={() => setAssignForm((prev) => ({ ...prev, assigned_to: rt._id }))}
                          style={{
                            padding: '6px 9px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: String(assignForm.assigned_to) === String(rt._id) ? 'rgba(234, 88, 12,0.12)' : 'var(--surface-card)',
                            border: String(assignForm.assigned_to) === String(rt._id) ? '1.5px solid #ea580c' : '1px solid var(--border-subtle)'
                          }}
                        >
                          <div>
                            <strong>{rt.full_name}</strong> ({rt.code}) • <span style={{ color: 'var(--ink-muted)' }}>{rt.specialty_label || rt.department}</span>
                          </div>
                          <span style={{ fontWeight: 700, color: rt.is_specialty_match !== false ? '#16a34a' : '#dc2626' }}>
                            {rt.score}đ • {rt.is_specialty_match !== false ? 'Đúng chuyên môn' : 'Trái phân quyền'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Chọn Kỹ Thuật Viên Phụ Trách (Phân Quyền Theo Chuyên Môn) *
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
                        {t.full_name} ({t.code} • {t.specialty_label || t.department || 'Tổ Kỹ Thuật CSVC'})
                      </option>
                    ))}
                  </select>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '11.5px', color: 'var(--ink-muted)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={Boolean(assignForm.force_override)}
                      onChange={(e) => setAssignForm({ ...assignForm, force_override: e.target.checked })}
                    />
                    <span>Cho phép giao vượt rào phân quyền chuyên môn trong trường hợp khẩn cấp (Force Override)</span>
                  </label>
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
                <button type="button" onClick={() => setShowAssignModal(false)} className="ruo-btn ruo-btn-secondary" style={{ padding: '8px 16px' }}>Hủy Bỏ</button>
                <button type="submit" disabled={submitting} className="ruo-btn ruo-btn-primary" style={{ padding: '8px 20px', fontWeight: 700 }}>
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
              <button onClick={() => setShowCloseModal(false)} className="ruo-drawer-close-btn"><Icons.Close size={18} /></button>
            </div>

            <form onSubmit={handleCloseSubmit}>
              <div className="ruo-drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {selectedTicket.status === 'unrepairable' ? (
                  <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', padding: '12px 14px', borderRadius: 'var(--radius-md)', fontSize: '12.5px', color: 'var(--ink-primary)' }}>
                    <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: '4px' }}>
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
                <button type="button" onClick={() => setShowCloseModal(false)} className="ruo-btn ruo-btn-secondary" style={{ padding: '8px 16px' }}>Hủy Bỏ</button>
                <button type="submit" disabled={submitting} className="ruo-btn ruo-btn-primary" style={{ padding: '8px 20px', fontWeight: 700 }}>
                  {submitting ? 'Đang Đóng Phiếu...' : 'Xác Nhận & Đóng Phiếu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ticket Chat Drawer */}
      <TicketChatDrawer
        isOpen={Boolean(chatTicket)}
        onClose={() => setChatTicket(null)}
        ticket={chatTicket}
        onTicketUpdated={fetchData}
      />
    </div>
  );
};

export default TicketKanbanPage;
