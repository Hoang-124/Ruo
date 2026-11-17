import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { isSameUser } from '../../config/navigation';
import { repairApi, sparePartApi, chatApi } from '../../lib/api';
import { RepairStepper } from '../../components/repairs/RepairStepper';
import { DeadlineCountdown } from '../../components/repairs/DeadlineCountdown';
import { TicketChatDrawer } from '../../components/chat/TicketChatDrawer';

export const TechnicianTasksPage = () => {
  const { currentUser, login } = useAuth();
  const userIdentity = useMemo(() => ({ _id: currentUser?._id, id: currentUser?.id, code: currentUser?.code, email: currentUser?.email }),
    [currentUser?._id, currentUser?.id, currentUser?.code, currentUser?.email]);
  const { toast } = useToast();
  const { error: showError } = toast;

  const handleQuickSwitchTech = async (techCode, techLabel) => {
    if (typeof login !== 'function') return;
    try {
      const res = await login(techCode, 'Ruo@2026');
      if (res?.success) {
        toast.success(`Đã chuyển sang tài khoản [${techCode}] ${techLabel}!`);
      } else {
        showError(res?.message || 'Không thể chuyển tài khoản KTV.');
      }
    } catch (err) {
      showError('Lỗi khi chuyển tài khoản KTV: ' + err.message);
    }
  };

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedTask, setSelectedTask] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [chatTicket, setChatTicket] = useState(null);

  // States xin linh kiện trực tiếp cho Ticket
  const [partModalTicket, setPartModalTicket] = useState(null);
  const [availableParts, setAvailableParts] = useState([]);
  const [loadingParts, setLoadingParts] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState('');
  const [requestQty, setRequestQty] = useState(1);
  const [requestReason, setRequestReason] = useState('');
  const [submittingPartRequest, setSubmittingPartRequest] = useState(false);

  // States báo trái chuyên môn / xin đổi KTV (kết nối trực tiếp Chat với Quản lý CSVC)
  const [reassignModalTask, setReassignModalTask] = useState(null);
  const [reassignReason, setReassignReason] = useState('');
  const [submittingReassign, setSubmittingReassign] = useState(false);

  const openReassignModal = (task) => {
    setReassignModalTask(task);
    const isGuard = currentUser?.specialty_code === 'GUARD_OPS' || /bảo vệ/i.test(currentUser?.department || '');
    setReassignReason(
      isGuard
        ? `Tổ Bảo vệ chỉ phụ trách bật/tắt điều hòa, công tắc đèn và mở cửa phòng. Sự cố [${task.equipment_id?.name || 'thiết bị'}] cần KTV chuyên môn sửa chữa phần cứng.`
        : `Qua kiểm tra thực tế, sự cố [${task.equipment_id?.name || 'thiết bị'}] không đúng chuyên môn phụ trách (${currentUser?.specialty_label || currentUser?.department || 'KTV'}), đề nghị Quản lý CSVC điều phối KTV chuyên sâu.`
    );
  };

  const handleSubmitReassignRequest = async (e) => {
    e.preventDefault();
    if (!reassignModalTask || !reassignReason.trim()) return;
    setSubmittingReassign(true);
    try {
      const targetTask = reassignModalTask;
      const res = await repairApi.requestReassign(targetTask._id, {
        reason: reassignReason.trim()
      });
      if (res && res.success) {
        toast.success(res.message || `Đã gửi yêu cầu đổi KTV và mở kênh Chat với Quản lý CSVC cho phiếu ${targetTask.ticket_code}!`);
        setReassignModalTask(null);
        await fetchTasks();
        setChatTicket(res.repair || targetTask);
      }
    } catch (err) {
      showError('Lỗi khi gửi yêu cầu đổi KTV: ' + err.message);
    } finally {
      setSubmittingReassign(false);
    }
  };

  const openTaskHistory = async (task) => {
    setSelectedTask(task);
    setLoadingDetail(true);
    try {
      const res = await repairApi.getById(task._id);
      if (res && res.repair) {
        setSelectedTask(res.repair);
      }
    } catch {
      // Keep summary fallback if detail fetch fails
    } finally {
      setLoadingDetail(false);
    }
  };

  const openSparePartModal = async (task) => {
    setPartModalTicket(task);
    setRequestQty(1);
    setRequestReason(`Thay linh kiện hỏng cho ${task.equipment_id?.name || 'thiết bị'} tại ${task.room_id?.code || 'phòng học'}`);
    setLoadingParts(true);
    try {
      const res = await sparePartApi.list();
      const list = res?.parts || res?.data || [];
      setAvailableParts(list);
      if (list.length > 0) {
        setSelectedPartId(list[0]._id);
      }
    } catch (err) {
      toast.error('Lỗi nạp danh mục linh kiện kho: ' + err.message);
    } finally {
      setLoadingParts(false);
    }
  };

  const handleSubmitPartRequest = async (e) => {
    e.preventDefault();
    if (!partModalTicket || !selectedPartId) return;

    const chosenPart = availableParts.find((p) => p._id === selectedPartId);
    setSubmittingPartRequest(true);
    try {
      // 1. Tạo bản ghi PartsRequest gắn với mã phiếu (Backend đã tự động sinh Action Card Kênh Tác Nghiệp KHO-01 và thông báo Quản lý)
      await sparePartApi.createRequest({
        repair_id: partModalTicket._id,
        items: [{
          part_id: selectedPartId,
          qty: Number(requestQty) || 1
        }],
        reason: requestReason || `Thay thế linh kiện cho ${partModalTicket.equipment_id?.name || 'thiết bị'}`
      });

      // 2. Gửi thông báo hệ thống vào Khung Chat riêng của phiếu sửa chữa
      await chatApi.sendTicketMessage(partModalTicket._id, {
        content: `Kỹ thuật viên ${currentUser?.name || 'KTV'} đã gửi yêu cầu xuất kho linh kiện [${chosenPart?.name || 'Linh kiện'}] (${requestQty} Cái). Đang chờ Quản lý CSVC duyệt xuất kho.`,
        message_type: 'system_event'
      }).catch(() => null);

      toast.success(`Đã gửi yêu cầu cấp linh kiện [${chosenPart?.name || ''}] cho phiếu ${partModalTicket.ticket_code}!`);
      setPartModalTicket(null);
      await fetchTasks();
      window.dispatchEvent(new CustomEvent('ruo-chat-refresh'));
    } catch (err) {
      toast.error('Lỗi khi gửi yêu cầu linh kiện: ' + err.message);
    } finally {
      setSubmittingPartRequest(false);
    }
  };

  // Modals
  const [showLogModal, setShowLogModal] = useState(false);
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiByTask, setAiByTask] = useState({});
  const aiRequest = useRef(0);
  const formVersion = useRef(0);

  const aiContext = JSON.stringify([selectedTask?._id, showLogModal, showOutcomeModal]);
  const [previousAiContext, setPreviousAiContext] = useState(aiContext);
  if (previousAiContext !== aiContext) {
    setPreviousAiContext(aiContext);
    setAiLoading(false);
  }

  useEffect(() => {
    formVersion.current += 1;
    aiRequest.current += 1;
    return () => {
      formVersion.current += 1;
      aiRequest.current += 1;
    };
  }, [selectedTask?._id, showLogModal, showOutcomeModal]);

  const handleLoadTaskAi = async (task) => {
    if (!task?._id) return;
    const request = ++aiRequest.current;
    try {
      setAiLoading(true);
      const res = await repairApi.aiCopilot(task._id);
      if (request !== aiRequest.current) return;
      if (res && res.success && res.copilot) {
        setAiByTask((prev) => ({ ...prev, [task._id]: res.copilot }));
        toast.success(`AI Kỹ thuật đã chẩn đoán nhiệm vụ [${task.ticket_code}]!`);
      }
    } catch (err) {
      if (request === aiRequest.current) showError('Không thể chạy AI Chẩn đoán: ' + err.message);
    } finally {
      if (request === aiRequest.current) setAiLoading(false);
    }
  };

  // Forms
  const [logData, setLogData] = useState({
    action: '',
    notes: '',
    cost: 0
  });

  const [outcomeData, setOutcomeData] = useState({
    outcome: 'repaired',
    notes: ''
  });

  const applyAiDraft = async (kind) => {
    const taskId = selectedTask?._id;
    if (!taskId) return;
    const version = formVersion.current;
    const request = ++aiRequest.current;
    try {
      setAiLoading(true);
      let cp = aiByTask[taskId];
      if (!cp) {
        const res = await repairApi.aiCopilot(taskId);
        if (request !== aiRequest.current || version !== formVersion.current) return;
        if (!res?.success || !res.copilot) throw new Error('Chưa nhận được gợi ý kỹ thuật.');
        cp = res.copilot;
        setAiByTask((prev) => ({ ...prev, [taskId]: cp }));
      }
      if (!cp?.diagnosis || version !== formVersion.current) return;
      if (kind === 'log') {
        setLogData((prev) => ({
          ...prev,
          action: cp.diagnosis.suggested_log_action || prev.action,
          notes: cp.diagnosis.suggested_log_notes || prev.notes
        }));
      } else {
        // The technician decides the physical outcome; AI only drafts review notes.
        setOutcomeData((prev) => ({
          ...prev,
          notes: cp.diagnosis.suggested_outcome_notes || prev.notes
        }));
      }
      toast.success('Đã điền bản nháp AI. Vui lòng đối chiếu thực tế trước khi lưu.');
    } catch (err) {
      if (request === aiRequest.current) showError('Lỗi gọi AI: ' + err.message);
    } finally {
      if (request === aiRequest.current) setAiLoading(false);
    }
  };

  const fetchTasks = useCallback(async () => {
    aiRequest.current += 1;
    formVersion.current += 1;
    setAiLoading(false);
    setAiByTask({});
    try {
      setLoading(true);
      const userIdentityId = String(userIdentity?._id || userIdentity?.id || '');
      const res = await repairApi.list(
        userIdentityId && userIdentityId !== 'guest' ? { assigned_to: userIdentityId } : {}
      );
      if (res && res.success) {
        const nextTasks = (res.repairs || []).filter((r) => isSameUser(r.assigned_to, userIdentity));
        setTasks(nextTasks);
        setSelectedTask((prev) => {
          if (!prev?._id) return prev;
          const updated = nextTasks.find((r) => String(r._id) === String(prev._id));
          return updated ? { ...prev, ...updated, logs: updated.logs || prev.logs } : prev;
        });
      }
    } catch (err) {
      showError('Lỗi khi tải danh sách nhiệm vụ: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [showError, userIdentity]);

  useEffect(() => {
    // This effect synchronizes remote data; the loader also sets its pending state before awaiting the response.
    // eslint-disable-next-line react/set-state-in-effect
    fetchTasks();
    const handlePartsRefresh = () => {
      fetchTasks();
    };
    window.addEventListener('ruo-parts-refresh', handlePartsRefresh);
    return () => window.removeEventListener('ruo-parts-refresh', handlePartsRefresh);
  }, [fetchTasks]);

  const handleAcceptTask = async (task) => {
    try {
      setSubmitting(true);
      const res = await repairApi.accept(task._id);
      if (res && res.success) {
        toast.success(`Đã tiếp nhận nhiệm vụ [${task.ticket_code}] thành công. Bắt đầu tính giờ thao tác!`);
        await fetchTasks();
      }
    } catch (err) {
      showError('Lỗi khi tiếp nhận nhiệm vụ: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openLogModal = (task) => {
    setSelectedTask(task);
    setLogData({ action: '', notes: '', cost: 0 });
    setShowLogModal(true);
  };

  const handleLogSubmit = async (e) => {
    e.preventDefault();
    if (!logData.action.trim()) {
      showError('Vui lòng nhập hành động đã thực hiện.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await repairApi.progress(selectedTask._id, {
        action: 'in_progress',
        description: [logData.action.trim(), logData.notes.trim()].filter(Boolean).join(' — '),
        notes: logData.notes.trim(),
        cost: Number(logData.cost) || 0
      });
      if (res && res.success) {
        toast.success('Đã cập nhật nhật ký tiến độ sửa chữa thành công!');
        setShowLogModal(false);
        await fetchTasks();
      }
    } catch (err) {
      showError('Lỗi khi ghi nhật ký: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openOutcomeModal = (task) => {
    const pendingParts = (task.parts_requests || []).filter((pr) => pr.status === 'pending');
    if (pendingParts.length > 0) {
      toast.error(`Phiếu này đang có ${pendingParts.length} yêu cầu linh kiện chờ Quản lý duyệt xuất kho. Cần Quản lý duyệt và sửa xong mới có thể Báo cáo kết quả!`);
      return;
    }
    setSelectedTask(task);
    setOutcomeData({
      outcome: 'repaired',
      notes: ''
    });
    setShowOutcomeModal(true);
  };

  const handleOutcomeSubmit = async (e) => {
    e.preventDefault();
    const pendingParts = (selectedTask?.parts_requests || []).filter((pr) => pr.status === 'pending');
    if (pendingParts.length > 0) {
      showError(`Không thể báo cáo kết quả: Còn ${pendingParts.length} yêu cầu linh kiện chưa được Quản lý duyệt xuất kho!`);
      return;
    }
    try {
      setSubmitting(true);
      const res = await repairApi.reportOutcome(selectedTask._id, {
        outcome: outcomeData.outcome,
        notes: outcomeData.notes.trim()
      });
      if (res && res.success) {
        toast.success(
          outcomeData.outcome === 'repaired'
            ? 'Đã báo cáo sửa chữa thành công! Thông báo đã gửi tới Quản lý CSVC để nghiệm thu.'
            : 'Đã báo cáo không thể sửa chữa. Thiết bị chuyển sang trạng thái chờ thanh lý!'
        );
        setShowOutcomeModal(false);
        await fetchTasks();
      }
    } catch (err) {
      showError('Lỗi khi báo cáo kết quả: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'reported':
        return <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>Mới Tiếp Nhận</span>;
      case 'assigned':
        return <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: 'rgba(6,182,212,0.15)', color: 'var(--laser-cyan)' }}>Cần Tiếp Nhận</span>;
      case 'in_progress':
        return <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: 'rgba(59,130,246,0.15)', color: '#3B82F6' }}>Đang Xử Lý</span>;
      case 'resolved':
        return <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>Đã Khắc Phục</span>;
      case 'unrepairable':
        return <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>Không Thể Sửa</span>;
      case 'closed':
        return <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: 'rgba(100,116,139,0.2)', color: 'var(--ink-secondary)' }}>Đã Đóng Phiếu</span>;
      default:
        return <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: 'rgba(255,255,255,0.08)', color: 'var(--ink-muted)' }}>{status}</span>;
    }
  };

  const getDamageLabel = (level) => {
    switch (level) {
      case 'critical':
        return { label: 'Khẩn cấp', bg: 'rgba(239,68,68,0.2)', color: '#EF4444' };
      case 'major':
        return { label: 'Hỏng nặng', bg: 'rgba(245,158,11,0.2)', color: '#F59E0B' };
      case 'minor':
      default:
        return { label: 'Hỏng nhẹ', bg: 'rgba(16,185,129,0.16)', color: '#10B981' };
    }
  };

  const getLogActionLabel = (action) => {
    switch (action) {
      case 'reported': return 'Ghi nhận báo cáo sự cố';
      case 'assigned': return 'Phân công Kỹ thuật viên';
      case 'in_progress': return 'Cập nhật tiến độ sửa chữa';
      case 'resolved': return 'Hoàn tất khắc phục sự cố';
      case 'unrepairable': return 'Kết luận không thể sửa chữa';
      case 'closed': return 'Nghiệm thu & đóng phiếu';
      case 'escalated': return 'Cảnh báo vượt hạn SLA';
      default: return action;
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'TODO') return t.status === 'assigned';
    if (statusFilter === 'DOING') return t.status === 'in_progress';
    if (statusFilter === 'OVERDUE') return !['resolved', 'unrepairable', 'closed'].includes(t.status) && t.deadline && new Date(t.deadline).getTime() < now;
    if (statusFilter === 'DONE') return ['resolved', 'unrepairable', 'closed'].includes(t.status);
    return true;
  });

  const countTodo = tasks.filter(t => t.status === 'assigned').length;
  const countDoing = tasks.filter(t => t.status === 'in_progress').length;
  const countOverdue = tasks.filter(t => !['resolved', 'unrepairable', 'closed'].includes(t.status) && t.deadline && new Date(t.deadline).getTime() < now).length;
  const countDone = tasks.filter(t => ['resolved', 'unrepairable', 'closed'].includes(t.status)).length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', color: '#0EA5E9', background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.25)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>KỸ THUẬT VIÊN</span>
            <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Theo Dõi Tiến Độ Xử Lý & Tiếp Nhận SLA</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink-pure)', letterSpacing: '-0.02em', margin: 0 }}>
            Nhiệm Vụ Sửa Chữa & Bảo Trì Thiết Bị
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--ink-muted)' }}>
            Tiếp nhận sự cố được giao, cập nhật tiến độ thực địa và báo cáo kết quả khắc phục sự cố theo cam kết SLA.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('open-ruo-chat', { detail: { tab: 'operations' } }));
            }}
            className="laser-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #f97316, #c2410c)',
              color: '#ffffff',
              border: 'none',
              boxShadow: '0 2px 8px rgba(234,88,12,0.25)',
              cursor: 'pointer'
            }}
            title="Mở Chat Tác Nghiệp Kỹ Thuật Viên & Quản Lý Kho"
          >
            <Icons.Package size={16} />
            <span>Chat Tác Nghiệp & Kho</span>
          </button>

          <button
            onClick={fetchTasks}
            className="laser-btn laser-btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 16px', borderRadius: 'var(--radius-md)', fontSize: '13px' }}
          >
            <Icons.RefreshCw size={16} />
            <span>Làm Mới</span>
          </button>
        </div>
      </div>

      {/* Specialty RBAC Banner for Logged-in Technician */}
      <div
        style={{
          background: 'var(--surface-card)',
          border: '1px solid rgba(14,165,233,0.35)',
          borderRadius: 'var(--radius-lg)',
          padding: '12px 16px',
          marginBottom: '18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '4px', background: 'rgba(6,182,212,0.14)', color: 'var(--laser-cyan)' }}>
              ĐANG ĐĂNG NHẬP: {currentUser?.code || 'KT001'} • {currentUser?.specialty_code || 'TECH_GENERAL'}
            </span>
            <strong style={{ fontSize: '13px', color: 'var(--ink-pure)' }}>
              {currentUser?.full_name || currentUser?.name || 'Kỹ Thuật Viên'} — {currentUser?.specialty_label || currentUser?.department || 'Kỹ Thuật Viên Đa Năng CSVC'}
            </strong>
          </div>
          {typeof login === 'function' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink-muted)' }}>Chuyển nhanh KTV:</span>
              {[
                { code: 'KT001', label: 'KT001 • Đa năng' },
                { code: 'KT002', label: 'KT002 • Bảo vệ' },
                { code: 'KT003', label: 'KT003 • Điện lạnh' },
                { code: 'KT004', label: 'KT004 • CNTT/AV' },
                { code: 'KT005', label: 'KT005 • Cơ khí' }
              ].map((st) => {
                const isCurrent = String(currentUser?.code || '').toUpperCase() === st.code;
                return (
                  <button
                    key={st.code}
                    type="button"
                    onClick={() => handleQuickSwitchTech(st.code, st.label)}
                    disabled={isCurrent}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: isCurrent ? 'default' : 'pointer',
                      border: isCurrent ? '1.5px solid var(--laser-cyan)' : '1px solid var(--hairline-medium)',
                      background: isCurrent ? 'rgba(6,182,212,0.18)' : 'var(--surface-panel)',
                      color: isCurrent ? 'var(--laser-cyan)' : 'var(--ink-secondary)'
                    }}
                  >
                    {st.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '11.5px', color: 'var(--ink-muted)' }}>
          <span>
            {Array.isArray(currentUser?.specialized_tasks) && currentUser.specialized_tasks.length > 0
              ? `Phạm vi công việc được phân quyền: ${currentUser.specialized_tasks.join(', ')}`
              : 'Phụ trách tiếp nhận và khắc phục sự cố kỹ thuật đúng chuyên môn được giao.'}
          </span>
          <span style={{ color: 'var(--ink-secondary)' }}>
            Nếu công việc không phù hợp chuyên môn, bấm <strong>"Báo Trái Chuyên Môn / Đổi KTV"</strong> để Chat với Quản lý CSVC.
          </span>
        </div>
      </div>

      {/* KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Tổng nhiệm vụ được giao</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--ink-pure)', marginTop: '4px' }}>{tasks.length}</div>
        </div>
        <div style={{ background: 'var(--surface-card)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: '12px', color: 'var(--laser-cyan)', fontWeight: 600 }}>Cần tiếp nhận ngay</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--laser-cyan)', marginTop: '4px' }}>{countTodo}</div>
        </div>
        <div style={{ background: 'var(--surface-card)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: '12px', color: '#3B82F6', fontWeight: 600 }}>Đang làm sửa chữa</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#3B82F6', marginTop: '4px' }}>{countDoing}</div>
        </div>
        <div
          onClick={() => setStatusFilter(statusFilter === 'OVERDUE' ? 'ALL' : 'OVERDUE')}
          style={{
            background: 'var(--surface-card)',
            border: statusFilter === 'OVERDUE' ? '2px solid #EF4444' : '1px solid rgba(239,68,68,0.3)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 18px',
            cursor: 'pointer'
          }}
        >
          <div style={{ fontSize: '12px', color: '#EF4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Icons.AlertCircle size={14} color="#EF4444" />
            <span>Quá hạn SLA (Khẩn)</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#EF4444', marginTop: '4px' }}>{countOverdue}</div>
        </div>
        <div style={{ background: 'var(--surface-card)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: '12px', color: '#10B981', fontWeight: 600 }}>Đã xong / Nghiệm thu</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#10B981', marginTop: '4px' }}>{countDone}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--hairline-medium)', marginBottom: '20px' }}>
        {[
          { key: 'ALL', label: `Tất Cả (${tasks.length})` },
          { key: 'TODO', label: `Cần Tiếp Nhận (${countTodo})` },
          { key: 'DOING', label: `Đang Làm (${countDoing})` },
          { key: 'OVERDUE', label: `Quá Hạn SLA (${countOverdue})` },
          { key: 'DONE', label: `Đã Xong (${countDone})` }
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

      {/* Task Cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink-muted)' }}>
          <Icons.RefreshCw size={28} className="spin" style={{ marginBottom: '12px' }} />
          <div>Đang nạp danh sách nhiệm vụ kỹ thuật...</div>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--surface-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--hairline-medium)', color: 'var(--ink-muted)' }}>
          <Icons.CheckCircle size={36} style={{ opacity: 0.5, marginBottom: '12px' }} />
          <div style={{ fontSize: '15px', fontWeight: 600 }}>Không có nhiệm vụ nào trong mục này.</div>
          <div style={{ fontSize: '13px', marginTop: '4px' }}>Bạn đã xử lý hết các sự cố được giao phụ trách.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredTasks.map(t => {
            const eq = t.equipment_id || {};
            const room = t.room_id || {};
            const isAssigned = t.status === 'assigned';
            const isInProgress = t.status === 'in_progress';
            const isCritical = t.damage_level === 'critical';

            return (
              <div
                key={t._id}
                style={{
                  background: 'var(--surface-card)',
                  border: isCritical ? '1px solid rgba(239,68,68,0.5)' : isInProgress ? '1px solid rgba(59,130,246,0.4)' : '1px solid var(--hairline-medium)',
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
                    <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--ink-pure)' }}>
                      {eq.name} ({eq.code})
                    </span>
                    {getStatusBadge(t.status)}
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: getDamageLabel(t.damage_level).bg, color: getDamageLabel(t.damage_level).color }}>
                      Mức: {getDamageLabel(t.damage_level).label}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '12.5px', color: 'var(--ink-muted)', marginBottom: '10px' }}>
                    <div>Vị trí: <strong style={{ color: 'var(--ink-pure)' }}>{room.code} ({room.name})</strong></div>
                    <div>Người báo: <strong style={{ color: 'var(--ink-pure)' }}>{t.reported_by?.full_name || 'Giảng viên'}</strong></div>
                  </div>

                  {/* Real-time SLA Deadline Countdown (UC-7.1) */}
                  {t.deadline && (
                    <div style={{ marginBottom: '12px' }}>
                      <DeadlineCountdown deadline={t.deadline} status={t.status} />
                    </div>
                  )}

                  <div style={{ margin: '10px 0' }}>
                    <RepairStepper status={t.status} outcome={t.outcome} />
                  </div>

                  <div style={{ background: 'var(--surface-panel)', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '13px', marginBottom: '10px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--ink-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '2px' }}>Hiện tượng sự cố:</div>
                    <div style={{ color: 'var(--ink-pure)' }}>{t.incident_description}</div>
                  </div>

                  {(t.ai_auto_assigned || t.ai_dispatch_reason) && (
                    <div style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.28)', padding: '8px 12px', borderRadius: 'var(--radius-md)', fontSize: '12px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <Icons.Sparkles size={14} style={{ color: 'var(--laser-cyan)', flexShrink: 0 }} />
                      <div>
                        <strong style={{ color: 'var(--laser-cyan)' }}>
                          {t.ai_auto_assigned ? 'AI Tự Động Phân Công Theo Chuyên Môn:' : 'Đánh Giá Khớp Chuyên Môn AI:'}
                        </strong>{' '}
                        <span style={{ color: 'var(--ink-secondary)' }}>
                          {t.ai_dispatch_reason || `Khớp hồ sơ chuyên môn (${t.ai_dispatch_score || 90}/100 điểm)`}
                        </span>
                      </div>
                    </div>
                  )}

                  {t.reassign_requested && (
                    <div style={{ background: 'rgba(234,88,12,0.1)', border: '1px solid rgba(234,88,12,0.4)', padding: '8px 12px', borderRadius: 'var(--radius-md)', fontSize: '12px', color: '#ea580c', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                      <div>
                        <strong>Đã gửi yêu cầu đổi KTV cho Quản lý CSVC:</strong> "{t.reassign_reason}"
                        {t.ai_recommended_to?.full_name && (
                          <span> • AI đề xuất chuyển cho: <strong>{t.ai_recommended_to.full_name}</strong></span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setChatTicket(t)}
                        className="laser-btn laser-btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '11.5px', fontWeight: 700, borderColor: '#ea580c', color: '#ea580c' }}
                      >
                        Mở Chat Với Quản Lý
                      </button>
                    </div>
                  )}

                  {/* Dải trạng thái yêu cầu linh kiện gắn chặt với Ticket này */}
                  {t.parts_requests && t.parts_requests.length > 0 && (
                    <div style={{ marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {t.parts_requests.map((pr, idx) => {
                        const isPending = pr.status === 'pending';
                        const isApproved = pr.status === 'approved';
                        const itemsText = pr.items?.map((i) => `${i.qty}x ${i.part_id?.name || i.part_name || 'Linh kiện'}`).join(', ');

                        return (
                          <div
                            key={pr._id || idx}
                            style={{
                              padding: '8px 12px',
                              borderRadius: 'var(--radius-md)',
                              fontSize: '12px',
                              background: isApproved ? 'rgba(22,163,74,0.08)' : isPending ? 'rgba(234,88,12,0.08)' : 'rgba(239,68,68,0.08)',
                              border: isApproved ? '1px solid rgba(22,163,74,0.3)' : isPending ? '1px solid rgba(234,88,12,0.3)' : '1px solid rgba(239,68,68,0.3)',
                              color: isApproved ? '#15803d' : isPending ? '#ea580c' : '#dc2626',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '8px'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Icons.Package size={14} color="currentColor" />
                              <span>
                                <strong>Linh kiện: {itemsText}</strong> — {isApproved ? `Đã Duyệt Xuất Kho (${pr.approved_by?.full_name || 'Quản lý'})` : isPending ? 'Đang chờ Quản lý duyệt xuất kho' : 'Bị từ chối xuất kho'}
                              </span>
                            </div>
                            {isApproved && (
                              <span style={{ fontSize: '11px', fontWeight: 700, background: '#16a34a', color: '#fff', padding: '2px 7px', borderRadius: '4px' }}>
                                Nhận đồ tại KHO-01
                              </span>
                            )}
                          </div>
                        );
                      })}
                      {t.parts_requests.some((pr) => pr.status === 'pending') && (
                        <div
                          style={{
                            padding: '6px 10px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '11.5px',
                            background: 'rgba(234,88,12,0.12)',
                            border: '1px dashed rgba(234,88,12,0.4)',
                            color: '#c2410c',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <Icons.Clock size={13} color="#ea580c" />
                          <span>Chờ Quản lý CSVC duyệt xuất kho linh kiện trước khi tiến hành sửa và báo cáo kết quả.</span>
                        </div>
                      )}
                    </div>
                  )}

                  {t.replacement_equipment_id && (
                    <div style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.25)', padding: '8px 12px', borderRadius: 'var(--radius-md)', fontSize: '12px', color: 'var(--laser-cyan)' }}>
                      Được cấp thiết bị thay thế từ kho: <strong>{t.replacement_equipment_id?.code} ({t.replacement_equipment_id?.name})</strong>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '170px' }}>
                  {isAssigned && (
                    <button
                      onClick={() => handleAcceptTask(t)}
                      className="laser-btn laser-btn-primary"
                      style={{ padding: '9px 16px', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                      <Icons.CheckCircle size={16} />
                      <span>Tiếp Nhận Task</span>
                    </button>
                  )}

                  {isInProgress && (
                    <>
                      <button
                        onClick={() => openSparePartModal(t)}
                        className="laser-btn"
                        style={{
                          padding: '8px 14px',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          background: 'linear-gradient(135deg, #f97316, #c2410c)',
                          color: '#ffffff',
                          border: 'none',
                          boxShadow: '0 2px 6px rgba(234,88,12,0.25)',
                          cursor: 'pointer'
                        }}
                        title="Gửi yêu cầu xuất kho linh kiện thay thế cho phiếu này"
                      >
                        <Icons.Package size={15} />
                        <span>Xin Linh Kiện Kho</span>
                      </button>

                      <button
                        onClick={() => openLogModal(t)}
                        className="laser-btn laser-btn-secondary"
                        style={{ padding: '8px 14px', fontSize: '12.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <Icons.Clock size={15} />
                        <span>Ghi Nhật Ký</span>
                      </button>

                      {(() => {
                        const pendingParts = (t.parts_requests || []).filter((pr) => pr.status === 'pending');
                        const hasPendingParts = pendingParts.length > 0;

                        return (
                          <button
                            disabled={hasPendingParts}
                            onClick={() => openOutcomeModal(t)}
                            className={`laser-btn ${hasPendingParts ? 'laser-btn-secondary' : 'laser-btn-primary'}`}
                            style={{
                              padding: '8px 14px',
                              fontSize: '12.5px',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              opacity: hasPendingParts ? 0.6 : 1,
                              cursor: hasPendingParts ? 'not-allowed' : 'pointer',
                              background: hasPendingParts ? 'rgba(234,88,12,0.08)' : undefined,
                              color: hasPendingParts ? '#ea580c' : undefined,
                              borderColor: hasPendingParts ? 'rgba(234,88,12,0.35)' : undefined
                            }}
                            title={
                              hasPendingParts
                                ? `Đang chờ Quản lý duyệt ${pendingParts.length} yêu cầu linh kiện kho. Cần được duyệt xuất kho và sửa xong mới có thể Báo cáo kết quả!`
                                : 'Báo cáo kết quả sửa chữa'
                            }
                          >
                            {hasPendingParts ? <Icons.Clock size={16} /> : <Icons.Check size={16} />}
                            <span>{hasPendingParts ? `Chờ Duyệt Kho (${pendingParts.length})` : 'Báo Cáo Kết Quả'}</span>
                          </button>
                        );
                      })()}
                    </>
                  )}

                  {(isAssigned || isInProgress) && (
                    <button
                      onClick={() => openReassignModal(t)}
                      className="laser-btn laser-btn-secondary"
                      style={{
                        padding: '7px 12px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        color: '#ea580c',
                        borderColor: 'rgba(234,88,12,0.45)',
                        background: 'rgba(234,88,12,0.08)'
                      }}
                      title="Báo công việc không đúng chuyên môn và mở khung Chat với Quản lý CSVC để đổi KTV"
                    >
                      <Icons.AlertTriangle size={13} color="#ea580c" />
                      <span>{t.reassign_requested ? 'Cập Nhật Lý Do Đổi Ca' : 'Báo Trái Chuyên Môn / Đổi KTV'}</span>
                    </button>
                  )}

                  <button
                    onClick={() => setChatTicket(t)}
                    className="laser-btn laser-btn-secondary"
                    style={{ padding: '7px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                    title="Mở kênh trao đổi trực tiếp của phiếu này (Giảng viên, KTV & Quản lý)"
                  >
                    <Icons.MessageSquare size={14} />
                    <span>Trao Đổi Phiếu</span>
                  </button>

                  <button
                    onClick={() => openTaskHistory(t)}
                    className="laser-btn laser-btn-secondary"
                    style={{ padding: '7px 12px', fontSize: '12px' }}
                  >
                    Xem Lịch Sử
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Details Drawer */}
      {selectedTask && !showLogModal && !showOutcomeModal && (
        <div className="ruo-drawer-backdrop" onClick={() => setSelectedTask(null)}>
          <div className="ruo-drawer-panel" style={{ width: '560px' }} onClick={(e) => e.stopPropagation()}>
            <div className="ruo-drawer-header">
              <div>
                <h2 className="ruo-drawer-title">{selectedTask.ticket_code}</h2>
                <p className="ruo-drawer-subtitle">{selectedTask.equipment_id?.name}</p>
              </div>
              <button onClick={() => setSelectedTask(null)} className="ruo-drawer-close-btn"><Icons.X size={18} /></button>
            </div>

            <div className="ruo-drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: 'var(--surface-panel)', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '12.5px' }}>
                <div>Trạng thái: {getStatusBadge(selectedTask.status)}</div>
                <div style={{ marginTop: '6px' }}>
                  Mức độ hư hỏng: <strong style={{ color: getDamageLabel(selectedTask.damage_level).color }}>{getDamageLabel(selectedTask.damage_level).label}</strong>
                </div>
                <div style={{ marginTop: '6px' }}>Phòng: <strong>{selectedTask.room_id?.code || selectedTask.equipment_id?.room_id?.code || 'Kho / Chưa gán'} {selectedTask.room_id?.name ? `- ${selectedTask.room_id.name}` : ''}</strong></div>
              </div>

              {/* AI Technician Diagnosis & Spare Parts Copilot */}
              <div style={{ background: 'var(--surface-2)', border: '1.5px solid var(--border-focus)', borderRadius: 'var(--radius-md)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 800, color: 'var(--ink-pure)' }}>
                    <Icons.Sparkles size={15} style={{ color: 'var(--laser-cyan)' }} />
                    <span>AI Chẩn Đoán & Gợi Ý Vật Tư Kho</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLoadTaskAi(selectedTask)}
                    disabled={aiLoading}
                    className="laser-btn laser-btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '11.5px', fontWeight: 700 }}
                  >
                    {aiLoading ? 'Đang Phân Tích...' : (aiByTask[selectedTask._id] ? 'Chẩn Đoán Lại' : 'AI Chẩn Đoán Lỗi')}
                  </button>
                </div>

                {aiByTask[selectedTask._id] && (() => {
                  const cp = aiByTask[selectedTask._id];
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
                        <strong style={{ color: 'var(--ink-pure)' }}>Giả thuyết lỗi gốc:</strong>{' '}
                        <span style={{ color: 'var(--ink-secondary)' }}>{cp.diagnosis?.root_cause}</span>
                      </div>
                      {Array.isArray(cp.diagnosis?.troubleshooting_steps) && cp.diagnosis.troubleshooting_steps.length > 0 && (
                        <div>
                          <strong style={{ color: 'var(--ink-pure)' }}>Các bước kiểm tra khuyến nghị:</strong>
                          <ol style={{ margin: '4px 0 0 18px', padding: 0, color: 'var(--ink-secondary)' }}>
                            {cp.diagnosis.troubleshooting_steps.map((step, idx) => (
                              <li key={idx} style={{ marginBottom: '2px' }}>{step}</li>
                            ))}
                          </ol>
                        </div>
                      )}
                      {Array.isArray(cp.historical_insights?.similar_cases) && cp.historical_insights.similar_cases.length > 0 && (
                        <div style={{ background: 'var(--surface-panel)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-sm)', padding: '7px 10px', fontSize: '11.5px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--ink-pure)', marginBottom: '3px' }}>
                            Kinh nghiệm từ ca tương tự tại Tòa A1 ({cp.historical_insights.similar_cases.length} phiếu):
                          </div>
                          {cp.historical_insights.similar_cases.slice(0, 2).map((sc) => (
                            <div key={sc.ticket_code} style={{ color: 'var(--ink-muted)', marginTop: '2px' }}>
                              • <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-secondary)' }}>{sc.ticket_code}</strong> ({sc.similarity}% tương đồng): {sc.incident_description}
                            </div>
                          ))}
                        </div>
                      )}
                      {Array.isArray(cp.recommended_parts) && cp.recommended_parts.length > 0 && (
                        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', padding: '8px 10px' }}>
                          <div style={{ fontWeight: 800, color: 'var(--ink-pure)', marginBottom: '4px' }}>Linh kiện vật tư gợi ý mang theo (Kho Linh Kiện):</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {cp.recommended_parts.map((p) => (
                              <span
                                key={p._id}
                                style={{
                                  fontSize: '11px',
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  fontWeight: 700,
                                  background: p.in_stock ? 'var(--status-success-bg)' : 'var(--status-danger-bg)',
                                  color: p.in_stock ? 'var(--status-success-color)' : 'var(--status-danger-color)',
                                  border: `1px solid ${p.in_stock ? 'var(--status-success-border)' : 'var(--status-danger-border)'}`
                                }}
                              >
                                {p.name} ({p.in_stock ? `Còn ${p.stock} ${p.unit}` : 'Hết hàng'})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ink-muted)', fontWeight: 700, marginBottom: '6px' }}>
                  Nhật Ký Thao Tác Kỹ Thuật (Repair Logs)
                </div>
                {loadingDetail ? (
                  <div style={{ padding: '16px', background: 'var(--surface-panel)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--ink-muted)', textAlign: 'center' }}>
                    Đang tải lịch sử nhật ký thao tác...
                  </div>
                ) : (!selectedTask.logs || selectedTask.logs.length === 0) ? (
                  <div style={{ padding: '16px', background: 'var(--surface-panel)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--ink-muted)', textAlign: 'center' }}>
                    Chưa có nhật ký ghi nhận cho nhiệm vụ này.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedTask.logs.map((log, idx) => {
                      const actorName = log.performed_by?.full_name || log.logged_by?.full_name || 'Kỹ thuật viên';
                      const detailNote = log.description || log.notes;
                      return (
                        <div key={log._id || idx} style={{ background: 'var(--surface-panel)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', fontSize: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ink-muted)', fontSize: '11px', marginBottom: '2px' }}>
                            <span>{actorName}</span>
                            <span>{new Date(log.timestamp || log.created_at || now).toLocaleString('vi-VN')}</span>
                          </div>
                          <div style={{ fontWeight: 600, color: 'var(--ink-pure)' }}>{getLogActionLabel(log.action)}</div>
                          {detailNote && <div style={{ color: 'var(--ink-secondary)', marginTop: '2px' }}>{detailNote}</div>}
                          {log.cost > 0 && <div style={{ color: '#10B981', marginTop: '2px' }}>Chi phí: {log.cost.toLocaleString('vi-VN')} đ</div>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Log Modal */}
      {showLogModal && selectedTask && (
        <div className="ruo-drawer-backdrop" onClick={() => setShowLogModal(false)}>
          <div className="ruo-drawer-panel" style={{ width: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="ruo-drawer-header">
              <div>
                <h2 className="ruo-drawer-title">Ghi Nhật Ký Tiến Độ Sửa Chữa</h2>
                <p className="ruo-drawer-subtitle">{selectedTask.ticket_code}</p>
              </div>
              <button onClick={() => setShowLogModal(false)} className="ruo-drawer-close-btn"><Icons.X size={18} /></button>
            </div>

            <form onSubmit={handleLogSubmit}>
              <div className="ruo-drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', background: 'var(--surface-2)', border: '1px solid var(--border-focus)', borderRadius: 'var(--radius-sm)', padding: '8px 10px' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--ink-secondary)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Icons.Sparkles size={13} style={{ color: 'var(--laser-cyan)' }} />
                    <span>Trợ lý AI soạn nhanh nhật ký kỹ thuật</span>
                  </span>
                  <button
                    type="button"
                    disabled={aiLoading}
                    onClick={() => applyAiDraft('log')}
                    className="laser-btn laser-btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 700 }}
                  >
                    {aiLoading ? 'Đang Soạn...' : 'Điền Nhanh Bằng AI'}
                  </button>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Hành Động / Thao Tác Thực Hiện *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Đoản mạch nguồn cấp, thay cầu chì 10A..."
                    value={logData.action}
                    onChange={(e) => { formVersion.current += 1; setLogData({ ...logData, action: e.target.value }); }}
                    className="ruo-portal-input"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Chi Tiết / Ghi Chú Kỹ Thuật
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Mô tả kỹ thuật bổ sung hoặc các phát hiện bất thường..."
                    value={logData.notes}
                    onChange={(e) => { formVersion.current += 1; setLogData({ ...logData, notes: e.target.value }); }}
                    className="ruo-portal-input"
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Chi phí sửa chữa (VNĐ, không gồm linh kiện đã xuất kho)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    aria-label="Chi phí sửa chữa, không gồm linh kiện đã xuất kho"
                    title="Không nhập lại chi phí linh kiện đã được duyệt xuất kho."
                    value={logData.cost}
                    onChange={(e) => setLogData({ ...logData, cost: e.target.value })}
                    className="ruo-portal-input"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div className="ruo-drawer-footer">
                <button type="button" onClick={() => setShowLogModal(false)} className="laser-btn laser-btn-secondary" style={{ padding: '8px 16px' }}>Hủy Bỏ</button>
                <button type="submit" disabled={submitting} className="laser-btn laser-btn-primary" style={{ padding: '8px 20px', fontWeight: 700 }}>
                  {submitting ? 'Đang Lưu...' : 'Lưu Nhật Ký'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Outcome Modal */}
      {showOutcomeModal && selectedTask && (
        <div className="ruo-drawer-backdrop" onClick={() => setShowOutcomeModal(false)}>
          <div className="ruo-drawer-panel" style={{ width: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="ruo-drawer-header">
              <div>
                <h2 className="ruo-drawer-title">Báo Cáo Kết Quả Sửa Chữa</h2>
                <p className="ruo-drawer-subtitle">{selectedTask.ticket_code}</p>
              </div>
              <button onClick={() => setShowOutcomeModal(false)} className="ruo-drawer-close-btn"><Icons.X size={18} /></button>
            </div>

            <form onSubmit={handleOutcomeSubmit}>
              <div className="ruo-drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {(() => {
                  const modalPendingParts = (selectedTask?.parts_requests || []).filter((pr) => pr.status === 'pending');
                  if (modalPendingParts.length === 0) return null;
                  return (
                    <div
                      style={{
                        background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: 'var(--radius-md)',
                        padding: '10px 14px',
                        color: '#dc2626',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <Icons.AlertTriangle size={16} />
                      <span>Phiếu này đang có <strong>{modalPendingParts.length}</strong> yêu cầu linh kiện chờ Quản lý duyệt xuất kho. Vui lòng đợi duyệt trước khi gửi báo cáo kết quả!</span>
                    </div>
                  );
                })()}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', background: 'var(--surface-2)', border: '1px solid var(--border-focus)', borderRadius: 'var(--radius-sm)', padding: '8px 10px' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--ink-secondary)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Icons.Sparkles size={13} style={{ color: 'var(--laser-cyan)' }} />
                    <span>AI soạn ghi chú đối chiếu; KTV xác nhận kết quả thực tế</span>
                  </span>
                  <button
                    type="button"
                    disabled={aiLoading}
                    onClick={() => applyAiDraft('outcome')}
                    className="laser-btn laser-btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 700 }}
                  >
                    {aiLoading ? 'Đang Tính...' : 'Gợi Ý Kết Luận AI'}
                  </button>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '8px' }}>
                    Kết Luận Tình Trạng Thiết Bị *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    <div
                      onClick={() => setOutcomeData({ ...outcomeData, outcome: 'repaired' })}
                      style={{
                        border: outcomeData.outcome === 'repaired' ? '2px solid #10B981' : '1px solid var(--hairline-medium)',
                        background: outcomeData.outcome === 'repaired' ? 'rgba(16,185,129,0.15)' : 'var(--surface-panel)',
                        borderRadius: 'var(--radius-md)',
                        padding: '14px',
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#10B981' }}>Đã Khắc Phục Xong</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '4px' }}>Thiết bị hoạt động ổn định, sẵn sàng bàn giao</div>
                    </div>

                    <div
                      onClick={() => setOutcomeData({ ...outcomeData, outcome: 'unrepairable' })}
                      style={{
                        border: outcomeData.outcome === 'unrepairable' ? '2px solid #EF4444' : '1px solid var(--hairline-medium)',
                        background: outcomeData.outcome === 'unrepairable' ? 'rgba(239,68,68,0.15)' : 'var(--surface-panel)',
                        borderRadius: 'var(--radius-md)',
                        padding: '14px',
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#EF4444' }}>Không Thể Khắc Phục</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '4px' }}>Hỏng nghiêm trọng, đề xuất chuyển thanh lý</div>
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Ghi Chú Kết Luận Chi Tiết *
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="VD: Đã thay bóng đèn chiếu và vệ sinh thấu kính; kiểm tra chạy thử 30 phút đạt độ nét chuẩn..."
                    value={outcomeData.notes}
                    onChange={(e) => { formVersion.current += 1; setOutcomeData({ ...outcomeData, notes: e.target.value }); }}
                    className="ruo-portal-input"
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>
              </div>

              <div className="ruo-drawer-footer">
                <button type="button" onClick={() => setShowOutcomeModal(false)} className="laser-btn laser-btn-secondary" style={{ padding: '8px 16px' }}>Hủy Bỏ</button>
                <button
                  type="submit"
                  disabled={submitting || (selectedTask?.parts_requests || []).some((pr) => pr.status === 'pending')}
                  className="laser-btn laser-btn-primary"
                  style={{ padding: '8px 20px', fontWeight: 700, opacity: (selectedTask?.parts_requests || []).some((pr) => pr.status === 'pending') ? 0.5 : 1 }}
                >
                  {submitting ? 'Đang Báo Cáo...' : 'Xác Nhận & Gửi Báo Cáo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Yêu Cầu Linh Kiện Kho Gắn Liền Với Ticket */}
      {partModalTicket && (
        <div className="ruo-drawer-backdrop" onClick={() => setPartModalTicket(null)} style={{ zIndex: 1250 }}>
          <div
            className="ruo-drawer-panel"
            style={{ width: '480px', maxWidth: '95vw', padding: '24px', borderRadius: '16px', background: 'var(--surface-primary)', boxShadow: '0 16px 40px rgba(0,0,0,0.25)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: 'rgba(234,88,12,0.1)', color: '#ea580c' }}>
                    YÊU CẦU XUẤT KHO VẬT TƯ
                  </span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '12.5px', color: 'var(--blueprint-500)' }}>
                    {partModalTicket.ticket_code}
                  </span>
                </div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--ink-pure)' }}>
                  Xin Linh Kiện Sửa Thiết Bị
                </h3>
              </div>
              <button onClick={() => setPartModalTicket(null)} className="ruo-btn ruo-btn-ghost ruo-btn-sm" style={{ padding: '4px' }}>
                <Icons.X size={16} />
              </button>
            </div>

            {/* Thông tin ngữ cảnh phiếu */}
            <div style={{ background: 'var(--bg-app)', padding: '12px 14px', borderRadius: '8px', fontSize: '12.5px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '4px', border: '1px solid var(--border-subtle)' }}>
              <div><strong>Thiết bị:</strong> {partModalTicket.equipment_id?.name} ({partModalTicket.equipment_id?.code})</div>
              <div><strong>Vị trí:</strong> {partModalTicket.room_id?.code || 'Phòng học'} • <strong>Người báo:</strong> {partModalTicket.reported_by?.full_name}</div>
              <div style={{ color: 'var(--ink-muted)' }}><strong>Hiện tượng:</strong> {partModalTicket.incident_description}</div>
            </div>

            <form onSubmit={handleSubmitPartRequest} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--ink-secondary)' }}>
                  Chọn Linh Kiện Cần Xuất Từ Kho KHO-01: *
                </label>
                {loadingParts ? (
                  <div style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--ink-muted)', background: 'var(--bg-app)', borderRadius: '6px' }}>
                    ⏳ Đang nạp danh mục linh kiện kho...
                  </div>
                ) : (
                  <select
                    value={selectedPartId}
                    onChange={(e) => setSelectedPartId(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-default)', background: 'var(--surface-primary)', color: 'var(--ink-pure)', fontSize: '13px' }}
                  >
                    {availableParts.length === 0 ? (
                      <option value="">-- Không có linh kiện nào trong kho --</option>
                    ) : (
                      availableParts.map((p) => (
                        <option key={p._id} value={p._id}>
                          [{p.code}] {p.name} (Tồn kho: {p.stock} {p.unit || 'Cái'})
                        </option>
                      ))
                    )}
                  </select>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--ink-secondary)' }}>
                  Số Lượng Cần Xuất: *
                </label>
                <input
                  type="number"
                  min={1}
                  value={requestQty}
                  onChange={(e) => setRequestQty(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-default)', background: 'var(--surface-primary)', color: 'var(--ink-pure)', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--ink-secondary)' }}>
                  Lý Do Cần Thay Thế / Ghi Chú Kỹ Thuật:
                </label>
                <input
                  type="text"
                  placeholder="VD: Cháy tụ motor / hỏng remote cần thay thế"
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-default)', background: 'var(--surface-primary)', color: 'var(--ink-pure)', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setPartModalTicket(null)}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border-default)', background: 'transparent', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={submittingPartRequest || loadingParts || !selectedPartId}
                  className="laser-btn laser-btn-primary"
                  style={{ flex: 1.5, padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  {submittingPartRequest ? 'Đang Gửi...' : 'Gửi Tới Quản Lý CSVC'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Báo Trái Chuyên Môn / Xin Đổi KTV Gửi Quản Lý CSVC */}
      {reassignModalTask && (
        <div className="ruo-drawer-backdrop" onClick={() => setReassignModalTask(null)} style={{ zIndex: 1250 }}>
          <div
            className="ruo-drawer-panel"
            style={{ width: '500px', maxWidth: '95vw', padding: '24px', borderRadius: '16px', background: 'var(--surface-primary)', boxShadow: '0 16px 40px rgba(0,0,0,0.25)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: 'rgba(234,88,12,0.12)', color: '#ea580c' }}>
                    BÁO TRÁI CHUYÊN MÔN • CHAT QUẢN LÝ CSVC
                  </span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '12.5px', color: 'var(--blueprint-500)' }}>
                    {reassignModalTask.ticket_code}
                  </span>
                </div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--ink-pure)' }}>
                  Đề Nghị Quản Lý CSVC Đổi Kỹ Thuật Viên Đúng Chuyên Môn
                </h3>
              </div>
              <button onClick={() => setReassignModalTask(null)} className="ruo-btn ruo-btn-ghost ruo-btn-sm" style={{ padding: '4px' }}>
                <Icons.X size={16} />
              </button>
            </div>

            <div style={{ background: 'var(--bg-app)', padding: '12px 14px', borderRadius: '8px', fontSize: '12.5px', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '4px', border: '1px solid var(--border-subtle)' }}>
              <div><strong>Thiết bị:</strong> {reassignModalTask.equipment_id?.name} ({reassignModalTask.equipment_id?.code})</div>
              <div><strong>Hiện tượng:</strong> {reassignModalTask.incident_description}</div>
              <div><strong>Chuyên môn hiện tại của bạn:</strong> <span style={{ color: 'var(--laser-cyan)', fontWeight: 700 }}>{currentUser?.specialty_label || currentUser?.department || 'KTV CSVC'}</span></div>
            </div>

            <form onSubmit={handleSubmitReassignRequest} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--ink-muted)', marginBottom: '6px' }}>
                  Chọn nhanh lý do thực tế tại trường:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[
                    'Tổ Bảo vệ chỉ phụ trách bật/tắt điều hòa, công tắc đèn và mở cửa phòng; sự cố này hỏng phần cứng cần KTV chuyên sâu.',
                    'Sự cố thực tế tại hiện trường thuộc chuyên môn khác (Điện lạnh / Điện nguồn / CNTT - Âm thanh - Máy chiếu / Cơ khí).',
                    'Đang xử lý ca khẩn cấp khác tại tòa nhà, nhờ Quản lý CSVC điều phối KTV cùng chuyên môn hỗ trợ.'
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setReassignReason(preset)}
                      style={{
                        textAlign: 'left',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        border: reassignReason === preset ? '1px solid #ea580c' : '1px solid var(--border-default)',
                        background: reassignReason === preset ? 'rgba(234,88,12,0.08)' : 'var(--surface-secondary)',
                        color: 'var(--ink-pure)',
                        cursor: 'pointer'
                      }}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--ink-secondary)' }}>
                  Nội dung gửi Quản lý CSVC (đồng bộ vào Chat Phiếu & Chat Tác Nghiệp): *
                </label>
                <textarea
                  required
                  rows={3}
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  placeholder="Nhập lý do công việc chưa phù hợp chuyên môn để trao đổi với Quản lý CSVC..."
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-default)', background: 'var(--surface-primary)', color: 'var(--ink-pure)', fontSize: '13px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setReassignModalTask(null)}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border-default)', background: 'transparent', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={submittingReassign || !reassignReason.trim()}
                  className="laser-btn laser-btn-primary"
                  style={{ flex: 1.6, padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, background: '#ea580c', borderColor: '#ea580c' }}
                >
                  {submittingReassign ? 'Đang Gửi & Mở Chat...' : 'Gửi Yêu Cầu & Chat Với Quản Lý'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ticket Chat Drawer (Giảng viên ↔ Kỹ thuật viên) */}
      <TicketChatDrawer
        isOpen={Boolean(chatTicket)}
        onClose={() => setChatTicket(null)}
        ticket={chatTicket}
        onTicketUpdated={fetchTasks}
      />
    </div>
  );
};

export default TechnicianTasksPage;
