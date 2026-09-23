import React, { useState, useEffect } from 'react';
import { Icons } from '../common/SvgIcons';
import { useAuth } from '../../context/AuthContext';

const API_BASE = 'http://localhost:5000/api/facilities';

const ROOM_TYPE_OPTIONS = [
  { value: 'theory', label: 'Phòng Lý Thuyết' },
  { value: 'lab', label: 'Lab Máy Tính' },
  { value: 'hall', label: 'Hội Trường' },
  { value: 'smart', label: 'Phòng Thông Minh' },
  { value: 'meeting', label: 'Phòng Họp' }
];

export const RoomEditModal = ({ isOpen, onClose, room, onSaveSuccess }) => {
  const { token } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    type: 'theory',
    capacity: 30,
    areaSqm: 60,
    powerKw: 0,
    imageUrl: '',
    bookingRules: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [warnings, setWarnings] = useState([]);

  // Pre-fill form with existing room data
  useEffect(() => {
    if (room && isOpen) {
      setFormData({
        name: room.name || '',
        type: room.type || 'theory',
        capacity: room.capacity || 30,
        areaSqm: room.areaSqm || 60,
        powerKw: room.powerKw || 0,
        imageUrl: room.imageUrl || '',
        bookingRules: room.bookingRules || ''
      });
      setError(null);
      setWarnings([]);
    }
  }, [room, isOpen]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setWarnings([]);

    try {
      const roomId = room._id || room.id;
      const res = await fetch(`${API_BASE}/rooms/${roomId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          type: formData.type,
          capacity: Number(formData.capacity),
          areaSqm: Number(formData.areaSqm),
          powerKw: Number(formData.powerKw),
          imageUrl: formData.imageUrl.trim(),
          bookingRules: formData.bookingRules.trim()
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Lỗi cập nhật phòng học.');
      }

      if (data.warnings && data.warnings.length > 0) {
        setWarnings(data.warnings);
      }

      if (onSaveSuccess) onSaveSuccess(data.room);

      // If no warnings, close the modal
      if (!data.warnings || data.warnings.length === 0) {
        onClose();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !room) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)'
      }}
      onClick={onClose}
    >
      <div
        className="bento-card"
        style={{
          width: '560px', maxHeight: '85vh', overflow: 'auto',
          padding: '0', animation: 'modalSlideIn 0.25s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`@keyframes modalSlideIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}</style>

        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--hairline-soft)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--laser-cyan)', marginBottom: '4px' }}>
              UC-3.4 • CẬP NHẬT PHÒNG
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ink-pure)', margin: 0 }}>
              Chỉnh sửa {room.code}
            </h3>
          </div>
          <button onClick={onClose} style={{
            width: '32px', height: '32px', borderRadius: '50%',
            border: '1px solid var(--hairline-medium)', background: 'transparent',
            color: 'var(--ink-muted)', cursor: 'pointer', fontSize: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>×</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {/* Room Name */}
          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label className="form-label" style={{ fontSize: '11px', color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)' }}>
              TÊN PHÒNG HỌC *
            </label>
            <input
              type="text"
              className="form-control"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--hairline-medium)',
                color: 'var(--ink-primary)', fontSize: '13px'
              }}
            />
          </div>

          {/* Two-Column: Type + Capacity */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '11px', color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)' }}>
                LOẠI PHÒNG
              </label>
              <select
                className="form-control"
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
                style={{
                  background: 'var(--surface-panel)',
                  border: '1px solid var(--hairline-medium)',
                  color: 'var(--ink-primary)', fontSize: '13px'
                }}
              >
                {ROOM_TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: '11px', color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)' }}>
                SỨC CHỨA (chỗ) *
              </label>
              <input
                type="number"
                className="form-control"
                value={formData.capacity}
                onChange={(e) => handleChange('capacity', e.target.value)}
                min="1"
                required
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--hairline-medium)',
                  color: 'var(--ink-primary)', fontSize: '13px'
                }}
              />
            </div>
          </div>

          {/* Two-Column: Area + Power */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '11px', color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)' }}>
                DIỆN TÍCH (m²)
              </label>
              <input
                type="number"
                className="form-control"
                value={formData.areaSqm}
                onChange={(e) => handleChange('areaSqm', e.target.value)}
                min="1"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--hairline-medium)',
                  color: 'var(--ink-primary)', fontSize: '13px'
                }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: '11px', color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)' }}>
                CÔNG SUẤT ĐIỆN (kW)
              </label>
              <input
                type="number"
                className="form-control"
                value={formData.powerKw}
                onChange={(e) => handleChange('powerKw', e.target.value)}
                min="0"
                step="0.1"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--hairline-medium)',
                  color: 'var(--ink-primary)', fontSize: '13px'
                }}
              />
            </div>
          </div>

          {/* Image URL */}
          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label className="form-label" style={{ fontSize: '11px', color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)' }}>
              URL ẢNH PHÒNG HỌC
            </label>
            <input
              type="url"
              className="form-control"
              value={formData.imageUrl}
              onChange={(e) => handleChange('imageUrl', e.target.value)}
              placeholder="https://..."
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--hairline-medium)',
                color: 'var(--ink-primary)', fontSize: '13px'
              }}
            />
          </div>

          {/* Booking Rules */}
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label" style={{ fontSize: '11px', color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)' }}>
              QUY TẮC ĐẶT PHÒNG (tuỳ chọn)
            </label>
            <textarea
              className="form-control"
              value={formData.bookingRules}
              onChange={(e) => handleChange('bookingRules', e.target.value)}
              rows={3}
              placeholder="VD: Chỉ cho phép đặt tối đa 2 tiếng..."
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--hairline-medium)',
                color: 'var(--ink-primary)', fontSize: '13px',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <div style={{
              padding: '12px 16px', marginBottom: '16px',
              background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
              borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--laser-amber)'
            }}>
              <div style={{ fontWeight: 700, marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>⚠️ CẢNH BÁO:</div>
              {warnings.map((w, i) => <div key={i}>{w}</div>)}
              <button
                type="button"
                className="laser-btn laser-btn-ghost"
                onClick={onClose}
                style={{ marginTop: '10px', fontSize: '11px' }}
              >
                Đã lưu thành công — Đóng
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              padding: '10px 14px', marginBottom: '16px',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--laser-rose)'
            }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" className="laser-btn laser-btn-ghost" onClick={onClose} style={{ fontSize: '12px' }}>
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="laser-btn laser-btn-cyan"
              disabled={saving}
              style={{ fontSize: '12px', minWidth: '120px' }}
            >
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
