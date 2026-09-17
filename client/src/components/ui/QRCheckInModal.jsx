import React, { useState, useEffect } from 'react';
import { Icons } from '../common/SvgIcons';

export const QRCheckInModal = ({ isOpen, onClose, bookingRoom = 'A1-302', bookingTime = '13:00 - 15:00' }) => {
  const [countdown, setCountdown] = useState(15 * 60); // 15 phút
  const [isCheckedIn, setIsCheckedIn] = useState(false);

  useEffect(() => {
    if (!isOpen || isCheckedIn) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, isCheckedIn]);

  if (!isOpen) return null;

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  const handleSimulateScan = () => {
    setIsCheckedIn(true);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px', textAlign: 'center' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
            <Icons.QrCode size={20} color="var(--color-primary-600)" />
            <span>Mô Phỏng Check-In Phòng Học (QR Code)</span>
          </div>
          <button onClick={onClose} className="icon-btn">
            <Icons.X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {!isCheckedIn ? (
            <>
              <div
                style={{
                  background: 'var(--color-warning-50)',
                  border: '1px solid var(--color-warning-500)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                  marginBottom: '20px',
                  fontSize: '13px',
                  color: 'var(--color-warning-700)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 700 }}>
                  <Icons.Clock size={16} />
                  Thời gian check-in còn lại: {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
                </div>
                <div style={{ fontSize: '11px', marginTop: '4px' }}>
                  Quá 15 phút không xác nhận có mặt, hệ thống tự động hủy slot chuyển <strong>NO_SHOW</strong> và trừ điểm uy tín.
                </div>
              </div>

              {/* Fake QR Graphic in Pure SVG */}
              <div
                style={{
                  background: '#FFFFFF',
                  padding: '24px',
                  borderRadius: 'var(--radius-lg)',
                  display: 'inline-block',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                  border: '2px dashed var(--color-primary-300)',
                  marginBottom: '16px'
                }}
              >
                <Icons.QrCode size={160} color="#0F172A" />
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-primary-700)', marginTop: '8px' }}>
                  MÃ QR ĐỊNH DANH PHÒNG {bookingRoom}
                </div>
              </div>

              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Phòng: <strong style={{ color: 'var(--text-primary)' }}>{bookingRoom}</strong> • Ca: {bookingTime}
              </div>

              <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={handleSimulateScan}>
                <Icons.CheckCircle size={18} />
                <span>Mô Phỏng Quét Thành Công</span>
              </button>
            </>
          ) : (
            <div style={{ padding: '24px 0' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'var(--color-green-100)',
                  color: 'var(--color-green-600)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}
              >
                <Icons.Check size={36} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-green-700)', marginBottom: '8px' }}>
                Check-in Thành Công!
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                Trạng thái buổi mượn phòng <strong>{bookingRoom}</strong> đã chuyển sang <strong>IN_USE</strong>. Chúc bạn có buổi học hiệu quả!
              </p>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setIsCheckedIn(false);
                  onClose();
                }}
              >
                Đóng cửa sổ
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
