import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { useToast } from '../../context/ToastContext';
import { masterDataApi, equipmentApi, repairApi } from '../../lib/api';

export const ReportIssuePage = ({ onNavigateTab, preselectedEquipment, preselectedRoom }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    room_id: preselectedRoom?._id || '',
    equipment_id: preselectedEquipment?._id || '',
    damage_level: 'minor',
    incident_description: '',
    incident_images: ''
  });

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    if (formData.room_id) {
      fetchRoomEquipments(formData.room_id);
    } else {
      setEquipments([]);
    }
  }, [formData.room_id]);

  useEffect(() => {
    if (preselectedRoom?._id) {
      setFormData(prev => ({ ...prev, room_id: preselectedRoom._id }));
    }
    if (preselectedEquipment?._id) {
      setFormData(prev => ({ ...prev, equipment_id: preselectedEquipment._id }));
    }
  }, [preselectedRoom, preselectedEquipment]);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const res = await masterDataApi.getRooms({ limit: 100 });
      const availableRooms = (res?.rooms || []).filter(r => r.type !== 'warehouse');
      setRooms(availableRooms);
      if (!formData.room_id && availableRooms.length > 0) {
        setFormData(prev => ({ ...prev, room_id: availableRooms[0]._id }));
      }
    } catch (err) {
      toast.error('Lỗi khi tải danh sách phòng: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoomEquipments = async (roomId) => {
    try {
      const res = await equipmentApi.list({ room: roomId, limit: 100 });
      const eqList = res?.equipments || [];
      setEquipments(eqList);
      if (!formData.equipment_id && eqList.length > 0) {
        setFormData(prev => ({ ...prev, equipment_id: eqList[0]._id }));
      }
    } catch (err) {
      console.warn('Load room equipment warning:', err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.room_id) {
      toast.error('Vui lòng chọn phòng học xảy ra sự cố.');
      return;
    }
    if (!formData.equipment_id) {
      toast.error('Vui lòng chọn thiết bị gặp sự cố.');
      return;
    }
    if (!formData.incident_description.trim()) {
      toast.error('Vui lòng nhập mô tả chi tiết sự cố hỏng hóc.');
      return;
    }

    try {
      setSubmitting(true);
      const imagesArray = formData.incident_images
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean);

      const res = await repairApi.create({
        room_id: formData.room_id,
        equipment_id: formData.equipment_id,
        damage_level: formData.damage_level,
        incident_description: formData.incident_description.trim(),
        incident_images: imagesArray,
        source: 'lecturer_report'
      });

      if (res && res.success) {
        toast.success(`Đã tiếp nhận phiếu báo hỏng thành công (Mã: ${res.repair?.ticket_code || 'RUO-TICKET'})!`);
        if (onNavigateTab) {
          onNavigateTab('my_tickets');
        }
      }
    } catch (err) {
      toast.error('Lỗi khi gửi báo hỏng: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedEquipment = equipments.find(e => e._id === formData.equipment_id);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ fontSize: '11px', color: '#10B981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>GIẢNG VIÊN</span>
          <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>MODULE 04 • UC: REPORT MALFUNCTION (BÁO HỎNG THIẾT BỊ)</span>
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink-pure)', letterSpacing: '-0.02em', margin: 0 }}>
          Phiếu Báo Hỏng Thiết Bị Phòng Học
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--ink-muted)' }}>
          Hệ thống sẽ tự động thông báo tới Cán bộ Quản lý CSVC và phân công Kỹ thuật viên xử lý theo hạn cam kết SLA.
        </p>
      </div>

      <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Room Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px', color: 'var(--ink-pure)' }}>
              1. Phòng Học Xảy Ra Sự Cố *
            </label>
            <select
              required
              value={formData.room_id}
              onChange={(e) => setFormData({ ...formData, room_id: e.target.value, equipment_id: '' })}
              className="ruo-portal-input"
              style={{ width: '100%', height: '40px', fontSize: '13px' }}
            >
              {rooms.map(r => (
                <option key={r._id} value={r._id}>
                  {r.code} - {r.name} (Tòa {r.building || 'A1'} • Tầng {r.floor || 1})
                </option>
              ))}
            </select>
          </div>

          {/* Equipment Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px', color: 'var(--ink-pure)' }}>
              2. Thiết Bị Gặp Trục Trặc *
            </label>
            {equipments.length === 0 ? (
              <div style={{ padding: '12px', background: 'var(--surface-panel)', borderRadius: 'var(--radius-md)', fontSize: '12.5px', color: 'var(--ink-muted)' }}>
                Chưa có thiết bị đăng ký tại phòng này. Vui lòng chọn phòng học khác hoặc liên hệ CSVC.
              </div>
            ) : (
              <select
                required
                value={formData.equipment_id}
                onChange={(e) => setFormData({ ...formData, equipment_id: e.target.value })}
                className="ruo-portal-input"
                style={{ width: '100%', height: '40px', fontSize: '13px' }}
              >
                {equipments.map(eq => (
                  <option key={eq._id} value={eq._id}>
                    [{eq.code}] {eq.name} — {eq.brand} {eq.model} ({eq.status})
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedEquipment && (
            <div style={{ background: 'var(--surface-panel)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-md)', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--laser-cyan)', fontSize: '12px' }}>
                  {selectedEquipment.code}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink-pure)' }}>
                  {selectedEquipment.name}
                </div>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
                Serial: <strong style={{ color: 'var(--ink-pure)' }}>{selectedEquipment.serial_number || 'N/A'}</strong>
              </div>
            </div>
          )}

          {/* Damage Level Severity */}
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '8px', color: 'var(--ink-pure)' }}>
              3. Mức Độ Ảnh Hưởng / Mức Độ Hư Hỏng *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {[
                { key: 'minor', label: 'Hỏng Nhẹ (Minor)', desc: 'Ảnh hưởng nhỏ, phòng vẫn học được', color: '#10B981', sla: 'Xử lý trong 48 giờ' },
                { key: 'major', label: 'Hỏng Nặng (Major)', desc: 'Gián đoạn giảng dạy, cần thay thế', color: '#F59E0B', sla: 'Xử lý trong 24 giờ' },
                { key: 'critical', label: 'Khẩn Cấp (Critical)', desc: 'Mất an toàn, chập cháy, tê liệt', color: '#EF4444', sla: 'Xử lý khẩn cấp 4 giờ' }
              ].map(lvl => (
                <div
                  key={lvl.key}
                  onClick={() => setFormData({ ...formData, damage_level: lvl.key })}
                  style={{
                    border: formData.damage_level === lvl.key ? `2px solid ${lvl.color}` : '1px solid var(--hairline-medium)',
                    background: formData.damage_level === lvl.key ? `${lvl.color}15` : 'var(--surface-panel)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: lvl.color }} />
                    <strong style={{ fontSize: '13px', color: 'var(--ink-pure)' }}>{lvl.label}</strong>
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginBottom: '4px' }}>{lvl.desc}</div>
                  <div style={{ fontSize: '11px', color: lvl.color, fontWeight: 700 }}>{lvl.sla}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Incident Description */}
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px', color: 'var(--ink-pure)' }}>
              4. Mô Tả Chi Tiết Sự Cố *
            </label>
            <textarea
              required
              rows={4}
              value={formData.incident_description}
              onChange={(e) => setFormData({ ...formData, incident_description: e.target.value })}
              placeholder="VD: Máy chiếu bật không lên nguồn, đèn nhấp nháy đỏ liên tục; quạt tản nhiệt kêu to bất thường khi bật cầu dao..."
              className="ruo-portal-input"
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          {/* Incident Images Simulator */}
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px', color: 'var(--ink-pure)' }}>
              5. Đường Dẫn Hình Ảnh Hiện Trường (Mỗi ảnh một dòng, tùy chọn)
            </label>
            <textarea
              rows={2}
              value={formData.incident_images}
              onChange={(e) => setFormData({ ...formData, incident_images: e.target.value })}
              placeholder="https://example.com/photo1.jpg"
              className="ruo-portal-input"
              style={{ width: '100%', fontFamily: 'monospace', fontSize: '12px', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px', paddingTop: '16px', borderTop: '1px solid var(--hairline-medium)' }}>
            <button
              type="button"
              onClick={() => onNavigateTab && onNavigateTab('dashboard')}
              className="laser-btn laser-btn-secondary"
              style={{ padding: '9px 18px', borderRadius: 'var(--radius-md)' }}
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="laser-btn laser-btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 24px', borderRadius: 'var(--radius-md)', fontWeight: 700 }}
            >
              {submitting ? <Icons.RefreshCw size={16} className="spin" /> : <Icons.AlertTriangle size={16} />}
              <span>{submitting ? 'Đang Gửi Báo Hỏng...' : 'Gửi Báo Hỏng Ngay'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportIssuePage;
