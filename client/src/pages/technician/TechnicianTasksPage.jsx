import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { repairApi } from '../../lib/api';

export const TechnicianTasksPage = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedTask, setSelectedTask] = useState(null);

  // Modals
  const [showLogModal, setShowLogModal] = useState(false);
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
      const res = await repairApi.list();
      if (res && res.success) {
        setTasks(res.repairs || []);
      }
    } catch (err) {
      toast.error('Lỗi khi tải danh sách nhiệm vụ: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

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
      const res = await repairApi.addLog(selectedTask._id, {
        action: logData.action.trim(),
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

  const filteredTasks = tasks.filter(t => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'TODO') return t.status === 'assigned';
    if (statusFilter === 'DOING') return t.status === 'in_progress';
    if (statusFilter === 'DONE') return ['resolved', 'unrepairable', 'closed'].includes(t.status);
    return true;
  });

  const countTodo = tasks.filter(t => t.status === 'assigned').length;
  const countDoing = tasks.filter(t => t.status === 'in_progress').length;
  const countDone = tasks.filter(t => ['resolved', 'unrepairable', 'closed'].includes(t.status)).length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', color: '#0EA5E9', background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.25)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>KỸ THUẬT VIÊN</span>
            <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>MODULE 04 • NHIỆM VỤ SỬA CHỮA & TIẾP NHẬN SLA</span>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Tổng nhiệm vụ được giao</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--ink-pure)', marginTop: '4px' }}>{tasks.length}</div>
        </div>
        <div style={{ background: 'var(--surface-card)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: '12px', color: 'var(--laser-cyan)', fontWeight: 600 }}>Cần tiếp nhận ngay</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--laser-cyan)', marginTop: '4px' }}>{countTodo}</div>
        </div>
        <div style={{ background: 'var(--surface-card)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: '12px', color: '#3B82F6', fontWeight: 600 }}>Đang thực hiện sửa chữa</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#3B82F6', marginTop: '4px' }}>{countDoing}</div>
        </div>
        <div style={{ background: 'var(--surface-card)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: '12px', color: '#10B981', fontWeight: 600 }}>Đã hoàn tất / Nghiệm thu</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#10B981', marginTop: '4px' }}>{countDone}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--hairline-medium)', marginBottom: '20px' }}>
        {[
          { key: 'ALL', label: `Tất Cả (${tasks.length})` },
          { key: 'TODO', label: `Cần Tiếp Nhận (${countTodo})` },
          { key: 'DOING', label: `Đang Làm (${countDoing})` },
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
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: isCritical ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)', color: isCritical ? '#EF4444' : '#F59E0B' }}>
                      Mức: {t.damage_level}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '12.5px', color: 'var(--ink-muted)', marginBottom: '10px' }}>
                    <div>Vị trí: <strong style={{ color: 'var(--ink-pure)' }}>{room.code} ({room.name})</strong></div>
                    <div>Hạn cam kết SLA: <strong style={{ color: isCritical ? '#EF4444' : 'var(--ink-pure)' }}>{t.deadline ? new Date(t.deadline).toLocaleString('vi-VN') : '—'}</strong></div>
                    <div>Người báo: <strong style={{ color: 'var(--ink-pure)' }}>{t.reported_by?.full_name || 'Giảng viên'}</strong></div>
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
                    onClick={() => setSelectedTask(t)}
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
                <div style={{ marginTop: '4px' }}>Mức độ hư hỏng: <strong>{selectedTask.damage_level}</strong></div>
                <div style={{ marginTop: '4px' }}>Phòng: <strong>{selectedTask.room_id?.code} - {selectedTask.room_id?.name}</strong></div>
              </div>

              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ink-muted)', fontWeight: 700, marginBottom: '6px' }}>
                  Nhật Ký Thao Tác Kỹ Thuật (Repair Logs)
                </div>
                {(!selectedTask.logs || selectedTask.logs.length === 0) ? (
                  <div style={{ padding: '16px', background: 'var(--surface-panel)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--ink-muted)', textAlign: 'center' }}>
                    Chưa có nhật ký ghi nhận cho nhiệm vụ này.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedTask.logs.map((log, idx) => (
                      <div key={idx} style={{ background: 'var(--surface-panel)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', fontSize: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ink-muted)', fontSize: '11px', marginBottom: '2px' }}>
                          <span>{log.logged_by?.full_name || 'Kỹ thuật viên'}</span>
                          <span>{new Date(log.created_at || Date.now()).toLocaleTimeString('vi-VN')}</span>
                        </div>
                        <div style={{ fontWeight: 600, color: 'var(--ink-pure)' }}>{log.action}</div>
                        {log.notes && <div style={{ color: 'var(--ink-secondary)', marginTop: '2px' }}>{log.notes}</div>}
                        {log.cost > 0 && <div style={{ color: '#10B981', marginTop: '2px' }}>Chi phí: {log.cost.toLocaleString('vi-VN')} đ</div>}
                      </div>
                    ))}
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
                    Chi Phí Phát Sinh Ngoài Dự Kiến (VNĐ, nếu có)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10000"
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
