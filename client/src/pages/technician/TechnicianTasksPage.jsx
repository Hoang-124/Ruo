import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { isSameUser } from '../../config/navigation';
import { repairApi } from '../../lib/api';
import { RepairStepper } from '../../components/repairs/RepairStepper';
import { DeadlineCountdown } from '../../components/repairs/DeadlineCountdown';

export const TechnicianTasksPage = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedTask, setSelectedTask] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const openTaskHistory = async (task) => {
    setSelectedTask(task);
    setLoadingDetail(true);
    try {
      const res = await repairApi.getById(task._id);
      if (res && res.repair) {
        setSelectedTask(res.repair);
      }
    } catch (_) {
      // Keep summary fallback if detail fetch fails
    } finally {
      setLoadingDetail(false);
    }
  };

  // Modals
  const [showLogModal, setShowLogModal] = useState(false);
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiByTask, setAiByTask] = useState({});

  const handleLoadTaskAi = async (task) => {
    if (!task?._id) return;
    try {
      setAiLoading(true);
      const res = await repairApi.aiCopilot(task._id);
      if (res && res.success && res.copilot) {
        setAiByTask((prev) => ({ ...prev, [task._id]: res.copilot }));
        toast.success(`AI Kỹ thuật đã chẩn đoán nhiệm vụ [${task.ticket_code}]!`);
      }
    } catch (err) {
      toast.error('Không thể chạy AI Chẩn đoán: ' + err.message);
    } finally {
      setAiLoading(false);
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

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const currentUserId = String(currentUser?._id || currentUser?.id || '');
      const res = await repairApi.list(
        currentUserId && currentUserId !== 'guest' ? { assigned_to: currentUserId } : {}
      );
      if (res && res.success) {
        setTasks((res.repairs || []).filter((r) => isSameUser(r.assigned_to, currentUser)));
      }
    } catch (err) {
      toast.error('Lỗi khi tải danh sách nhiệm vụ: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [currentUser?._id, currentUser?.id, currentUser?.code]);

  const handleAcceptTask = async (task) => {
    try {
      setSubmitting(true);
      const res = await repairApi.accept(task._id);
      if (res && res.success) {
        toast.success(`Đã tiếp nhận nhiệm vụ [${task.ticket_code}] thành công. Bắt đầu tính giờ thao tác!`);
        await fetchTasks();
      }
    } catch (err) {
      toast.error('Lỗi khi tiếp nhận nhiệm vụ: ' + err.message);
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
      toast.error('Vui lòng nhập hành động đã thực hiện.');
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
      toast.error('Lỗi khi ghi nhật ký: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openOutcomeModal = (task) => {
    setSelectedTask(task);
    setOutcomeData({
      outcome: 'repaired',
      notes: ''
    });
    setShowOutcomeModal(true);
  };

  const handleOutcomeSubmit = async (e) => {
    e.preventDefault();
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
      toast.error('Lỗi khi báo cáo kết quả: ' + err.message);
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
    if (statusFilter === 'OVERDUE') return !['resolved', 'unrepairable', 'closed'].includes(t.status) && t.deadline && new Date(t.deadline).getTime() < Date.now();
    if (statusFilter === 'DONE') return ['resolved', 'unrepairable', 'closed'].includes(t.status);
    return true;
  });

  const countTodo = tasks.filter(t => t.status === 'assigned').length;
  const countDoing = tasks.filter(t => t.status === 'in_progress').length;
  const countOverdue = tasks.filter(t => !['resolved', 'unrepairable', 'closed'].includes(t.status) && t.deadline && new Date(t.deadline).getTime() < Date.now()).length;
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

        <button
          onClick={fetchTasks}
          className="laser-btn laser-btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 16px', borderRadius: 'var(--radius-md)', fontSize: '13px' }}
        >
          <Icons.RefreshCw size={16} />
          <span>Làm Mới</span>
        </button>
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
          <div style={{ fontSize: '12px', color: '#EF4444', fontWeight: 700 }}>🚨 Quá hạn SLA (Khẩn)</div>
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
          { key: 'OVERDUE', label: `🚨 Quá Hạn SLA (${countOverdue})` },
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
                        onClick={() => openLogModal(t)}
                        className="laser-btn laser-btn-secondary"
                        style={{ padding: '8px 14px', fontSize: '12.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <Icons.Clock size={15} />
                        <span>Ghi Nhật Ký</span>
                      </button>

                      <button
                        onClick={() => openOutcomeModal(t)}
                        className="laser-btn laser-btn-primary"
                        style={{ padding: '8px 14px', fontSize: '12.5px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <Icons.Check size={16} />
                        <span>Báo Cáo Kết Quả</span>
                      </button>
                    </>
                  )}

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
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                      {cp.disposal_advisory?.should_consider_disposal && (
                        <div style={{ background: 'var(--status-danger-bg)', border: '1px solid var(--status-danger-border)', color: 'var(--status-danger-color)', padding: '8px 10px', borderRadius: 'var(--radius-sm)', fontWeight: 700 }}>
                          ⚠ {cp.disposal_advisory.recommendation}
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
                      {Array.isArray(cp.recommended_parts) && cp.recommended_parts.length > 0 && (
                        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', padding: '8px 10px' }}>
                          <div style={{ fontWeight: 800, color: 'var(--ink-pure)', marginBottom: '4px' }}>Vật tư thay thế cần mang theo (Kho KHO-01):</div>
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
                            <span>{new Date(log.timestamp || log.created_at || Date.now()).toLocaleString('vi-VN')}</span>
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
                    onClick={async () => {
                      let cp = aiByTask[selectedTask._id];
                      if (!cp) {
                        setAiLoading(true);
                        try {
                          const res = await repairApi.aiCopilot(selectedTask._id);
                          if (res?.success && res.copilot) {
                            cp = res.copilot;
                            setAiByTask((prev) => ({ ...prev, [selectedTask._id]: cp }));
                          }
                        } catch (err) {
                          toast.error('Lỗi gọi AI: ' + err.message);
                        } finally {
                          setAiLoading(false);
                        }
                      }
                      if (cp?.diagnosis) {
                        setLogData((prev) => ({
                          ...prev,
                          action: cp.diagnosis.suggested_log_action || prev.action,
                          notes: cp.diagnosis.suggested_log_notes || prev.notes
                        }));
                        toast.success('Đã điền mẫu nhật ký kỹ thuật từ AI!');
                      }
                    }}
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
                    onChange={(e) => setLogData({ ...logData, action: e.target.value })}
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
                    onChange={(e) => setLogData({ ...logData, notes: e.target.value })}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', background: 'var(--surface-2)', border: '1px solid var(--border-focus)', borderRadius: 'var(--radius-sm)', padding: '8px 10px' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--ink-secondary)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Icons.Sparkles size={13} style={{ color: 'var(--laser-cyan)' }} />
                    <span>AI gợi ý kết luận (đối chiếu ngưỡng R-ratio 60%)</span>
                  </span>
                  <button
                    type="button"
                    disabled={aiLoading}
                    onClick={async () => {
                      let cp = aiByTask[selectedTask._id];
                      if (!cp) {
                        setAiLoading(true);
                        try {
                          const res = await repairApi.aiCopilot(selectedTask._id);
                          if (res?.success && res.copilot) {
                            cp = res.copilot;
                            setAiByTask((prev) => ({ ...prev, [selectedTask._id]: cp }));
                          }
                        } catch (err) {
                          toast.error('Lỗi gọi AI: ' + err.message);
                        } finally {
                          setAiLoading(false);
                        }
                      }
                      if (cp?.diagnosis) {
                        setOutcomeData({
                          outcome: cp.diagnosis.suggested_outcome || 'repaired',
                          notes: cp.diagnosis.suggested_outcome_notes || ''
                        });
                        toast.success('Đã điền gợi ý kết luận nghiệm thu từ AI!');
                      }
                    }}
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
                    onChange={(e) => setOutcomeData({ ...outcomeData, notes: e.target.value })}
                    className="ruo-portal-input"
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>
              </div>

              <div className="ruo-drawer-footer">
                <button type="button" onClick={() => setShowOutcomeModal(false)} className="laser-btn laser-btn-secondary" style={{ padding: '8px 16px' }}>Hủy Bỏ</button>
                <button type="submit" disabled={submitting} className="laser-btn laser-btn-primary" style={{ padding: '8px 20px', fontWeight: 700 }}>
                  {submitting ? 'Đang Báo Cáo...' : 'Xác Nhận & Gửi Báo Cáo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicianTasksPage;
