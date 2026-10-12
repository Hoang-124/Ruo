import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { useToast } from '../../context/ToastContext';
import { inventoryApi, masterDataApi } from '../../lib/api';

export const InventoryPage = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [sessionLogs, setSessionLogs] = useState([]);
  const [rooms, setRooms] = useState([]);

  // Scan state
  const [scannedRoomId, setScannedRoomId] = useState('');
  const [qrInput, setQrInput] = useState('');
  const [isDamaged, setIsDamaged] = useState(false);
  const [damageNote, setDamageNote] = useState('');
  const [scanning, setScanning] = useState(false);

  // New Session Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [submittingSession, setSubmittingSession] = useState(false);

  const fetchRooms = async () => {
    try {
      const res = await masterDataApi.getRooms({ limit: 100 });
      const roomList = (res?.rooms || []).filter(r => r.type !== 'warehouse');
      setRooms(roomList);
      if (roomList.length > 0 && !scannedRoomId) {
        setScannedRoomId(roomList[0]._id);
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

    try {
      setSubmittingSession(true);
      const res = await inventoryApi.createSession({
        name: newSessionName.trim(),
        scope_type: 'building'
      });

      if (res && res.success) {
        toast.success('Đã khởi tạo đợt kiểm kê mới thành công!');
        setShowCreateModal(false);
        setNewSessionName('');
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
        is_damaged: isDamaged,
        damage_note: damageNote.trim()
      });

      if (res && res.success) {
        const log = res.log || {};
        if (log.status === 'matched') {
          toast.success(`[KHỚP VỊ TRÍ] Thiết bị khớp đúng phòng kiểm kê!`);
        } else if (log.status === 'wrong_location') {
          toast.warning(`[LỆCH VỊ TRÍ] Thiết bị thuộc phòng khác nhưng được tìm thấy tại phòng này!`);
        } else if (log.status === 'damaged') {
          toast.error(`[PHÁT HIỆN HỎNG] Đã tự động tạo phiếu sửa chữa khẩn cấp!`);
        }
        setQrInput('');
        setIsDamaged(false);
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
        toast.success('Đã chốt đối soát số liệu kiểm kê thành công!');
        await loadSessionDetails(activeSession._id);
        await fetchSessions();
      }
    } catch (err) {
      toast.error('Lỗi khi chốt kiểm kê: ' + err.message);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--laser-cyan)', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>MODULE 05</span>
            <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>KIỂM KÊ THỰC ĐỊA, QUÉT MÃ QR & ĐỐI SOÁT TÀI SẢN</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink-pure)', letterSpacing: '-0.02em', margin: 0 }}>
            Kiểm Kê CSVC & Đối Soát Mã QR Thực Địa
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--ink-muted)' }}>
            Quét mã QR tại từng phòng học, phát hiện thiết bị lệch vị trí, ghi nhận hư hỏng tự động tạo phiếu sửa chữa và chốt số liệu.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setShowCreateModal(true)}
            className="laser-btn laser-btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 18px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 700 }}
          >
            <Icons.Plus size={16} />
            <span>Tạo Đợt Kiểm Kê Mới</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Sessions Sidebar + Active Session Workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(0, 2.5fr)', gap: '20px', alignItems: 'start' }}>
        {/* Left: Sessions List */}
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--hairline-medium)', background: 'var(--surface-panel)' }}>
            <h3 style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--ink-pure)', margin: 0 }}>
              Các Đợt Kiểm Kê CSVC ({sessions.length})
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {sessions.map(s => {
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
                      {isReconciled ? 'Đã Chốt' : 'Đang Kiểm'}
                    </span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                    Ngày: {new Date(s.date || s.created_at).toLocaleDateString('vi-VN')} • Người lập: {s.created_by?.full_name || 'Quản lý'}
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
            {/* Session Info Banner */}
            <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ink-pure)', margin: 0 }}>
                    {activeSession.name}
                  </h2>
                  <div style={{ fontSize: '12.5px', color: 'var(--ink-muted)', marginTop: '4px' }}>
                    Trạng thái: <strong>{activeSession.status}</strong> • Đã quét: <strong>{sessionLogs.length}</strong> lượt tài sản
                  </div>
                </div>

                {activeSession.status !== 'reconciled' && activeSession.status !== 'completed' && (
                  <button
                    onClick={handleReconcile}
                    className="laser-btn laser-btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 18px', borderRadius: 'var(--radius-md)', fontWeight: 700 }}
                  >
                    <Icons.CheckCircle size={16} />
                    <span>Chốt Số Liệu Đối Soát</span>
                  </button>
                )}
              </div>
            </div>

            {/* Field Scanner Toolbar */}
            {activeSession.status !== 'reconciled' && activeSession.status !== 'completed' && (
              <div style={{ background: 'var(--surface-card)', border: '1px solid var(--laser-cyan)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--ink-pure)', margin: '0 0 14px' }}>
                  Quét Mã QR Tại Phòng Thực Địa
                </h3>

                <form onSubmit={handleScanSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) minmax(240px, 1.5fr)', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                        Phòng Học Đang Đứng Kiểm Kê:
                      </label>
                      <select
                        value={scannedRoomId}
                        onChange={(e) => setScannedRoomId(e.target.value)}
                        className="ruo-portal-input"
                        style={{ width: '100%', height: '38px', fontSize: '13px' }}
                      >
                        {rooms.map(r => (
                          <option key={r._id} value={r._id}>{r.code} - {r.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                        Mã QR / Mã Thiết Bị Cần Quét:
                      </label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          required
                          placeholder="Quét tem QR hoặc nhập mã thiết bị..."
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
                          {scanning ? 'Đang Ghi...' : 'Quét'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--surface-panel)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12.5px', color: '#EF4444', fontWeight: 700 }}>
                      <input
                        type="checkbox"
                        checked={isDamaged}
                        onChange={(e) => setIsDamaged(e.target.checked)}
                      />
                      <span>Phát hiện hỏng hóc thực địa (Tự động mở phiếu sửa chữa)</span>
                    </label>

                    {isDamaged && (
                      <input
                        type="text"
                        placeholder="Mô tả hư hỏng..."
                        value={damageNote}
                        onChange={(e) => setDamageNote(e.target.value)}
                        className="ruo-portal-input"
                        style={{ flex: 1, height: '32px', fontSize: '12px' }}
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
                      <th style={{ padding: '10px 16px', color: 'var(--ink-pure)', fontWeight: 700 }}>Phòng Quét Thực Tế</th>
                      <th style={{ padding: '10px 16px', color: 'var(--ink-pure)', fontWeight: 700 }}>Kết Quả Đối Soát</th>
                      <th style={{ padding: '10px 16px', color: 'var(--ink-pure)', fontWeight: 700 }}>Thời Điểm Quét</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessionLogs.map(l => {
                      const eq = l.equipment_id || {};
                      const isMatched = l.status === 'matched';
                      const isWrong = l.status === 'wrong_location';
                      const isDamagedLog = l.status === 'damaged';

                      return (
                        <tr key={l._id} style={{ borderBottom: '1px solid var(--hairline-soft)' }}>
                          <td style={{ padding: '10px 16px' }}>
                            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--laser-cyan)' }}>{eq.code || l.qr_code}</div>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-pure)' }}>{eq.name}</div>
                          </td>
                          <td style={{ padding: '10px 16px', color: 'var(--ink-pure)' }}>
                            {l.scanned_room_id?.code || 'Phòng'}
                          </td>
                          <td style={{ padding: '10px 16px' }}>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '3px 8px',
                                borderRadius: '4px',
                                background: isMatched ? 'rgba(16,185,129,0.15)' : isWrong ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                                color: isMatched ? '#10B981' : isWrong ? '#F59E0B' : '#EF4444'
                              }}
                            >
                              {isMatched ? 'Khớp Đúng Vị Trí' : isWrong ? 'Sai Lệch Phòng' : 'Hư Hỏng Tại Chỗ'}
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

      {/* Modal: Create Session */}
      {showCreateModal && (
        <div className="ruo-drawer-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="ruo-drawer-panel" style={{ width: '460px' }} onClick={(e) => e.stopPropagation()}>
            <div className="ruo-drawer-header">
              <div>
                <h2 className="ruo-drawer-title">Khởi Tạo Đợt Kiểm Kê Thực Tế</h2>
                <p className="ruo-drawer-subtitle">Thiết lập đợt kiểm tra đối soát tài sản định kỳ</p>
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
                    placeholder="VD: Kiểm kê định kỳ thiết bị Nhà A1 Học kỳ 1 2026-2027"
                    value={newSessionName}
                    onChange={(e) => setNewSessionName(e.target.value)}
                    className="ruo-portal-input"
                    style={{ width: '100%', height: '38px' }}
                  />
                </div>
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
    </div>
  );
};

export default InventoryPage;
