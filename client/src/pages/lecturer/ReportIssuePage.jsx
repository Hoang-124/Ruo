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
  const [triaging, setTriaging] = useState(false);
  const [triageResult, setTriageResult] = useState(null);

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
      const availableRooms = (res?.rooms || []).filter(r => (r.room_type || r.type) !== 'warehouse');
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

  const handleAiTriage = async () => {
    if (!formData.incident_description.trim()) {
      toast.error('Vui lòng nhập mô tả hiện tượng sự cố để AI phân tích.');
      return;
    }
    try {
      setTriaging(true);
      const imagesArray = formData.incident_images
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await repairApi.aiTriage({
        room_id: formData.room_id,
        equipment_id: formData.equipment_id,
        incident_description: formData.incident_description.trim(),
        incident_images: imagesArray
      });

      if (res && res.success && res.triage) {
        setTriageResult(res.triage);
        toast.success('AI đã phân tích mức độ ưu tiên, kiểm tra trùng lặp và chuẩn hóa mô tả!');
      }
    } catch (err) {
      toast.error('Không thể chạy AI Phân loại sự cố: ' + err.message);
    } finally {
      setTriaging(false);
    }
  };

  const handleApplyTriage = () => {
    if (!triageResult) return;
    setFormData((prev) => ({
      ...prev,
      damage_level: triageResult.suggested_damage_level || prev.damage_level,
      incident_description: triageResult.refined_description || prev.incident_description
    }));
    toast.success('Đã áp dụng mức độ ưu tiên và mô tả kỹ thuật chuẩn từ AI!');
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
          <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Tiếp Nhận Sự Cố & Báo Hỏng Thực Địa</span>
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

          {/* Incident Description + AI Triage Copilot */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--ink-pure)' }}>
                4. Mô Tả Chi Tiết Sự Cố *
              </label>
              <button
                type="button"
                onClick={handleAiTriage}
                disabled={triaging}
                className="laser-btn laser-btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--laser-cyan)',
                  border: '1px solid var(--border-focus)',
                  background: 'var(--surface-2)'
                }}
              >
                <Icons.Sparkles size={14} />
                <span>{triaging ? 'AI Đang Phân Tích...' : 'AI Phân Loại & Kiểm Tra Trùng Lặp'}</span>
              </button>
            </div>
            <textarea
              required
              rows={4}
              value={formData.incident_description}
              onChange={(e) => setFormData({ ...formData, incident_description: e.target.value })}
              placeholder="VD: Máy chiếu bật không lên nguồn, đèn nhấp nháy đỏ liên tục; quạt tản nhiệt kêu to bất thường khi bật cầu dao..."
              className="ruo-portal-input"
              style={{ width: '100%', resize: 'vertical' }}
            />

            {triageResult && (
              <div
                style={{
                  marginTop: '12px',
                  background: 'var(--surface-2)',
                  border: '1.5px solid var(--border-focus)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: 'var(--status-info-bg)', color: 'var(--status-info-color)', border: '1px solid var(--status-info-border)' }}>
                      <Icons.Sparkles size={12} />
                      <span>{triageResult.engine === 'gemini' ? 'GEMINI AI TRIAGE' : 'RUO AI TRIAGE'}</span>
                    </span>
                    <span
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background:
                          triageResult.suggested_damage_level === 'critical'
                            ? 'var(--status-danger-bg)'
                            : triageResult.suggested_damage_level === 'major'
                              ? 'var(--status-warning-bg)'
                              : 'var(--status-success-bg)',
                        color:
                          triageResult.suggested_damage_level === 'critical'
                            ? 'var(--status-danger-color)'
                            : triageResult.suggested_damage_level === 'major'
                              ? 'var(--status-warning-color)'
                              : 'var(--status-success-color)',
                        border: `1px solid ${
                          triageResult.suggested_damage_level === 'critical'
                            ? 'var(--status-danger-border)'
                            : triageResult.suggested_damage_level === 'major'
                              ? 'var(--status-warning-border)'
                              : 'var(--status-success-border)'
                        }`
                      }}
                    >
                      Đề xuất: {triageResult.suggested_damage_level?.toUpperCase()} • SLA {triageResult.sla_label}
                    </span>
                    <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--ink-muted)' }}>
                      Độ tin cậy: {triageResult.confidence}%
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyTriage}
                    className="laser-btn laser-btn-primary"
                    style={{ padding: '5px 12px', fontSize: '11.5px', fontWeight: 700, borderRadius: 'var(--radius-sm)' }}
                  >
                    Áp Dụng Gợi Ý AI
                  </button>
                </div>

                {Array.isArray(triageResult.duplicate_tickets) && triageResult.duplicate_tickets.length > 0 && (
                  <div
                    style={{
                      background: 'var(--status-warning-bg)',
                      border: '1px solid var(--status-warning-border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 12px',
                      fontSize: '12px',
                      color: 'var(--status-warning-color)'
                    }}
                  >
                    <div style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <Icons.AlertTriangle size={14} />
                      <span>
                        {triageResult.has_exact_duplicate
                          ? 'Cảnh báo trùng lặp: Thiết bị này đang có phiếu báo hỏng chưa đóng!'
                          : 'Lưu ý: Phòng học này đang có phiếu sự cố mở liên quan:'}
                      </span>
                    </div>
                    {triageResult.duplicate_tickets.slice(0, 2).map((dup) => (
                      <div key={dup._id || dup.ticket_code} style={{ fontSize: '11.5px', color: 'var(--ink-secondary)', marginTop: '2px' }}>
                        • <strong style={{ fontFamily: 'var(--font-mono)' }}>{dup.ticket_code}</strong> ({dup.status}): {dup.incident_description}
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ fontSize: '12.5px', color: 'var(--ink-secondary)' }}>
                  <strong style={{ color: 'var(--ink-pure)' }}>Nhận định kỹ thuật:</strong> {triageResult.reasoning}
                </div>

                <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', fontSize: '12px', color: 'var(--ink-primary)' }}>
                  <div style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: '3px' }}>
                    Mô tả chuẩn hóa gợi ý
                  </div>
                  <div>{triageResult.refined_description}</div>
                </div>

                {Array.isArray(triageResult.quick_checks) && triageResult.quick_checks.length > 0 && (
                  <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                    <strong style={{ color: 'var(--ink-secondary)' }}>Hướng dẫn xử lý nhanh tại chỗ:</strong>
                    <ul style={{ margin: '4px 0 0 18px', padding: 0 }}>
                      {triageResult.quick_checks.map((tip, i) => (
                        <li key={i} style={{ marginBottom: '2px' }}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
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
