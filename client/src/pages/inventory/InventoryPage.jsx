import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { inventoryApi, masterDataApi } from '../../lib/api';

export const InventoryPage = () => {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const userRole = currentUser?.role || 'facility_manager';
  const canCreateOrReconcile = ['facility_manager', 'admin'].includes(userRole);

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

  // Live summary counts from sessionLogs
  const matchedCount = sessionLogs.filter((l) => l.status === 'matched').length;
  const wrongLocCount = sessionLogs.filter((l) => l.status === 'wrong_location').length;
  const missingCount = sessionLogs.filter((l) => l.status === 'missing').length;
  const damagedCount = sessionLogs.filter((l) => l.status === 'damaged').length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--laser-cyan)', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
              MODULE 05 • UC-3.9, UC-3.10, UC-3.11
            </span>
            <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
              KIỂM KÊ ĐỊNH KỲ TÒA A1, QUÉT MÃ QR ĐỐI SOÁT &amp; BIÊN BẢN KÝ SỐ
            </span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink-pure)', letterSpacing: '-0.02em', margin: 0 }}>
            Kiểm Kê CSVC &amp; Đối Soát Mã QR Thực Địa (Tòa Nhà A1)
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--ink-muted)' }}>
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
                fontWeight: 700,
                color: 'var(--laser-cyan)',
                border: '1px solid var(--laser-cyan)',
                background: 'rgba(6, 182, 212, 0.08)'
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
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 18px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 700 }}
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
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--hairline-medium)', background: 'var(--surface-panel)' }}>
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
                    borderBottom: '1px solid var(--hairline-soft)',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(6,182,212,0.08)' : 'transparent',
                    borderLeft: isSelected ? '3px solid var(--laser-cyan)' : '3px solid transparent'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '13px', color: 'var(--ink-pure)' }}>{s.name}</strong>
                    <span style={{ fontSize: '10.5px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: isReconciled ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: isReconciled ? '#10B981' : '#F59E0B' }}>
                      {isReconciled ? 'Đã Chốt Sổ' : 'Đang Kiểm'}
                    </span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                    Phạm vi: <strong>{s.scope_type === 'floor' ? `Tầng ${s.scope_floor}` : s.scope_type === 'room' ? 'Theo Phòng' : 'Toàn Tòa A1'}</strong> • Ngày: {new Date(s.date || s.created_at).toLocaleDateString('vi-VN')}
                  </div>
                </div>
              );
            })}

            {sessions.length === 0 && (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ink-muted)', fontSize: '12.5px' }}>
                Chưa có đợt kiểm kê nào. Nhấn "Tạo Đợt Kiểm Kê Mới" để bắt đầu.
              </div>
            )}
          </div>
        </div>

        {/* Right: Active Session Workspace */}
        {activeSession ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Session Info Banner + 4 Reconciliation KPIs */}
            <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ink-pure)', margin: 0 }}>
                    {activeSession.name}
                  </h2>
                  <div style={{ fontSize: '12.5px', color: 'var(--ink-muted)', marginTop: '4px' }}>
                    Trạng thái: <strong>{activeSession.status}</strong> • Phạm vi:{' '}
                    <strong>
                      {activeSession.scope_type === 'floor'
                        ? `Tầng ${activeSession.scope_floor} — Tòa A1`
                        : activeSession.scope_type === 'room'
                          ? 'Theo Phòng học Tòa A1'
                          : 'Toàn bộ Tòa nhà Đa năng A1'}
                    </strong>{' '}
                    • Đã ghi nhận: <strong>{sessionLogs.length}</strong> tài sản
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleOpenExportReport}
                    disabled={exportingReport}
                    className="laser-btn laser-btn-secondary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '12.5px', fontWeight: 700, color: 'var(--laser-cyan)' }}
                  >
                    <Icons.Download size={15} />
                    <span>Xuất Biên Bản (UC-3.11)</span>
                  </button>

                  {canCreateOrReconcile && activeSession.status !== 'reconciled' && activeSession.status !== 'completed' && (
                    <button
                      onClick={handleReconcile}
                      className="laser-btn laser-btn-primary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '12.5px' }}
                    >
                      <Icons.CheckCircle size={15} />
                      <span>Chốt Số Liệu Đối Soát</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 4 Reconciliation Buckets Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#10B981', fontWeight: 700 }}>1. Khớp Đúng Phòng</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#10B981' }}>{matchedCount}</div>
                </div>
                <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#F59E0B', fontWeight: 700 }}>2. Thừa / Sai Vị Trí</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#F59E0B' }}>{wrongLocCount}</div>
                </div>
                <div style={{ background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '8px', padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#A855F7', fontWeight: 700 }}>3. Thiếu / Thất Lạc</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#A855F7' }}>{missingCount}</div>
                </div>
                <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#EF4444', fontWeight: 700 }}>4. Hỏng Hóc Thực Địa</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#EF4444' }}>{damagedCount}</div>
                </div>
              </div>
            </div>

            {/* Field Scanner Toolbar (UC-3.10: Quét QR đối soát thực tế) */}
            {activeSession.status !== 'reconciled' && activeSession.status !== 'completed' && (
              <div style={{ background: 'var(--surface-card)', border: '1px solid var(--laser-cyan)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--ink-pure)', margin: '0 0 14px' }}>
                  Quét Mã QR Đối Soát Thực Địa Tại Phòng (UC-3.10)
                </h3>

                <form onSubmit={handleScanSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) minmax(240px, 1.5fr)', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                        Phòng Học Đang Đứng Kiểm Kê (Tòa A1):
                      </label>
                      <select
                        value={scannedRoomId}
                        onChange={(e) => setScannedRoomId(e.target.value)}
                        className="ruo-portal-input"
                        style={{ width: '100%', height: '38px', fontSize: '13px' }}
                      >
                        {rooms.map((r) => (
                          <option key={r._id} value={r._id}>{r.code} - {r.name} (Tầng {r.floor})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
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
                          style={{ flex: 1, height: '38px', fontFamily: 'var(--font-mono)' }}
                        />
                        <button
                          type="submit"
                          disabled={scanning}
                          className="laser-btn laser-btn-primary"
                          style={{ padding: '0 18px', height: '38px', fontWeight: 700 }}
                        >
                          {scanning ? 'Đang Ghi...' : 'Quét Đối Soát'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Reconciliation Mode Selector: Auto (Matched/Wrong Room) vs Damaged vs Missing */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', background: 'var(--surface-panel)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-secondary)' }}>Chế độ ghi nhận:</span>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', color: '#10B981', fontWeight: 700 }}>
                      <input type="radio" name="scanMode" checked={scanMode === 'auto'} onChange={() => setScanMode('auto')} />
                      <span>Tự động đối soát (Khớp / Sai phòng)</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', color: '#EF4444', fontWeight: 700 }}>
                      <input type="radio" name="scanMode" checked={scanMode === 'damaged'} onChange={() => setScanMode('damaged')} />
                      <span>Báo Hỏng Hóc (Tự động mở phiếu sửa chữa)</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', color: '#A855F7', fontWeight: 700 }}>
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
                        style={{ flex: '1 1 220px', height: '32px', fontSize: '12px' }}
                      />
                    )}
                  </div>
                </form>
              </div>
            )}

            {/* Scan Logs Table */}
            <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--hairline-medium)' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--ink-pure)', margin: 0 }}>
                  Nhật Ký Quét Kiểm Kê Thực Tế ({sessionLogs.length})
                </h3>
              </div>

              {sessionLogs.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ink-muted)', fontSize: '13px' }}>
                  Chưa có lượt quét nào trong đợt kiểm kê này.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-panel)', borderBottom: '1px solid var(--hairline-medium)' }}>
                      <th style={{ padding: '10px 16px', color: 'var(--ink-pure)', fontWeight: 700 }}>Mã QR / Thiết Bị</th>
                      <th style={{ padding: '10px 16px', color: 'var(--ink-pure)', fontWeight: 700 }}>Phòng Quy Định</th>
                      <th style={{ padding: '10px 16px', color: 'var(--ink-pure)', fontWeight: 700 }}>Phòng Quét Thực Tế</th>
                      <th style={{ padding: '10px 16px', color: 'var(--ink-pure)', fontWeight: 700 }}>Kết Quả Đối Soát</th>
                      <th style={{ padding: '10px 16px', color: 'var(--ink-pure)', fontWeight: 700 }}>Thời Điểm Quét</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessionLogs.map((l) => {
                      const eq = l.equipment_id || {};
                      const isMatched = l.status === 'matched';
                      const isWrong = l.status === 'wrong_location';
                      const isMissing = l.status === 'missing';

                      const badgeBg = isMatched
                        ? 'rgba(16,185,129,0.15)'
                        : isWrong
                          ? 'rgba(245,158,11,0.15)'
                          : isMissing
                            ? 'rgba(168,85,247,0.15)'
                            : 'rgba(239,68,68,0.15)';
                      const badgeColor = isMatched
                        ? '#10B981'
                        : isWrong
                          ? '#F59E0B'
                          : isMissing
                            ? '#A855F7'
                            : '#EF4444';
                      const badgeLabel = isMatched
                        ? 'Khớp Đúng Vị Trí'
                        : isWrong
                          ? 'Thừa / Sai Phòng'
                          : isMissing
                            ? 'Thiếu / Thất Lạc'
                            : 'Hỏng Hóc Tại Chỗ';

                      return (
                        <tr key={l._id} style={{ borderBottom: '1px solid var(--hairline-soft)' }}>
                          <td style={{ padding: '10px 16px' }}>
                            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--laser-cyan)' }}>{eq.code || l.qr_code}</div>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-pure)' }}>{eq.name}</div>
                          </td>
                          <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--ink-secondary)' }}>
                            {eq.room_id?.code || 'Kho dự phòng'}
                          </td>
                          <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--ink-pure)' }}>
                            {l.scanned_room_id?.code || 'Phòng A1'}
                          </td>
                          <td style={{ padding: '10px 16px' }}>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '3px 8px',
                                borderRadius: '4px',
                                background: badgeBg,
                                color: badgeColor
                              }}
                            >
                              {badgeLabel}
                            </span>
                            {l.repair_id && (
                              <div style={{ fontSize: '11px', color: '#EF4444', marginTop: '2px' }}>
                                Tự tạo phiếu: {l.repair_id.ticket_code}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '10px 16px', fontSize: '12px', color: 'var(--ink-muted)' }}>
                            {new Date(l.scanned_at).toLocaleTimeString('vi-VN')} ({new Date(l.scanned_at).toLocaleDateString('vi-VN')})
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : (
          <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-lg)', padding: '60px 20px', textAlign: 'center', color: 'var(--ink-muted)' }}>
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
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
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
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                    Phạm Vi Kiểm Kê Trong Tòa Nhà A1 *
                  </label>
                  <select
                    value={scopeType}
                    onChange={(e) => setScopeType(e.target.value)}
                    className="ruo-portal-input"
                    style={{ width: '100%', height: '38px' }}
                  >
                    <option value="building">Toàn bộ Tòa nhà Đa năng A1 (5 tầng)</option>
                    <option value="floor">Theo Tầng cụ thể trong Tòa A1 (Tầng 1 – 5)</option>
                    <option value="room">Theo Phòng học / Kho cụ thể trong Tòa A1</option>
                  </select>
                </div>

                {scopeType === 'floor' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                      Chọn Tầng Kiểm Kê (Tòa A1) *
                    </label>
                    <select
                      value={scopeFloor}
                      onChange={(e) => setScopeFloor(e.target.value)}
                      className="ruo-portal-input"
                      style={{ width: '100%', height: '38px' }}
                    >
                      {[1, 2, 3, 4, 5].map((fl) => (
                        <option key={fl} value={String(fl)}>Tầng {fl} — Tòa nhà Đa năng A1</option>
                      ))}
                    </select>
                  </div>
                )}

                {scopeType === 'room' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
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
                <button type="button" onClick={() => setShowCreateModal(false)} className="laser-btn laser-btn-secondary" style={{ padding: '8px 16px' }}>Hủy Bỏ</button>
                <button type="submit" disabled={submittingSession} className="laser-btn laser-btn-primary" style={{ padding: '8px 20px', fontWeight: 700 }}>
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
              <div id="printable-inventory-report" style={{ background: 'var(--surface-panel)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
                <div style={{ textAlign: 'center', borderBottom: '1px solid var(--hairline-medium)', paddingBottom: '14px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-muted)', textTransform: 'uppercase' }}>
                    ĐẠI HỌC QUỐC GIA • HỆ THỐNG QUẢN LÝ CSVC TÒA NHÀ ĐA NĂNG A1
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ink-pure)', margin: '6px 0 4px' }}>
                    BIÊN BẢN KIỂM KÊ &amp; ĐỐI SOÁT TÀI SẢN THIẾT BỊ ĐỊNH KỲ
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--laser-cyan)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    Số hiệu: {reportData.report_code} • Đợt: {reportData.session?.name}
                  </div>
                </div>

                {/* Summary Counts */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '18px' }}>
                  <div style={{ background: 'var(--surface-card)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(16,185,129,0.3)', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#10B981', fontWeight: 700 }}>Danh Sách Khớp</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#10B981' }}>{reportData.summary?.matched || 0}</div>
                  </div>
                  <div style={{ background: 'var(--surface-card)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(245,158,11,0.3)', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#F59E0B', fontWeight: 700 }}>Danh Sách Thừa / Sai Phòng</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#F59E0B' }}>{reportData.summary?.wrong_location || 0}</div>
                  </div>
                  <div style={{ background: 'var(--surface-card)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(168,85,247,0.3)', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#A855F7', fontWeight: 700 }}>Danh Sách Thiếu / Thất Lạc</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#A855F7' }}>{reportData.summary?.missing || 0}</div>
                  </div>
                  <div style={{ background: 'var(--surface-card)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#EF4444', fontWeight: 700 }}>Danh Sách Hỏng Hóc</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#EF4444' }}>{reportData.summary?.damaged || 0}</div>
                  </div>
                </div>

                {/* Categorized Lists */}
                {[
                  { key: 'matched_items', title: 'I. DANH SÁCH TÀI SẢN KHỚP VỊ TRÍ (MATCHED)', color: '#10B981' },
                  { key: 'wrong_location_items', title: 'II. DANH SÁCH TÀI SẢN THỪA / SAI VỊ TRÍ PHÒNG (SURPLUS / WRONG ROOM)', color: '#F59E0B' },
                  { key: 'missing_items', title: 'III. DANH SÁCH TÀI SẢN THIẾU / THẤT LẠC (MISSING)', color: '#A855F7' },
                  { key: 'damaged_items', title: 'IV. DANH SÁCH TÀI SẢN HỎNG HÓC PHÁT HIỆN KHI KIỂM KÊ (DAMAGED)', color: '#EF4444' }
                ].map((sec) => {
                  const items = reportData.categories?.[sec.key] || [];
                  return (
                    <div key={sec.key} style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: sec.color, marginBottom: '6px' }}>
                        {sec.title} ({items.length} thiết bị)
                      </div>
                      {items.length === 0 ? (
                        <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', padding: '8px 12px', background: 'var(--surface-card)', borderRadius: '4px' }}>
                          Không có thiết bị nào trong mục này.
                        </div>
                      ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', background: 'var(--surface-card)', borderRadius: '4px', overflow: 'hidden' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--hairline-medium)', color: 'var(--ink-muted)' }}>
                              <th style={{ padding: '6px 10px' }}>Mã TS</th>
                              <th style={{ padding: '6px 10px' }}>Tên Thiết Bị</th>
                              <th style={{ padding: '6px 10px' }}>Phòng Sổ Sách</th>
                              <th style={{ padding: '6px 10px' }}>Phòng Thực Tế</th>
                              <th style={{ padding: '6px 10px' }}>Nguyên Giá</th>
                              <th style={{ padding: '6px 10px' }}>Ghi Chú</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((it, idx) => (
                              <tr key={it.log_id || idx} style={{ borderBottom: '1px solid var(--hairline-soft)' }}>
                                <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--laser-cyan)' }}>{it.code}</td>
                                <td style={{ padding: '6px 10px', fontWeight: 600 }}>{it.name}</td>
                                <td style={{ padding: '6px 10px' }}>{it.expected_room}</td>
                                <td style={{ padding: '6px 10px' }}>{it.scanned_room}</td>
                                <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)' }}>{Number(it.price || 0).toLocaleString('vi-VN')} đ</td>
                                <td style={{ padding: '6px 10px', color: 'var(--ink-muted)' }}>{it.note || (it.repair_ticket ? `Phiếu SC: ${it.repair_ticket}` : '—')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  );
                })}

                {/* Digital Signature Block */}
                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1.5px dashed var(--hairline-medium)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#10B981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Icons.Shield size={15} />
                      <span>CHỮ KÝ SỐ ĐIỆN TỬ XÁC THỰC BIÊN BẢN (SHA-256 DIGITAL SIGNATURE)</span>
                    </div>
                    <span style={{ fontSize: '10.5px', fontFamily: 'var(--font-mono)', color: 'var(--laser-cyan)', background: 'rgba(6,182,212,0.1)', padding: '3px 8px', borderRadius: '4px' }}>
                      SHA-256: {reportData.digital_signature?.hash?.slice(0, 32)}...
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center' }}>
                    {(reportData.digital_signature?.signers || []).map((sig, i) => (
                      <div key={i} style={{ background: 'var(--surface-card)', border: '1px solid rgba(16,185,129,0.35)', borderRadius: '6px', padding: '12px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink-secondary)' }}>{sig.role}</div>
                        <div style={{ margin: '8px auto', display: 'inline-block', padding: '3px 10px', borderRadius: '4px', background: 'rgba(16,185,129,0.12)', color: '#10B981', fontSize: '10.5px', fontWeight: 800 }}>
                          ✔ { isDigitallySigned ? 'ĐÃ KÝ SỐ XÁC THỰC' : sig.status }
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-pure)' }}>{sig.name}</div>
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
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontWeight: 700, color: 'var(--laser-cyan)' }}
              >
                <Icons.Download size={15} />
                <span>Tải Tệp CSV Biên Bản</span>
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={() => setShowReportModal(false)} className="laser-btn laser-btn-secondary" style={{ padding: '8px 16px' }}>
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="laser-btn laser-btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 20px', fontWeight: 700 }}
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
