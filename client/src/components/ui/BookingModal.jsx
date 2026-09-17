import React, { useState } from 'react';
import { triggerConfetti } from '../../utils/confetti';
import { Icons } from '../common/SvgIcons';
import { useAuth } from '../../context/AuthContext';

export const BookingModal = ({ isOpen, onClose, selectedRoom, onBookingSuccess }) => {
  const { currentUser } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    startTime: '08:00',
    endTime: '10:00',
    purpose: 'Học nhóm đồ án chuyên ngành',
    participants: 4,
    agreePunctual: false,
    agreeEquipment: false
  });

  const [hasConflict, setHasConflict] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !selectedRoom) return null;

  const handleTimeChange = (field, val) => {
    const updated = { ...formData, [field]: val };
    setFormData(updated);

    // Mock conflict detection (Optimistic Conflict check)
    if (updated.startTime === '07:30' && selectedRoom.code === 'A1-302') {
      setHasConflict(true);
    } else {
      setHasConflict(false);
    }
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (hasConflict) return;
      setStep(2);
    } else if (step === 2) {
      if (!formData.agreePunctual || !formData.agreeEquipment) {
        alert('Vui lòng đồng ý với các nội quy sử dụng phòng học!');
        return;
      }
      // Submit
      setIsSubmitting(true);
      setTimeout(() => {
        setIsSubmitting(false);
        setStep(3);
        try {
          triggerConfetti();
        } catch (e) {
          console.log(e);
        }
        if (onBookingSuccess) {
          onBookingSuccess({
            room: selectedRoom,
            ...formData
          });
        }
      }, 500);
    }
  };

  const handleClose = () => {
    setStep(1);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header with Stepper */}
        <div className="modal-header">
          <div>
            <div style={{ fontWeight: 800, fontSize: '18px', color: 'var(--text-primary)' }}>
              Đặt Phòng Học {selectedRoom.code}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Bước {step} / 3: {step === 1 ? 'Thông tin ca mượn' : step === 2 ? 'Cam kết nội quy' : 'Hoàn tất & Nhận mã'}
            </div>
          </div>
          <button onClick={handleClose} className="icon-btn">
            <Icons.X size={18} />
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div style={{ display: 'flex', height: '4px', background: 'var(--border-color)' }}>
          <div style={{ width: step >= 1 ? '33.33%' : '0%', background: 'var(--color-primary-600)', transition: 'width 200ms' }} />
          <div style={{ width: step >= 2 ? '33.33%' : '0%', background: 'var(--color-primary-600)', transition: 'width 200ms' }} />
          <div style={{ width: step >= 3 ? '33.34%' : '0%', background: 'var(--color-green-500)', transition: 'width 200ms' }} />
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {step === 1 && (
            <div>
              {/* Room Quick Summary Card */}
              <div
                style={{
                  display: 'flex',
                  gap: '16px',
                  background: 'var(--bg-card-subtle)',
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '20px',
                  alignItems: 'center'
                }}
              >
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundImage: `url(${selectedRoom.image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    flexShrink: 0
                  }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px' }}>{selectedRoom.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {selectedRoom.building} • Tầng {selectedRoom.floor} • Sức chứa: {selectedRoom.capacity} chỗ
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-primary-600)', marginTop: '2px', fontWeight: 600 }}>
                    Trang thiết bị: {selectedRoom.equipments.slice(0, 2).join(', ')}...
                  </div>
                </div>
              </div>

              {/* Form inputs */}
              <div className="grid-cols-2">
                <div className="form-group">
                  <label className="form-label">Ngày sử dụng</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Số người tham gia</label>
                  <input
                    type="number"
                    min="1"
                    max={selectedRoom.capacity}
                    className="form-control"
                    value={formData.participants}
                    onChange={(e) => setFormData({ ...formData, participants: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>

              <div className="grid-cols-2">
                <div className="form-group">
                  <label className="form-label">Giờ bắt đầu</label>
                  <select
                    className="form-control"
                    value={formData.startTime}
                    onChange={(e) => handleTimeChange('startTime', e.target.value)}
                  >
                    <option value="07:30">07:30 (Trùng lịch lớp chính khóa demo)</option>
                    <option value="08:00">08:00</option>
                    <option value="09:45">09:45</option>
                    <option value="13:00">13:00</option>
                    <option value="15:15">15:15</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Giờ kết thúc</label>
                  <select
                    className="form-control"
                    value={formData.endTime}
                    onChange={(e) => handleTimeChange('endTime', e.target.value)}
                  >
                    <option value="09:30">09:30</option>
                    <option value="10:00">10:00</option>
                    <option value="11:45">11:45</option>
                    <option value="15:00">15:00</option>
                    <option value="17:15">17:15</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Mục đích mượn phòng</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ví dụ: Học nhóm, sinh hoạt câu lạc bộ, ôn tập thi..."
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                />
              </div>

              {/* Real-time Conflict Alert */}
              {hasConflict ? (
                <div
                  style={{
                    background: 'var(--color-danger-50)',
                    border: '1px solid var(--color-danger-500)',
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-danger-700)',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Icons.AlertTriangle size={18} color="var(--color-danger-500)" />
                  <div>
                    <strong>Xung đột lịch học:</strong> Khung giờ 07:30 - 09:30 đã có lớp <em>Lập Trình Web Nâng Cao</em> (chính khóa) đăng ký trước. Vui lòng chọn khung giờ khác!
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: 'var(--color-green-50)',
                    border: '1px solid var(--color-green-500)',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-green-700)',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Icons.CheckCircle size={16} color="var(--color-green-600)" />
                  <div>Khung giờ khả dụng! Không có xung đột lịch với lớp học phần hay đơn đặt khác.</div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div>
              <div
                style={{
                  background: 'var(--color-primary-50)',
                  border: '1px solid var(--color-primary-200)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  marginBottom: '20px'
                }}
              >
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-primary-900)', marginBottom: '8px' }}>
                  Quy định sử dụng cơ sở vật chất nhà trường:
                </h4>
                <ul style={{ fontSize: '13px', color: 'var(--color-primary-700)', paddingLeft: '20px', lineHeight: 1.6 }}>
                  <li>Phải có mặt và quét mã QR xác nhận trước cửa phòng trong <strong>15 phút đầu</strong> của ca học.</li>
                  <li>Nếu không check-in, đơn sẽ bị hủy chuyển <strong>NO_SHOW</strong> và trừ điểm uy tín đặt phòng.</li>
                  <li>Tắt tất cả thiết bị điện, điều hòa, máy chiếu và khóa cửa trước khi rời khỏi phòng.</li>
                  <li>Không mang đồ ăn, nước ngọt vào phòng máy tính và phòng thí nghiệm.</li>
                </ul>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.agreePunctual}
                    onChange={(e) => setFormData({ ...formData, agreePunctual: e.target.checked })}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span>Tôi cam kết check-in đúng giờ (trong vòng 15 phút đầu ca mượn).</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.agreeEquipment}
                    onChange={(e) => setFormData({ ...formData, agreeEquipment: e.target.checked })}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span>Tôi cam kết bảo quản tài sản, thiết bị và bồi thường nếu để xảy ra hư hại.</span>
                </label>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
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
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Gửi Yêu Cầu Thành Công!
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                Đơn đặt phòng <strong>{selectedRoom.code}</strong> ngày <strong>{formData.date}</strong> ({formData.startTime} - {formData.endTime}) của <strong>{currentUser?.name || 'Tác nhân'}</strong> đã được chuyển tới bộ phận Quản lý CSVC phê duyệt.
              </p>

              <div
                style={{
                  background: '#FFFFFF',
                  padding: '16px',
                  borderRadius: 'var(--radius-lg)',
                  display: 'inline-block',
                  border: '1px solid var(--border-color)',
                  boxShadow: 'var(--shadow-md)',
                  marginBottom: '16px'
                }}
              >
                <Icons.QrCode size={130} color="#0F172A" />
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                  Mã QR xác nhận (Tự động kích hoạt khi được duyệt)
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          {step === 1 && (
            <>
              <button className="btn btn-secondary" onClick={handleClose}>
                Hủy bỏ
              </button>
              <button className="btn btn-primary" onClick={handleNextStep} disabled={hasConflict}>
                <span>Tiếp theo</span>
                <Icons.ArrowRight size={16} />
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <button className="btn btn-secondary" onClick={() => setStep(1)}>
                <Icons.ArrowLeft size={16} />
                <span>Quay lại</span>
              </button>
              <button className="btn btn-primary" onClick={handleNextStep} disabled={isSubmitting}>
                {isSubmitting ? 'Đang kiểm tra...' : 'Xác nhận đặt phòng'}
              </button>
            </>
          )}

          {step === 3 && (
            <button className="btn btn-success" onClick={handleClose}>
              <Icons.CheckCircle size={16} />
              <span>Hoàn tất</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
