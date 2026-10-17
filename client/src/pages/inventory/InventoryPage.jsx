import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { inventoryApi, masterDataApi } from '../../lib/api';

export const InventoryPage = () => {
  const { toast } = useToast();
  const { currentUser, hasPermission } = useAuth();
  const userRole = currentUser?.role || 'facility_manager';
  const canCreateOrReconcile = typeof hasPermission === 'function'
    ? (hasPermission('inventory:create') || hasPermission('inventory:reconcile'))
    : ['facility_manager', 'admin'].includes(userRole);

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [sessionLogs, setSessionLogs] = useState([]);
  const [rooms, setRooms] = useState([]);

  // Scan state (UC-3.10: Khớp / Thất lạc / Hỏng hóc / Sai vị trí phòng)
  const [scannedRoomId, setScannedRoomId] = useState('');
  const [qrInput, setQrInput] = useState('');
  const [scanMode, setScanMode] = useState('auto'); // 'auto' | 'damaged' | 'missing'
  const [damageNote, setDamageNote] = useState('');
  const [scanning, setScanning] = useState(false);

  // New Session Modal (UC-3.9)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [scopeType, setScopeType] = useState('building');
  const [scopeFloor, setScopeFloor] = useState('1');
  const [scopeRoomId, setScopeRoomId] = useState('');
  const [submittingSession, setSubmittingSession] = useState(false);

  // Export Report & Digital Signature Modal (UC-3.11)
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [exportingReport, setExportingReport] = useState(false);
  const [isDigitallySigned, setIsDigitallySigned] = useState(false);

  const fetchRooms = async () => {
    try {
      const res = await masterDataApi.getRooms({ limit: 100 });
      const roomList = res?.rooms || [];
      setRooms(roomList);
      if (roomList.length > 0 && !scannedRoomId) {
        setScannedRoomId(roomList[0]._id);
      }
      if (roomList.length > 0 && !scopeRoomId) {
        setScopeRoomId(roomList[0]._id);
      }
    } catch (err) {
      console.warn('Load rooms warning:', err.message);
    }
  };

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res = await inventoryApi.getSessions();
      const list = res?.data || res?.sessions || [];
      setSessions(list);
      if (list.length > 0) {
        loadSessionDetails(list[0]._id);
      } else {
        setActiveSession(null);
        setSessionLogs([]);
      }
    } catch (err) {
      toast.error('Lỗi khi tải các đợt kiểm kê: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSessionDetails = async (sessionId) => {
    try {
      const res = await inventoryApi.getSessionById(sessionId);
      if (res && res.success && res.data) {
        setActiveSession(res.data);
        setSessionLogs(res.data.logs || []);
      }
    } catch (err) {
      toast.error('Lỗi khi tải chi tiết đợt kiểm kê: ' + err.message);
    }
  };

  useEffect(() => {
    fetchRooms();
    fetchSessions();
  }, []);

  const handleCreateSessionSubmit = async (e) => {
    e.preventDefault();
    if (!newSessionName.trim()) {
      toast.error('Vui lòng nhập tên đợt kiểm kê.');
      return;
    }
    if (scopeType === 'room' && !scopeRoomId) {
      toast.error('Vui lòng chọn phòng/kho cần kiểm kê.');
      return;
    }

    try {
      setSubmittingSession(true);
      const payload = {
        name: newSessionName.trim(),
        scope_type: scopeType,
        ...(scopeType === 'floor' ? { scope_floor: Number(scopeFloor) } : {}),
        ...(scopeType === 'room' && scopeRoomId ? { scope_ids: [scopeRoomId] } : {})
      };
      const res = await inventoryApi.createSession(payload);

      if (res && res.success) {
        toast.success('Đã khởi tạo đợt kiểm kê mới thành công (UC-3.9)!');
        setShowCreateModal(false);
        setNewSessionName('');
        setScopeType('building');
        await fetchSessions();
      }
    } catch (err) {
      toast.error('Lỗi khi tạo đợt kiểm kê: ' + err.message);
    } finally {
      setSubmittingSession(false);
    }
  };

  const handleScanSubmit = async (e) => {
    e.preventDefault();
    if (!qrInput.trim()) {
      toast.error('Vui lòng quét hoặc nhập mã QR thiết bị.');
      return;
    }
    if (!activeSession) {
      toast.error('Vui lòng chọn hoặc tạo đợt kiểm kê đang hoạt động.');
      return;
    }

    try {
      setScanning(true);
      const res = await inventoryApi.scanInRoom(activeSession._id, {
        qr_code: qrInput.trim(),
        scanned_room_id: scannedRoomId,
        is_damaged: scanMode === 'damaged',
        is_missing: scanMode === 'missing',
        damage_note: damageNote.trim(),
        note: damageNote.trim()
      });

      if (res && res.success) {
        const log = res.log || res.data || {};
        if (log.status === 'matched') {
          toast.success(`[KHỚP VỊ TRÍ] Thiết bị khớp đúng phòng kiểm kê!`);
        } else if (log.status === 'wrong_location') {
          toast.warning(`[SAI VỊ TRÍ PHÒNG] Thiết bị thuộc phòng khác nhưng được tìm thấy tại phòng này!`);
        } else if (log.status === 'damaged') {
          toast.error(`[HỎNG HÓC] Đã ghi nhận hỏng và tự động tạo phiếu sửa chữa!`);
        } else if (log.status === 'missing') {
          toast.warning(`[THẤT LẠC] Đã ghi nhận thiết bị vắng mặt / thất lạc tại phòng!`);
        }
        setQrInput('');
        setScanMode('auto');
        setDamageNote('');
        await loadSessionDetails(activeSession._id);
      }
    } catch (err) {
      toast.error('Lỗi khi kiểm kê thiết bị: ' + err.message);
    } finally {
      setScanning(false);
    }
  };

  const handleReconcile = async () => {
    if (!activeSession) return;
    try {
      const res = await inventoryApi.reconcile(activeSession._id);
      if (res && res.success) {
        toast.success(res.message || 'Đã chốt đối soát số liệu kiểm kê thành công!');
        await loadSessionDetails(activeSession._id);
        await fetchSessions();
      }
    } catch (err) {
      toast.error('Lỗi khi chốt kiểm kê: ' + err.message);
    }
  };

  // UC-3.11: Export Inventory Report with Digital Signature
  const handleOpenExportReport = async () => {
    if (!activeSession) return;
    try {
      setExportingReport(true);
      const res = await inventoryApi.exportReport(activeSession._id);
      if (res && res.success && res.report) {
        setReportData(res.report);
        setIsDigitallySigned(true);
        setShowReportModal(true);
        toast.success(res.message || 'Đã tổng hợp Biên bản kiểm kê & chữ ký số SHA-256!');
      }
    } catch (err) {
      toast.error('Không thể xuất biên bản kiểm kê: ' + err.message);
    } finally {
      setExportingReport(false);
    }
  };

  const handleDownloadCsvReport = () => {
    if (!reportData) return;
    const allItems = [
      ...(reportData.categories?.matched_items || []),
      ...(reportData.categories?.wrong_location_items || []),
      ...(reportData.categories?.missing_items || []),
      ...(reportData.categories?.damaged_items || [])
    ];

    const statusLabelMap = {
      matched: 'Khớp đúng vị trí',
      wrong_location: 'Thừa / Sai vị trí phòng',
      missing: 'Thiếu / Thất lạc',
      damaged: 'Hỏng hóc tại chỗ'
    };

    const rows = [
      ['Mã Biên Bản', reportData.report_code],
      ['Đợt Kiểm Kê', reportData.session?.name || ''],
      ['Tòa Nhà', reportData.building],
      ['Chữ Ký Số SHA-256', reportData.digital_signature?.hash || ''],
      [],
      ['Mã Tài Sản', 'Tên Thiết Bị', 'Phòng Quy Định', 'Phòng Quét Thực Tế', 'Kết Quả Đối Soát', 'Người Kiểm Kê', 'Ghi Chú']
    ];

    allItems.forEach((it) => {
      rows.push([
        it.code,
        `"${(it.name || '').replace(/"/g, '""')}"`,
        `"${it.expected_room}"`,
        `"${it.scanned_room}"`,
        statusLabelMap[it.status] || it.status,
        `"${it.scanned_by}"`,
        `"${(it.note || '').replace(/"/g, '""')}"`
      ]);
    });

    const csv = '\uFEFF' + rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportData.report_code}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Đã tải xuống tệp CSV biên bản kiểm kê [${reportData.report_code}.csv]!`);
  };

  const [activeLogTab, setActiveLogTab] = useState('scanned'); // 'scanned' | 'unscanned'

  const handleQuickScanFromChecklist = async (eq, mode = 'auto') => {
    if (!activeSession) return;
    const targetRoomId = eq.room_id?._id || eq.room_id || scannedRoomId;
    try {
      setScanning(true);
      const res = await inventoryApi.scanInRoom(activeSession._id, {
        qr_code: eq.qr_code || eq.code,
        scanned_room_id: targetRoomId,
        is_damaged: mode === 'damaged',
        is_missing: mode === 'missing',
        damage_note: mode === 'damaged' ? 'Phát hiện hư hỏng trực tiếp khi đối soát sổ sách' : '',
        note: mode === 'missing' ? 'Xác nhận vắng mặt trên danh mục sổ sách' : 'Quét đối soát nhanh từ danh mục sổ sách'
      });
      if (res && res.success) {
        if (res.warning) {
          toast.warning(res.warning);
        } else if (mode === 'missing') {
          toast.warning(`[THẤT LẠC] Đã đánh dấu thiếu thiết bị [${eq.code}]!`);
        } else if (mode === 'damaged') {
          toast.error(`[HỎNG HÓC] Đã ghi nhận hỏng [${eq.code}] & tự tạo phiếu sửa chữa!`);
        } else {
          toast.success(`[KHỚP VỊ TRÍ] Đã đối soát khớp [${eq.code}]!`);
        }
        await loadSessionDetails(activeSession._id);
      }
    } catch (err) {
      toast.error('Lỗi khi quét nhanh: ' + err.message);
    } finally {
      setScanning(false);
    }
  };

  // Live summary counts from sessionLogs
  const matchedCount = sessionLogs.filter((l) => l.status === 'matched').length;
  const wrongLocCount = sessionLogs.filter((l) => l.status === 'wrong_location').length;
  const missingCount = sessionLogs.filter((l) => l.status === 'missing').length;
  const damagedCount = sessionLogs.filter((l) => l.status === 'damaged').length;

  const expectedEquipments = activeSession?.expected_equipments || [];
  const unscannedEquipments = activeSession?.unscanned_equipments || [];
  const sessionProgress = activeSession?.progress || {
    expected_count: expectedEquipments.length,
    scanned_count: sessionLogs.length,
    unscanned_count: unscannedEquipments.length,
    completion_percent: expectedEquipments.length > 0
      ? Math.min(100, Math.round((sessionLogs.length / expectedEquipments.length) * 100))
      : 100
  };
  const isSessionLocked = activeSession && (activeSession.status === 'reconciled' || activeSession.status === 'completed');

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', color: '#FFFFFF', background: '#1D4ED8', border: '1.5px solid #1E3A8A', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
              MODULE 05 • UC-3.9, UC-3.10, UC-3.11
            </span>
            <span style={{ fontSize: '12px', color: 'var(--ink-secondary)', fontWeight: 700 }}>
              KIỂM KÊ ĐỊNH KỲ TÒA A1, QUÉT MÃ QR ĐỐI SOÁT &amp; BIÊN BẢN KÝ SỐ
            </span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink-pure)', letterSpacing: '-0.02em', margin: 0 }}>
            Kiểm Kê CSVC &amp; Đối Soát Mã QR Thực Địa (Tòa Nhà A1)
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '13.5px', color: 'var(--ink-secondary)', fontWeight: 500 }}>
            Khởi tạo đợt kiểm kê theo phòng/tầng, quét QR đối soát 4 trạng thái (Khớp / Sai phòng / Hỏng hóc / Thất lạc) và xuất biên bản ký số PDF.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {activeSession && (
            <button
              onClick={handleOpenExportReport}
              disabled={exportingReport}
              className="laser-btn laser-btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                fontWeight: 800,
                color: 'var(--status-info-color)',
                border: '1.5px solid var(--status-info-border)',
                background: 'var(--status-info-bg)'
              }}
            >
              <Icons.Download size={16} />
              <span>{exportingReport ? 'Đang Xuất...' : 'Xuất Biên Bản & Ký Số PDF (UC-3.11)'}</span>
            </button>
          )}

          {canCreateOrReconcile && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="laser-btn laser-btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 18px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 800 }}
            >
              <Icons.Plus size={16} />
              <span>Tạo Đợt Kiểm Kê Mới (UC-3.9)</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Sessions Sidebar + Active Session Workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(0, 2.5fr)', gap: '20px', alignItems: 'start' }}>
        {/* Left: Sessions List */}
        <div style={{ background: 'var(--surface-card)', border: '1.5px solid var(--border-strong)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1.5px solid var(--border-strong)', background: 'var(--surface-header)' }}>
            <h3 style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--ink-pure)', margin: 0 }}>
              Các Đợt Kiểm Kê Tòa A1 ({sessions.length})
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {sessions.map((s) => {
              const isSelected = activeSession && activeSession._id === s._id;
              const isReconciled = s.status === 'reconciled' || s.status === 'completed';

              return (
                <div
                  key={s._id}
                  onClick={() => loadSessionDetails(s._id)}
                  style={{
                    padding: '14px 18px',
                    borderBottom: '1px solid var(--border-default)',
                    cursor: 'pointer',
                    background: isSelected ? 'var(--status-info-bg)' : 'transparent',
                    borderLeft: isSelected ? '4px solid var(--laser-cyan)' : '4px solid transparent'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px', gap: '8px' }}>
                    <strong style={{ fontSize: '13.5px', color: 'var(--ink-pure)', fontWeight: 800 }}>{s.name}</strong>
                    <span style={{ fontSize: '10.5px', fontWeight: 800, padding: '2px 7px', borderRadius: '4px', border: `1.5px solid ${isReconciled ? 'var(--status-success-border)' : 'var(--status-warning-border)'}`, background: isReconciled ? 'var(--status-success-bg)' : 'var(--status-warning-bg)', color: isReconciled ? 'var(--status-success-color)' : 'var(--status-warning-color)', whiteSpace: 'nowrap' }}>
                      {isReconciled ? 'Đã Chốt Sổ' : 'Đang Kiểm'}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--ink-secondary)', fontWeight: 500 }}>
                    Phạm vi: <strong>{s.scope_type === 'floor' ? `Tầng ${s.scope_floor}` : s.scope_type === 'room' ? 'Theo Phòng' : 'Toàn Tòa A1'}</strong> • Ngày: {new Date(s.date || s.created_at).toLocaleDateString('vi-VN')}
                  </div>
                </div>
              );
            })}

            {sessions.length === 0 && (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ink-secondary)', fontSize: '12.5px', fontWeight: 600 }}>
                Chưa có đợt kiểm kê nào. Nhấn "Tạo Đợt Kiểm Kê Mới" để bắt đầu.
              </div>
            )}
          </div>
        </div>

        {/* Right: Active Session Workspace */}
        {activeSession ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Session Info Banner + Progress + 4 Reconciliation KPIs */}
            <div style={{ background: 'var(--surface-card)', border: '1.5px solid var(--border-strong)', borderRadius: 'var(--radius-lg)', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <h2 style={{ fontSize: '19px', fontWeight: 800, color: 'var(--ink-pure)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {!isSessionLocked && <span className="ruo-live-dot" style={{ color: 'var(--status-warning-color)' }} />}
                    <span>{activeSession.name}</span>
                  </h2>
                  <div style={{ fontSize: '13px', color: 'var(--ink-secondary)', marginTop: '4px', fontWeight: 600 }}>
                    Trạng thái: <strong style={{ color: isSessionLocked ? 'var(--status-success-color)' : 'var(--status-warning-color)' }}>{isSessionLocked ? 'ĐÃ CHỐT ĐỐI SOÁT' : 'ĐANG KIỂM KÊ THỰC ĐỊA'}</strong> • Phạm vi:{' '}
                    <strong>
                      {activeSession.scope_type === 'floor'
                        ? `Tầng ${activeSession.scope_floor} — Tòa A1`
                        : activeSession.scope_type === 'room'
                          ? 'Theo Phòng học Tòa A1'
                          : 'Toàn bộ Tòa nhà Đa năng A1'}
                    </strong>{' '}
                    • Đã quét: <strong>{sessionLogs.length}</strong> / <strong>{sessionProgress.expected_count || sessionLogs.length}</strong> tài sản sổ sách
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleOpenExportReport}
                    disabled={exportingReport}
                    className="laser-btn laser-btn-secondary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '12.5px', fontWeight: 800, color: 'var(--status-info-color)', background: 'var(--status-info-bg)', border: '1.5px solid var(--status-info-border)' }}
                  >
                    <Icons.Download size={15} />
                    <span>Xuất Biên Bản (UC-3.11)</span>
                  </button>

                  {canCreateOrReconcile && !isSessionLocked && (
                    <button
                      onClick={handleReconcile}
                      className="laser-btn laser-btn-primary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: 'var(--radius-md)', fontWeight: 800, fontSize: '12.5px' }}
                    >
                      <Icons.CheckCircle size={15} />
                      <span>Chốt Số Liệu Đối Soát</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Audit Completion Progress Bar */}
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-default)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  <span style={{ color: 'var(--ink-primary)' }}>
                    Tiến độ kiểm kê đối soát sổ sách: <strong>{sessionProgress.scanned_count}</strong> đã quét • <strong style={{ color: unscannedEquipments.length > 0 ? 'var(--status-warning-color)' : 'var(--status-success-color)' }}>{unscannedEquipments.length}</strong> chưa quét
                  </span>
                  <span style={{ color: 'var(--laser-cyan)', fontWeight: 800 }}>{sessionProgress.completion_percent}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'var(--surface-3)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    className="ruo-progress-bar-animated"
                    style={{
                      width: `${sessionProgress.completion_percent}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #1D4ED8 0%, #059669 100%)',
                      transition: 'width 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                  />
                </div>
              </div>

              {/* 4 Reconciliation Buckets Summary */}
              <div className="ruo-stagger-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                <div className="ruo-motion-card" style={{ background: 'var(--status-success-bg)', border: '1.5px solid var(--status-success-border)', borderTop: '4px solid #059669', borderRadius: '8px', padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11.5px', color: 'var(--status-success-color)', fontWeight: 800 }}>1. Khớp Đúng Phòng</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--status-success-color)' }}>{matchedCount}</div>
                </div>
                <div className="ruo-motion-card" style={{ background: 'var(--status-warning-bg)', border: '1.5px solid var(--status-warning-border)', borderTop: '4px solid #D97706', borderRadius: '8px', padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11.5px', color: 'var(--status-warning-color)', fontWeight: 800 }}>2. Thừa / Sai Vị Trí</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--status-warning-color)' }}>{wrongLocCount}</div>
                </div>
                <div className="ruo-motion-card" style={{ background: 'var(--status-purple-bg)', border: '1.5px solid var(--status-purple-border)', borderTop: '4px solid #7C3AED', borderRadius: '8px', padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11.5px', color: 'var(--status-purple-color)', fontWeight: 800 }}>3. Thiếu / Thất Lạc</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--status-purple-color)' }}>{missingCount}</div>
                </div>
                <div className="ruo-motion-card" style={{ background: 'var(--status-danger-bg)', border: '1.5px solid var(--status-danger-border)', borderTop: '4px solid #DC2626', borderRadius: '8px', padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11.5px', color: 'var(--status-danger-color)', fontWeight: 800 }}>4. Hỏng Hóc Thực Địa</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--status-danger-color)' }}>{damagedCount}</div>
                </div>
              </div>
            </div>

            {/* Locked Session Banner OR Field Scanner Toolbar (UC-3.10) */}
            {isSessionLocked ? (
              <div style={{ background: 'var(--status-success-bg)', border: '2px solid var(--status-success-border)', borderRadius: 'var(--radius-lg)', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--status-success-color)', fontWeight: 800, fontSize: '13.5px' }}>
                  <Icons.Shield size={20} />
                  <span>PHIÊN KIỂM KÊ ĐÃ CHỐT SỔ ĐỐI SOÁT — Đã khóa chức năng quét thêm để bảo toàn tính toàn vẹn của Biên bản ký số SHA-256.</span>
                </div>
              </div>
            ) : (
              <div style={{ background: 'var(--surface-card)', border: '2px solid var(--laser-cyan)', borderRadius: 'var(--radius-lg)', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
                <h3 style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--ink-pure)', margin: '0 0 14px' }}>
                  Quét Mã QR Đối Soát Thực Địa Tại Phòng (UC-3.10)
                </h3>

                <form onSubmit={handleScanSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) minmax(240px, 1.5fr)', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, marginBottom: '4px', color: 'var(--ink-primary)' }}>
                        Phòng Học Đang Đứng Kiểm Kê (Tòa A1):
                      </label>
                      <select
                        value={scannedRoomId}
                        onChange={(e) => setScannedRoomId(e.target.value)}
                        className="ruo-portal-input"
                        style={{ width: '100%', height: '38px', fontSize: '13px', fontWeight: 600 }}
                      >
                        {rooms.map((r) => (
                          <option key={r._id} value={r._id}>{r.code} - {r.name} (Tầng {r.floor})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, marginBottom: '4px', color: 'var(--ink-primary)' }}>
                        Mã QR / Mã Thiết Bị Cần Quét Đối Soát:
                      </label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          required
                          placeholder="Quét tem QR hoặc nhập mã thiết bị (VD: EQ-2026-001)..."
                          value={qrInput}
                          onChange={(e) => setQrInput(e.target.value)}
                          className="ruo-portal-input"
                          style={{ flex: 1, height: '38px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                        />
                        <button
                          type="submit"
                          disabled={scanning}
                          className="laser-btn laser-btn-primary"
                          style={{ padding: '0 18px', height: '38px', fontWeight: 800 }}
                        >
                          {scanning ? 'Đang Ghi...' : 'Quét Đối Soát'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Reconciliation Mode Selector: Auto (Matched/Wrong Room) vs Damaged vs Missing */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', background: 'var(--surface-2)', border: '1px solid var(--border-default)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--ink-primary)' }}>Chế độ ghi nhận:</span>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12.5px', color: 'var(--status-success-color)', fontWeight: 800 }}>
                      <input type="radio" name="scanMode" checked={scanMode === 'auto'} onChange={() => setScanMode('auto')} />
                      <span>Tự động đối soát (Khớp / Sai phòng)</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12.5px', color: 'var(--status-danger-color)', fontWeight: 800 }}>
                      <input type="radio" name="scanMode" checked={scanMode === 'damaged'} onChange={() => setScanMode('damaged')} />
                      <span>Báo Hỏng Hóc (Tự động mở phiếu sửa chữa)</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12.5px', color: 'var(--status-purple-color)', fontWeight: 800 }}>
                      <input type="radio" name="scanMode" checked={scanMode === 'missing'} onChange={() => setScanMode('missing')} />
                      <span>Báo Thất Lạc / Không Tìm Thấy</span>
                    </label>

                    {scanMode !== 'auto' && (
                      <input
                        type="text"
                        placeholder={scanMode === 'damaged' ? 'Mô tả tình trạng hư hỏng...' : 'Ghi chú thất lạc / vắng mặt...'}
                        value={damageNote}
                        onChange={(e) => setDamageNote(e.target.value)}
                        className="ruo-portal-input"
                        style={{ flex: '1 1 220px', height: '34px', fontSize: '12px' }}
                      />
                    )}
                  </div>
                </form>
              </div>
            )}

            {/* Tabbed Card: Scanned Logs vs Unscanned Expected Checklist */}
            <div style={{ background: 'var(--surface-card)', border: '1.5px solid var(--border-strong)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ padding: '12px 18px', borderBottom: '1.5px solid var(--border-strong)', background: 'var(--surface-header)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveLogTab('scanned')}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '6px',
                      fontSize: '12.5px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      border: activeLogTab === 'scanned' ? '1.5px solid #1E3A8A' : '1.5px solid var(--border-strong)',
                      background: activeLogTab === 'scanned' ? '#1D4ED8' : 'var(--surface-card)',
                      color: activeLogTab === 'scanned' ? '#FFFFFF' : 'var(--ink-secondary)'
                    }}
                  >
                    Nhật Ký Đã Quét Thực Tế ({sessionLogs.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveLogTab('unscanned')}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '6px',
                      fontSize: '12.5px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      border: activeLogTab === 'unscanned' ? '1.5px solid #92400E' : '1.5px solid var(--border-strong)',
                      background: activeLogTab === 'unscanned' ? '#D97706' : 'var(--surface-card)',
                      color: activeLogTab === 'unscanned' ? '#FFFFFF' : 'var(--ink-secondary)'
                    }}
                  >
                    Danh Sách Sổ Sách Chưa Quét ({unscannedEquipments.length})
                  </button>
                </div>
              </div>

              {activeLogTab === 'scanned' ? (
                sessionLogs.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ink-secondary)', fontSize: '13px', fontWeight: 600 }}>
                    Chưa có lượt quét nào trong đợt kiểm kê này. Bạn có thể quét mã QR ở trên hoặc chuyển sang tab "Danh Sách Sổ Sách Chưa Quét" để đối soát nhanh.
                  </div>
                ) : (
                  <table className="ruo-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: 'var(--surface-header)', borderBottom: '2px solid var(--border-strong)' }}>
                        <th style={{ padding: '12px 16px', color: 'var(--ink-pure)', fontWeight: 800 }}>Mã QR / Thiết Bị</th>
                        <th style={{ padding: '12px 16px', color: 'var(--ink-pure)', fontWeight: 800 }}>Phòng Quy Định</th>
                        <th style={{ padding: '12px 16px', color: 'var(--ink-pure)', fontWeight: 800 }}>Phòng Quét Thực Tế</th>
                        <th style={{ padding: '12px 16px', color: 'var(--ink-pure)', fontWeight: 800 }}>Kết Quả Đối Soát</th>
                        <th style={{ padding: '12px 16px', color: 'var(--ink-pure)', fontWeight: 800 }}>Thời Điểm Quét</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessionLogs.map((l) => {
                        const eq = l.equipment_id || {};
                        const isMatched = l.status === 'matched';
                        const isWrong = l.status === 'wrong_location';
                        const isMissing = l.status === 'missing';

                        const badgeBg = isMatched
                          ? 'var(--status-success-bg)'
                          : isWrong
                            ? 'var(--status-warning-bg)'
                            : isMissing
                              ? 'var(--status-purple-bg)'
                              : 'var(--status-danger-bg)';
                        const badgeColor = isMatched
                          ? 'var(--status-success-color)'
                          : isWrong
                            ? 'var(--status-warning-color)'
                            : isMissing
                              ? 'var(--status-purple-color)'
                              : 'var(--status-danger-color)';
                        const badgeBorder = isMatched
                          ? 'var(--status-success-border)'
                          : isWrong
                            ? 'var(--status-warning-border)'
                            : isMissing
                              ? 'var(--status-purple-border)'
                              : 'var(--status-danger-border)';
                        const badgeLabel = isMatched
                          ? 'Khớp Đúng Vị Trí'
                          : isWrong
                            ? 'Thừa / Sai Phòng'
                            : isMissing
                              ? 'Thiếu / Thất Lạc'
                              : 'Hỏng Hóc Tại Chỗ';

                        return (
                          <tr key={l._id} style={{ borderBottom: '1px solid var(--border-default)' }}>
                            <td style={{ padding: '11px 16px' }}>
                              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--laser-cyan)' }}>{eq.code || l.qr_code}</div>
                              <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--ink-pure)' }}>{eq.name}</div>
                            </td>
                            <td style={{ padding: '11px 16px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--ink-secondary)', fontWeight: 700 }}>
                              {eq.room_id?.code || 'Kho dự phòng'}
                            </td>
                            <td style={{ padding: '11px 16px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--ink-pure)', fontWeight: 800 }}>
                              {l.scanned_room_id?.code || 'Phòng A1'}
                            </td>
                            <td style={{ padding: '11px 16px' }}>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  padding: '3px 9px',
                                  borderRadius: '6px',
                                  background: badgeBg,
                                  color: badgeColor,
                                  border: `1.5px solid ${badgeBorder}`
                                }}
                              >
                                {badgeLabel}
                              </span>
                              {l.note && (
                                <div style={{ fontSize: '11px', color: 'var(--ink-secondary)', marginTop: '3px', fontWeight: 500 }}>
                                  {l.note}
                                </div>
                              )}
                              {l.repair_id && (
                                <div style={{ fontSize: '11px', color: 'var(--status-danger-color)', fontWeight: 800, marginTop: '2px' }}>
                                  Tự tạo phiếu: {l.repair_id.ticket_code}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '11px 16px', fontSize: '12px', color: 'var(--ink-secondary)', fontWeight: 600 }}>
                              {new Date(l.scanned_at).toLocaleTimeString('vi-VN')} ({new Date(l.scanned_at).toLocaleDateString('vi-VN')})
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )
              ) : unscannedEquipments.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--status-success-color)', fontSize: '13.5px', fontWeight: 800 }}>
                  ✔ Toàn bộ thiết bị trên sổ sách trong phạm vi kiểm kê đã được quét đối soát đầy đủ!
                </div>
              ) : (
                <table className="ruo-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-header)', borderBottom: '2px solid var(--border-strong)' }}>
                      <th style={{ padding: '12px 16px', color: 'var(--ink-pure)', fontWeight: 800 }}>Mã Tài Sản / QR</th>
                      <th style={{ padding: '12px 16px', color: 'var(--ink-pure)', fontWeight: 800 }}>Tên Thiết Bị</th>
                      <th style={{ padding: '12px 16px', color: 'var(--ink-pure)', fontWeight: 800 }}>Phòng Sổ Sách</th>
                      <th style={{ padding: '12px 16px', color: 'var(--ink-pure)', fontWeight: 800 }}>Trạng Thái Sổ Sách</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--ink-pure)', fontWeight: 800 }}>Thao Tác Đối Soát Nhanh</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unscannedEquipments.map((eq) => (
                      <tr key={eq._id} style={{ borderBottom: '1px solid var(--border-default)' }}>
                        <td style={{ padding: '10px 16px' }}>
                          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--laser-cyan)' }}>{eq.code}</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--ink-secondary)', fontWeight: 600 }}>{eq.qr_code || `QR-${eq.code}`}</div>
                        </td>
                        <td style={{ padding: '10px 16px', fontWeight: 700, color: 'var(--ink-pure)' }}>{eq.name}</td>
                        <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--ink-pure)' }}>
                          {eq.room_id?.code || 'Kho dự phòng'}
                        </td>
                        <td style={{ padding: '10px 16px', color: 'var(--ink-secondary)', fontWeight: 700 }}>{eq.status}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                          {!isSessionLocked && (
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              <button
                                type="button"
                                disabled={scanning}
                                onClick={() => handleQuickScanFromChecklist(eq, 'auto')}
                                style={{ padding: '5px 10px', borderRadius: '6px', background: 'var(--status-success-bg)', border: '1.5px solid var(--status-success-border)', color: 'var(--status-success-color)', fontWeight: 800, fontSize: '11.5px', cursor: 'pointer' }}
                              >
                                ✔ Quét Khớp
                              </button>
                              <button
                                type="button"
                                disabled={scanning}
                                onClick={() => handleQuickScanFromChecklist(eq, 'damaged')}
                                style={{ padding: '5px 10px', borderRadius: '6px', background: 'var(--status-danger-bg)', border: '1.5px solid var(--status-danger-border)', color: 'var(--status-danger-color)', fontWeight: 800, fontSize: '11.5px', cursor: 'pointer' }}
                              >
                                ⚠ Báo Hỏng
                              </button>
                              <button
                                type="button"
                                disabled={scanning}
                                onClick={() => handleQuickScanFromChecklist(eq, 'missing')}
                                style={{ padding: '5px 10px', borderRadius: '6px', background: 'var(--status-purple-bg)', border: '1.5px solid var(--status-purple-border)', color: 'var(--status-purple-color)', fontWeight: 800, fontSize: '11.5px', cursor: 'pointer' }}
                              >
                                ✖ Báo Thiếu
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : (
          <div style={{ background: 'var(--surface-card)', border: '1.5px solid var(--border-strong)', borderRadius: 'var(--radius-lg)', padding: '60px 20px', textAlign: 'center', color: 'var(--ink-secondary)', fontWeight: 600 }}>
            Chọn một đợt kiểm kê ở danh sách bên trái hoặc tạo đợt kiểm kê mới.
          </div>
        )}
      </div>

      {/* Modal: Create Session (UC-3.9) */}
      {showCreateModal && (
        <div className="ruo-drawer-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="ruo-drawer-panel" style={{ width: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="ruo-drawer-header">
              <div>
                <h2 className="ruo-drawer-title">Khởi Tạo Đợt Kiểm Kê Định Kỳ (UC-3.9)</h2>
                <p className="ruo-drawer-subtitle">Thiết lập đợt kiểm tra đối soát tài sản theo phòng hoặc toàn tầng Tòa A1</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="ruo-drawer-close-btn"><Icons.X size={18} /></button>
            </div>

            <form onSubmit={handleCreateSessionSubmit}>
              <div className="ruo-drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, marginBottom: '6px' }}>
                    Tên Đợt Kiểm Kê *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Kiểm kê định kỳ thiết bị Tòa A1 Học kỳ 1 2026-2027"
                    value={newSessionName}
                    onChange={(e) => setNewSessionName(e.target.value)}
                    className="ruo-portal-input"
                    style={{ width: '100%', height: '38px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, marginBottom: '6px' }}>
                    Phạm Vi Kiểm Kê Trong Tòa Nhà A1 *
                  </label>
                  <select
                    value={scopeType}
                    onChange={(e) => setScopeType(e.target.value)}
                    className="ruo-portal-input"
                    style={{ width: '100%', height: '38px' }}
                  >
                    <option value="building">Toàn bộ Tòa nhà Đa năng A1 (7 tầng)</option>
                    <option value="floor">Theo Tầng cụ thể trong Tòa A1 (Tầng 1 – 7)</option>
                    <option value="room">Theo Phòng học / Kho cụ thể trong Tòa A1</option>
                  </select>
                </div>

                {scopeType === 'floor' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, marginBottom: '6px' }}>
                      Chọn Tầng Kiểm Kê (Tòa A1) *
                    </label>
                    <select
                      value={scopeFloor}
                      onChange={(e) => setScopeFloor(e.target.value)}
                      className="ruo-portal-input"
                      style={{ width: '100%', height: '38px' }}
                    >
                      {[1, 2, 3, 4, 5, 6, 7].map((fl) => (
                        <option key={fl} value={String(fl)}>Tầng {fl} — Tòa nhà Đa năng A1</option>
                      ))}
                    </select>
                  </div>
                )}

                {scopeType === 'room' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, marginBottom: '6px' }}>
                      Chọn Phòng Học / Kho (Tòa A1) *
                    </label>
                    <select
                      value={scopeRoomId}
                      onChange={(e) => setScopeRoomId(e.target.value)}
                      className="ruo-portal-input"
                      style={{ width: '100%', height: '38px' }}
                    >
                      {rooms.map((r) => (
                        <option key={r._id} value={r._id}>{r.code} — {r.name} (Tầng {r.floor})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="ruo-drawer-footer">
                <button type="button" onClick={() => setShowCreateModal(false)} className="laser-btn laser-btn-secondary" style={{ padding: '8px 16px', fontWeight: 700 }}>Hủy Bỏ</button>
                <button type="submit" disabled={submittingSession} className="laser-btn laser-btn-primary" style={{ padding: '8px 20px', fontWeight: 800 }}>
                  {submittingSession ? 'Đang Khởi Tạo...' : 'Tạo Đợt Kiểm Kê'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Export Inventory Report & Digital Signature (UC-3.11) */}
      {showReportModal && reportData && (
        <div className="ruo-drawer-backdrop" onClick={() => setShowReportModal(false)}>
          <div className="ruo-drawer-panel" style={{ width: '880px', maxWidth: '96vw' }} onClick={(e) => e.stopPropagation()}>
            <div className="ruo-drawer-header">
              <div>
                <h2 className="ruo-drawer-title">Biên Bản Kiểm Kê CSVC &amp; Xác Thực Chữ Ký Số (UC-3.11)</h2>
                <p className="ruo-drawer-subtitle">
                  Mã biên bản: {reportData.report_code} • {reportData.building}
                </p>
              </div>
              <button onClick={() => setShowReportModal(false)} className="ruo-drawer-close-btn"><Icons.X size={18} /></button>
            </div>

            <div className="ruo-drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '75vh', overflowY: 'auto' }}>
              {/* Printable Official Report Document */}
              <div id="printable-inventory-report" style={{ background: 'var(--surface-panel)', border: '1.5px solid var(--border-strong)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
                <div style={{ textAlign: 'center', borderBottom: '1.5px solid var(--border-strong)', paddingBottom: '14px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--ink-secondary)', textTransform: 'uppercase' }}>
                    ĐẠI HỌC QUỐC GIA • HỆ THỐNG QUẢN LÝ CSVC TÒA NHÀ ĐA NĂNG A1
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ink-pure)', margin: '6px 0 4px' }}>
                    BIÊN BẢN KIỂM KÊ &amp; ĐỐI SOÁT TÀI SẢN THIẾT BỊ ĐỊNH KỲ
                  </h3>
                  <div style={{ fontSize: '12.5px', color: 'var(--laser-cyan)', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>
                    Số hiệu: {reportData.report_code} • Đợt: {reportData.session?.name}
                  </div>
                </div>

                {/* Summary Counts */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '18px' }}>
                  <div style={{ background: 'var(--status-success-bg)', padding: '10px', borderRadius: '6px', border: '1.5px solid var(--status-success-border)', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: 'var(--status-success-color)', fontWeight: 800 }}>Danh Sách Khớp</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--status-success-color)' }}>{reportData.summary?.matched || 0}</div>
                  </div>
                  <div style={{ background: 'var(--status-warning-bg)', padding: '10px', borderRadius: '6px', border: '1.5px solid var(--status-warning-border)', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: 'var(--status-warning-color)', fontWeight: 800 }}>Danh Sách Thừa / Sai Phòng</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--status-warning-color)' }}>{reportData.summary?.wrong_location || 0}</div>
                  </div>
                  <div style={{ background: 'var(--status-purple-bg)', padding: '10px', borderRadius: '6px', border: '1.5px solid var(--status-purple-border)', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: 'var(--status-purple-color)', fontWeight: 800 }}>Danh Sách Thiếu / Thất Lạc</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--status-purple-color)' }}>{reportData.summary?.missing || 0}</div>
                  </div>
                  <div style={{ background: 'var(--status-danger-bg)', padding: '10px', borderRadius: '6px', border: '1.5px solid var(--status-danger-border)', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: 'var(--status-danger-color)', fontWeight: 800 }}>Danh Sách Hỏng Hóc</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--status-danger-color)' }}>{reportData.summary?.damaged || 0}</div>
                  </div>
                </div>

                {/* Categorized Lists */}
                {[
                  { key: 'matched_items', title: 'I. DANH SÁCH TÀI SẢN KHỚP VỊ TRÍ (MATCHED)', color: 'var(--status-success-color)' },
                  { key: 'wrong_location_items', title: 'II. DANH SÁCH TÀI SẢN THỪA / SAI VỊ TRÍ PHÒNG (SURPLUS / WRONG ROOM)', color: 'var(--status-warning-color)' },
                  { key: 'missing_items', title: 'III. DANH SÁCH TÀI SẢN THIẾU / THẤT LẠC (MISSING)', color: 'var(--status-purple-color)' },
                  { key: 'damaged_items', title: 'IV. DANH SÁCH TÀI SẢN HỎNG HÓC PHÁT HIỆN KHI KIỂM KÊ (DAMAGED)', color: 'var(--status-danger-color)' },
                  { key: 'unscanned_items', title: 'V. DANH SÁCH TÀI SẢN TRÊN SỔ SÁCH CHƯA QUÉT ĐỐI SOÁT (UNSCANNED)', color: 'var(--ink-secondary)' }
                ].map((sec) => {
                  const items = reportData.categories?.[sec.key] || [];
                  return (
                    <div key={sec.key} style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '12.5px', fontWeight: 800, color: sec.color, marginBottom: '6px' }}>
                        {sec.title} ({items.length} thiết bị)
                      </div>
                      {items.length === 0 ? (
                        <div style={{ fontSize: '12px', color: 'var(--ink-secondary)', padding: '8px 12px', background: 'var(--surface-card)', borderRadius: '4px', border: '1px solid var(--border-subtle)', fontWeight: 600 }}>
                          Không có thiết bị nào trong mục này.
                        </div>
                      ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', background: 'var(--surface-card)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-default)' }}>
                          <thead>
                            <tr style={{ borderBottom: '1.5px solid var(--border-strong)', color: 'var(--ink-pure)', background: 'var(--surface-header)' }}>
                              <th style={{ padding: '7px 10px' }}>Mã TS</th>
                              <th style={{ padding: '7px 10px' }}>Tên Thiết Bị</th>
                              <th style={{ padding: '7px 10px' }}>Phòng Sổ Sách</th>
                              <th style={{ padding: '7px 10px' }}>Phòng Thực Tế</th>
                              <th style={{ padding: '7px 10px' }}>Nguyên Giá</th>
                              <th style={{ padding: '7px 10px' }}>Ghi Chú</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((it, idx) => (
                              <tr key={it.log_id || idx} style={{ borderBottom: '1px solid var(--border-default)' }}>
                                <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--laser-cyan)' }}>{it.code}</td>
                                <td style={{ padding: '6px 10px', fontWeight: 700, color: 'var(--ink-pure)' }}>{it.name}</td>
                                <td style={{ padding: '6px 10px', color: 'var(--ink-primary)', fontWeight: 600 }}>{it.expected_room}</td>
                                <td style={{ padding: '6px 10px', color: 'var(--ink-pure)', fontWeight: 700 }}>{it.scanned_room}</td>
                                <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--ink-pure)' }}>{Number(it.price || 0).toLocaleString('vi-VN')} đ</td>
                                <td style={{ padding: '6px 10px', color: 'var(--ink-secondary)', fontWeight: 500 }}>{it.note || (it.repair_ticket ? `Phiếu SC: ${it.repair_ticket}` : '—')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  );
                })}

                {/* Digital Signature Block */}
                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '2px dashed var(--border-strong)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--status-success-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Icons.Shield size={16} />
                      <span>CHỮ KÝ SỐ ĐIỆN TỬ XÁC THỰC BIÊN BẢN (SHA-256 DIGITAL SIGNATURE)</span>
                    </div>
                    <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--status-info-color)', background: 'var(--status-info-bg)', border: '1.5px solid var(--status-info-border)', padding: '3px 8px', borderRadius: '4px' }}>
                      SHA-256: {reportData.digital_signature?.hash?.slice(0, 32)}...
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center' }}>
                    {(reportData.digital_signature?.signers || []).map((sig, i) => (
                      <div key={i} style={{ background: 'var(--surface-card)', border: '1.5px solid var(--status-success-border)', borderRadius: '6px', padding: '12px' }}>
                        <div style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--ink-secondary)' }}>{sig.role}</div>
                        <div style={{ margin: '8px auto', display: 'inline-block', padding: '3px 10px', borderRadius: '4px', background: 'var(--status-success-bg)', border: '1.5px solid var(--status-success-border)', color: 'var(--status-success-color)', fontSize: '10.5px', fontWeight: 800 }}>
                          ✔ { isDigitallySigned ? 'ĐÃ KÝ SỐ XÁC THỰC' : sig.status }
                        </div>
                        <div style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--ink-pure)' }}>{sig.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="ruo-drawer-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button
                type="button"
                onClick={handleDownloadCsvReport}
                className="laser-btn laser-btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontWeight: 800, color: 'var(--status-info-color)', background: 'var(--status-info-bg)', border: '1.5px solid var(--status-info-border)' }}
              >
                <Icons.Download size={15} />
                <span>Tải Tệp CSV Biên Bản</span>
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={() => setShowReportModal(false)} className="laser-btn laser-btn-secondary" style={{ padding: '8px 16px', fontWeight: 700 }}>
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="laser-btn laser-btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 20px', fontWeight: 800 }}
                >
                  <Icons.CheckCircle size={15} />
                  <span>In Biên Bản PDF Có Chữ Ký Số</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPage;
