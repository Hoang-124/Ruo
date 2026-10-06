import React, { useState } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { useToast } from '../../context/ToastContext';

export const InventoryPage = () => {
  const { toast } = useToast();

  const [sessions, setSessions] = useState([
    {
      _id: 'INV2026-Q3',
      name: 'Kiểm Kê Tài Sản Toàn Diện Nhà A1 Học Kỳ 1 2026-2027',
      scope_type: 'Tòa nhà A1 (5 tầng)',
      date: '2026-09-30',
      total_items: 24,
      scanned_count: 18,
      status: 'in_progress'
    },
    {
      _id: 'INV2026-Q2',
      name: 'Kiểm Kê Định Kỳ Thiết Bị Nghe Nhìn Quý 2/2026',
      scope_type: 'Phòng thực hành & Giảng đường',
      date: '2026-06-30',
      total_items: 45,
      scanned_count: 45,
      status: 'reconciled'
    }
  ]);

  const [activeSession, setActiveSession] = useState(sessions[0]);

  const [scanLogs, setScanLogs] = useState([
    {
      _id: 'ILOG001',
      equipment_code: 'EQ-PRJ-101',
      equipment_name: 'Máy Chiếu Laser Sony VPL-FHZ75',
      registered_room: 'A1-101',
      scanned_room: 'A1-101',
      status: 'matched',
      scanned_at: '2026-09-30 09:15',
      note: 'Tem QR nguyên vẹn'
    },
    {
      _id: 'ILOG002',
      equipment_code: 'EQ-TV-201',
      equipment_name: 'Smart TV Samsung 75" QLED 4K',
      registered_room: 'A1-101',
      scanned_room: 'A1-201',
      status: 'wrong_location',
      scanned_at: '2026-09-30 09:40',
      note: 'Phát hiện tại phòng A1-201 (Cần cập nhật đơn điều chuyển)'
    }
  ]);

  const [scannedRoom, setScannedRoom] = useState('A1-101');
  const [scanInput, setScanInput] = useState('');

  // Sample database of equipment for simulation
  const equipmentDatabase = {
    'RUO-EQ-PRJ-101': { code: 'EQ-PRJ-101', name: 'Máy Chiếu Laser Sony VPL-FHZ75', room: 'A1-101' },
    'RUO-EQ-TV-201': { code: 'EQ-TV-201', name: 'Smart TV Samsung 75" QLED 4K', room: 'A1-101' },
    'RUO-EQ-PRJ-OLD': { code: 'EQ-PRJ-OLD', name: 'Máy Chiếu Cũ Optoma X341', room: 'A1-501' }
  };

  const handleScan = (qrCodeToScan) => {
    const code = qrCodeToScan || scanInput.trim().toUpperCase();
    if (!code) {
      toast.error('Vui lòng quét hoặc nhập mã QR thiết bị');
      return;
    }

    const found = equipmentDatabase[code] || {
      code: code,
      name: 'Thiết Bị Quét Mới',
      room: 'A1-101'
    };

    const isMatch = found.room === scannedRoom;
    const newLog = {
      _id: 'ILOG' + Date.now().toString().slice(-4),
      equipment_code: found.code,
      equipment_name: found.name,
      registered_room: found.room,
      scanned_room: scannedRoom,
      status: isMatch ? 'matched' : 'wrong_location',
      scanned_at: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      note: isMatch ? 'Khớp vị trí' : `Lệch vị trí: Phòng gốc ${found.room}`
    };

    setScanLogs([newLog, ...scanLogs]);
    setScanInput('');

    if (isMatch) {
      toast.success(`[MATCHED] Thiết bị ${found.code} khớp vị trí phòng ${scannedRoom}!`);
    } else {
      toast.warning(`[LỆCH VỊ TRÍ] Thiết bị ${found.code} thuộc ${found.room} nhưng đang ở ${scannedRoom}!`);
    }
  };

  const handleReconcile = () => {
    setActiveSession(prev => ({ ...prev, status: 'reconciled' }));
    setSessions(prev => prev.map(s => s._id === activeSession._id ? { ...s, status: 'reconciled' } : s));
    toast.success('Đã đối soát toàn bộ và CHỐT SỐ LIỆU KIỂM KÊ (Ghi sổ kiểm toán SHA-256)!');
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--laser-cyan)', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>MODULE 05</span>
            <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>KIỂM KÊ TÀI SẢN THỰC TẾ • QUÉT QR TẠI PHÒNG</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink-pure)', letterSpacing: '-0.02em', margin: 0 }}>
            Kiểm Kê CSVC & Đối Soát Mã QR Thực Địa
          </h1>
        </div>

        {activeSession.status !== 'reconciled' && (
          <button
            onClick={handleReconcile}
            className="laser-btn laser-btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 700 }}
          >
            <Icons.CheckCircle size={16} />
            <span>Đối Soát & Chốt Số Liệu</span>
          </button>
        )}
      </div>

      {/* Top Banner: Active Session */}
      <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>ĐỢT KIỂM KÊ ĐANG CHỌN</div>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--ink-pure)', margin: '4px 0' }}>{activeSession.name}</h3>
            <div style={{ fontSize: '12.5px', color: 'var(--ink-secondary)' }}>Phạm vi: {activeSession.scope_type} • Ngày: {activeSession.date}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{
              display: 'inline-block',
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: '12px',
              fontWeight: 700,
              background: activeSession.status === 'reconciled' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
              color: activeSession.status === 'reconciled' ? '#10B981' : '#F59E0B',
              border: `1px solid ${activeSession.status === 'reconciled' ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`
            }}>
              {activeSession.status === 'reconciled' ? 'ĐÃ ĐỐI SOÁT & KHÓA SỔ' : 'ĐANG TIẾN HÀNH KIỂM KÊ'}
            </span>
          </div>
        </div>
      </div>

      {/* Interactive QR In-Situ Scanner Box */}
      <div style={{ background: 'var(--surface-panel)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-lg)', padding: '24px', marginBottom: '32px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ink-pure)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icons.Search size={18} color="var(--laser-cyan)" />
          <span>Mô Phỏng Quét Mã QR Thiết Bị Tại Phòng Thực Địa</span>
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '6px' }}>
              Vị Trí Kỹ Thuật Viên Đang Đứng (Phòng Kiểm Kê)
            </label>
            <select
              value={scannedRoom}
              onChange={e => setScannedRoom(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', color: 'var(--ink-pure)', fontSize: '13px' }}
            >
              <option value="A1-101">Phòng A1-101 (Giảng Đường Tầng 1)</option>
              <option value="A1-201">Phòng A1-201 (Hội Thảo Tầng 2)</option>
              <option value="A1-301">Phòng A1-301 (Lab Mạng Tầng 3)</option>
              <option value="A1-501">Phòng A1-501 (Kho Tầng 5)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '6px' }}>
              Nhập Hoặc Quét Mã QR Thiết Bị
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="VD: RUO-EQ-PRJ-101"
                value={scanInput}
                onChange={e => setScanInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleScan()}
                style={{ flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', color: 'var(--ink-pure)', fontSize: '13px' }}
              />
              <button
                type="button"
                onClick={() => handleScan()}
                className="laser-btn laser-btn-primary"
                style={{ padding: '0 18px', borderRadius: 'var(--radius-sm)', fontWeight: 700 }}
              >
                Quét
              </button>
            </div>
          </div>
        </div>

        {/* Quick Test QR Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Mã quét mẫu:</span>
          <button
            onClick={() => handleScan('RUO-EQ-PRJ-101')}
            className="laser-btn laser-btn-ghost"
            style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '4px' }}
          >
            RUO-EQ-PRJ-101 (Máy chiếu A1-101)
          </button>
          <button
            onClick={() => handleScan('RUO-EQ-TV-201')}
            className="laser-btn laser-btn-ghost"
            style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '4px' }}
          >
            RUO-EQ-TV-201 (TV gốc A1-101)
          </button>
          <button
            onClick={() => handleScan('RUO-EQ-PRJ-OLD')}
            className="laser-btn laser-btn-ghost"
            style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '4px' }}
          >
            RUO-EQ-PRJ-OLD (Kho A1-501)
          </button>
        </div>
      </div>

      {/* Scanned Items Logs */}
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ink-pure)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icons.Audit size={18} color="var(--laser-cyan)" />
          <span>Danh Sách Thiết Bị Đã Quét Trong Đợt Kiểm Kê</span>
        </h3>

        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--surface-panel)', borderBottom: '1px solid var(--hairline-medium)', color: 'var(--ink-secondary)' }}>
                <th style={{ padding: '12px 16px' }}>Mã Log</th>
                <th style={{ padding: '12px 16px' }}>Thiết Bị</th>
                <th style={{ padding: '12px 16px' }}>Phòng Đăng Ký Gốc</th>
                <th style={{ padding: '12px 16px' }}>Phòng Quét Thực Tế</th>
                <th style={{ padding: '12px 16px' }}>Trạng Thái Khớp</th>
                <th style={{ padding: '12px 16px' }}>Thời Gian</th>
                <th style={{ padding: '12px 16px' }}>Ghi Chú Đối Soát</th>
              </tr>
            </thead>
            <tbody>
              {scanLogs.map(l => (
                <tr key={l._id} style={{ borderBottom: '1px solid var(--hairline-soft)' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--laser-cyan)' }}>{l._id}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--ink-pure)' }}>{l.equipment_name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)' }}>{l.equipment_code}</div>
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--ink-secondary)' }}>{l.registered_room}</td>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: l.status === 'matched' ? 'var(--ink-pure)' : '#EF4444' }}>
                    {l.scanned_room}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {l.status === 'matched' ? (
                      <span style={{ padding: '3px 8px', borderRadius: '4px', background: 'rgba(16,185,129,0.12)', color: '#10B981', fontWeight: 700, fontSize: '11.5px' }}>KHỚP VỊ TRÍ</span>
                    ) : (
                      <span style={{ padding: '3px 8px', borderRadius: '4px', background: 'rgba(239,68,68,0.12)', color: '#EF4444', fontWeight: 700, fontSize: '11.5px' }}>LỆCH PHÒNG</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--ink-muted)' }}>{l.scanned_at}</td>
                  <td style={{ padding: '14px 16px', color: 'var(--ink-secondary)' }}>{l.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default InventoryPage;
